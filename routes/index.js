var express = require('express');
var router = express.Router();
const render = require('../controller/render');

// ---------------------------- MIDDLEWARES ------------------------------------
router.route(['/home-page','logout']).get(render.accessMiddleware);
router.route(['/','/register','/register/password']).get(render.middleware);
// ---------------------------- CHECK CONNECTION  --------------------------------
router.get('/check-connection', render.checkConnection);
// --------------------------------- GET LOGIN -----------------------------------
router.get('/', render.getLogin);
//---------------------------- POST LOGIN  ---------------------------------------
router.post('/', render.postLogin);
// -------------------------------- REGISTER -------------------------------------
router.get('/register', render.getRegister);
// ------------------------------- POST REGISTER----------------------------------
router.post('/register', render.postRegister);
// ---------------------------- REGISTER PASSWORD --------------------------------
router.get('/register/password', render.getRegisterPassword);
//------------------------------ POST REGISTER PASSWORD ---------------------------
router.post('/register/password', render.postRegisterPassword);
//------------------------------ LOGOUT ------------------------------------------
router.get('/logout', render.getLogout);
//----------------------------- HOME PAGE ----------------------------------------
router.get('/home-page', render.getHomePage)


module.exports = router;
