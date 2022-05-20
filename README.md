# The most advanced scam link filter bot for Discord

The most advanced scam link filter bot for Discord, this bot is 100% open source under MIT Licence.

## ✨ Features

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

    # Copying a file and changing the name
    cp config.sample.js config.js

Then, open the file `config.js` with your ftp client by copying it on your PC or opening it remotely.

Search for the line `token: 'INSERT BOT TOKEN HERE'` and copy the bot token that you created on the Discord developper portal.

⚠️ ***Be careful, never provide you bot token to anyone who you don't trust!*** ⚠️

GG! The bot is ready to run on your server! Just type `node index.js` in your Linux terminal to run the bot. But if you leave the terminal page your bot will shutdown so we need to setup a background run for the bot.

## ⚙️ Post installation

### Background running

Like said earlier, there's two methods for running the bot in background, Screen and pm2. We'll see in this part how to use Screen and pm2 with the bot.

#### Screen method

The first option is screen, this tool is letting you running your script or other programm in the background with virtual screens, it's literally like running the with `node index.js` but this time is you leave the window, the bot will continue to run.

If it's not already the case, install Screen on your machine

    # installing screen
    sudo apt-get install screen

Once done, check if it's properly installed

    # Checking Screen version
    screen -v

It should return something like that

    Screen version 4.08.00 (GNU) 05-Feb-20

Now, go to the bot folder and create a file called `start.sh` then, open it with your code/text editor and add the following code

    screen -dmS noscam-bot nodemon -L index.js  
    echo "Bot started !"

Save and go back in your terminal and type

    # Making your file executable
    chmod +x start.sh

This will made your file executable.
Now, we can start the bot with Screen!

      # Starting the bot with Screen
      ./start.sh

The terminal should return `Bot started!`
GG! Your bot is now running in the background! To access the virtual screen, you can type

    # Accessing the virtual screen
    screen -x noscam-bot

To leave the screen you can do the following command `CTRL A` and then `d`, to kill the screen do `CTRL A` and then `k` or just doing a `CTRL C` on the screen.

[Here's the full Screen documentation.](https://www.gnu.org/software/screen/manual/screen.html)

#### pm2 method




