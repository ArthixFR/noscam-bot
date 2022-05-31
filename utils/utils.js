const {Interaction, Permissions, MessageEmbed, Constants, Client, MessageAttachment, Message, GuildCacheMessage, CacheType, GuildMember, CommandInteraction} = require("discord.js");
const fs = require("fs");
const path = require('path');
const humanizeDuration = require('humanize-duration');
const config = require('../config.js');
const crypto = require('crypto');
const {REST} = require('@discordjs/rest');
const {Routes} = require('discord-api-types/v10');
const {SlashCommandBuilder} = require('@discordjs/builders');
const _ = require('lodash');
const {getPhishingData} = require('../config/phishingConfig.js');
const axios = require('axios').default;

let beginTimestamp = 0;

module.exports = {
    initBeginTimestamp: function() {
        beginTimestamp = new Date().getTime();
    },

    /**
     * @return {number}
     */
    getBeginTimestamp: function() {
        return beginTimestamp;
    },

    /**
     * @param {Client} client
     * @param {MessageEmbed} actualEmbed
     * @param {CommandInteraction} interaction
     * @param {boolean} isDefer
     * @param {boolean?} DMUser
     * @param {MessageAttachment?} attachments
     * @param {number} generatedTime
     * @param {string} footerAddition
     * @return {Promise<GuildCacheMessage<CacheType>>|*}
     */
    sendEmbedInteraction: function(client, actualEmbed, interaction, isDefer, DMUser = undefined, attachments = undefined, generatedTime = undefined, footerAddition = '') {
        let interactData = this.getEmbed(client, actualEmbed, interaction, DMUser, undefined, attachments, generatedTime, footerAddition);
        return isDefer ? interaction.editReply(interactData) : interaction.reply(interactData);
    },

    /**
     * @param {Client} client
     * @param {MessageEmbed} actualEmbed
     * @param {Message} discordMessage
     * @param {boolean?} DMUser
     * @param {Message} responseMessage
     * @param {MessageAttachment?} attachments
     * @param {number} generatedTime
     * @param {string} footerAddition
     * @return {*|Promise<Message>}
     */
    sendEmbedMessage: function(client, actualEmbed, discordMessage, DMUser = undefined, responseMessage = undefined, attachments = undefined, generatedTime = undefined, footerAddition = '') {
        let messageData = this.getEmbed(client, actualEmbed, discordMessage, DMUser, responseMessage, attachments, generatedTime, footerAddition);
        return responseMessage !== undefined ? responseMessage.edit(messageData) : (DMUser ? discordMessage.author.send(messageData) : discordMessage.channel.send(messageData));
    },

    /**
     * @param {Client} client
     * @param {MessageEmbed} actualEmbed
     * @param {Message & CommandInteraction} messageOrInteraction
     * @param {boolean?} DMUser
     * @param {Message} responseMessage
     * @param {MessageAttachment?} attachments
     * @param {number} generatedTime
     * @param {string} footerAddition
     * @return {Promise<unknown>|{files: undefined, embeds: *[]}|{files: undefined, embeds: *[], content: null}}
     */
    getEmbed: function(client, actualEmbed, messageOrInteraction, DMUser = undefined, responseMessage = undefined, attachments = undefined, generatedTime = undefined, footerAddition = '') {
        let time, lang;

        let isGuildMessage = !(messageOrInteraction instanceof Interaction);

        if (!DMUser && isGuildMessage) {
            if (!this.hasBotPermission(messageOrInteraction.guild.me, Permissions.FLAGS.SEND_MESSAGES)) {
                return new Promise((resolve, reject) => reject('MISSING_PERMISSIONS'));
            }
        }

        if (generatedTime !== undefined && isGuildMessage) {
            lang = require('./lang.js').getGuildLang(messageOrInteraction.guildId);
            time = humanizeDuration(generatedTime, {
                language: lang.getLanguage(),
                round: true,
                units: ['s', 'ms']
            });
        }

        if (actualEmbed.color === undefined) actualEmbed.setColor(this.COLORS.default);

        actualEmbed.setFooter({text: `${client.user.username} bot${generatedTime !== undefined && isGuildMessage ? ` • ${lang.getTranslate({time: time}, "GLOBAL", "GENERATED_IN")}` : ``}${footerAddition !== '' ? ` • ${footerAddition}` : ''}`, iconURL: client.user.avatarURL({ dynamic: true })});
        actualEmbed.setTimestamp(Date.now());

        if (responseMessage !== undefined) {
            return { content: null, embeds: [actualEmbed], files: attachments };
        } else {
            return {embeds: [actualEmbed], files: attachments};
        }
    },

    /**
     * @param {Client} client
     * @param {String} errorMessage
     * @param {Message} discordMessage
     * @param {boolean} isDM
     * @param {Message?} responseMessage
     */
    sendErrorEmbedMessage: function(client, errorMessage, discordMessage, isDM = false, responseMessage = undefined) {
        let messageData = this.getErrorEmbed(client, errorMessage, discordMessage, isDM, responseMessage);
        responseMessage !== undefined ? responseMessage.edit(messageData) : (isDM ? discordMessage.author.send(messageData) : discordMessage.channel.send(messageData));
    },

    /**
     * @param {Client} client
     * @param {string} errorMessage
     * @param {CommandInteraction} interaction
     * @param {boolean} isDefer
     */
    sendErrorEmbedInteraction: function(client, errorMessage, interaction, isDefer) {
        let interactData = this.getErrorEmbed(client, errorMessage, interaction, false, undefined);
        isDefer ? interaction.editReply(interactData) : interaction.reply(interactData);
    },

    /**
     * @param {Client} client
     * @param {string} successMessage
     * @param {CommandInteraction} interaction
     * @param {boolean} isDefer
     */
    sendSuccessEmbedInteraction: function(client, successMessage, interaction, isDefer) {
        let interactData = this.getErrorEmbed(client, successMessage, interaction, false, undefined);
        const embed = interactData.embeds[0]
            .setColor(this.COLORS.success)
            .setDescription(`:white_check_mark: ${successMessage}`)
        interactData.embeds[0] = embed;
        isDefer ? interaction.editReply(interactData) : interaction.reply(interactData);
    },

    /**
     * @param {Client} client
     * @param {string} errorMessage
     * @param {Message & CommandInteraction} messageOrInteraction
     * @param {boolean} isDM
     * @param {Message?} responseMessage
     * @return {{embeds: *[]}|Promise<unknown>|{embeds: *[], content: null}}
     */
    getErrorEmbed: function(client, errorMessage, messageOrInteraction, isDM = false, responseMessage = undefined) {
        let lang;
        let message = errorMessage;

        let isGuildMessage = !(messageOrInteraction instanceof Interaction);

        if (!isDM && isGuildMessage) {
            if (!this.hasBotPermission(messageOrInteraction.guild.me, Permissions.FLAGS.SEND_MESSAGES)) {
                return new Promise((resolve, reject) => reject('MISSING_PERMISSIONS'));
            }
        }


        if (!isDM) {
            lang = require('./lang.js').getGuildLang(isGuildMessage ? messageOrInteraction.guild.id : messageOrInteraction.guildId);
            message = `${lang.getTranslate({}, 'GLOBAL', 'ERROR_TITLE')}\n\n${errorMessage}`;
        }

        const embed = new MessageEmbed()
            .setColor(this.COLORS.error)
            .setDescription(`:x: ${message}`)
            .setFooter({text: `${client.user.username} bot`, iconURL: client.user.avatarURL({ dynamic: true })})
            .setTimestamp();

        if (responseMessage !== undefined) {
            return { content: null, embeds: [embed] };
        } else {
            return {embeds: [embed]};
        }
    },

    /**
     * @param {Client} client
     * @param {string} message
     * @param {Message} discordMessage
     * @param {boolean?} isDM
     * @param {Message?} responseMessage
     * @return {*|Promise<Message>|Promise<unknown>}
     */
    sendMessage: function(client, message, discordMessage, isDM = false, responseMessage = undefined) {
        if (!isDM) {
            if (!this.hasBotPermission(discordMessage.guild.me, Permissions.FLAGS.SEND_MESSAGES)) {
                return new Promise((resolve, reject) => reject('MISSING_PERMISSIONS'));
            }
        }
        return responseMessage !== undefined ? responseMessage.edit({content: message}) : (isDM ? discordMessage.author.send({content: message}) : discordMessage.channel.send({content: message}));
    },

    /**
     * @param {GuildMember} guildBot
     * @param {Permissions} permissions
     * @return {*}
     */
    hasBotPermission: function(guildBot, permissions) {
        return guildBot.permissions.has(permissions, true);
    },

    /**
     * @param {string} commandName
     * @param {Message & CommandInteraction} discordMessageOrInteraction
     * @param {string} error
     */
    sendErrorConsole: function(commandName, discordMessageOrInteraction, error) {
        console.line(discordMessageOrInteraction);
        let username = discordMessageOrInteraction instanceof Interaction ? `${discordMessageOrInteraction.user.username}#${discordMessageOrInteraction.user.discriminator}` : `${discordMessageOrInteraction.author.username}#${discordMessageOrInteraction.author.discriminator}`;
        let user_id = discordMessageOrInteraction instanceof Interaction ? discordMessageOrInteraction.user.id : discordMessageOrInteraction.author.id;
        let command = discordMessageOrInteraction instanceof Interaction ? `Complete interaction: id=${discordMessageOrInteraction.customId},values=${discordMessageOrInteraction.options.toString()}` : `Complete command: ${discordMessageOrInteraction.content}`;

        console.error('===============================================');
        console.error(`Error while executing ${discordMessageOrInteraction instanceof Interaction ? 'interaction' : 'command'} ${commandName}!`);
        console.error(`Performed by: ${username} (id:${user_id})`);
        console.error(command);
        console.error("Complete error:");
        console.line(error);
        console.error('===============================================');
    },

    /**
     * @param {Client} client
     * @param {string | Buffer | URL} dir
     */
    cycleDir: function(client, dir) {
        fs.readdirSync(dir).forEach(file => {
            let fullPath = path.join(dir, file);
            if (fs.lstatSync(fullPath).isDirectory()) {
                this.cycleDir(client, fullPath);
            } else {
                this.importFile(client, fullPath);
            }
        });
    },

    /**
     * @param {Client} client
     * @param {string | Buffer | URL} filePath
     * @param {boolean} isReload
     */
    importFile: function(client, filePath, isReload = false) {
        try {
            const command = require(`../${filePath}`);
            if (client.commands.has(command.name)) console.warn(`[🕹 ] Command ${command.name} has already been registered ! Register multiples files with the same command name will ignore all others previously registered commands !`);
            command.path = `${filePath}`;
            const slicePath = filePath.match(/(commands)[\/\\](.*)[\/\\](.*).js/);
            command.group = slicePath !== null ? slicePath[2] : '';
            client.commands.set(command.name, command);
            console.info(`[🕹 ] Command ${command.name} in ../${filePath} has been successfully ${isReload ? 're' : ''}loaded !`);
        } catch (e) {
            console.error(`[🕹 ] Error when ${isReload ? 're' : ''}loading ${filePath} !`);
            console.line(e);
        }
    },

    /**
     * @param {Client} client
     * @return {Promise<void>}
     */
    async registerSlashCommands(client) {
        const slashCommands = [];

        client.commands.forEach((command) => {
            if (!command.botOwnersOnly && !(command.description === '' || command.description === undefined)) {
                let slashData = new SlashCommandBuilder()
                    .setName(command.name)
                    .setDescription(command.description);
                if (command.data !== undefined && command.data instanceof SlashCommandBuilder) slashCommands.push(command.data.toJSON())
                else slashCommands.push(slashData.toJSON());
            }
        });

        const rest = new REST({version: '10'}).setToken(config.token);

        try {
            console.info("[🕹 ] Refreshing application slash commands.");

            await rest.get(Routes.applicationCommands(client.user.id), {}).then(async registeredSlashCommands => {
                let slashCommandsToRefresh = [];
                let slashCommandsToDelete = [];

                let commandToEdit = 0
                let commandToAdd = 0;

                registeredSlashCommands.forEach(registeredSlashCommand => {
                    slashCommands.forEach(slashCommand => {
                        if (registeredSlashCommand.name === slashCommand.name) {
                            if (registeredSlashCommand.options === undefined) registeredSlashCommand.options = [];
                            if (slashCommand.options === undefined) slashCommand.options = [];

                            let registerSlashCommandsJson = JSON.stringify(registeredSlashCommand.options).replaceAll(",\"options\":[]", "").replaceAll(",\"required\":false", "");
                            let slashCommandsJson = JSON.stringify(slashCommand.options).replaceAll(",\"options\":[]", "").replaceAll(",\"required\":false", "")

                            if (registeredSlashCommand.description === slashCommand.description && _.isEqual(JSON.parse(registerSlashCommandsJson), JSON.parse(slashCommandsJson))) {
                                console.info('[🕹 ] Skip updating command ' + slashCommand.name + ".");
                            } else {
                                console.info('[🕹 ] Updating command ' + slashCommand.name + ".");
                                commandToEdit++;
                                slashCommandsToRefresh.push(slashCommand);
                            }
                        }
                    });
                });

                slashCommands.forEach(slashCommand => {
                    let isRegistered = false;
                    registeredSlashCommands.forEach(registeredSlashCommand => {
                        if (registeredSlashCommand.name === slashCommand.name) isRegistered = true;
                    })
                    if (!isRegistered) {
                        console.info('[🕹 ] Registering command ' + slashCommand.name + '.');
                        commandToAdd++;
                        slashCommandsToRefresh.push(slashCommand);
                    }
                });

                registeredSlashCommands.forEach(registeredSlashCommand => {
                    let isRegistered = false;

                    slashCommands.forEach(slashCommand => {
                        if (registeredSlashCommand.name === slashCommand.name) isRegistered = true;
                    });

                    if (!isRegistered) {
                        console.info('[🕹 ] Deleting command ' + registeredSlashCommand.name + '.');
                        slashCommandsToDelete.push(registeredSlashCommand.id);
                    }
                });

                if (registeredSlashCommands.length === 0) {
                    await rest.put(Routes.applicationCommands(client.user.id), {
                        body: slashCommands
                    });
                } else {
                    slashCommandsToRefresh.forEach(slashCommand => {
                        rest.post(Routes.applicationCommands(client.user.id), {
                            body: slashCommand
                        });
                    })
                }

                slashCommandsToDelete.forEach(commandId => {
                    rest.delete(Routes.applicationCommand(client.user.id, commandId), {});
                });

                console.info(`[🕹 ] ${commandToEdit} slash command${commandToEdit === 1 ? '' : 's'} successfully refreshed.`);
                console.info(`[🕹 ] ${commandToAdd} slash command${commandToAdd === 1 ? '' : 's'} successfully added.`);
                console.info(`[🕹 ] ${slashCommandsToDelete.length} slash command${slashCommandsToDelete.length === 1 ? '' : 's'} successfully deleted.`);

                console.info(`[🕹 ] Successfully loaded ${registeredSlashCommands.length} application slash commands.`);
            });
        } catch (error) {
            console.error(error);
        }
    },

    /**
     * @param {Client} client
     * @param {string} commandName
     * @return {boolean}
     */
    reloadCommand: function(client, commandName) {
        if (!client.commands.has(commandName)) return false;
        try {
            const path = client.commands.get(commandName).path;
            delete require.cache[require.resolve(`../${path}`)];
            client.commands.delete(commandName);
            this.importFile(client, path, true);
            return true;
        } catch (e) {
            console.error(`[🕹 ] Error when reloading command ${commandName} !`);
            console.line(e);
            return false;
        }
    },

    /**
     * @param {*} command
     * @param {GuildMember} member
     * @param {boolean?} isLogged
     * @return {boolean}
     */
    hasPermission: function(command, member, isLogged = false) {
        if (command.botOwnersOnly && config.botOwners.indexOf(member.id) === -1) {
            if (isLogged) console.debug(member.displayName + ' is not a bot owner !');
            return false;
        }

        if (command.permissions && !command.botOwnersOnly && config.botOwners.indexOf(member.id) === -1) {
            for (const permission of command.permissions) {
                if (!member.permissions.has(Permissions.resolve(permission), true)) {
                    if (isLogged) console.debug(member.displayName + ' doesn\'t have the permission to do this !');
                    return false;
                }
            }
        }

        if (command.roles) {
            let hasRole = false;
            command.roles.forEach((roleId) => {
                if (member.roles.cache.has(roleId)) {
                    hasRole = true;
                }
            });
            return hasRole;
        }

        return true;
    },

    initCheckFiles: function() {
        let foldersToCheck = [
            './logs',
            './logs/crash-reports',
            './logs/commands',
            './logs/unauthorized',
            './data',
            './data/guilds',
            './data/api'
        ];

        foldersToCheck.forEach((path) => {
            if (!fs.existsSync(path)) {
                console.warn(`[📁] Path '${path}' doesn't exist, trying creating it...`);
                try {
                    fs.mkdirSync(path);
                } catch (e) {
                    console.error(`[📁] Error when creating path folder '${path}' !`);
                    console.line(e);
                }
            }
        });
    },

    updatePhishingDatabase() {
        console.info('[✋] Updating phishing database.');
        if (getPhishingData().getLastUpdate() < Date.now() - (518400 * 1000)) {
            console.info('[✋] The phishing database has not been updated for more than 6 days, getting full phishing list.');
            axios.get('https://phish.sinking.yachts/v2/all', {headers: {'X-Identity': 'NoScam Discord bot', 'Accept': 'application/json'}})
                .then(response => {
                    console.info('[✋] The phishing database has been updated!');
                    getPhishingData().setDatabase(response.data);
                })
                .catch(reason => {
                    console.error('[✋] An error occured while trying to update phishing database!');
                    console.line(reason);
                });
        } else {
            console.info('[✋] The phishing database was updated less than 6 days ago, getting recent changes.');
            let datetime = ((Date.now() - getPhishingData().getLastUpdate()) / 1000).toFixed(0);
            axios.get(`https://phish.sinking.yachts/v2/recent/${datetime}`, {headers: {'X-Identity': 'NoScam Discord bot', 'Accept': 'application/json'}})
                .then(response => {
                    let domainsToAdd = [];
                    let domainsToRemove = [];

                    response.data.forEach(domainsModification => {
                        if (domainsModification.type === 'add') domainsToAdd.push(domainsModification.domains);
                        if (domainsModification.type === 'delete') domainsToRemove.push(domainsModification.domains);
                    });

                    getPhishingData().addToDatabase(domainsToAdd);
                    getPhishingData().removeToDatabase(domainsToRemove);

                    console.info(`[✋] The phishing database has been updated with ${domainsToAdd.length} addition${domainsToAdd.length > 1 ? 's' : ''} and ${domainsToRemove.length} deletion${domainsToRemove.length > 1 ? 's' : ''}`);
                })
                .catch(reason => {
                    console.error('[✋] An error occured while trying to update phishing database!');
                    console.line(reason);
                });
        }
    },

    /**
     * @param {*} data
     * @return {string}
     */
    getMD5: function(data) {
        return crypto.createHash('md5').update(data).digest('hex');
    },

    COLORS: {
        default: config.isDevEnv ? '#7F0700' : '#002D63',
        error: '#fc0303',
        success: '#50ea0e'
    }
}