# The most advanced scam link filter bot for Discord

The most advanced scam link filter bot for Discord, this bot is 100% open source under MIT Licence.

## 📃 Features

- Blocking scam links.
- Sending an embed with logs to the chosen channel.
- Buttons under the embed to ban the user. (Dyno button not available if Dyno is not on the server.)
- Whitelist button if the URL is safe but got banned.
- Using multiple databases and APIs of known scam links such as:
	- [discord-phishing-links](https://github.com/nikolaischunk/discord-phishing-links)
	- xxxxxx
	- xxxxxx
	- xxxxxx
- If the sent link is not known by any database, the bot will check the website in a browser:
	- Reused Discord assets checking. (If the Discord main page got dumped or partially dumped.)
	- Suspicious website title checking. (Nitro, Free nitro words...)
	- Reused webapp from Discord. (React, if the Discord main page got dumped.)
	- Cloudflare bypass. (It's soemtimes not working.)
	- Not all links are scanned if not known by any database, only suspicious ones.
