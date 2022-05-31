const {getGuildConfig} = require('../config/guildConfig.js');
const scamConfig = require('../config/scamConfig.js');
const {Client} = require("discord.js");

/**
 * @param {Client} client
 * @param {Guild} guild
 */
module.exports = (client, guild) => {
    console.info(`[👋] Joining server ${guild.name} with id ${guild.id}, checking Dyno's presence...`);
    guild.members.fetch({ user: ['155149108183695360', '168274283414421504'] })
        .then(result => {
            let guildConfig = getGuildConfig(guild.id);
            if (result.size === 0) {
                console.info('[💻] Dyno is not present on the server, not enabling compatibility.');
            } else {
                console.info('[💻] Dyno is present on the server, enabling compatibility.');
                guildConfig.setDynoPresence(true).save();
            }
        })
        .catch(console.error);

    console.info(`[✋] Initializing scam data.`);
    scamConfig.getScamData().createGuildScamData(guild.id);
};