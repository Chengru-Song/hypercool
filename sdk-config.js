var fs = require('fs');
var path = require("path");
// 请在此配置sdk文件的路径和用户名
var sdkfile = "C:\\Users\\Administrator\\Downloads\\bupt\\hypercool\\sdk-config\\HyperCool-sdk-config.json";
var tmp_user_id = "Admin";

// 解析sdk-config-yaml文件获取配置信息
var sdkconfig = JSON.parse(fs.readFileSync(sdkfile));

var tmp_orgid = sdkconfig.client.organization;

var tmp_channel_id = ( () => {
    for (var item in sdkconfig.channels) {
        return item;
    }
})();

var tmp_chaincode_id = sdkconfig.channels[tmp_channel_id].chaincodes[0];
tmp_chaincode_id = tmp_chaincode_id.substring(0, tmp_chaincode_id.indexOf(':'));

var tmp_peer_url = sdkconfig.peers[(() => {
    for (var peer in sdkconfig.peers) {
        return peer;
    }
})()].url;

var tmp_event_url = sdkconfig.peers[(() => {
    for (var peer in sdkconfig.peers) {
        return peer;
    }
})()].eventUrl;

var tmp_orderer_url = sdkconfig.orderers[(() => {
    for (var order in sdkconfig.orderers) {
        return order;
    }
})()].url;

var tmp_peer_tls_cacerts = sdkconfig.peers[(() => {
    for (var peer in sdkconfig.peers) {
        return peer;
    }
})()].tlsCACerts.path;

var tmp_orderers_tls_cacerts = sdkconfig.orderers[(() => {
    for (var orderer in sdkconfig.orderers) {
        return orderer;
    }
})()].tlsCACerts.path;

var tmp_peerhost_name = sdkconfig.peers[(() => {
    for (var peer in sdkconfig.peers) {
        return peer;
    }
})()].grpcOptions['ssl-target-name-override'];

var tmp_ordererhost_name = sdkconfig.orderers[(() => {
    for (var orderer in sdkconfig.orderers) {
        return orderer;
    }
})()].grpcOptions['ssl-target-name-override'];

var tmp_msp_id = sdkconfig.organizations[tmp_orgid].mspid;

const getKeyFilesInDir = (dir) => {
    //该函数用于找到keystore目录下的私钥文件的路径
    var files = fs.readdirSync(dir);
    var keyFiles = [];
    files.forEach((file_name) =>{
        let filePath = path.join(dir, file_name);
        keyFiles.push(filePath);
    });
    return keyFiles;
};

var tmp_privateKey = getKeyFilesInDir(path.join(sdkconfig.organizations[tmp_orgid].cryptoPath, "/keystore"))[0];

var tmp_signedCert = getKeyFilesInDir(path.join(sdkconfig.organizations[tmp_orgid].cryptoPath, "/signcerts"))[0];

var Options = {
    user_id: tmp_user_id,
    msp_id: tmp_msp_id,
    channel_id: tmp_channel_id,
    chaincode_id: tmp_chaincode_id,
    peer_url: tmp_peer_url,
    event_url: tmp_event_url,
    orderer_url: tmp_orderer_url,
    peer_tls_cacerts: tmp_peer_tls_cacerts,
    orderer_tls_cacerts: tmp_orderers_tls_cacerts,
    pserver_hostname: tmp_peerhost_name,
    oserver_hostname: tmp_ordererhost_name,
    privateKey: tmp_privateKey,
    signedCert: tmp_signedCert,
};

exports.Options=Options;