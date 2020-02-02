/* eslint-disable quotes */
/* eslint-disable max-len */
const moment = require('moment');
const rimraf = require('rimraf');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const {zip} = require('zip-a-folder');
const pLimit = require('p-limit');
const fetch = require('node-fetch');
const Helper = require('./helpers/bothelpers');
const pupHelper = require('./helpers/puppeteerhelper');
const keys = require('./config/keys');
const categories = require('./config/categories');
// const categories = JSON.parse(fs.readFileSync('productLinks.json', 'utf8'));
const shopifyHelper = require('./helpers/shopifyhelper');
let browser;

module.exports.run = () => new Promise(async (resolve, reject) => {
  try {
    console.log('Started BOT run...');

    // Remove Previously Generated Csvs and Create new folder
    rimraf.sync('csvs');
    if (fs.existsSync('csvs.zip')) fs.unlinkSync('csvs.zip');
    fs.mkdirSync('csvs');

    // Launch Browser
    browser = await pupHelper.launchBrowser();

    // Fetch Categories
    await getAllProductLinks();
    fs.writeFileSync('productLinks.json', JSON.stringify(categories));

    // Fetch Products
    await getAllProducts();

    // Loop Through All categories
    // for (let i = 0; i < categories.length; i++) {
    //   console.log(`${i + 1}/${categories.length} - Fetching Product Links for category: ${categories[i].categoryName}`);

    //   // Get All Product Links For a Category
    //   categories[i].productLinks = await getAllProductLinks(categories[i]);

    //   // Remove Duplicate Links from Product Links
    //   categories[i].productLinks = Helper.removeDuplicateLinks(categories[i].productLinks);

    //   console.info(`Number of Products in category "${categories[i].categoryName}": ${categories[i].productLinks.length}`);

    //   // Crawl All Product Links
    //   categories[i].products = await crawlProductLinks(categories[i]);
    // }

    // Create a zip file of all csvs
    await zip('csvs', 'csvs.zip');

    // Close the Browser
    await browser.close();
    console.log('Finished BOT run...');
    resolve(true);
  } catch (error) {
    await browser.close();
    console.log(error);
    reject(error);
  }
});

const getAllProductLinks = () => new Promise(async (resolve, reject) => {
  try {
    for (let i = 0; i < categories.length; i++) {
      await getProductLinksFromCat(i);
    }

    resolve();
  } catch (error) {
    console.log(`getAllProductLinks Error: ${error}`);
    reject(error);
  }
});

const getProductLinksFromCat = (index) => new Promise(async (resolve, reject) => {
  try {
    console.log(`${index+1}/${categories.length} - Fetching Products from Category: ${categories[index].categoryName}`);
    categories[index].products = [];
    let $;
    let pageNumber = 1;
    let gotProducts = true;

    do {
      console.log(`Fetching Products from Page: ${pageNumber}`);

      // const respData = await axios.get(`${categories[index].categoryUrl}${pageNumber}`);
      const respData = await fetch(`${categories[index].categoryUrl}${pageNumber}`);
      const respHtml = await respData.text();
      console.log(respHtml);
      $ = cheerio.load(respHtml);

      const productGridNode = '.product-grid_list > .product-grid_item:not(.product-grid_item--espot) a.product-card_image-link';
      if ($(productGridNode).length > 0) {
        $(productGridNode).each((i, elm) => {
          const newProduct = {};
          newProduct.url = $(elm).attr('href');
          categories[index].products.push(newProduct);
        });
        pageNumber++;
      } else {
        gotProducts = false;
      }
    } while (gotProducts);

    console.log(`Product Links fetched for Category ${categories[index].categoryName}: ${categories[index].products.length}`);
    resolve();
  } catch (error) {
    // await page.close();
    console.log(`getAllProductLinks ${categories[index].categoryName} Error: ${error}`);
    reject(error);
  }
});

const getAllProducts = () => new Promise(async (resolve, reject) => {
  try {
    for (let i = 0; i < categories.length; i++) {
      await getProductsFromCategory(i);
      fs.writeFileSync('productDetails.json', JSON.stringify(categories));
    }

    resolve();
  } catch (error) {
    console.log(`getAllProducts Error: ${error}`);
    reject(error);
  }
});

const getProductsFromCategory = (index) => new Promise(async (resolve, reject) => {
  try {
    console.log(`Fetching Products from Category: ${categories[index].categoryName}`);
    // Create CSV File Header
    // const fileName = `csvs/${moment().format('MM-DD-YYYY')}_${keys.botName}_${categories[index].categoryName}.csv`.replace(/ /g, '').toLowerCase();
    // const csvHeader = 'Handle,Title,Body,Vendor,Type,Tags,published,Option1 Name,Option1 Value,Option2 Name, Option2 value, Option3 Name, Option3 value, Variant SKU, Grams, Variant Inventory Tracker, Variant Inventory Qty, Variant Inventory Policy, Variant Fulfillment Service, Variant Price, Variant Compare At Price, Variant Requires Shipping, Variant Taxable, Variant Barcode, Image Src, Image Src, Image Src, Image Src, Image Alt Text, Gift Card, SEO Title, SEO Description, Google Shopping / Google Product Category, Google Shopping / Gender, Google Shopping / MPN, Google Shopping / Age Group, Google Shopping / AdWords Grouping, Google Shopping / Adwords Labels, Google Shopping / Condition, Google Shopping / Custom Product, Google Shopping / Custom Label 0, Google Shopping / Custom Label 1, Google Shopping / Custom Label 2, Google Shopping / Custom Label 3, Google Shopping / Custom Label 4, Variant Image, Variant Weight Unit, Variant Tax Code\r\n';
    // Helper.saveDataToFile(fileName, csvHeader);

    const limit = pLimit(10);
    const promises = [];

    for (let i = 0; i < categories[index].products.length; i++) {
      promises.push((limit(() => getProduct(index, i))));
      // await getProduct(index, i);
    }

    await Promise.all(promises);

    resolve(products);
  } catch (error) {
    console.log(`getProductsFromCategory Error: ${error}`);
    reject(error);
  }
});

const getProduct = (categoryIndex, productIndex) => new Promise(async (resolve, reject) => {
  let page;
  try {
    page = await pupHelper.launchPage(browser);
    
    console.log(`${productIndex + 1}/${categories[categoryIndex].products.length} - Fetching: ${categories[categoryIndex].products[productIndex].url}`);
    await page.goto(categories[categoryIndex].products[productIndex].url, {waitUntil: 'load', timeout: 0});

    categories[categoryIndex].products[productIndex].title = await pupHelper.getTxt('h1.buying-controls_title > span[itemprop="name"]', page);
    if (categories[categoryIndex].products[productIndex].title !== '') {
      categories[categoryIndex].products[productIndex].handle = await pupHelper.getAttr('ul.pdp_images-list', 'data-product-code', page);
      const body1 = await pupHelper.getHTML('section.product-info_overview', page);
      const body2 = await pupHelper.getHTML('section.product-info_details', page);
      categories[categoryIndex].products[productIndex].body = body1 + body2;
      categories[categoryIndex].products[productIndex].vendor = 'HARRODS';
      categories[categoryIndex].products[productIndex].type = categories[categoryIndex].type;
      categories[categoryIndex].products[productIndex].tags = keys.commontags.join(',') + ',' + categories[categoryIndex].tags.join(',');
      categories[categoryIndex].products[productIndex].price = Helper.clearPrice(await pupHelper.getTxt('.buying-controls_price > .price > .price_amount', page))
      categories[categoryIndex].products[productIndex].option1name = 'Sizes';
      categories[categoryIndex].products[productIndex].option2name = 'Colours';
      categories[categoryIndex].products[productIndex].images = await pupHelper.getAttrMultiple('.hrd_gallery-thumbs-list > li.hrd_gallery-thumbs-item > a.hrd_gallery-thumbs-link > img.hrd_gallery-thumbs-image', 'src', page);
      categories[categoryIndex].products[productIndex].images = categories[categoryIndex].products[productIndex].images.map((img) => 'https:' + img.replace(/\?.*$/gi, ''));
      categories[categoryIndex].products[productIndex].seotitle = await page.title();
      categories[categoryIndex].products[productIndex].googleproductcategory = categories[categoryIndex].googleproductcategory;
      categories[categoryIndex].products[productIndex].variants = [];
      categories[categoryIndex].products[productIndex].gtin = '';
      categories[categoryIndex].products[productIndex].color = await pupHelper.getTxt('.buying-controls_option--colour > span.buying-controls_value', page);
      if (categories[categoryIndex].products[productIndex].color == '') categories[categoryIndex].products[productIndex].color = 'N/A';
      categories[categoryIndex].products[productIndex].sizes = await pupHelper.getTxtMultiple('select[name="productSize"] > option', page);
      if (categories[categoryIndex].products[productIndex].sizes.length == 0) {
        const size = await pupHelper.getTxt('.buying-controls_option--size > span.buying-controls_value', page);
        if (size !== '') categories[categoryIndex].products[productIndex].sizes.push(size);
      };
      // const variants = await fetchSizes();
      // if (variants.length > 0) {
        // for (let a = 0; a < variants.length; a++) {
          // const singleVariant = {
            // option1value: variants[a],
            // option2value: newProduct.color,
          // };
          // newProduct.variants.push(singleVariant);
          // let csvText;
          // if (a == 0) {
        //     csvText = `"${newProduct.handle}","${newProduct.title}","${newProduct.body.replace(/"/g, "'")}","${newProduct.vendor}","${newProduct.type}","${newProduct.tags}","TRUE","${newProduct.option1name}","${singleVariant.option1value}","${newProduct.option2name}","${singleVariant.option2value}","","","","150","shopify","5","deny","manual","${newProduct.price}","","TRUE","FALSE","${newProduct.gtin}","${newProduct.images[0] ? newProduct.images[0] : ''}","${newProduct.images[1] ? newProduct.images[1] : ''}","${newProduct.images[2] ? newProduct.images[2] : ''}","${newProduct.images[3] ? newProduct.images[3] : ''}","","FALSE","${newProduct.seotitle}","${newProduct.body.replace(/"/g, "'")}","${newProduct.googleproductcategory}","","","","","","","","","","","","","","kg",""\r\n`;
        //   } else {
        //     csvText = `"${newProduct.handle}","${newProduct.title}","","","","","","${newProduct.option1name}","${singleVariant.option1value}","${newProduct.option2name}","${singleVariant.option2value}","","","","150","shopify","5","deny","manual","${newProduct.price}","","TRUE","FALSE","${newProduct.gtin}","","","","","","FALSE","","","","","","","","","","","","","","","","","kg",""\r\n`;
        //   }
        //   Helper.saveDataToFile(fileName, csvText);
        // };
      // } else {
      //   const colorVal = newProduct.color;
      //   csvText = `"${newProduct.handle}","${newProduct.title}","${newProduct.body.replace(/"/g, "'")}","${newProduct.vendor}","${newProduct.type}","${newProduct.tags}","TRUE","${newProduct.option1name}","N/A","${newProduct.option2name}","${colorVal}","","","","150","shopify","5","deny","manual","${newProduct.price}","","TRUE","FALSE","${newProduct.gtin}","${newProduct.images[0] ? newProduct.images[0] : ''}","${newProduct.images[1] ? newProduct.images[1] : ''}","${newProduct.images[2] ? newProduct.images[2] : ''}","${newProduct.images[3] ? newProduct.images[3] : ''}","","FALSE","${newProduct.seotitle}","${newProduct.body.replace(/"/g, "'")}","${newProduct.googleproductcategory}","","","","","","","","","","","","","","kg",""\r\n`;
      //   Helper.saveDataToFile(fileName, csvText);
      // }
    } else {
      console.log(`Skipping product.. Title not found..`);
    }
    
    await page.close();
    resolve();
  } catch (error) {
    await page.close();
    console.log(`getProduct ${categories[categoryIndex].products[productIndex].url} Error: ${error}`);
    reject(error);
  }
})

const fetchGtin = () => new Promise(async (resolve, reject) => {
  try {
    let gtin = '';
    const gtinNode = await page.$('strong > span > a[title="Delivery"]');
    if (gtinNode) {
      gtin = await page.$eval(
          'strong > span > a[title="Delivery"]',
          (elm) => elm.getAttribute('href').match(/(?<=\?TS=).*(?=&cat)/gi)[0]
      );
    }
    resolve(gtin);
  } catch (error) {
    console.log(`fetchGtin Error: ${error}`);
    reject(error);
  }
})


const fetchSizes = () => new Promise(async (resolve, reject) => {
  try {
    let sizeTags = '';
    const sizesNode = await page.$('.ProductSizes-list');
    if (sizesNode) {
      sizeTags = await page.$$eval(
          '.ProductSizes-list > button.ProductSizes-button span',
          (elms) => elms.map((elm) => elm.innerText.trim())
      );
    } else {
      sizeTags = await page.$$eval(
          'select#productSizes option:not(:first-of-type)',
          (elms) => elms.map((elm) => {
            const sizeVal = elm.innerText.trim();
            if (sizeVal.toLowerCase().includes(':')) {
              return sizeVal.match(/(?<=size).*(?=:)/gi)[0].trim();
            } else {
              return sizeVal.match(/(?<=size).*/gi)[0].trim();
            }
          })
      );
    }
    resolve(sizeTags);
  } catch (error) {
    console.log(`fetchSizes Error: ${error}`)
    reject(error);
  }
});

const fetchColors = () => new Promise(async (resolve, reject) => {
  try {
    let color = '';
    const body = await page.$eval('.ProductDescription-productDetails', (elm) => elm.innerText.trim());
    const colorRegex = new RegExp('(?<=Colour:).*', 'gi');
    if (colorRegex.test(body)) {
      color = body.match(colorRegex)[0].trim();
    } else {
      color = 'N/A';
    }
    resolve(color);
  } catch (error) {
    console.log(`fetchColors Error: ${error}`);
    reject(error);
  }
});

const fetchProductCode = () => new Promise(async (resolve, reject) => {
  try {
    let productCode = '';
    const body = await page.$eval('.ProductDescription-productDetails', (elm) => elm.innerText.trim());
    const prodCodeRx1 = new RegExp('(?<=Product Code:).*', 'gi');
    const prodCodeRx2 = new RegExp('(?<=Code:).*', 'gi');
    if (prodCodeRx1.test(productCode)) {
      productCode = body.match(prodCodeRx1)[0].trim();
    } else {
      productCode = body.match(prodCodeRx2)[0].trim();
    }
    resolve(productCode);
  } catch (error) {
    console.log(`fetchProductCode Error: ${error}`);
    reject(error);
  }
});

const fetchPrice = () => new Promise(async (resolve, reject) => {
  try {
    let price = '';
    const priceNode = await page.$('.ProductDetail-priceWrapper > .HistoricalPrice > .Price');
    const priceNode2 = await page.$('.ProductDetail-priceWrapper > .HistoricalPrice > .HistoricalPrice-old > .Price');
    if (priceNode) {
      price = await page.$eval('.ProductDetail-priceWrapper > .HistoricalPrice > .Price', (elm) => elm.innerText.trim());
      price = Helper.clearPrice(price);
    } else if (priceNode2) {
      await page.waitForSelector('.ProductDetail-priceWrapper > .HistoricalPrice > .HistoricalPrice-old > .Price');
      price = await page.$eval('.ProductDetail-priceWrapper > .HistoricalPrice > .HistoricalPrice-old > .Price', (elm) => elm.innerText.trim());
      price = Helper.clearPrice(price);
    } else {
      await page.waitForSelector('.Bundles-header > .Bundles-price > .Price');
      price = await page.$eval('.Bundles-header > .Bundles-price > .Price', (elm) => elm.innerText.trim());
      price = Helper.clearPrice(price);
    }
    resolve(price);
  } catch (error) {
    console.log(`fetchPrice Error: ${error}`);
    reject(error);
  }
});

const fetchImages = () => new Promise(async (resolve, reject) => {
  try {
    const images = [];
    await page.waitForSelector('.Carousel-imageCarousel');
    const imagesCount = await page.$$('.Carousel-images > .Carousel-list > .Carousel-item');
    for (let i = 0; i < imagesCount.length; i++) {
      const imgNode = await page.$(`.Carousel-images > .Carousel-list > .Carousel-item:nth-of-type(${i + 1}) img.Carousel-image`);
      if (imgNode) {
        const image = await page.$eval(
            `.Carousel-images > .Carousel-list > .Carousel-item:nth-of-type(${i + 1}) img.Carousel-image`,
            (elm) => 'https:' + elm.getAttribute('src').trim().replace('?$w700', '?$w1300')
        );
        images.push(image);
      }
      const imageRightNode = await page.$('.Carousel-imageCarousel > .Carousel-arrow--right');
      if (imageRightNode) {
        await page.click('.Carousel-imageCarousel > .Carousel-arrow--right');
      }
      await page.waitFor(500);
    };
    resolve(images);
  } catch (error) {
    console.log(`fetchImages Error: ${error}`);
    reject(error);
  }
});

const fetchProductTitle = () => new Promise(async (resolve, reject) => {
  try {
    let productTitle = '';
    const productTitleNode = await page.$('h1.ProductDetail-title');
    if (productTitleNode) {
      productTitle = await page.$eval(
          'h1.ProductDetail-title',
          (elm) => elm.innerText.trim()
      );
    }
    resolve(productTitle);
  } catch (error) {
    console.log(`fetchProductTitle Error: ${error}`);
    reject(error);
  }
});

const saveProductsToShopify = (products) => new Promise(async (resolve, reject) => {
  try {
    for (let i = 0; i < products.length; i++) {
      const foundProduct = await shopifyHelper.getProductbyHandle(products[i].handle);
      if (foundProduct === 'Not Found') {
        const newProduct = shopifyHelper.createProductObjectForShopify(products[i]);
        await shopifyHelper.uploadProduct(newProduct);
      }
    }
  } catch (error) {
    console.log(`saveProductsToShopify Error: ${error}`);
    reject(error);
  }
});

this.run()