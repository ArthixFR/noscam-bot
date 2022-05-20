# The most advanced scam link filter bot for Discord

The most advanced scam link filter bot for Discord, this bot is 100% open source under MIT Licence.

## 📃 Features

- Blocking scam links.
- Sending an embed with logs to the chosen channel.
- Buttons under the embed to ban the user. (Dyno button not available if Dyno is not on the server.)
- Whitelist button if the URL is safe but got banned.
- Role and channel whitelist.
- Using multiple databases and APIs of known scam links such as:
	- [discord-phishing-links](https://github.com/nikolaischunk/discord-phishing-links)
	- [SinkingYachts Phishing Domain API](https://phish.sinking.yachts/docs)
	- [Phishing.Database](https://github.com/mitchellkrogza/Phishing.Database)
- If the sent link is not known by any database, the bot will check the website in a browser:
	- Reused Discord assets checking. (If the Discord main page got dumped or partially dumped.)
	- Suspicious website title checking. (Nitro, Free nitro words...)
	- Reused webapp from Discord. (React, if the Discord main page got dumped.)
	- Cloudflare bypass. (It's soemtimes not working.)
	- Not all links are scanned if not known by any database, only suspicious ones.

## 💾 Prerequisites

- A **Linux** system. (Dedicated or VPS.) [Our VPS choice - Contabo.](https://contabo.com/en/vps/)
- **Google Chrome** on Linux. [Installing Google Chrome on Debian.](https://linuxize.com/post/how-to-install-google-chrome-web-browser-on-debian-10/)
- **xvfb** package. `sudo apt-get install xvfb`(on Debian/Ubuntu based distribution.)
- **NodeJS 16.x** & **NPM**. [Installing NodeJS on a Debian/Ubuntu based distribution.](https://github.com/nodesource/distributions/blob/master/README.md)
- A pre created **bot** with the **token**. [Setting up a bot application. (NodeJS Guide)](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)
- **Git**. [Git install guide on Linux.](https://www.atlassian.com/git/tutorials/install-git#linux)
- **Screen** or **pm2**. (For run in background.)
- A **brain** and some patience. [Download brain.](https://www.youtube.com/watch?v=dQw4w9WgXcQ)

## 🔧 Installation

First of all, clone the GitHub project in your selected folder

    # Cloning the GitHub project
    git clone https://github.com/ArthixFR/noscam-bot.git

You should then be able to find the cloned project

    # Going in the bot directory
    cd noscam-bot
    
    # Displaying what's in the folder
    ls

If you want your bot running you'll need to change the config file with a ftp or the tool called nano. We'll use a ftp here.
Copy the file named `config.sample.js` to `config.js`

    # Copying a file and change the name
    cp config.sample.js config.js

