const query = require('../fabric_controllers/query');

exports.queryCopyrightByImgId = function (req, res, next) {
    const params = [req.body.img_id];
    query.query(params, 'queryCopyrightByImgId').then(result => {
        res.send(result)
    }).catch(err => {
        res.send(err);
    })
};

exports.queryCopyrightByOwnerId = function (req, res, next) {
    const params = [req.body.own_id];
    query.query(params, 'queryCopyrightByOwnerID').then(result => {
        console.log(result);
    }).catch(err => {
        console.log(err);
    })
};

exports.queryAllCopyright = function (req, res, next) {
    query.query([], 'queryAllCopyright').then(result => {
        res.send(result);
    }).catch(err => {
        res.send(err);
    })
}