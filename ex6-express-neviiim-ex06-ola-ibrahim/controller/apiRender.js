const db = require("../models");
const createError = require('http-errors');
const {checkParams, isUserConnected} = require('./functions');
// ---------------------------------------- constans ----------------------------------------
const {
    EXPIRED_SESSION, DB_ERROR, IMAGE_NOT_FOUND, COMMENT_NOT_FOUND, IMAGE_CREATED_FAILED,
    COMMENT_CREATION_FAILED, ALREADY_DELETED, NOT_AUTHORIZED, NO_UPDATES, PARAMETERS_MISSING,
    // ==================== status codes ====================
    INVALID = 400, NOT_FOUND = 404, SERVER_ERROR = 500, UPDATE_SECONDS = 15000, UNAUTHORIZED
} = require('./constants');
const {Sequelize} = require("sequelize");
// =================================== MIDDLE WARE CHECK SESSION ======================
// check if user is connected
exports.checkSession = (req, res, next) => {
    try {
        if (!req.session.user) {
            // send response that the session has expired and redirect to login page
            throw new Error(EXPIRED_SESSION);
        } else
            next();
    } catch (err) {
        req.session.errorMessage = EXPIRED_SESSION;
        res.send({status: UNAUTHORIZED, message: EXPIRED_SESSION, url: '/'});
    }
}

// =================================== POST COMMENT ===================================
// save comment in db
exports.postComment = async (req, res) => {
    const {imageId} = req.params;
    const {text} = req.body;
    const {username, id} = req.session.user;
    const userId = id;

    checkParams(imageId, text);
    if (!username || !userId) {
        throw createError(UNAUTHORIZED, EXPIRED_SESSION);
    }

    // create comment in db - if image not exist so will be created
    funcs.createComment(imageId, text, username, userId).then(comment => {
        res.json({id: comment.id, createdAt: comment.createdAt, isOwner: true, username: comment.username});
    }).catch(err => {
        if (err instanceof Sequelize.ValidationError)
            funcs.handleErrors(res, err);
        else
            res.status(SERVER_ERROR).json({message: COMMENT_CREATION_FAILED});
    })
}

// ---------------------------------------- GET COMMENTS ----------------------------------------
exports.getComments = async (req, res) => {
    try {
        const {imageId} = req.params;
        if (!imageId) {
            return res.status(INVALID).json({message: PARAMETERS_MISSING});
        }
        const image = await db.Picture.findOne({where: {date: imageId}});
        if (!image) {
            return res.json({message: IMAGE_NOT_FOUND});
        }
        // check if image has comments
        const comments = await funcs.getImageComments(imageId);
        if (comments) {
            return res.json({
                comments: comments.map(comment => ({
                    id: comment.id,
                    createdAt: comment.createdAt,
                    text: comment.text,
                    username: comment.username,
                    isOwner: comment.userId === req.session.user.id
                }))
            });
        } else {
            return res.json({message: COMMENT_NOT_FOUND});
        }
        // if not exist return empty array else return comments
    } catch (err) {
        funcs.handleErrors(res, err);
    }
}
// =================================== DELETE COMMENT ===================================
/***
 * delete comment from db and update lastUpdated in picture(save changes)
 * @param userId: user id from session
 * @param commentId: comment id we want to delete from db
 * @returns {Promise<void>}
 */
const deleteComment = async (userId, commentId) => {
    const comment = await db.Comment.findOne({where: {id: commentId}});
    if (!comment) {
        throw createError(NOT_FOUND, COMMENT_NOT_FOUND);
    }
    // if already deleted - invalid
    if (comment.deleted)
        throw createError(INVALID, ALREADY_DELETED);
    // if not the user who created the comment - unauthorized
    if (comment.userId !== userId)
        throw createError(INVALID, NOT_AUTHORIZED);
    // save changes in picture
    const picture = await db.Picture.findOne({where: {date: comment.imageId}});
    // if picture not exist - we dont allow to delete comment
    if (!picture)
        throw createError(NOT_FOUND, IMAGE_NOT_FOUND);
    // update comment and picture in db - save changes
    comment.update({deleted: true, text: "comment deleted"});
    picture.update({lastUpdated: new Date()});
}
// ---------------------------------------- DELETE REQUEST ----------------------------------------
exports.deleteComment = async (req, res) => {
    try {
        const {commentId} = req.params;
        checkParams(commentId);
        const {id} = req.session.user;
        await deleteComment(id, commentId)
            .then(() => res.json({message: "comment deleted"})).catch(err => {
                funcs.handleErrors(res, err);
            });
    } catch (err) {
        funcs.handleErrors(res, err);
    }
}


exports.getUpdates = async (req, res) => {
    try {
        const imageId = req.params.imageId;
        checkParams(imageId);
        // function to check if image has been updated
        const image = await db.Picture.findOne({where: {date: imageId}});
        if (!image) {
            return res.json({message: IMAGE_NOT_FOUND});
        }
        const lastUpdatedAt = new Date().toISOString() - UPDATE_SECONDS; // 15 seconds
        // check if image has been updated
        if (lastUpdatedAt >= image.lastUpdated) {
            return res.json({message: NO_UPDATES});
        }
        // there are updates
        const comments = await funcs.getImageComments(imageId);
        if (comments) {
            return res.json({
                comments: comments.map(comment => ({
                    id: comment.id,
                    createdAt: comment.createdAt,
                    text: comment.text,
                    username: comment.username,
                    isOwner: comment.userId === req.session.user.id
                }))
            });
        } else {
            return res.json({comments: []});
        }
    } catch (err) {
        funcs.handleErrors(res, err);
    }
}


(function () {
    const checkIfParamsUndefined = (...params) => params.some((param) => param === undefined);
    const getComment = (commentId) => {
        return db.Comment.findOne({where: {id: commentId}}) ?? null;
    }
    const getComments = (imageId) => {
        return db.Comment.findAll({
            where: {PictureId: imageId}, order: [['createdAt', 'DESC']]
        })
    }
    const getImage = async (imageId) => {
        return await db.Picture.findOne({where: {id: imageId}});
    }
    const redirectLogin = (res, req, error) => {
        req.session.loginError = error;
        res.redirect('/');
    }
    return {
        getComment: getComment,
        getImage: getImage,
        getComments: getComments,
        checkIfParamsUndefined: checkIfParamsUndefined,
        redirectLogin: redirectLogin,
    }
})();

// ==================================== MODAL ====================================
/***
 * modal for functions
 * @type {{handleErrors: handleErrors, createComment: (function(*, *, *, *): Promise<TModelAttributes>), getImageComments: (function(*): Promise<Model[]>)}}
 */
const funcs = (() => {
    const handleErrors = (res, err) => {
        res.status(err.status || SERVER_ERROR).json({message: err.message})
    };
    const createComment = async (imageId, text, username, userId) => {
        const image = await db.Picture.findOrCreate({where: {date: imageId}});
        if (!image)
            throw createError(SERVER_ERROR, DB_ERROR + IMAGE_CREATED_FAILED);
        const comment = await db.Comment.create({
            imageId: imageId,
            text: text,
            username: username,
            userId: userId
        }, {returning: true, attributes: ['id', 'createdAt']});
        if (!image[1]) {// already found
            image[0].lastUpdated = new Date();
            await image[0].save();
        }
        // return attributes of new comment
        if (!comment)
            throw createError(SERVER_ERROR, DB_ERROR + COMMENT_CREATION_FAILED);
        return comment.dataValues;
    }
    // ==================================================================================
    const getImageComments = async (imageId) => {
        return await db.Comment.findAll({
            where: {imageId, deleted: false}
        });
    }
    return {
        handleErrors: handleErrors,
        createComment: createComment,
        getImageComments: getImageComments,
    }
})();
