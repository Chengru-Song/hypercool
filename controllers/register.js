const crypto = require('crypto');
const invoke = require('../fabric_controllers/invoke');
const imghash = require('imghash');
const path = require('path');
const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI('/ip4/127.0.0.1/tcp/5002');

const fs = require('fs');

// 根据用户注册的用户名和邮箱添加用户
exports.addOwner = function (req, res, next) {
    //转化用户名为md5哈希值
    const owner_id = crypto.createHash('md5').update(req.body.owner_password).digest('hex');
    console.log(owner_id, req.body.owner_name, req.body.owner_mail);

    // 进行添加用户
    const params = [owner_id, req.body.owner_name, req.body.owner_mail];
    console.log(params);
    invoke.invoke(params, 'addOwner')
        .then(result => {
            res.send({
                code: result.code,
                message: result.message,
                owner_id: owner_id
            });
        })
        .catch(err => {
            res.send(err);
        })
};

// 用户上传图片
exports.uploadCopyright = async function (req, res, next) {
    // 上传图片并返回图片感知哈希
    const filename = req.file.filename;
    const filepath = path.join(__dirname + '/../upload/' + filename);
    const img_id = await imghash.hash(filepath);
    let owner_id = '';
    // 上传图片至ipfs并获得哈希值
    const content = fs.createReadStream(filepath);
    const imgs = [{
        path: filepath,
        content: content
    }];
    let img_hash = '';
    ipfs.files.add(imgs)
        .then(result => {
            img_hash = result[0].hash;
            console.log(result[0].hash);

            // 将用户信息写入区块链
            owner_id = crypto.createHash('md5').update(req.body.owner_password).digest('hex');
            const params = [owner_id, req.body.owner_name, req.body.owner_mail,img_id,img_hash,req.body.img_title];
            console.log(params);
            return invoke.invoke(params, 'uploadCopyright')
        })
        .then(result => {
            res.send({
                code: result.code,
                message: result.message,
                img_id:img_id,
                img_hash: img_hash
            });
        })
        .catch(err => {
            if(err.code === 202){
                res.send(err);
            }else{
                console.log(err);
            }
        });
};

// 进行转账，实则改变图片拥有者
exports.transferCopyright = function (req, res, next) {
    const params = [req.body.raw_id, req.body.img_id, req.body.new_owner_id];
    console.log(params);
    invoke.invoke(params, 'transferCopyright')
        .then(result => {
            res.send(result);
        })
        .catch(err => {
            res.send(err);
        })
};
