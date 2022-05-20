const fs = require('fs');
const path = require('path');
const dateformat = require('dateformat');
const {User, Snowflake} = require('discord.js');
const crashDirectory = path.resolve('logs/crash-reports');

module.exports = {
    /**
     * @param {string} logType
     * @return {string}
     */
    generateFileName: function(logType) {
        return logType + '-' + dateformat(new Date(), "yyyy-mm-dd_HH-MM");
    },

    /**
     * @param {string} logType
     * @param {string} message
     */
    generateLog: function(logType, message) {
        try {
            fs.writeFileSync(`${crashDirectory}/${this.generateFileName(logType)}.log`, message);
        } catch (e) {
            console.error(`An error occured while trying to generate log !`);
            console.line(e);
        }
    },

    /**
     * @param {User} discordUser
     * @param {Snowflake} guildID
     * @param {*} command
     * @param {boolean} isSlash
     * @param {Array} args
     */
    logCommand: function(discordUser, guildID, command, isSlash, args = []) {
        let message = `[${dateformat(new Date(), "dd/mm/yyyy HH:MM:ss")}] ${discordUser.tag} (ID:${discordUser.id}) executed ${isSlash ? "slash" : ""} command '${command.name}' ${args.length === 0 ? 'without argument' : `with arguments : ${args.join(' ')}`}\n`;
        this.log(guildID, 'commands', message);
    },

    /**
     * @param {User} discordUser
     * @param {Snowflake} guildID
     * @param {*} command
     * @param {boolean} isSlash
     * @param {Array} args
     */
    logUnauthorized: function(discordUser, guildID, command, isSlash, args = []) {
        let message = `[${dateformat(new Date(), "dd/mm/yyyy HH:MM:ss")}] ${discordUser.tag} (ID:${discordUser.id}) try to use ${isSlash ? "slash" : ""} command '${command.name}' ${args.length === 0 ? 'without argument' : `with arguments : ${args.join(' ')}`}\n`;
        this.log(guildID, 'unauthorized', message);
    },

    /**
     * @param {Snowflake} guildID
     * @param {string} folder
     * @param {string} message
     */
    log: function(guildID, folder, message) {
        let logFilePath = path.resolve(`logs/${folder}/${guildID}`);
        let logFile = path.resolve(logFilePath + `/command-${dateformat(new Date(), "yyyy-mm-dd")}.log`);

        try {
            if (!fs.existsSync(logFilePath)) { fs.mkdirSync(logFilePath); }

            if (fs.existsSync(logFile)) { // If file exists, write in it
                let file = fs.openSync(logFile, 'a');
                fs.writeSync(file, message);
                fs.closeSync(file);
            } else { // Else, we create the file and write in it
                fs.writeFileSync(logFile, message);
            }
        } catch (e) {
            console.error('Error while logging command !');
            console.line(e);
        }
    }
}