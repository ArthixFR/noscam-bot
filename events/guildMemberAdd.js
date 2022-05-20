const config = require("../config.js");
const guildConfig = require('../config/guildConfig.js');
const {GuildMember, Client} = require("discord.js");

let hasBeenWarned = false;

/**
 * @param {Client} client
 * @param {GuildMember} member
 */
module.exports = (client, member) => {
    if (member.id === '155149108183695360' || member.id === '168274283414421504') {
        guildConfig.getGuildConfig(member.guild.id).setDynoPresence(true).save();
        console.info('[💻] Dyno joined the server, adding compatibility!');
    }

    if (config.isDevEnv) {
        if (!hasBeenWarned) {
            console.warn(`You're in dev mode, guildMemberAdd event is disabled!`);
            hasBeenWarned = true;
        }
        return;
    }
};