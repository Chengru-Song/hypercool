var express = require('express');
var router = express.Router();
const register = require('../controllers/register');
const query = require('../controllers/query');

let multer = require('multer');
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "upload")
    },
    filename: function (req, file, cb) {
      const filename = file.fieldname + '_' + Date.now() + '_' + file.originalname;
      cb(null, filename);
    }
});
var uploadImage = multer({storage: storage});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/addOwner',  register.addOwner);
router.post('/uploadCopyright',  uploadImage.single('upload'),register.uploadCopyright);
router.post('/queryCopyrightByImgId', query.queryCopyrightByImgId);
router.post('/queryCopyrightByOwnerId', query.queryCopyrightByOwnerId);
router.post('/queryAllCopyright', query.queryAllCopyright);
module.exports = router;
