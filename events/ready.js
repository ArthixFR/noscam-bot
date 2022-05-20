const {Client} = require('discord.js');

/**
 * @param {Client} client
 */
module.exports = (client) => {
    console.info(`[💻] Ready to serve in ${client.channels.cache.size} channels on ${client.guilds.cache.size} servers, for a total of ${client.users.cache.size} users.`);
};