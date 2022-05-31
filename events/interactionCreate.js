const config = require('../config.js');
const language = require('../utils/lang.js');
const utils = require('../utils/utils.js');
const scamConfig = require('../config/scamConfig.js');
const {Interaction, Client, MessageActionRow, Collection} = require("discord.js");
const logger = require("../utils/logger.js");

const cooldowns = new Collection();
const cooldownsMessage = new Collection();

/**
 * @param {Client} client
 * @param {Interaction} interaction
 * @return {Promise<void>}
 */
module.exports = async (client, interaction) => {
    utils.initBeginTimestamp();

    if (!interaction.isCommand()) return;

    if (interaction.user.bot) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    const user = interaction.user;

    // If the 'isDMAllowed' parameter is true and the message sent is not in a guild, the command is not executed.
    if (!command.isDMAllowed && interaction.guildId === null) {return}

    const guildMember = interaction.member;

    // Getting guild language
    const lang = interaction.guildId === null ? language.getLang('en') : language.getGuildLang(guildMember.guild.id);

    // If the 'botOwnersOnly' parameter of the command is set to true, check if the user is in the list of 'botOwners' in the config file. If not the command is not executed and logged.
    if (command.botOwnersOnly) {
        if (config.botOwners.indexOf(user.id) === -1) {
            console.debug(user.username + ' is not a bot owner !');
            logger.logUnauthorized(user.username + "#" + user.discriminator, interaction.guildId, command, true);
            return interaction.reply({ content: lang.getTranslate({}, 'GLOBAL', 'ERROR', 'USER_NO_PERMISSION'), ephemeral: true });
        }
    }

    // Checks if the user has the permission(s) as defined in the 'permissions' parameter.
    if (!utils.hasPermission(command, guildMember, true)) {
        return interaction.reply({ content: lang.getTranslate({}, 'GLOBAL', 'ERROR', 'USER_NO_PERMISSION'), ephemeral: true });
    }

    // Checks if the user has no waiting time with the command
    let userId = user.id;
    if (command.cooldown !== undefined && command.cooldown !== 0 && config.botOwners.indexOf(user.id) === -1) {
        console.debug('Actual time : ' + Date.now());
        console.debug(cooldowns.get(userId));
        if (!cooldowns.has(userId)) {
            cooldowns.set(userId, {[command.name]: Date.now()});
        } else {
            let commandCooldowns = cooldowns.get(userId);
            let commandCooldown = commandCooldowns[command.name];
            if (commandCooldown !== undefined) {
                if ((commandCooldown + (command.cooldown * 1000)) >= Date.now()) {
                    // Cannot execute command
                    if (!cooldownsMessage.has(userId)) {
                        cooldownsMessage.set(userId, {[command.name]: Date.now()});
                        const remaining = humanizeDuration((commandCooldown + (command.cooldown * 1000)) - Date.now(), { language: lang.getLanguage(), round: true });
                        utils.sendErrorEmbedInteraction(client, lang.getTranslate({remaining: remaining}, 'GLOBAL', 'ERROR', 'COOLDOWN'), interaction, false);
                        return interaction.reply({ content: lang.getTranslate({remaining: remaining}, 'GLOBAL', 'ERROR', 'COOLDOWN'), ephemeral: true });
                    } else {
                        let commandMessageCooldown = cooldownsMessage.get(userId)[command.name];
                        if (commandMessageCooldown !== undefined) {
                            const remaining = humanizeDuration((commandCooldown + (command.cooldown * 1000)) - Date.now(), { language: lang.getLanguage(), round: true });
                            if ((commandMessageCooldown + 8000) <= Date.now()) {
                                cooldownsMessage.set(userId, {[command.name]: Date.now()});
                                utils.sendErrorEmbedInteraction(client, lang.getTranslate({remaining: remaining}, 'GLOBAL', 'ERROR', 'COOLDOWN'), interaction, false);
                                return interaction.reply({ content: lang.getTranslate({remaining: remaining}, 'GLOBAL', 'ERROR', 'COOLDOWN'), ephemeral: true });
                            } else {
                                return interaction.reply({ content: lang.getTranslate({remaining: remaining}, 'GLOBAL', 'ERROR', 'COOLDOWN'), ephemeral: true });
                            }
                        } else {
                            cooldownsMessage.set(userId, {[command.name]: Date.now()});
                            const remaining = humanizeDuration((commandCooldown + (command.cooldown * 1000)) - Date.now(), { language: lang.getLanguage(), round: true });
                            utils.sendErrorEmbedInteraction(client, lang.getTranslate({remaining: remaining}, 'GLOBAL', 'ERROR', 'COOLDOWN'), interaction, false);
                            return interaction.reply({ content: lang.getTranslate({remaining: remaining}, 'GLOBAL', 'ERROR', 'COOLDOWN'), ephemeral: true });
                        }
                    }
                } else {
                    // Can execute command, so we save the time
                    commandCooldowns[command.name] = Date.now();
                    cooldowns.set(userId, commandCooldowns);
                }
            } else {
                commandCooldowns[command.name] = Date.now();
                cooldowns.set(userId, commandCooldowns);
            }
        }
    }

    if (command.noDefer) {
        executeCommand(command, interaction, client, lang, user);
    } else {
        interaction.deferReply({ephemeral: true}).then(reply => {
            executeCommand(command, interaction, client, lang, user);
        });
    }
}

function executeCommand(command, interaction, client, lang, user) {
    logger.logCommand(user.username + "#" + user.discriminator, interaction.guildId, command, true);
    try {
        command.executeSlash(interaction, client, client.config.prefix, lang);
    } catch (error) {
        utils.sendErrorEmbedInteraction(client, lang.getTranslate({}, "GLOBAL", "ERROR", "UNKNOWN"), interaction, true);
        utils.sendErrorConsole(command.name, interaction, error);
    }
}

