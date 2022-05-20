const {Collection, DMChannel, Client, Message, MessageEmbed, MessageActionRow, MessageButton} = require('discord.js');
const config = require('../config.js');
const language = require('../utils/lang.js');
const utils = require('../utils/utils.js');
const humanizeDuration = require("humanize-duration");
const logger = require('../utils/logger.js');
const stopPhishing = require('stop-discord-phishing');
const crypto = require('crypto');

const scamConfig = require('../config/scamConfig.js');

const Puppeteer = require("puppeteer-extra");
const PuppeteerStealth = require("puppeteer-extra-plugin-stealth");
const {getGuildConfig} = require("../config/guildConfig.js");
Puppeteer.use(PuppeteerStealth());

const cooldowns = new Collection();
const cooldownsMessage = new Collection();

/**
 * @param {Client} client
 * @param {Message} message
 */
module.exports = async (client, message) => {
    utils.initBeginTimestamp();

    let linkRegex = /(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b\/)([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/gi;
    // REGEX DISCORD OFFICIAL DOMAINS : (?!(discord\.com|discord\.gg|discord\.media|discordapp\.com|discordapp\.net|discordstatus\.com|discord\.gift))

    // (?:(?:https?|ftp|mailto):\/\/)(?:www.{0,3}\.)?.*((?=((di|dj|dl)(?=.*s)(?=.*c)(?=.*o)(?=.*r).*d.*\..*))|(?=(free|nitro|hype|gift|boost)).*\..*)(?!(discord\.com|discord\.gg|discord\.media|discordapp\.com|discordapp\.net|discordstatus\.com|discord\.gift))

    // Vérifie si le message contient un lien de phishing
    let badLinkReason = "Blacklisted link";
    let isPhishing = await stopPhishing.checkMessage(message.content);
    let isSuspicious = false;
    let regexSuspicious = /(?:(?:https?|ftp|mailto):\/\/)(?:www.{0,3}\.)?.*((?=((di|dj|dl)(?=.*s)(?=.*c)(?=.*o)(?=.*r).*d.*\..*))|(?=(free|nitro|hype|gift|boost)).*\..*)(?!(discord\.com|discord\.gg|discord\.media|discordapp\.com|discordapp\.net|discordstatus\.com|discord\.gift))/gi;
    let linkMatch;

    let guildId = message.guild.id;

    if (!isPhishing) {
        if (message.content.match(regexSuspicious) !== null ||
            ((message.content.includes('free') || message.content.includes('nitro') || message.content.includes('hypesquad') || message.content.includes('giveaway') && message.content.match(linkRegex) !== null) &&
            (message.content.match(/(https?:\/\/(www\.)?(?!(discord\.com|discord\.gg|discord\.media|discordapp\.com|discordapp\.net|discordstatus\.com|discord\.gift))[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b\/)([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/gi) !== null))) {
            linkMatch = linkRegex.exec(message.content.toLowerCase());
            if (linkMatch !== null) {
                if (scamConfig.getScamData().isInSafeList(guildId, linkMatch[1])) {
                    isSuspicious = false;
                } else if (scamConfig.getScamData().isInScamList(guildId, linkMatch[1])) {
                    isSuspicious = true;
                    badLinkReason = "Custom blacklisted link";
                } else {
                    let check = await checkWebsite(linkMatch[0], linkMatch[1]).then(linkStatus => {
                        isSuspicious = linkStatus.isSuspect;
                        if (isSuspicious) {
                            badLinkReason = linkStatus.reasons.join(', ');
                            badLinkReason = badLinkReason[0].toUpperCase() + badLinkReason.substring(1);
                        }
                    }).catch(reason => {
                        console.error(`[✋] Cannot check URL ${linkMatch[0]}`);
                        console.error(reason);
                    });
                }
            }
        }
    } else {
        linkMatch = linkRegex.exec(message.content.toLowerCase());
        if (scamConfig.getScamData().isInScamList(guildId, linkMatch[1])) {
            scamConfig.getScamData().removeToScamList(guildId, linkMatch[1]);
        }
    }

    if (isPhishing || isSuspicious) {
        console.log(`[✋] ${message.author.tag} (ID: ${message.author.id}) tried to send a ${isSuspicious ? 'suspicious ': ''}phishing link`);

        message.delete().then(deletedMessage => {
            let guildConfig = getGuildConfig(message.guildId);
            let scamLogChannelId = guildConfig.getScamLogsChannel();
            if (scamLogChannelId === '0') {
                console.error('[✋] Scam logs channel is not setup, cannot send message !');
            } else {
                client.channels.fetch(scamLogChannelId).then(channel => {
                    // Si l'utilisateur existe déjà dans le cache, pas la peine d'envoyer un nouveau message
                    if (client.scamCache.has(message.author.id)) {
                        channel.messages.fetch(client.scamCache.get(message.author.id).sentMessageId).then(messageSent => {
                            /** @type {MessageEmbed} */
                            let embed = messageSent.embeds[0];
                            // Si la personne a envoyé plusieurs messages détectés comme scam, on modifie la description
                            let description = embed.description;
                            if (!description.includes('Multiple')) {
                                description = description.replace(':warning: Suspicious message', ':warning: Multiple suspicious messages').replace(':exclamation: Phishing message', ':exclamation: Multiple phishing messages')
                            }
                            if (!description.includes(deletedMessage.channel.toString())) {
                                description += `, ${deletedMessage.channel.toString()}`;
                            }
                            embed.setDescription(description);

                            // Si la personne n'a pas envoyé le même message, on ajoute un field dans l'embed
                            if (crypto.createHash('md5').update(message.content).digest("hex") !== client.scamCache.get(message.author.id).md5) {
                                embed.addField('Another flagged message', deletedMessage.content.length > 1019 ? deletedMessage.content.slice(0, 1019) + '...' : deletedMessage.content);
                            }

                            // Et enfin on envoie la modification de l'embed
                            let buttons = messageSent.components[0].components;
                            const row = new MessageActionRow().addComponents(buttons);

                            messageSent.edit({content: null, embeds: [embed], components: [row]});
                        }).catch(reason => {
                            console.error('[✋] Cannot fetch message');
                            console.error(reason);
                        });
                    } else {
                        // Si ce n'est pas le même utilisateur, on envoie un message et on l'ajouter dans scamCache
                        let embed = new MessageEmbed()
                            .setAuthor({name: deletedMessage.author.tag, iconURL: deletedMessage.author.avatarURL()})
                            .setFooter({text: `User ID: ${deletedMessage.author.id} | Reason(s) : ${badLinkReason}`})
                            .setTimestamp(Date.now())
                            .setColor(isSuspicious ? '#e39f1f' : '#c01919')
                            .setDescription(`${isSuspicious ? ':warning: Suspicious' : ':exclamation: Phishing'} message sent by ${deletedMessage.author.toString()} deleted in ${deletedMessage.channel.toString()}`)
                            .addField('Flagged message', deletedMessage.content.length > 1019 ? deletedMessage.content.slice(0, 1019) + '...' : deletedMessage.content);

                        const banDiscordButton = new MessageButton()
                            .setLabel('Ban via Discord')
                            .setStyle("DANGER")
                            .setCustomId(config.interaction_prefix + 'scamdiscord_' + deletedMessage.author.id);

                        const banDynoButton = new MessageButton()
                            .setLabel('Ban via Dyno')
                            .setStyle('DANGER')
                            .setCustomId(config.interaction_prefix + 'scamdyno_' + deletedMessage.author.id);

                        const whitelistUrl = new MessageButton()
                            .setLabel('Whitelist domain URL')
                            .setStyle('SECONDARY')
                            .setCustomId(config.interaction_prefix + 'scamwl_' + linkMatch[1]);

                        let row = new MessageActionRow().addComponents(banDiscordButton);

                        if (guildConfig.isDynoPresent()) row.addComponents(banDynoButton);
                        if (isSuspicious) row.addComponents(whitelistUrl);

                        channel.send({ content: null, embeds: [embed], components: [row]}).then(messageSent => {
                            client.scamCache.set(message.author.id, {md5: crypto.createHash('md5').update(message.content).digest("hex"), sentMessageId: messageSent.id});
                        }).catch(reason => {
                            console.error('Cannot send message');
                            console.error(reason);
                        });
                    }
                }).catch(reason => {
                    console.error('[✋] Cannot fetch channel');
                    console.error(reason);
                });
            }

        }).catch(reason => {
            console.error('[✋] Cannot delete phishing message');
            console.error(reason);
        });

        return;
    }

    async function checkWebsite(url, domainUrl) {
        console.log(url);

        return new Promise(async (resolve, reject) => {
            // Si puppeteer est fermé pour une raison que j'ignore, le relancer.
            if (client.puppeteer === undefined) {
                client.puppeteer = await Puppeteer.default.launch({ headless: true, args: config.puppeteer.args, userDataDir: config.puppeteer.userDataDir, executablePath: config.puppeteer.executablePath});
            }

            try {
                let browser = client.puppeteer;
                browser.newPage().then(async page => {
                    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36');
                    await page.goto(url);
                    await page.waitForFunction('document.querySelector("#challenge-form") === null');
                    const page_content = await page.content();
                    await page.close();

                    let titleCheck = page_content.match(/<title(.*?)<\/title>/);
                    let appMountCheck = page_content.includes('id="app-mount"');
                    let discordAssetCheck = page_content.includes('discord.com/assets');

                    let result = {isSuspect: false, reasons: []};

                    if (titleCheck !== null) {
                        if (titleCheck[0].toLowerCase().includes('discord') || titleCheck[0].toLowerCase().includes('free') || titleCheck[0].toLowerCase().includes('nitro') || titleCheck[0].toLowerCase().includes('hypesquad')) {
                            result.isSuspect = true;
                            result.reasons.push('suspicious title');
                        }
                    }
                    if (appMountCheck) {
                        result.isSuspect = true;
                        result.reasons.push('suspicious content');
                    }
                    if (discordAssetCheck) {
                        result.isSuspect = true;
                        result.reasons.push('suspicious assets');
                    }

                    if (result.isSuspect) {
                        scamConfig.getScamData().addToScamList(guildId, domainUrl);
                    } else {
                        scamConfig.getScamData().addToSafeList(guildId, domainUrl);
                    }

                    console.log(result);
                    resolve(result);
                }).catch(reason => reject(reason));
            } catch (e) {
                reject(e);
            }
        });
    }
}