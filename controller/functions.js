const createError = require("http-errors");
const {EXPIRED_SESSION, PARAMETERS_MISSING, INVALID} = require('./constants');
//======================================================================================================================
exports.isUserConnected = (req) => req.session.user;

exports.checkParams = (...params) => {
    if (params.some(param => !param)) {
        throw createError(INVALID, PARAMETERS_MISSING);
    }
}

exports.redirectLogin = (res, req, error = '') => {
    req.session.loginError = error ?? null;
    return res.redirect('/');
}

exports.setUserConnected = (req, user) => {
    req.session.user = user ?? null;
}

exports.redirectHomePage = (res, req, error) => {
    return res.redirect('/home-page');
}
exports.setSessionExpired = (req) => {
    req.session.loginError = EXPIRED_SESSION;
}

