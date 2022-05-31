const {Client, Message, MessageEmbed, MessageActionRow, MessageButton} = require('discord.js');
const config = require('../config.js');
const utils = require('../utils/utils.js');
const stopPhishing = require('stop-discord-phishing');
const crypto = require('crypto');

const scamConfig = require('../config/scamConfig.js');

const Puppeteer = require("puppeteer-extra");
const PuppeteerStealth = require("puppeteer-extra-plugin-stealth");
const {getGuildConfig} = require("../config/guildConfig.js");
const {getPhishingData} = require("../config/phishingConfig.js");
Puppeteer.use(PuppeteerStealth());

const axios = require("axios");

// All official hash from discord.com
const officialHashes = [
    '5ec394acd3a6cc22dafa7db4ea2d205c', // Official discord icon : https://discord.com/assets/847541504914fd33810e70a0ea73177e.ico
    '74925a1c13ac88a2e41048e53eb8589e', // Official discord login background svg
    'ff9cef4a844aa3d7728633eb5daebdd5', // Official discord icon in png
];

/**
 * @param {Client} client
 * @param {Message} message
 */
module.exports = async (client, message) => {
    utils.initBeginTimestamp();

    let linkRegex = /(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b\/)([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/gi;
    // REGEX DISCORD OFFICIAL DOMAINS : (?!(discord\.com|discord\.gg|discord\.media|discordapp\.com|discordapp\.net|discordstatus\.com|discord\.gift))

    // (?:(?:https?|ftp|mailto):\/\/)(?:www.{0,3}\.)?.*((?=((di|dj|dl)(?=.*s)(?=.*c)(?=.*o)(?=.*r).*d.*\..*))|(?=(free|nitro|hype|gift|boost)).*\..*)(?!(discord\.com|discord\.gg|discord\.media|discordapp\.com|discordapp\.net|discordstatus\.com|discord\.gift))
    let isSuspicious = false;
    let regexSuspicious = /(?:(?:https?|ftp|mailto):\/\/)(?:www.{0,3}\.)?.*((?=((di|dj|dl)(?=.*s)(?=.*c)(?=.*o)(?=.*r).*d.*\..*))|(?=(free|nitro|hype|gift|boost)).*\..*)(?!(discord\.com|discord\.gg|discord\.media|discordapp\.com|discordapp\.net|discordstatus\.com|discord\.gift))/gi;
    let linkMatch;

    // Checking with stop-discord-phishing database
    let badLinkReason = "stop-discord-phishing blacklist";
    let isPhishing = await stopPhishing.checkMessage(message.content);

    // Checking with SinkingYachts Phishing database
    let links = message.content.match(linkRegex);
    if (links !== null) {
        links.forEach(link => {
            if (getPhishingData().isInDatabase(link)) {
                isPhishing = true;
                badLinkReason = "SinkingYachts phishing blacklist";
            }
        })
    }

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
                    await checkWebsite(linkMatch[0], linkMatch[1]).then(linkStatus => {
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
                    // If the user already exists in the cache, no need to send a new message
                    if (client.scamCache.has(message.author.id)) {
                        channel.messages.fetch(client.scamCache.get(message.author.id).sentMessageId).then(messageSent => {
                            /** @type {MessageEmbed} */
                            let embed = messageSent.embeds[0];
                            // If the person has sent several messages detected as scam, we edit the description
                            let description = embed.description;
                            if (!description.includes('Multiple')) {
                                description = description.replace(':warning: Suspicious message', ':warning: Multiple suspicious messages').replace(':exclamation: Phishing message', ':exclamation: Multiple phishing messages')
                            }
                            if (!description.includes(deletedMessage.channel.toString())) {
                                description += `, ${deletedMessage.channel.toString()}`;
                            }
                            embed.setDescription(description);

                            // If the person has not sent the same message, we add a field in the embed
                            if (crypto.createHash('md5').update(message.content).digest("hex") !== client.scamCache.get(message.author.id).md5) {
                                embed.addField('Another flagged message', deletedMessage.content.length > 1019 ? deletedMessage.content.slice(0, 1019) + '...' : deletedMessage.content);
                            }

                            // And finally we send the modification of the embed
                            let buttons = messageSent.components[0].components;
                            const row = new MessageActionRow().addComponents(buttons);

                            messageSent.edit({content: null, embeds: [embed], components: [row]});
                        }).catch(reason => {
                            console.error('[✋] Cannot fetch message');
                            console.error(reason);
                        });
                    } else {
                        // If it is not the same user, we send a message and add it in scamCache
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
    }

    async function checkWebsite(url, domainUrl) {
        console.log(url);

        return new Promise(async (resolve, reject) => {
            // If puppeteer is closed for some reason, restart it.
            if (client.puppeteer === undefined) {
                client.puppeteer = await Puppeteer.default.launch({ headless: false, args: config.puppeteer.args, userDataDir: config.puppeteer.userDataDir, executablePath: config.puppeteer.executablePath});
            }

            try {
                let browser = client.puppeteer;
                browser.newPage().then(async page => {
                    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36');
                    await page.goto(url);
                    await page.waitForFunction('document.querySelector("#challenge-form") === null');
                    const page_content = await page.content();
                    await page.close();

                    let result = {isSuspect: false, reasons: []};

                    let titleCheck = page_content.match(/<title(.*?)<\/title>/);
                    let appMountCheck = page_content.includes('id="app-mount"');

                    // Assets check
                    let discordAssetCheck = false;

                    if (page_content.includes('discord.com/assets')) {
                        discordAssetCheck = true;
                        result.reasons.push('suspicious assets');
                    }

                    // Check website icon
                    try {
                        let iconRegex = page_content.match(/<link rel="icon" href="([\s\S]*?)">/mi);
                        if (iconRegex !== null) {
                            let matchUrlIcon = iconRegex[1].startsWith('/') || iconRegex[1].startsWith('../') ? domainUrl + iconRegex[1].replace(/^\//, '').replace(/\.\.\//, '') : iconRegex[1].startsWith('http') ? iconRegex[1] : domainUrl + '/' + iconRegex[1];
                            let iconResponse = await axios.get(matchUrlIcon);
                            if (iconResponse.status === 200) {
                                if (officialHashes.indexOf(utils.getMD5(iconResponse.data)) !== -1) {
                                    discordAssetCheck = true;
                                    result.reasons.push('suspicious website icon');
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('[✋] Cannot verify website icon!');
                        console.line(e);
                    }

                    // Check discord logo svg
                    if (page_content.includes('M26.0015 6.9529C24.0021 6.03845 21.8787 5.37198 19.6623 5C19.3833 5.48048 19.0733 6.13144 18.8563 6.64292C16.4989 6.30193 14.1585 6.30193 11.8336 6.64292C11.6166 6.13144 11.2911 5.48048 11.0276 5C8.79575 5.37198 6.67235 6.03845 4.6869 6.9529C0.672601 12.8736 -0.41235 18.6548 0.130124 24.3585C2.79599 26.2959 5.36889 27.4739 7.89682 28.2489C8.51679 27.4119 9.07477 26.5129 9.55525 25.5675C8.64079 25.2265 7.77283 24.808 6.93587 24.312C7.15286 24.1571 7.36986 23.9866 7.57135 23.8161C12.6241 26.1255 18.0969 26.1255 23.0876 23.8161C23.3046 23.9866 23.5061 24.1571 23.7231 24.312C22.8861 24.808 22.0182 25.2265 21.1037 25.5675C21.5842 26.5129 22.1422 27.4119 22.7621 28.2489C25.2885 27.4739 27.8769 26.2959 30.5288 24.3585C31.1952 17.7559 29.4733 12.0212 26.0015 6.9529ZM10.2527 20.8402C8.73376 20.8402 7.49382 19.4608 7.49382 17.7714C7.49382 16.082 8.70276 14.7025 10.2527 14.7025C11.7871 14.7025 13.0425 16.082 13.0115 17.7714C13.0115 19.4608 11.7871 20.8402 10.2527 20.8402ZM20.4373 20.8402C18.9183 20.8402 17.6768 19.4608 17.6768 17.7714C17.6768 16.082 18.8873 14.7025 20.4373 14.7025C21.9717 14.7025 23.2271 16.082 23.1961 17.7714C23.1961 19.4608 21.9872 20.8402 20.4373 20.8402Z')) {
                        discordAssetCheck = true;
                        result.reasons.push('suspicious discord logo assets');
                    }

                    try {
                        // SVG file url
                        Array.from(page_content.matchAll(/src="([\s\S]*?.svg)"/gmi), async match => {
                            let matchUrlSvg = match[1].startsWith('/') || match[1].startsWith('../') ? domainUrl + match[1].replace(/^\//, '').replace(/\.\.\//, '') : match[1].startsWith('http') ? match[1] : domainUrl + '/' + match[1];
                            let svgResponse = await axios.get(matchUrlSvg);
                            if (svgResponse.status === 200) {
                                let matchSvgBlock = svgResponse.data.match(/<svg [\s\S]*?>([\s\S]*?)<\/svg>/mi);
                                if (matchUrlSvg !== null) {
                                    if (officialHashes.indexOf(utils.getMD5(matchSvgBlock[1])) !== -1) {
                                        discordAssetCheck = true;
                                        result.reasons.push('suspicious svg url assets');
                                    }
                                }
                            }
                        });

                        // SVG blocks
                        Array.from(page_content.matchAll(/<svg [\s\S]*?>([\s\S]*?)<\/svg>/gmi), match => {
                            if (officialHashes.indexOf(utils.getMD5(match[1])) !== -1) {
                                discordAssetCheck = true;
                                result.reasons.push('suspicious svg block assets');
                            }
                        });
                    } catch (e) {
                        console.warn('[✋] Cannot verify svg files!');
                        console.line(e);
                    }

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

                    if (discordAssetCheck) result.isSuspect = true;

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