"use strict";
const NASA_API_KEY = "bgj2jrY5rBPFBJdWoNFuPwBU1lqFFpMNYxx6GQMh",
    NASA_APOD_URL = "https://api.nasa.gov/planetary/apod";
//================================== REST API URLS ====================================
const SAVE_COMMENT_URL = '/api/comments/save', GET_COMMENTS_URL = '/api/comments',
    DELETE_COMMENT_URL = '/api/comments/delete', UPDATE_COMMENT_URL = '/api/updates',
    CHECK_SESSION_URL = '/check-connection';
// =====================================================================================
const HEADER = {"Content-Type": "application/json"},
    BEFORE_2DAYS = 2, BEFORE_DAY = 1, NO_COPYRIGHT = "No copyright", UPDATE_TIMER = 15000,  // 15 seconds
    EMPTY = '', INVALID_COMMENT_MSG = 'Comment must be between 1-128 characters',
    NASA_ERROR_OCCURED = "Error occurred while fetching data from NASA API.",
    INVALID_DATE = "Invalid date format inserted.", SERVER_ERROR = "Server error occurred.",
    UNKNOWN_ERROR = "Unknown error occurred.", CONNECTION_FAILED = "Connection failed.";
let USER = null;
// ================================== INIT MODULE ======================================
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        // polling every 15 seconds
        managerModule.checkSession();
        // get user from session
        USER = JSON.parse(document.getElementById('user').innerHTML);
        // Set the date of the form to be today
        managerModule.setDateToday();
        managerModule.querySelect('#clearBtn').addEventListener('click', managerModule.clearImages);
        managerModule.querySelect('#ajaxDateFormGet').addEventListener('submit', managerModule.searchNasaPhotos);
    });
})();
// ================================== MANAGER MODULE ======================================
/***
 * Manager module is responsible for handling all the events and DOM manipulations
 * @type {{clearImages: clearImages, searchNasaPhotos: searchNasaPhotos, querySelect: (function(*): *), setDateToday: setDateToday}}
 */
const managerModule = (function () {
    // =============================== SAVED DOM ELEMENTS =================================
    const imagesContainer = document.querySelector('#nasa-images'),
        loadingElem = document.querySelector('#loading'),
        dateInput = document.querySelector('#date'),
        toastsContainer = document.querySelector('#toastDiv');
    /***--------------------------------------------------------------------------------------
     * @param response: Response object
     * @returns {Promise<void>} : Promise object - resolve if the response status is 200-201, reject otherwise
     * This function is responsible for checking the response status
     */
    const status = async (response) => {
        if (response.status >= 200 && response.status <= 201) {
            return Promise.resolve(response);
        } else
            return Promise.reject(new Error(response));
    }

    /***
     * This function is responsible for handling the server error and display the error message
     * @param error: Error object
     * @param deleteRequest:(OPTIONAL) boolean to indicate if the request is delete request,
     * if true, the error will be handled differently - because it's will not return
     * header - prevent redirect to login page
     */
    function serverErrorHandler(error, deleteRequest = false) {
        let errorMessage;
        console.log(error.status)
        if ((!error.header && !deleteRequest) || error.status === 401) {
            console.log(error.status)

            window.location.href = "/";
            getMsgWarning(errorMessage, "CONNECTION_FAILED", true);
            return;
        } else if (error.json) {
            if (error.msg || error.message) {
                errorMessage = error.msg || error.message || "SERVER_ERROR";
            } else {
                errorMessage = "SERVER_ERROR";
            }

            error
                .json()
                .then((json) => {
                    errorMessage = json.message || json.error.msg || "SERVER_ERROR";
                })
                .catch((err) => {
                    errorMessage = err.message || "SERVER_ERROR";
                });
        }
        getMsgWarning(errorMessage, "Error");
    }

    /***
     * This function is responsible for returning error message or promise object for nasa api
     * @param response
     * @returns {*}
     */
    const status2json = (response) => {
        // check for specific error message
        if (!response.ok) {
            return response.json().then(json => {
                throw new Error(json.msg ?? NASA_ERROR_OCCURED);
            });
        }
        //?? throw new Error('Invalid response from NASA API');
        return response.json()
    }

    // ========================== SEARCH NASA PHOTOS FROM NASA APOD API====================
    /***
     * This function is responsible for fetching the photos from NASA APOD API
     * @param event: form submit event
     */
    const searchNasaPhotos = (event) => {
        event.preventDefault();
        // Clear the images container
        clearImages();
        // Get the images from NASA API
        let end_date = dateInput.value,
            start_date = getDayBefore(end_date, BEFORE_2DAYS),
            hasMoreImages = true;
        loadMoreImages(); // inner func to load more images
        // check if we are at the end of the page and load more images
        window.onscroll = function () {
            if (hasMoreImages) {
                if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
                    loadMoreImages();
                }
            }
        };

        function handleError(error) {
            let errorMessage;
            errorMessage = error.msg ?? error.message ?? NASA_ERROR_OCCURED;
            // display error into the page
            managerModule.getMsgWarning(errorMessage, 'Error');
        }

        // inner function - load more images if there are more images in given range(date, before 2 days)
        function loadMoreImages() {
            try {
                show(loadingElem);
                if (!validationModule.validateDates(start_date, end_date))
                    throw new Error(INVALID_DATE);
                fetch(`${NASA_APOD_URL}?api_key=${NASA_API_KEY}&start_date=${start_date}&end_date=${end_date}`)
                    .then(status2json)
                    .then(data => {
                        createImagesInHtml(imagesContainer, data, loadingElem);
                        end_date = getDayBefore(start_date, BEFORE_DAY);
                        start_date = getDayBefore(end_date, BEFORE_2DAYS);
                    })
                    .catch(handleError);
                hide(loadingElem);
            } catch (error) {
                handleError(error);
            }
        }
    }
    const getDayBefore = (date, days) => {
        let newDate = new Date(date);
        newDate.setDate(newDate.getDate() - days);
        // Format the date to yyyy-mm-dd
        return newDate.toISOString().slice(0, 10);
    }

    // sorting images by date
    function createImagesInHtml(imagesDivElem, images, loadingElem) {
        if (images && images.length > 0) {
            images.sort((a, b) => a.date < b.date ? 1 : -1);
            images.forEach(image => imagesDivElem.appendChild(imageModule.createImgCard(image)));
        }
        hide(loadingElem)
    }
    const createNode = function (element, ...classes) {
        const node = document.createElement(element);
        if (classes && classes.length > 0) {
            node.classList.add(...classes);
        }
        return node;
    }
    // for getting icons from font awesome
    const icon = (iconName) => `<i class="fa fa-${iconName}"></i>`;
    const toggle = (element) => {
        element.classList.toggle('d-none');
    }
    const hide = (element) => {
        element.classList.add('d-none');
    }
    const show = (element) => {
        element.classList.remove('d-none');
    }
    const querySelect = (container) => document.querySelector(container);
    const appendChildrens = (parent, ...childrens) => {
        childrens.forEach((node) => parent.appendChild(node));
    }
    const json = (response) => response.json();

    function checkIfJson(response) {
        // Convert the response to a JSON object if it is not a message
        const contentType = response.headers.get("content-type");
        return (contentType && contentType.indexOf("application/json") !== -1) ? response.json() : {};
    }

    // Set the date of the form to be today
    const setDateToday = () => {
        const today = new Date();
        dateInput.value = today.toISOString().substr(0, 10);
    }
    // clear the images from the container
    const clearImages = () => {
        imagesContainer.innerHTML = EMPTY;
    }
    /***
     * This function is responsible for checking every 15 sec if the user is still logged in
     * if not so its will redirect to '/' login page
     */
    const checkSession = () => {
        setInterval(() => {
            fetch(CHECK_SESSION_URL)
                .then(json)
                .then(data => {
                    if (data.url) {
                        window.location.href = data.url;
                    }
                })
                .catch(serverErrorHandler);
        }, UPDATE_TIMER);
    }
    // =========================================== IMAGES MODULE ============================================ \\
    /***
     *
     * @type {{createImgCard: (function(*): *)}}
     */
    const imageModule = (function () {
        const clearComments = (commentsElem) => {
            commentsElem.querySelectorAll('.comment').forEach(comment => comment.remove());
        }
        // this function for creating the image card
        function createImgCard(image) {
            // ----------------- create card elements -----------------
            const card = createNode('div', 'card', 'bg-dark', 'border-info');
            const cardBody = createNode('div', 'card-body', 'row');
            const title = createNode('h5', 'card-title', 'text-info');
            const descriptionSection = createNode('div', 'd-none', 'card-footer');
            const commentsSection = createNode('div', 'comments', 'd-none', 'card-footer');
            const bodyContent = createBodyContent(image, commentsSection, descriptionSection);
            // map for convert the source type to the appropriate element
            const convert = {
                'image': (url) => createImage(url),
                'video': (url) => createVideo(url),
            };
            if (image.media_type in convert) {
                cardBody.appendChild(convert[image.media_type](image.url));
            }
            // ------------------- init attributes -------------------
            card.id = image.date;
            title.innerHTML = ` ${image.title}`;
            descriptionSection.innerHTML = `<p>${image.explanation}</p>`;
            //------------------- append elements ------------------
            appendChildrens(cardBody, bodyContent);
            appendChildrens(card, title, cardBody, commentsSection, descriptionSection);
            return card;
        }

        function createVideo(videoSrc) {
            const videoElem = createNode('iframe', 'card-video', 'col-6');
            videoElem.src = videoSrc;
            videoElem.width = videoElem.height = "100%";
            return videoElem;
        }

        // create an image element and adding a link to the image
        function createImage(imageSrc) {
            const img = createNode('img', 'img-fluid', 'card-img');
            const aElem = createNode('a', 'col-md-6');
            aElem.href = img.src = imageSrc;
            appendChildrens(aElem, img);
            return aElem;
        }

        // create comment object and saving it in the server (get comments from server)
        const newComment = async (comment, imageId) => {
            let commentObj = new Comment(comment, imageId, comment.id, comment.createdAt);
            return await commentObj.save();
        }

        // create comment object without saving it in the server (get comments from server)
        const getHtmlComment = (comment, imageId) => {
            return new Comment(comment, imageId, comment.id, comment.createdAt).createCommentElement();
        }
        const insertBefore = (newNode, referenceNode) => {
            referenceNode.parentNode.insertBefore(newNode, referenceNode);
        }

        // this function for getting comments from the server
        function getComments(commentsElem, imageId) {
            // Add the id parameter to the params object
            fetch(`${GET_COMMENTS_URL}/${imageId}`)
                .then(status)
                .then(json) // Check if the response is a JSON object
                .then(data => {
                    if (data.comments)
                        initComments(data.comments, commentsElem, imageId);
                }).catch(serverErrorHandler);
        }

        // this function for init the comments if updated
        function updateComments(updatedComments, commentsElem, imageId) {
            // remove all the comments - just comment form
            initComments(updatedComments, commentsElem, imageId);
        }

        // this function for init the comments in the image card
        function initComments(commentsData, commentsElem, imageId) {
            clearComments(commentsElem)
            if (checkIfIterable(commentsData) && commentsData.length > 0) {
                // init the comments
                commentsData.forEach(comment => {
                    insertBefore(getHtmlComment(comment, imageId), commentsElem.querySelector('form'));
                });
            }
        }

        // this function for checking if its an iterable object
        function checkIfIterable(updatedComments) {
            return updatedComments && Array.isArray(updatedComments);
        }

        // this function for checking if there is an update in the comments in server
        function checkUpdates(imageId, commentsElem) {
            // Send an HTTP GET request to the server with the comments
            fetch(`${UPDATE_COMMENT_URL}/${imageId}`)
                .then(status)
                .then(json)
                .then(data => {
                    // Get the updated comments from the server
                    if (data.comments) {
                        const updatedComments = data.comments;
                        updateComments(updatedComments, commentsElem, imageId);
                    }
                })
                .catch(err => {
                    serverErrorHandler(err);
                });
        }

        // for creating 2 buttons for the image card
        function createButtons(commentsSection, descriptionSection, imageId) {
            const showDescriptionBtn = createNode('button', 'btn', 'btn-outline-primary', 'col');
            const showCommentsBtn = createNode('button', 'btn', 'btn-outline-secondary', 'mx-1', 'col');
            const buttons = createNode('div', 'row', 'mt-2');
            showCommentsBtn.innerHTML = '<i class="fas fa-comments">Comments</i>';
            showDescriptionBtn.innerHTML = '<i class="fa fa-info">nfo</i>';
            appendChildrens(buttons, showDescriptionBtn, showCommentsBtn);
            let firstClick = true;// for GET request if first time - no checking updates needed
            showCommentsBtn.addEventListener('click', () => {
                toggle(commentsSection);
                let myInterval;
                // if the comments section is visible
                if (!commentsSection.classList.contains('d-none')) {
                    if (firstClick) {
                        firstClick = false;
                        getComments(commentsSection, imageId);
                    }
                    hide(descriptionSection);
                    myInterval = setInterval(() => {
                            checkUpdates(imageId, commentsSection)
                        }
                        , UPDATE_TIMER);
                    // if the comments section is hidden - stop checking updates
                } else if (!firstClick)
                    clearInterval(myInterval);
            })
            showDescriptionBtn.addEventListener('click', () => {
                toggle(descriptionSection);
                hide(commentsSection);
            })
            return buttons;
        }

        // create form for adding new comment
        function createCommentForm(imageId) {
            const form = createNode('form', 'form-group');
            const textArea = createNode('textarea', 'form-control', 'mb-1', 'mr-1');
            textArea.placeholder = 'Write a comment...';
            textArea.rows = 1;
            const submit = createNode('button', 'btn', 'btn-primary');
            submit.type = 'submit';
            submit.innerHTML = `<i class="fa fa-paper-plane"></i>`;
            appendChildrens(form, textArea, submit);
            // add spaces text aria and the form and the button
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const text = textArea.value;
                if (validationModule.validateComment(text)) {
                    hide(form.nextElementSibling);
                    const comment = {text: text}
                    newComment(comment, imageId).then(commentElem => {
                        // add commentElem before post form
                        insertBefore(commentElem, form);
                        form.reset();
                    }).catch(err => {
                        serverErrorHandler(err);
                    })
                } else {
                    // show invalid validation message
                    show(form.nextElementSibling);
                }
            })
            return form;
        }

        // create comment body element
        function createBodyContent(image, commentsSection, descriptionSection) {
            const info = createNode('div', 'col-md-6');
            const copyRight = createNode('p');
            const buttons = createButtons(commentsSection, descriptionSection, image.date);
            const errorMessages = createNode('p', 'text-danger', 'd-none', 'error-messages');
            const postComment = createCommentForm(image.date);
            const dateElem = createNode('p');
            // ----------------- add content to the elements -----------------
            dateElem.innerHTML = `${icon('calendar')} ${image.date}`;
            errorMessages.innerHTML = INVALID_COMMENT_MSG;
            copyRight.innerHTML = `${icon('camera')} ${image.copyright ?? NO_COPYRIGHT}`;
            // ----------------- append elements to the info div -----------------
            appendChildrens(commentsSection, postComment, errorMessages);
            appendChildrens(info, dateElem, copyRight, buttons);
            return info;
        }

        // ================================= COMMENT CLASS ===============================
        /***
         * This class for creating a comment element
         * @type {Comment}
         */
        class Comment {
            // write comment and declare parameters for this class with /***/
            /*** comment class constructor
             * @param commentData: json object that contains the comment data: {text, user{firstName, lastName, id}} - required parameter
             * @param imageId: the id of the image that the comment is related to - required parameter
             * @param id: the id of the comment - optional parameter
             * @param createdAt: the date the comment was created - optional parameter
             * this.user: the user that created the comment
             */
            constructor(commentData, imageId, id, createdAt) {
                this.text = commentData.text;
                this.imageId = imageId;
                this.username = commentData.username ?? null;
                this.id = id ?? null;
                this.isMine = commentData.isOwner ?? false;
                this.createdAt = createdAt ?? EMPTY;
            }

            /***
             * This method for saving the comment to the server and updating the comment variables id and created at
             * that are returned from the server after successful saving
             * @returns {Promise<void>}
             */
            async save() {
                try {
                    const resStatus = await fetch(`${SAVE_COMMENT_URL}/${this.imageId}`, {
                        method: 'POST',
                        headers: HEADER,
                        body: JSON.stringify({text: this.text})
                    })
                    const res = await status(resStatus);
                    const data = await json(res);
                    this.id = data.id;
                    // if owner of comment is the current user - delete permission
                    this.isMine = data.isOwner;
                    this.username = data.username;
                    this.createdAt = data.createdAt;
                    return this.createCommentElement();
                } catch (err) {
                    serverErrorHandler(err);
                }
            }

            /***
             * This method for deleting the comment from the server and the comment element from the DOM
             * @param commentElem: the comment element to delete
             */
            deleteComment(commentElem) {
                if (!this.isMine)
                    throw new Error('You can not delete this comment')
                // delete comment from the server
                fetch(`${DELETE_COMMENT_URL}/${this.id}`, {
                    method: 'DELETE'
                }).then(status)
                    .then(json)
                    .then((success) => {
                        commentElem.remove();
                        // delete the class object(this)
                        delete this;
                    })
                    .catch((error) => {
                        // true for sign that the error is from the delete request
                        serverErrorHandler(error, true);
                    });
            }

            /***
             * This method for creating a comment element
             * @returns {*} - the comment element
             */
            createCommentElement() {
                const comment = createNode('div', 'comment', 'border', 'border-info', 'rounded', 'shadow', 'p-2', 'm-2');
                const commentText = createNode('small', 'comment-text');
                const commentName = createNode('span', 'comment-name', 'text-primary', 'fw-bold', 'me-2', 'label', 'bg-info', 'bg-gradient', 'rounded', 'p-1', 'bg-info');
                commentText.innerHTML = this.text;
                commentName.innerHTML = `@_${this.username}`;
                // if the current user is the owner of the comment - add remove button
                appendChildrens(comment, commentName, commentText);
                if (this.isMine) {
                    const commentDelete = createNode('btn', 'btn-danger', 'btn-sm', 'float-end', 'fas', 'fa-trash-alt', 'comment-delete');
                    commentDelete.addEventListener('click', () => {
                        this.deleteComment(comment);
                    });
                    comment.appendChild(commentDelete);
                }
                return comment;
            }
        }

        // ====================== IMAGES MODULE RETURNS ======================
        return {
            createImgCard: createImgCard
        }
    })();
    /***
     * This module for creating the toast element for showing errors and warnings
     * @param msg<string>: the message to show
     * @param title<string>: the title of the message
     * @param isDoc<boolean>: if true - the message will be shown in the document,(OPTIONAL)
     */
    const getMsgWarning = (msg, title, isDoc = false) => {
        const toast = createNode("div", "toast", "text-white", "bg-dark", "border-info", "show");
        const innerContainer = createNode("div", "d-flex", 'fas', 'fa-lg', 'p-2', 'shadow');
        const toastHeader = createNode("div", "toast-header", "bg-dark", "text-white", "border-info");
        toastHeader.innerHTML = `<i class="fas fa-exclamation-triangle text-danger"><strong class="me-auto">${title}</strong></i>`;
        const toastBody = document.createElement("div", "toast-body", "text-danger", "text-right");
        toastBody.textContent = `${msg}`;
        toast.setAttribute("role", "alert");
        toast.setAttribute("aria-live", "assertive");
        toast.setAttribute("aria-atomic", "true");

        const closeBtn = createNode("button", "btn-close", "btn-close-white", "me-2", "m-auto");
        closeBtn.setAttribute("data-bs-dismiss", "toast");
        closeBtn.setAttribute("aria-label", "Close");

        appendChildrens(innerContainer, toastBody);
        appendChildrens(toast, toastHeader, innerContainer);
        toastHeader.appendChild(closeBtn);
        // add toast to the body at end of page or to the container
        isDoc ? document.body.appendChild(toast) : toastsContainer.appendChild(toast);
        //remove Toast from DOM when clicked
        closeBtn.addEventListener("click", () => {
            toast.remove();
        });
    }


    // ========================= MANAGER MODULE RETURNS ======================
    return {
        searchNasaPhotos: searchNasaPhotos,
        setDateToday: setDateToday,
        querySelect: querySelect,
        clearImages: clearImages,
        checkSession: checkSession,
        getMsgWarning: getMsgWarning,
    }
})();
// ========================== VALIDATION MODULE ==== ==========================
const validationModule = (function () {
    const REGEX_DATE = /^\d{4}-\d{2}-\d{2}$/;
    const [MIN_COMMENT_LEN, MAX_COMMENT_LEN] = [1, 128]

    function validateDate(date) {
        return REGEX_DATE.test(date);
    }

    const validateDates = (start_date, end_date) => (start_date && end_date && start_date <= end_date && validateDate(start_date) && validateDate(end_date));
    const validateComment = (comment) => comment && comment.length <= MAX_COMMENT_LEN && comment.length >= MIN_COMMENT_LEN;
    return {
        validateDates: validateDates,
        validateComment: validateComment
    }
})();
