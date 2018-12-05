const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI('/ip4/127.0.0.1/tcp/5002');

const img = '../testimgs/test1.jpg';
const fs = require('fs');
const content = fs.createReadStream(img);
const files = [{
    path: img,
    content: content
}];
ipfs.files.add(files)
.then(result => {
    console.log(result[0].hash);
});