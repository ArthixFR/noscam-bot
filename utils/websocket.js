const WebSocket = require('ws');
const {getPhishingData} = require('../config/phishingConfig.js');

let ws = undefined;

module.exports = {

    /**
     * @returns {Promise<WebSocket | Error>}
     */
    initConnection: function() {
        console.info('[📮] Connecting to SinkingYachts Phishing Websocket API...');
        return new Promise((resolve, reject) => {
            ws = new WebSocket('wss://phish.sinking.yachts/feed', {headers: {'X-Identity': 'NoScam Discord bot'}});

            ws.on('open', () => {
                console.info('[📮] Connected to SinkingYachts Phishing Websocket API!');
                resolve(ws);
            });

            ws.on('close', (code, reason) => {
                console.info(`[📮] Disconnected from SinkingYachts Phishing Websocket API with code ${code} with reason:`);
                console.info(reason.toString());
            });

            ws.on('error', (err) => {
                reject(err);
            });

            ws.on('message', (data) => {
                try {
                    let message = JSON.parse(data.toString());
                    let phishingData = getPhishingData();
                    if (message.type === 'add') {
                        console.info(`[📮] New domains to add received! ${message.domains.join(',')}`);
                        phishingData.addToDatabase(message.domains);
                    } else if (message.type === 'delete') {
                        console.info(`[📮] New domains to remove received! ${message.domains.join(',')}`);
                        phishingData.removeToDatabase(message.domains);
                    }
                } catch (e) {
                    console.error('[📮] An error occured while trying to parse data!');
                    console.line(e);
                }
            });
        });
    }
}