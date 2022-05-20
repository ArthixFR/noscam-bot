const {Collection, Snowflake} = require("discord.js");
const fs = require("fs");
const path = require('path');

const guildConfigDirectory = path.resolve('data/guilds');
const defaultConfig = {
    lang: 'en',
    dynoPresent: false,
    scamLogsChannelId: '0'
}

let guildConfigs = new Collection();

class GuildConfig {
    /** @type {Object} */
    configFile;
    /** @type {Snowflake} */
    guildId;

    /**
     * @param {Snowflake} guildId
     */
    constructor(guildId) {
        this.guildId = guildId;
        this.configFile = getGuildFile(guildId);
    }

    /**
     * @return {string}
     */
    getLang() {
        return this.configFile['lang'];
    }

    /**
     * @param {string} lang
     * @return {GuildConfig}
     */
    setLang(lang) {
        this.configFile['lang'] = lang;
        return this;
    }

    /**
     * @param {string|*} key
     * @param {*} value
     * @return {GuildConfig}
     */
    setData(key, value) {
        this.configFile[key] = value;
        return this;
    }

    /**
     * @param {string|*} key
     * @return {GuildConfig}
     */
    removeData(key) {
        delete this.configFile[key];
        return this;
    }

    /**
     * @param {string|*} key
     * @return {*}
     */
    getData(key) {
        return this.configFile[key];
    }

    /**
     * @return {Snowflake} channelid
     */
    getScamLogsChannel() {
        return this.configFile['scamLogsChannelId'];
    }

    /**
     * @param {Snowflake} channelId
     */
    setScamLogsChannel(channelId) {
        this.configFile['scamLogsChannelId'] = channelId;
        return this;
    }

    /**
     * @returns {boolean}
     */
    isDynoPresent() {
        return this.configFile['dynoPresent'];
    }

    /**
     * @param {boolean} isPresent
     * @returns {GuildConfig}
     */
    setDynoPresence(isPresent) {
        this.configFile['dynoPresent'] = isPresent;
        return this;
    }

    /**
     * @return {Object}
     */
    getConfigFile() {
        return this.configFile;
    }

    /**
     * @return {Object|null}
     */
    save() {
        try {
            fs.writeFileSync(`${guildConfigDirectory}/${this.guildId}.json`, JSON.stringify(this.configFile, null, 4));
            guildConfigs.set(this.guildId, this);
            return this.configFile;
        } catch (e) {
            console.error(`[📝] An error occured while trying to save guild config ${this.guildId}.json !`);
            console.error(e);
        }
    }
}

module.exports = {
    initGuildConfig: function() {
        if (!fs.existsSync(guildConfigDirectory)) fs.mkdirSync(guildConfigDirectory);

        let configLoadedNumber = 0;
        const configFiles = fs.readdirSync(guildConfigDirectory).filter(file => file.endsWith('.json'));
        for (const configFile of configFiles) {
            const guildId = configFile.split('.')[0];
            try {
                //const guildConfig = JSON.parse(fs.readFileSync(`${guildConfigDirectory}/${configFile}`));
                guildConfigs.set(guildId, new GuildConfig(guildId));
                configLoadedNumber++;
            } catch (e) {
                console.error(`[📝] Error when loading guildConfig ${guildId} !`);
                console.error(e);
            }
        }
        console.info(`[📝] ${configLoadedNumber} guild server configurations have been successfully loaded !`);
        console.line(' ');
    },

    /**
     * @param {Snowflake} guildId
     * @return {GuildConfig}
     */
    getGuildConfig: function(guildId) {
        if (guildConfigs.has(guildId)) {
            return guildConfigs.get(guildId);
        } else {
            console.warn(`[📝] Guild ${guildId} attempt to access to a guild config but no one exists, creating it !`);
            return this.createGuildConfig(guildId);
        }
    },

    /**
     * @param {Snowflake} guildId
     * @return {GuildConfig}
     */
    createGuildConfig: function(guildId) {
        if (!isGuildSaveExist(guildId)) {
            fs.writeFileSync(`${guildConfigDirectory}/${guildId}.json`, JSON.stringify(defaultConfig, null, 4));
            if (!guildConfigs.has(guildId)) guildConfigs.set(guildId, new GuildConfig(guildId));
        } else {
            console.warn(`Guild config ${guildId}.json already exist !`);
        }
        return this.getGuildConfig(guildId);
    },

    /**
     * @param {Snowflake} guildId
     */
    removeGuildConfig: function(guildId) {
        if (isGuildSaveExist(guildId)) {
            fs.unlinkSync(`${guildConfigDirectory}/${guildId}.json`);
            guildConfigs.delete(guildId);
        } else {
            console.error(`An error occured while trying to delete guild config ${guildId}.json : Not found !`);
        }
    }
}


/**
 * @param {Snowflake} guildId
 * @return {null|Object}
 */
function getGuildFile(guildId) {
    if (isGuildSaveExist(guildId)) {
        try {
            return JSON.parse(fs.readFileSync(`${guildConfigDirectory}/${guildId}.json`));
        } catch (e) {
            console.error(`An error occured while trying to get guild config ${guildId}.json !`);
            console.error(e);
            return null;
        }
    }
}

/**
 * @param {Snowflake} guildId
 * @return {boolean}
 */
function isGuildSaveExist(guildId) {
    return fs.existsSync(`${guildConfigDirectory}/${guildId}.json`);
}