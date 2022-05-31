const {Client, Intents, Collection} = require('discord.js');
const betterLogging = require('better-logging');
const dateformat = require('dateformat');
const chalk = require('chalk');
const path = require('path');
const Puppeteer = require("puppeteer-extra");

const guildConfig = require('./config/guildConfig.js');
const scamConfig = require('./config/scamConfig.js');

let config = undefined;
const lang = require('./utils/lang.js');
const fs = require("fs");

const client = new Client({intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_BANS,
        Intents.FLAGS.GUILD_WEBHOOKS,
        Intents.FLAGS.GUILD_INTEGRATIONS,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MESSAGE_TYPING,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGE_TYPING
    ]});

// Init better logs
betterLogging(console, {
    format: ctx => `${ctx.STAMP(dateformat(new Date(), "dd/mm/yyyy HH:MM:ss"), chalk.gray)} ${toUpperCase(ctx.type)} ${ctx.msg}`
});

console.fatal = (message) => {
    console.line(chalk.grey(`[${chalk.rgb(139, 0, 0)(dateformat(new Date(), "dd/mm/yyyy HH:MM:ss"))}] [${chalk.rgb(139, 0, 0)('FATAL')}] ${chalk.reset(message)}`));
};

// Checking if the config file exists
if (fs.existsSync(path.join(__dirname, 'config.js'))) {
    config = require('./config.js');
} else {
    console.fatal('File config.js not found! Copy config.sample.js and rename it to config.js.');
    process.exit();
}

// utils.js needs to be required after checking if config.js exists
const utils = require('./utils/utils.js');

if (config.isDevEnv) console.logLevel = 4; // Enable debug mode

function toUpperCase(str) {
    const regex = /([a-ln-z]+)/g;
    return str.replace(regex, function (search, match) {
            return match.toUpperCase()
        }
    );
}

// Checking and creating folders if needed
utils.initCheckFiles();

// Saving config, commands and scamCache in client
client.config = config;
client.commands = new Collection();
client.scamCache = new Collection();

// Init lang
lang.initLangs();

// Init guilds config
guildConfig.initGuildConfig();

// Init scam list
scamConfig.initScamData();

// Registering events
console.info("=====================[START REGISTERING EVENTS]=====================");
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    try {
        const event = require(`./events/${file}`);
        let eventName = file.split('.')[0];
        client.on(eventName, event.bind(null, client));
        console.info(`[⚡] ${eventName} event has been successfully loaded !`);
    } catch (e) {
        console.error(`[⚡] Error when loading ${file} !`);
        console.line(e);
    }
}

console.info("=====================[END REGISTERING EVENTS]=====================");
console.line(" ");

// Registering commands
console.info("=====================[START REGISTERING COMMANDS]=====================");
let commandFolder = fs.readdirSync('./commands');

commandFolder.forEach(file => {
    if (file.endsWith('.js')) {
        utils.importFile(client, `commands/${file}`);
    } else {
        utils.cycleDir(client, `./commands/${file}`);
    }
});

console.info("=====================[END REGISTERING COMMANDS]=====================");
console.line(" ");

// Connecting bot
client.login(config.token).then(async () => {

    // Registering slash commands
    console.info("=====================[START REGISTERING SLASH COMMANDS]=====================")
    await utils.registerSlashCommands(client);
    console.info("=====================[END REGISTERING SLASH COMMANDS]=====================")
    console.line(" ")

    // Opening a browser with puppeteer when bot is started
    console.info("[💻] Starting puppeteer");
    client.puppeteer = await Puppeteer.default.launch({ headless: true, args: config.puppeteer.args, userDataDir: config.puppeteer.userDataDir, executablePath: config.puppeteer.executablePath});
});