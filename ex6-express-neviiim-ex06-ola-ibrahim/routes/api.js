var express = require('express');
var router = express.Router();

const controller = require('../controller/apiRender');

router.use(controller.checkSession);
// ------------------ SAVE COMMENT --------------------//
router.post('/comments/save/:imageId', controller.postComment);
// ------------------ GET COMMENTS --------------------//
router.get('/comments/:imageId', controller.getComments);
// ------------------ DELETE COMMENT  --------------------//
router.delete('/comments/delete/:commentId', controller.deleteComment);
// ------------------ CHECK UPDATES -----------------------//
router.get('/updates/:imageId', controller.getUpdates);


module.exports = router;
