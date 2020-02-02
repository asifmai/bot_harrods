/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const _ = require('underscore');
const moment = require('moment');
const dateToday = moment().format('YY-MM-DD');

class Helper {
  /**
   * Convert Multiple Spaces to single Space and Remove CR + LF characters
   * @param {string} str
   * @return {string} formatted string
   */
  cleanText(str) {
    return str.replace(/\s*/gi, ' ').replace(/[\n\r]/g, '');
  }
  removeFile(fileURL) {
    if (fs.existsSync(fileURL)) {
      fs.unlinkSync(fileURL);
    };
  }
  /**
   * Remove some unused characters, space, CR + LF characters
   * @param {string} str
   * @return {string} formatted price
   */
  clearPrice(str) {
    return str.trim().replace(/[@£#€$%&*]/g, '')
        .replace(/\s\s+/g, ' ')
        .replace(/[\n\r, ]/g, '')
        .replace(/[^\d\.\,\s]+/g, '')
        .trim();
  }
  /**
   * Save data to file
   * @param {string} fileName
   * @param {array} dataArr
   */
  saveDataToFile(fileName, dataArr) {
    if (fs.existsSync(fileName)) {
      fs.appendFileSync(fileName, dataArr, (err) => {
        if (err) throw err;
        console.error(`ERR: cannot update file ${fileName}.`);
      });
    } else {
      fs.writeFileSync(fileName, dataArr, 'utf8', (err) => {
        if (err) throw err;
        console.error(`ERR: file ${fileName} either not saved or saved corrupted.`);
      });
    };
  };
  /**
   * Remove all folders from the last run
   * @param {string} dirPath Path to the directory that is to be removed
   * @return {boolean} a promise
   */
  async rmDir(dirPath) {
    await new Promise((resolve) => {
      let files;
      try {
        files = fs.readdirSync(dirPath);
      } catch (e) {
        console.log(`No Folder Found to Delete: ${dirPath}`);
        resolve(true);
      }
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const filePath = path.join(dirPath, files[i]);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          } else {
            module.exports.rmDir(filePath);
          }
        }
        fs.rmdirSync(dirPath);
        console.log(`Removed Folder: ${dirPath}`);
        resolve(true);
      }
    });
  }
  /**
   * Launch a puppeteer headless chromium browser instance
   * @param {boolean} headless Set headless to true or false
   * @return {object} a puppeteer headless chromium browser instance
   */
  launchBrowser(headless) {
    return new Promise(async (resolve, reject) => {
      try {
        const browser = await puppeteer.launch({
          headless: headless,
          args: [
            '--disable-setuid-sandbox',
            '--no-sandbox',
            '--disable-infobars',
            '--window-position=0,0',
            '--ignore-certifcate-errors',
            '--ignore-certifcate-errors-spki-list',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          ],
          ignoreHTTPSErrors: true,
          defaultViewport: null,
        });
        resolve(browser);
      } catch (error) {
        console.log('Browser Launch Error: ', error);
        reject(error);
      }
    });
  }
  /**
   * Launch a new page/tab inside headless browser
   * @param {object} browser a puppeteer headless chromium browser instance
   * @param {boolean} blockResources Choose whether to block resources or not
   * @return {object} a new page/tab inside headless browser
   */
  launchPage(browser, blockResources) {
    return new Promise(async (resolve, reject) => {
      try {
        // Create New Page
        const page = await browser.newPage();

        // Set user agent for page.
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36';
        await page.setUserAgent(userAgent);

        // Pass the Webdriver Test.
        await page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
          });

          Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
          });

          Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
          });
        });

        if (blockResources === true) {
          const blockedResources = ['image', 'stylesheet', 'media', 'font', 'texttrack', 'object', 'beacon', 'csp_report', 'imageset'];

          // Set Request Interception to avoid receiving images, fonts and stylesheets for fast speed
          await page.setRequestInterception(true);
          page.on('request', (req) => {
            if (blockedResources.includes(req.resourceType())) {
              req.abort();
            } else {
              req.continue();
            }
          });
        }

        // Set Extra Header for request
        await page.setExtraHTTPHeaders({
          'accept-language': 'en-US,en;q=0.8',
        });

        resolve(page);
      } catch (error) {
        console.log('Launch Page Error: ', error);
        reject(error);
      }
    });
  }
  /**
   * Format Reference Numbers
   * @param {string} refNum
   * @return {string} a formatted string
   */
  convRefNum(refNum) {
    return refNum
        .trim()
        .replace(/[\s,\/;:!\?_\-\)\("'\{\}\[\]|\+=\*\`]/g, '.')
        .replace(/\.{2,}/g, '.')
        .toUpperCase();
  }
  /**
   * Remove Latin Characters
   * @param {string} str String to remove Latin Characters from
   * @return {string} Converted String without Latin Characters
   */
  replLatinChs(str) {
    return str.replace(/\x22/g, '\'').replace(/”/g, '\'').replace(/“/g, '\'').replace(/\s+/g, ' ')
        .replace(/[Ằ|Ẵ|Ẳ|Ặ|Ắ|Ȃ|Ä|Æ|Å|Á|Ả|Ã|À|Ạ|Ă|Ằ|Ẳ|Ẵ|Ắ|Ặ|Â|Ấ|Ầ|Ẩ|Ẫ|Ậ]/g, 'A')
        .replace(/[ẵ|ẳ|ặ|ắ|ằ|ȃ|æ|å|ä|à|ả|ã|á|ạ|ă|ằ|ẳ|ẵ|ắ|ặ|â|ầ|ẩ|ẫ|ấ|ậ]/g, 'a')
        .replace(/[Ĕ|È|Ë|É|Ẻ|Ẽ|Ẹ|Ê|Ế|Ề|Ể|Ễ|Ệ]/g, 'E')
        .replace(/[ĕ|ë|è|ẻ|ẽ|é|ẹ|ê|ề|ể|ễ|ế|ệ]/g, 'e')
        .replace(/[đ]/g, 'd')
        .replace(/[Đ]/g, 'D')
        .replace(/[Í|Î|Ỉ|Ì|Ĩ|Ị|Ĭ]/g, 'I')
        .replace(/[ĭ|ı|î|ï|ì|ỉ|ĩ|í|ị]/g, 'i')
        .replace(/[Ö|Ø|Ó|Ò|Ỏ|Õ|Ọ|Ô|Ố|Ồ|Ổ|Ỗ|Ộ|Ơ|Ớ|Ờ|Ở|Ỡ|Ợ|Ŏ]/g, 'O')
        .replace(/[ŏ|ø|ö|ò|ỏ|õ|ó|ọ|ô|ồ|ổ|ỗ|ố|ộ|ơ|ờ|ở|ỡ|ớ|ợ]/g, 'o')
        .replace(/[Ü|Û|Ú|Ù|Ủ|Ũ|Ụ|Ư|Ứ|Ừ|Ử|Ữ|Ự|ŭ|Ŭ]/g, 'U')
        .replace(/[û|ü|ù|ủ|ũ|ú|ụ|ư|ừ|ử|ữ|ứ|ự]/g, 'u')
        .replace(/[Ý|Ÿ|Ỳ|Ỷ|Ỹ|Ỵ]/g, 'Y')
        .replace(/[ÿ|ỳ|ỷ|ỹ|ý|ỵ]/g, 'y')
        .replace(/[ẞ|Ş]/g, 'S')
        .replace(/[ß|ş]/g, 's')
        .replace(/[ĳ]/g, 'ij')
        .replace(/[ç]/g, 'c')
        .replace(/[Ç]/g, 'C')
        .replace(/[ñ]/g, 'n')
        .replace(/[Ñ]/g, 'N')
        .replace(/[Ğ|Ǵ|Ĝ|Ġ|Ģ|Ḡ|Ǥ|Ɠ|Ｇ|Ǧ|Ŋ]/g, 'G')
        .replace(/[ｇ|ŋ|ɢ|ᶃ|ğ|ǵ|ĝ|ġ|ģ|ḡ|ǥ|ɠ|ǧ]/g, 'g')
        .replace(/"/g, `'`);
  }
  /**
   * format data for gender field. Return one of 3 values: M - Men/Gents, W - Woman/Ladies, U - Unisex/Other
   * @param {string} gender
   * @return {string} gender
   */
  getGenderUnify(gender) {
    const mGenders = ['gents', 'men', 'mens', 'man', 'male', 'men\'s', 'mens watch', 'men watch', 'man watch', 'male watch', 'men’s watch/unisex'];
    const fGenders = ['ladies', 'women', 'woman', 'female', 'womens', 'women\'s', 'ladies watch', 'ladies’ watch', 'female watch', 'womens watch', 'woman watch'];
    if (mGenders.includes(gender.toLowerCase().trim())) return 'M'
    else if (fGenders.includes(gender.toLowerCase().trim())) return 'W'
    else return 'U';
  }
  /**
   * Save Data to a File
   * @param {string} fileName Name of File to Save data to
   * @param {array} content Content to be Saved
   */
  saveDataToFile(fileName, content) {
    if (fs.existsSync(fileName)) {
      fs.appendFileSync(fileName, content, 'utf8', (err) => {
        if (err) throw err;
        console.error('ERR: cannot update file.');
      });
    } else {
      fs.writeFileSync(fileName, content, 'utf8', (err) => {
        if (err) throw err;
        console.error('ERR: file either not saved or saved corrupted.');
      });
    }
  }
  /**
   * Save data into Csv Files
   * @param {string} botName Bot Name
   * @param {object} watchInfo Object with Scrap Data
   */
  putDataToCsvFile(botName, watchInfo) {
    if (watchInfo.label !== '') {
      // Check if folder Structure and csv File exists
      // If not create the folder structure and csv file with headers
      if (!fs.existsSync(`${watchInfo.label}/${botName}/${botName}_${dateToday}.csv`)) {
        // create new folder with label as name
        !fs.existsSync(`${watchInfo.label}`) && fs.mkdirSync(`${watchInfo.label}`);
        !fs.existsSync(`${watchInfo.label}/${botName}`) && fs.mkdirSync(`${watchInfo.label}/${botName}`);
        let csvHeader;
        if (watchInfo.label === 'new_static') {
          csvHeader = `"WatchLink","WatchName","WatchImage","ReferenceNumber","WatchModel","BrandId","Movement","Gender","PowerReserve","NumberOfJewels","CaseDiameter","CaseMaterial","WaterResistanceAtm","BezelMaterial","Glass","DialColor","BraceletMaterial","BraceletColor","Buckle","BuckleMaterial","Condition","ScopeOfDelivery","Location","Price","Currency","Functions","Desciption","Other","WebsourceId","Year"\r\n`;
        } else if (watchInfo.label === 'new_price') {
          csvHeader = `"WatchLink","WatchName","Price","Currency","WebsourceId","StaticId","DynamicId"\r\n`;
        } else if (watchInfo.label === 'new_dynamic') {
          csvHeader = `"WatchLink","WatchName","Condition","ScopeOfDelivery","Location","Price","Currency","Functions","Desciption","Other","WebsourceId","Staticid","Year"\r\n`;
        } else if (watchInfo.label === 'end_date') {
          csvHeader = `"DynamicId","StaticId","WatchLink","WebsourceId"\r\n`;
        }
        this.saveDataToFile(`${watchInfo.label}/${botName}/${botName}_${dateToday}.csv`, csvHeader);
      }

      let newLine;
      if (watchInfo.label === 'new_static') {
        newLine = `"${watchInfo.watchlink}","${this.reFormatWatchName(watchInfo)}","${this.replLatinChs(watchInfo.watchimage)}","${this.convRefNum(watchInfo.referencenumber)}","${this.formatBrandModel(watchInfo.watchmodel)}","${watchInfo.brandid}","${this.replLatinChs(watchInfo.movements)}","${watchInfo.gender}","${this.replLatinChs(watchInfo.powerreserve)}","${this.replLatinChs(watchInfo.numberofjewels)}","${this.replLatinChs(watchInfo.casediameter)}","${this.replLatinChs(watchInfo.casematerial)}","${this.replLatinChs(watchInfo.waterresistanceatm)}","${this.replLatinChs(watchInfo.bezelmaterial)}","${this.replLatinChs(watchInfo.glass)}","${this.replLatinChs(watchInfo.dialcolor)}","${this.replLatinChs(watchInfo.braceletmaterial)}","${this.replLatinChs(watchInfo.braceletcolor)}","${this.replLatinChs(watchInfo.buckle)}","${this.replLatinChs(watchInfo.bucklematerial)}","${this.replLatinChs(watchInfo.condition)}","${this.replLatinChs(watchInfo.scopeofdelivery)}","${this.replLatinChs(watchInfo.location)}",${watchInfo.price},"${watchInfo.currency}","${this.replLatinChs(watchInfo.functions)}","${this.replLatinChs(watchInfo.description)}","${this.replLatinChs(watchInfo.others)}","${watchInfo.websourceid}","${watchInfo.year}"\r\n`;
      } else if (watchInfo.label === 'new_price') {
        newLine = `"${watchInfo.watchlink}","${this.reFormatWatchName(watchInfo)}","${watchInfo.price}","${watchInfo.currency}","${watchInfo.websourceid}","${watchInfo.staticid}","${watchInfo.dynamicid}"\r\n`;
      } else if (watchInfo.label === 'new_dynamic') {
        newLine = `"${watchInfo.watchlink}","${this.reFormatWatchName(watchInfo)}","${this.replLatinChs(watchInfo.condition)}","${this.replLatinChs(watchInfo.scopeofdelivery)}","${this.replLatinChs(watchInfo.location)}",${watchInfo.price},"${watchInfo.currency}","${this.replLatinChs(watchInfo.functions)}","${this.replLatinChs(watchInfo.description)}","${this.replLatinChs(watchInfo.others)}","${watchInfo.websourceid}","${watchInfo.staticid}","${watchInfo.year}"\r\n`;
      } else if (watchInfo.label === 'end_date') {
        newLine = `"${watchInfo.id}","${watchInfo.staticid}","${watchInfo.watchlink}","${watchInfo.websourceid}"\r\n`;
      }
      // save scraped data to csv file
      this.saveDataToFile(`${watchInfo.label}/${botName}/${botName}_${dateToday}.csv`, newLine);
    }
  }
  /**
   * Find Unique elements in two arrays
   * @param {array} arr1 First Array
   * @param {array} arr2 Second Array
   * @return {array} unique elements from two arrays
   */
  findTheDifferences(arr1, arr2) {
    const diff = [];
    for (let i = 0; i < arr1.length; i++) {
      if (arr2.indexOf(arr1[i]) === -1) {
        diff.push(arr1[i]);
      }
    }
    return diff;
  }
  /**
   * Convert String to Title Case
   * @param {string} str String to convert
   * @return {string} Converted String
   */
  toTitleCase(str) {
    const cleanStr = str.replace(/[ ]{2,}/g, ' ');
    return cleanStr.split(' ').map((w) => {
      if (w.includes('-')) {
        return w.split('-').map((w2) => w2.trim().charAt(0).toUpperCase() + w2.trim().substr(1).toLowerCase()).join('-');
      } else {
        return w[0].toUpperCase() + w.substr(1).toLowerCase();
      }
    }).join(' ');
  }
  /**
   * Get Bot Object from MongoDB
   * @param {string} botName Bot Name
   * @return {object} Object with Bot details from MongoDB
   */
  async getBot(botName) {
    const bot = await Bot.findOne({name: botName});
    return bot;
  }
  /**
   * Check MongoDB Connection
   */
  async checkMongoConnection() {
    if (mongoose.connection.readyState == 0) {
      await mongoose.connect(configs.mongoURI, {
        useNewUrlParser: true, useFindAndModify: false,
      });
    }
  }
  /**
   * Round a number to whatever decimals you choose
   * @param {number} num Number to Round
   * @param {number} scale Number of Decimals
   * @return {number} Rounded Number
   */
  roundNumber(num, scale) {
    if (!('' + num).includes('e')) {
      return +(Math.round(num + 'e+' + scale) + 'e-' + scale);
    } else {
      const arr = ('' + num).split('e');
      let sig = '';
      if (+arr[1] + scale > 0) {
        sig = '+';
      }
      return +(Math.round(+arr[0] + 'e' + sig + (+arr[1] + scale)) + 'e-' + scale);
    }
  }
  /**
   * Remove Duplicate Links
   * @param {array} watchLinks Watch Links Scraped from a site
   * @return {array} Unique watch links
   */
  removeDuplicateLinks(watchLinks) {
    if (watchLinks.length > 0) {
      const uniqueLinks = _.uniq(watchLinks);
      console.log('Removed Duplicate Links...');
      return uniqueLinks;
    } else {
      console.log('No Watch Links Found to Remove Duplicates from...');
      return [];
    }
  }
  /**
   * Find Similarity between two Strings in percentage
   * @param {string} s1 First String
   * @param {string} s2 Second String
   * @return {number} 0 to 1 Representing percentage similarity between the two strings
   */
  similarity(s1, s2) {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    const longerLength = longer.length;
    if (longerLength == 0) {
      return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
  }
}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  const costs = new Array();
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i == 0) { costs[j] = j; } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) != s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue),
            costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) { costs[s2.length] = lastValue; }
  }
  return costs[s2.length];
}

module.exports = new Helper();
