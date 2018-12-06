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
    const params = [req.body.owner_id];
    console.log(params);
    query.query(params, 'queryCopyrightByOwnerID').then(result => {
        res.send(result);
    }).catch(err => {
        res.send(err);
    })
};

exports.queryAllCopyright = function (req, res, next) {
    query.query([], 'queryAllCopyright').then(result => {
        res.send(result);
    }).catch(err => {
        res.send(err);
    })
}