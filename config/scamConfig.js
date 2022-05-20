const path = require('path');
const fs = require('fs');
const {Snowflake} = require('discord.js');

const scamDataLocation = path.resolve('data/api/scamList.json');

let scamData;

class ScamConfig {
    /** @type {{safeList: Array, scamList: Array}} */
    dataFile;

    /**
     * @param scamFile {Object}
     */
    constructor(scamFile) {
        this.dataFile = scamFile;
    }

    /**
     * @param guildId {Snowflake}
     * @return {Array}
     */
    getSafeList(guildId) {
        if (!this.isGuildScamDataExist(guildId)) this.createGuildScamData(guildId);
        return this.dataFile[guildId].safeList || [];
    }

    /**
     * @param guildId {Snowflake}
     * @return {Array}
     */
    getScamList(guildId) {
        if (!this.isGuildScamDataExist(guildId)) this.createGuildScamData(guildId);
        return this.dataFile[guildId].scamList || [];
    }

    /**
     * @param guildId {Snowflake}
     * @param link {string}
     * @return {ScamConfig}
     */
    addToSafeList(guildId, link) {
        if (!this.isGuildScamDataExist(guildId)) this.createGuildScamData(guildId);
        if (this.dataFile[guildId].safeList.indexOf(link) === -1) this.dataFile[guildId].safeList.push(link);
        this.save();
        return this;
    }

    /**
     * @param guildId {Snowflake}
     * @param link {string}
     * @return {ScamConfig}
     */
    addToScamList(guildId, link) {
        if (!this.isGuildScamDataExist(guildId)) this.createGuildScamData(guildId);
        if (this.dataFile[guildId].scamList.indexOf(link) === -1) this.dataFile[guildId].scamList.push(link);
        this.save();
        return this;
    }

    /**
     * @param guildId {Snowflake}
     * @param link {string}
     * @return {ScamConfig}
     */
    removeToSafeList(guildId, link) {
        if (!this.isGuildScamDataExist(guildId)) this.createGuildScamData(guildId);
        let index = this.dataFile[guildId].safeList.indexOf(link);
        if (index !== -1) {
            this.dataFile[guildId].safeList.splice(index, 1);
            this.save();
        }
        return this;
    }

    /**
     * @param guildId {Snowflake}
     * @param link {string}
     * @return {ScamConfig}
     */
    removeToScamList(guildId, link) {
        if (!this.isGuildScamDataExist(guildId)) this.createGuildScamData(guildId);
        let index = this.dataFile[guildId].scamList.indexOf(link);
        if (index !== -1) {
            this.dataFile[guildId].scamList.splice(index, 1);
            this.save();
        }
        return this;
    }

    /**
     * @param guildId {Snowflake}
     * @returns {ScamConfig}
     */
    createGuildScamData(guildId) {
        if (!this.isGuildScamDataExist(guildId)) {
            console.info(`[✋] Scam list for guild ${guildId} does not exist, creating it!`);
            this.dataFile[guildId] = {scamList: [], safeList: []};
            this.save();
        }
        return this;
    }

    /**
     * @param guildId {Snowflake}
     * @param link {string}
     * @return {boolean}
     */
    isInSafeList(guildId, link) {
        if (!this.isGuildScamDataExist(guildId)) this.createGuildScamData(guildId);
        return this.dataFile[guildId].safeList.indexOf(link) !== -1;
    }

    /**
     * @param guildId {Snowflake}
     * @param link {string}
     * @return {boolean}
     */
    isInScamList(guildId, link) {
        if (!this.isGuildScamDataExist(guildId)) this.createGuildScamData(guildId);
        return this.dataFile[guildId].scamList.indexOf(link) !== -1;
    }

    /**
     * @param guildId {Snowflake}
     * @returns {boolean}
     */
    isGuildScamDataExist(guildId) {
        return typeof(this.dataFile[guildId]) !== "undefined";
    }

    save() {
        try {
            fs.writeFileSync(`${scamDataLocation}`, JSON.stringify(this.dataFile, null, 4));
            scamData = this;
            return this.dataFile;
        } catch (e) {
            console.error(`[✋] An error occured while trying to save scam list file!`);
            console.error(e);
        }
    }
}

module.exports = {

    initScamData: function () {
        let scamFile = getScamFile();

        if (scamFile !== null) {
            scamData = new ScamConfig(scamFile);
            console.info(`[✋] Scam list file successfully loaded!`);
            console.line(' ');
        } else {
            fs.appendFile(scamDataLocation, '{}', function (err) {
                if (err) {
                    console.error(`[✋] An error occured while trying to create scam list file!`);
                    console.error(err);
                    return;
                }

                console.info(`[✋] Scam list file successfully created!`);
                scamData = new ScamConfig(scamData);
            });
        }
    },

    /**
     * @return {ScamConfig | undefined}
     */
    getScamData: function() {
        if (scamData === undefined) console.error(`[✋] Scam list file does not exist!`);
        return scamData;
    }
}

function getScamFile() {
    try {
        return JSON.parse(fs.readFileSync(scamDataLocation).toString());
    } catch (e) {
        console.error(`[✋] An error occured while trying to get scam list file!`);
        console.error(e);
        return null;
    }
}