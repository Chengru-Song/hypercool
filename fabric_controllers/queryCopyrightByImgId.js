'use strict';

var hfc = require('fabric-client');
var sdkUtils = require('fabric-client/lib/utils');
var fs = require('fs');

var SDKConfig = require("../sdk-config");

var options = SDKConfig.Options;

var channel = {};
var client = new hfc();

console.log("Load peer privateKey and signedCert");
var createUserOpt = {
    username: options.user_id,
    mspid: options.msp_id,
    cryptoContent: {
        privateKey: options.privateKey,
        signedCert: options.signedCert,
        skipPersistence: false,
    }
};
exports.query = function(params, method){
    return new Promise((resolve, reject) => {

    })
}
Promise.resolve().then(() => {

    // create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
    return sdkUtils.newKeyValueStore({
        path: "./fabric-client-stateStore/"
    }).then((store) => {
        client.setStateStore(store);
        return client.createUser(createUserOpt)
    })
}).then((user) => {
    channel = client.newChannel(options.channel_id);

    let data = fs.readFileSync(options.peer_tls_cacerts);
    let peer = client.newPeer(options.peer_url, {
        pem: Buffer.from(data).toString(),
        'ssl-target-name-override': options.pserver_hostname
    });
    // this is just for identification, what ever you want
    peer.setName("temppeer");
    channel.addPeer(peer);
}).then(() => {
    console.log("Make query");
    var transaction_id = client.newTransactionID();
    console.log("Assigning transaction_id: ", transaction_id._transaction_id);
    // build the request ctx
    const request = {
        chaincodeId: options.chaincode_id,
        txId: transaction_id,
        fcn: 'queryCopyrightByImgId',
        args: params
    };
    // send the query proposal to the peer
    return channel.queryByChaincode(request);
}).then((query_responses) => {
    console.log("Query has completed, checking results");
    if (!query_responses.length) {
        console.log("No payloads were returned from query");
    } else {
        console.log("Query result count = ", query_responses.length)
    }
    if (query_responses[0] instanceof Error) {
        console.error("error from query = ", query_responses[0]);
    }
    // const result = JSON.stringify(query_responses[0].toString());
    // console.log('title: ', result.img_title);
    // console.log(query_responses[0]);
    console.log("what response: ", query_responses[0].toString('utf-8'));
    // console.log("Response is ", query_responses[0].toString()); //打印返回的结果
}).catch((err) => {
    console.error("Caught Error", err);
});

