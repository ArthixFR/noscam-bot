const {CommandInteraction} = require('discord.js');

const { SlashCommandBuilder, SlashCommandChannelOption, SlashCommandSubcommandBuilder} = require('@discordjs/builders');
const {ChannelType} = require("discord-api-types/v10");

const guildConfig = require('../config/guildConfig.js');
const utils = require('../utils/utils.js');

module.exports = {
    name: "scamlogs",
    description: "Sets the channel where scam will be logged",
    data: new SlashCommandBuilder()
        .setName("scamlogs")
        .setDescription('test')
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName('set')
            .setDescription('Sets the channel where scam will be logged')
            .addChannelOption(new SlashCommandChannelOption().setName('channel').setDescription('Channel to send scam logs').setRequired(false).addChannelTypes(ChannelType.GuildText))),
    /**
     * @param {CommandInteraction} interaction
     * @param {Client} client
     * @param {string} prefix
     * @param {Lang} lang
     */
    executeSlash(interaction, client, prefix, lang) {
        if (interaction.options.getSubcommand() === 'set') {
            let channel = interaction.options.getChannel('channel', false) || interaction.channel;

            if (channel == null) {
                utils.sendErrorEmbedInteraction(client, lang.getTranslate({}, "COMMAND", "SCAMLOGS", "ERROR", "NO_CHANNEL"), interaction, true);
            }

            guildConfig.getGuildConfig(interaction.guildId).setScamLogsChannel(channel.id).save();
            utils.sendSuccessEmbedInteraction(client, lang.getTranslate({channel_id: channel.id}, "COMMAND", "SCAMLOGS", "CHANNEL_SETUP_OK"), interaction, true);
        }
    }
}