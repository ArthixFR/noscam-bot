const path = require('path');
const fs = require('fs');

const phishingDataLocation = path.resolve('data/api/phishingDb.json');

let phishingData;

class PhishingConfig {
    /** @type {{lastUpdated: Number, phishingList: Array}} */
    dataFile;

    /**
     * @param phishingFile {Object}
     */
    constructor(phishingFile) {
        this.dataFile = phishingFile;
    }

    /**
     * @returns {Number}
     */
    getLastUpdate() {
        return this.dataFile['lastUpdated'];
    }

    /**
     * @param {Number} timestamp
     * @returns {PhishingConfig}
     */
    setLastUpdate(timestamp) {
        this.dataFile['lastUpdated'] = timestamp;
        this.save();
        return this;
    }

    /**
     * @returns {Array}
     */
    getDatabase() {
        return this.dataFile['phishingList'];
    }

    /**
     * @param {Array} links
     * @returns {PhishingConfig}
     */
    setDatabase(links) {
        this.dataFile['phishingList'] = links;
        this.setLastUpdate(Date.now());
        this.save();
        return this;
    }

    /**
     * @param {string} link
     * @returns {boolean}
     */
    isInDatabase(link) {
        return this.getDatabase().find(website => link.includes(website)) !== undefined;
    }

    /**
     * @param {Array} links
     * @returns {PhishingConfig}
     */
    addToDatabase(links) {
        links.forEach(link => {
            if (!this.isInDatabase(link)) {
                this.dataFile['phishingList'].push(link);
                this.setLastUpdate(Date.now());
            }
        });

        this.save();
        return this;
    }

    /**
     *
     * @param {Array} links
     * @returns {PhishingConfig}
     */
    removeToDatabase(links) {
        links.forEach(link => {
            if (this.isInDatabase(link)){
                this.dataFile['phishingList'].splice(this.getDatabase().indexOf(link), 1);
                this.setLastUpdate(Date.now());
            }
        });

        this.save();
        return this;
    }

    save() {
        try {
            fs.writeFileSync(`${phishingDataLocation}`, JSON.stringify(this.dataFile, null, 4));
            phishingData = this;
            return this.dataFile;
        } catch (e) {
            console.error(`[✋] An error occured while trying to save phishing database file!`);
            console.error(e);
        }
    }
}

module.exports = {

    initPhishingData: function () {
        let scamFile = getPhishingFile();

        if (scamFile !== null) {
            phishingData = new PhishingConfig(scamFile);
            console.info(`[✋] Phishing database file successfully loaded!`);
            console.line(' ');
        } else {
            fs.appendFile(phishingDataLocation, JSON.stringify({lastUpdated: 0, phishingList: []}, null, 4), function (err) {
                if (err) {
                    console.error(`[✋] An error occured while trying to create phishing database file!`);
                    console.error(err);
                    return;
                }

                console.info(`[✋] Phishing database file successfully created!`);
                phishingData = new PhishingConfig(phishingData);
            });
        }
    },

    /**
     * @return {PhishingConfig | undefined}
     */
    getPhishingData: function() {
        if (phishingData === undefined) console.error(`[✋] Phishing database file does not exist!`);
        return phishingData;
    }
}

function getPhishingFile() {
    try {
        return JSON.parse(fs.readFileSync(phishingDataLocation).toString());
    } catch (e) {
        console.error(`[✋] An error occured while trying to get phishing database file!`);
        console.error(e);
        return null;
    }
}