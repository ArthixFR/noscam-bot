const gConf = require('../config/guildConfig.js');
const path = require('path');
const fs = require('fs');
const countries_list = require('countries-list');

const langDirectory = path.resolve('./lang');

let langList = new Map();

class Lang {
    langName;
    langFile;

    constructor(langFile) {
        this.langFile = JSON.parse(fs.readFileSync(`${langDirectory}/${langFile}`));
        this.langName = langFile.split('.')[0];
    }

    getLanguage() {
        return this.langName;
    }

    getTranslateFile(lang = undefined) {
        return lang === undefined ? this.langFile : langList.get(lang).getTranslateFile();
    }

    getTranslate(args, ...translate) {
        return this.getTrans(undefined, args, ...translate);
    }

    getTranslateByCountryCode(countryCode, args, ...translate) {
        return this.getTrans(countryCode, args, ...translate);
    }

    getTrans(countryCode = undefined, args, ...translate) {
        let lang = countryCode === undefined ? this.getTranslateFile() : this.getTranslateFile(countryCode);
        let fallbackLang = this.getTranslateFile('en');

        if (lang === undefined) return '???';

        let actualLang = lang;

        for (const segment of translate) {
            if (actualLang !== undefined && actualLang[segment] !== undefined) {
                actualLang = actualLang[segment];
                if (fallbackLang[segment] !== undefined) fallbackLang = fallbackLang[segment];
            } else {
                actualLang = undefined;

                if (fallbackLang[segment] !== undefined) {
                    fallbackLang = fallbackLang[segment];
                } else {
                    fallbackLang = undefined;
                    break;
                }
            }
        }

        let translateLine = actualLang !== undefined ? actualLang : fallbackLang !== undefined ? fallbackLang : '???';

        Object.entries(args).forEach(([key, value]) => {
            translateLine = translateLine.split(`$[${key}]`).join(value);
            console.debug(`${key} : ${value}`);
        })

        return translateLine;
    }
}

function initLangs() {
    if (!fs.existsSync(langDirectory)) fs.mkdirSync(langList);

    let langLoadedNumber = 0;
    const langFiles = fs.readdirSync(langDirectory).filter(file => file.endsWith('.json'));
    for (const langFile of langFiles) {
        const langName = langFile.split('.')[0];
        try {
            langList.set(langName, new Lang(langFile));
            langLoadedNumber++;
        } catch (e) {
            console.error(`[🏳️ ] Error when loading lang ${langName} !`);
            console.line(e);
        }
    }
    console.info(`[🏳️ ] ${langLoadedNumber} langs have been successfully loaded !`);
    console.line(' ');
}

function isLangExist(langName) {
    return langList.has(langName);
}

function getAllAvailableLangs() {
    return Array.from(langList.keys());
}

function getNativeCountryName(countryCode) {
    const nativeName = countries_list.languagesAll[countryCode];
    return nativeName === undefined ? '???' : nativeName.native;
}

function getGuildLang(guildId) {
    const guildConfig = gConf.getGuildConfig(guildId);
    return langList.get(guildConfig.getLang());
}

/**
 * @param {string} langName
 * @returns {Lang} lang
 */
function getLang(langName) {
    return langList.get(langName);
}

module.exports = {
    initLangs: initLangs,
    getGuildLang: getGuildLang,
    isLangExist: isLangExist,
    getAllAvailableLangs: getAllAvailableLangs,
    getNativeCountryName: getNativeCountryName,
    getLang: getLang
};