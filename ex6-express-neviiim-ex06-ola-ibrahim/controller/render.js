'use strict';
const createError = require("http-errors");
const Cookies = require('cookies');
const db = require('../models');
let keys = ['Gjkfe123214H@#!%`']
const bcrypt = require('bcrypt');
const { //======================= import constants ====================== //
    EXPIRED_COOKIE, UNAUTHORIZED, SERVER_STATUS_CODE,
    DISCONNECTED_RESPONSE, NONE, THIRTY_SECONDS, USER_KEY_IN_COOKIES, LOGIN_ERROR,
    LOGIN_WRONG_CREDENTIALS, USER_REGISTERED_SUCCESSFULLY, LOGIN_USER_NOT_FOUND,
    USER_ALREADY_EXISTS, PASSWORDS_NOT_MATCHING, REGISTER_ERROR, CREATE_USER_ERROR,
    HOME_PAGE_ERROR
} = require('./constants');
// ====================== import functions ====================== //
const {
    checkParams, isUserConnected, redirectHomePage,
    setSessionExpired, redirectLogin,
} = require('./functions');
const {Sequelize} = require("sequelize");
// ======================= middle ware ======================= //
exports.middleware = (req, res, next) => {
    req.session.user ? res.redirect('/home-page') : next();
}
exports.accessMiddleware = (req, res, next) => {
    req.session.user ? next() : redirectLogin(res, req);
}

//========================== CHECK SESSION - GET REQUEST ==================//
exports.checkConnection = (req, res) => {
    try {
        if (req.session.user) {
            res.send({status: 200, message: 'connected'});
        } else {
            setSessionExpired(req);
            res.status(UNAUTHORIZED).json(DISCONNECTED_RESPONSE);
        }
    } catch (err) {
        res.status(SERVER_STATUS_CODE).json({message: err.message});
    }
}

// ======================== LOGIN - GET REQUEST ========================== //
exports.getLogin = (req, res) => {
    try {
        let message = NONE;
        // get message from previous page (saved in session)
        const {loginError} = req.session;
        if (loginError) {
            req.session.loginError = null;
            message = loginError;
        }
        rendersModel.renderLogin(res, message);
    } catch (err) {
        funcsModule.catchError(res, SERVER_STATUS_CODE, err.message, LOGIN_ERROR);
    }
}
// ====================== POST LOGIN ====================== //
exports.postLogin = async (req, res) => {
    try {
        const {password} = req.body;
        const email = req.body.email.toLowerCase().trim();
        checkParams(email, password);

        const existingUser = await db.User.findOne({where: {email: email}});
        if (existingUser) {
            // await bcrypt.compare(password, existingUser.password);
            if (bcrypt.compare(password, existingUser.password)) {
                funcsModule.login(req, res, existingUser);
            }
            // password or email not correct
            else {
                redirectLogin(res, req, LOGIN_WRONG_CREDENTIALS);
            }
        }// user not found
        else {
            redirectLogin(res, req, LOGIN_USER_NOT_FOUND);
        }
    } catch (err) {
        funcsModule.catchError(res, SERVER_STATUS_CODE, err.message);
    }
}
// ------------------- REGISTER - GET REQUEST ------------------- //
exports.getRegister = (req, res) => {
    try {
        const {registerError} = req.session;
        let inputs = [NONE, NONE, NONE];
        if (registerError) {
            console.log(registerError)
            req.session.registerError = null;
            rendersModel.renderRegister(res, registerError);
        } else {
            let [formInputs, message] = [funcsModule.getCookies(req, res, USER_KEY_IN_COOKIES), NONE];
            // if cookies not expired show the form with values from cookies
            if (formInputs) {
                formInputs = JSON.parse(formInputs);
                const userExist = funcsModule.checkIfUserExists(formInputs.email);
                if (userExist.isExist) {
                    message = userExist.msg
                }
                inputs = [formInputs.firstName, formInputs.lastName, formInputs.email];
            }
            rendersModel.renderRegister(res, message, inputs[0], inputs[1], inputs[2]);
        }
    } catch (err) {
        rendersModel.renderRegister(res, REGISTER_ERROR);
    }
}
// ------------------- REGISTER - POST REQUEST ------------------- //
exports.postRegister = async (req, res) => {
    try {
        const {firstName, lastName, email} = req.body;
        checkParams(firstName, lastName, email);

        const formInputs = {
            firstName: firstName.toLowerCase().trim(),
            lastName: lastName.toLowerCase().trim(),
            email: email.toLowerCase().trim()
        };
        const isExist = await funcsModule.checkIfUserExists(formInputs.email);
        if (!isExist.isExist) {
            // save the form inputs in cookies for 30 seconds
            funcsModule.save2Cookies(req, res, USER_KEY_IN_COOKIES, formInputs, THIRTY_SECONDS);
            res.redirect('/register/password');
        }
        // if user already exist don't save to cookies and show error message
        else {
            rendersModel.redirectRegister(res, req, isExist.msg);
        }
    } catch (err) {
        rendersModel.redirectRegister(res, req, REGISTER_ERROR);
    }
}
// ------------------- PASSWORD - GET REQUEST ------------------- //
exports.getRegisterPassword = (req, res) => {
    try {
        const {passwordError} = req.session;
        if (passwordError) {
            req.session.passwordError = null;
            rendersModel.renderPassword(res, passwordError);
        } else {
            //if cookies not expired show the form with values from cookies
            const user = funcsModule.getCookies(req, res, USER_KEY_IN_COOKIES);
            user ? rendersModel.renderPassword(res) : rendersModel.redirectRegister(res, req, EXPIRED_COOKIE);
        }
    } catch (err) {
        rendersModel.renderPassword(res, REGISTER_ERROR);
    }
}

function saveUserRecord(cookies, formInputs, password, res, req) {
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            throw createError(SERVER_STATUS_CODE, err.message)
        }
        funcsModule.createUser(res, req, cookies, formInputs.email, formInputs.firstName, formInputs.lastName, hash);
    })
}

// ------------------- PASSWORD - POST REQUEST ------------------- //
exports.postRegisterPassword = (req, res) => {
    try {
        const cookies = Cookies(req, res, {keys: keys});
        const user = cookies.get(USER_KEY_IN_COOKIES, {signed: true});

        // check if any of inputs expired and redirect to login page
        if (!user)
            rendersModel.redirectRegister(res, req, EXPIRED_COOKIE);

        const {password, confirmPassword} = req.body;
        if (confirmPassword && password) {
            console.log(4)

            const formInputs = JSON.parse(user);
            if (funcsModule.checkPassword(password, confirmPassword)) {
                console.log('passwords match');
                const emailExist = funcsModule.checkIfUserExists(formInputs.email);
                console.log('emailExist', 'isExist', emailExist.isExist);
                if (!emailExist.isExist) {
                    saveUserRecord(cookies, formInputs, password, res, req);
                } else {
                    //return to register page from beginning
                    rendersModel.redirectRegister(res, req, emailExist.msg);
                }
            } else {// passwords not matching
                rendersModel.redirectRegisterPassword(res, req, PASSWORDS_NOT_MATCHING);
            }
        }
    } catch (err) {
        funcsModule.catchError(res, SERVER_STATUS_CODE, err.message, CREATE_USER_ERROR);
    }
}
// ------------------ HOME - GET REQUEST ------------------- //
exports.getHomePage = (req, res) => {
    try {
        const {user} = req.session;
        res.render('homePage', {user: user});
    } catch (err) {
        rendersModel.renderLogin(res, HOME_PAGE_ERROR);
    }
}
// ------------------- LOGOUT ------------------- //
exports.getLogout = (req, res) => {
    try {
        funcsModule.setUserConnected(req, null);
        res.redirect('/');
    } catch (err) {
        redirectLogin(res, req, LOGOUT_ERROR);
    }
}

const funcsModule = (function () {
    const setUserConnected = (req, user) => {
        req.session.user = user ?? null;
    }
    const json = (res) => res.json();
    const checkPassword = (password, confirmPassword) => password === confirmPassword;
    const checkIfUserExists = async (email) => {
        try {
            const isExist = await db.User.findOne({where: {email: email}});
            const isExistMsg = isExist ? USER_ALREADY_EXISTS : NONE;
            return {
                "isExist": !!isExist,
                "msg": isExistMsg
            }
        } catch (err) {
            throwsError(DATABASE_ERROR);
        }
    }
    const createUser = (res, req, cookies, email, firstName, lastName, password) => {
        db.User.create({firstName: firstName, lastName: lastName, email: email, password: password})
            .then(user => {
                cookies.set(USER_KEY_IN_COOKIES, null, {maxAge: -1});
                redirectLogin(res, req, USER_REGISTERED_SUCCESSFULLY);
            }).catch(err => {
            if (err instanceof Sequelize.ValidationError) {
                // handle validation error here
                console.log(`validation error ${err}`);
                rendersModel.redirectRegisterPassword(res, req, err.message ?? err.msg ?? REGISTER_ERROR);
            } else {
                // handle other types of errors here
                console.log(`other error ${err}`);
                throw createError(err);
            }
        });
    }

    const getCookies = (req, res, key) => {
        const cookies = Cookies(req, res, {keys: keys});
        return cookies.get(key, {signed: true})
    };
    const catchError = (res, statusCode, errMsg) => {
        return res.status(statusCode).json({message: errMsg});
    }
    // check if all inputs are defined
    const throwsError = (errMsg) => {
        throw new Error(errMsg);
    }
    const login = (req, res, user) => {
        const {email, id} = user.dataValues;
        user = {
            username: email.split('@')[0],
            id: id
        };
        // save connected user data in session
        funcsModule.setUserConnected(req, user);
        return redirectHomePage(res, req);
    }
    const save2Cookies = (req, res, key, value, expiredTime) => {
        const cookies = Cookies(req, res, {keys: keys});
        cookies.set(key, JSON.stringify(value), {signed: true, maxAge: expiredTime});
    }
    return {
        checkIfUserExists: checkIfUserExists,
        createUser: createUser,
        getCookies: getCookies,
        json: json,
        checkPassword: checkPassword,
        setUserConnected: setUserConnected,
        catchError: catchError,
        throwsError: throwsError,
        login: login,
        save2Cookies: save2Cookies,
    }
})();

const rendersModel = (function () {
    const renderLogin = (res, msg = NONE) => {
        res.render('login', {msg: msg});
    }
    const renderRegister = (res, msg = NONE, firstName = NONE, lastName = NONE, email = NONE) => {
        res.render('register', {
            firstName: firstName,
            lastName: lastName,
            email: email,
            msg: msg
        });
    }
    const renderPassword = (res, msg = NONE) => {
        res.render('password', {msg: msg});
    }
    const redirectRegister = (res, req, error) => {
        req.session.registerError = error ?? NONE;
        res.redirect('/register');
    }
    const redirectRegisterPassword = (res, req, error) => {
        req.session.passwordError = error ?? NONE;
        res.redirect('/register/password');
    }
    return {
        renderLogin: renderLogin,
        renderRegister: renderRegister,
        redirectRegister: redirectRegister,
        renderPassword: renderPassword,
        redirectRegisterPassword: redirectRegisterPassword,
    }
})();
