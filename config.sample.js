const isDevEnv = true;

module.exports = {
    token: 'INSERT BOT TOKEN HERE', // Change with your bot's token
    interaction_prefix: 'dev_', // Change with something you want, ex: 'prod_' (Not used now !)
    prefix: '.', // Deprecated for now, only used with non slash commands
    isDevEnv: isDevEnv,
    botOwners: [],
    modRoles: [],
    puppeteer: { // Puppeteer configuration
        args: [ // You can add more args if you need to.
            "--disable-setuid-sandbox",
            "--no-sandbox",
            "--disable-gpu"
        ],
        userDataDir: './scamChromeUserData', // User data for puppeteer browser, no need to change it
        executablePath: '/usr/bin/google-chrome' // Path to google-chrome
    },
    api: {},
}
