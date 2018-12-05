'use strict';
var hfc = require('fabric-client');
var util = require('util');
var sdkUtils = require('fabric-client/lib/utils');
const fs = require('fs');

// Get configs from sdk-config.json which was downloaded from HuaweiBCS
var SDKConfig = require("../sdk-config");

var options = SDKConfig.Options;

var channel = {};

// init the fabric client
var client = new hfc();
var targets = [];
var tx_id = null;

// init the target peer
let data = fs.readFileSync(options.peer_tls_cacerts);
var peer = client.newPeer(options.peer_url,
    {
        pem: Buffer.from(data).toString(),
        'ssl-target-name-override': options.pserver_hostname
    }
);
let CREATED = false;
exports.invoke = function (params, method) {
    return new Promise((resolve, reject) => {
        console.log("Load peer privateKey and signedCert");
        const createUserOpt = {
            username: options.user_id,
            mspid: options.msp_id,
            cryptoContent: {
                privateKey: options.privateKey,
                signedCert: options.signedCert
            }
        };
        return new Promise((resolve, reject) => {
            if(!CREATED){
                sdkUtils.newKeyValueStore({
                    path: "./fabric-client-stateStore/"
                }).then((store) => {
                    // keep the user's certificate
                    client.setStateStore(store);
                    return client.createUser(createUserOpt);
                }).then(user => {
                    console.log('channel id: ', options.channel_id);
                    channel = client.newChannel(options.channel_id);
                    channel.addPeer(peer);
                    let odata = fs.readFileSync(options.orderer_tls_cacerts);
                    let caroots = Buffer.from(odata).toString();
                    var orderer = client.newOrderer(options.orderer_url, {
                        'pem': caroots,
                        'ssl-target-name-override': options.oserver_hostname
                    });

                    channel.addOrderer(orderer);
                    targets.push(peer);
                    CREATED = true;
                    resolve()
                })
            }else{
                resolve();
            }
        }).then(() => {
            tx_id = client.newTransactionID();
            console.log("Assigning transaction_id: ", tx_id._transaction_id);

            const request = {
                targets: targets,
                chaincodeId: options.chaincode_id,
                fcn: method,
                // args: ['20180002', 'user2', '1234567@qq.com', 'what', '20292820', '不能划水哇'],
                args: params,
                chainId: options.channel_id,
                txId: tx_id
            };
            // send the transaction proposal to the peers
            return channel.sendTransactionProposal(request);
        }).then(results => {
            var promises = [];
            var proposalResponses = results[0];
            var proposal = results[1];
            let isProposalGood = false;
            if (proposalResponses && proposalResponses[0].response &&
                proposalResponses[0].response.status === 200) {
                isProposalGood = true;
                // const proposalPromise = new Promise((resolve => resolve({
                //     code: 201,
                //     message: 'Transaction proposal was good'
                // })));
                // promises.push(proposalPromise);
                resolve({
                    code: 201,
                    message: 'Transaction proposal was good'
                });
                console.log('Transaction proposal was good');
            } else {
                reject({
                    code: 202,
                    message: 'Transaction proposal was bad'
                });
                console.error('Transaction proposal was bad');
            }
            if (isProposalGood) {
                console.log(util.format(
                    'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
                    proposalResponses[0].response.status, proposalResponses[0].response.message));

                // build up the request for the orderer to have the transaction committed
                var request = {
                    proposalResponses: proposalResponses,
                    proposal: proposal
                };

                // set the transaction listener and set a timeout of 30 sec
                // if the transaction did not get committed within the timeout period,
                // report a TIMEOUT status
                var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing


                var sendPromise = channel.sendTransaction(request);
                promises.push(sendPromise); //we want the send transaction first, so that we know where to check status

                // get an eventhub once the fabric client has a user assigned. The user
                // is required bacause the event registration must be signed
                let event_hub = channel.newChannelEventHub(peer);

                // using resolve the promise so that result status may be processed
                // under the then clause rather than having the catch clause process
                // the status
                let txPromise = new Promise((resolve, reject) => {
                    let handle = setTimeout(() => {
                        event_hub.unregisterTxEvent(transaction_id_string);
                        event_hub.disconnect();
                        resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
                    }, 30000);
                    event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
                            // this is the callback for transaction event status
                            // first some clean up of event listener
                            clearTimeout(handle);

                            // now let the application know what happened
                            var return_status = {event_status : code, tx_id : transaction_id_string};
                            if (code !== 'VALID') {
                                console.error('The transaction was invalid, code = ' + code);
                                resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
                            } else {
                                console.log('The transaction has been committed on peer ' + event_hub.getPeerAddr());
                                resolve(return_status);
                            }
                        }, (err) => {
                            //this is the callback if something goes wrong with the event registration or processing
                            reject(new Error('There was a problem with the eventhub ::'+err));
                        },
                        {disconnect: true} //disconnect when complete
                    );
                    event_hub.connect();

                });
                promises.push(txPromise);

                return Promise.all(promises);
            } else {
                reject({
                    code: 202,
                    message: 'Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...'
                });
                console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
                // throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
            }
        })
    })
};