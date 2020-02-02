const keys = require('../config/keys');
const axios = require('axios');

module.exports.getProductbyHandle = (handle) => new Promise((resolve, reject) => {
  const url = `https://${keys.shopifyShopName}/admin/api/2019-10/products.json?handle=${handle}`;
  const options = {
    method: 'GET',
    url: url,
    json: true,
    headers: {
      'X-Shopify-Access-Token': keys.shopifyAccessToken,
      'content-type': 'application/json',
    },
  };
  axios(options)
      .then((resp) => {
        const {products} = resp.data;
        if (products.length == 0) {
          resolve('Not Found');
        } else if (products.length > 1) {
          resolve('Found More Than One Product');
        } else {
          resolve(products[0]);
        }
      })
      .catch((error) => {
        console.log(`Shopify getProduct Error: ${error}`);
        reject(error);
      });
});

module.exports.uploadProduct = (product) => new Promise((resolve, reject) => {
  const url = `https://${keys.shopifyShopName}/admin/api/2019-10/products.json`;
  const options = {
    method: 'POST',
    url: url,
    headers: {
      'X-Shopify-Access-Token': keys.shopifyAccessToken,
      'content-type': 'application/json',
    },
    data: product,
  };
  axios(options)
      .then((resp) => {
        const response = resp.data;
        resolve(response);
      })
      .catch((error) => {
        console.log(`Shopify uploadProduct Error: ${error}`);
        reject(error);
      });
});

module.exports.createProductObjectForShopify = (product) => {
  const productObject = {
    product: {
      handle: product.handle,
      title: product.title,
      body_html: product.body,
      vendor: product.vendor,
      product_type: product.type,
      tags: product.tag,
      variants: [],
      options: [{
        name: 'Sizes',
        values: ['34R', '36R', '38R', '40R', '42R', '44R', '46R', '48R'],
      },
      {
        name: 'Colours',
        values: [product.color],
      },
      ],
      images: [],
    },
  };
  if (product.variants.length > 0) {
    for (let i = 0; i < product.variants.length; i++) {
      const variant = {
        title: `${product.variants[i].option1value} / ${product.color}`,
        price: product.price,
        inventory_policy: 'deny',
        fulfillment_service: 'manual',
        inventory_management: 'shopify',
        option1: product.variants[i].option1value,
        option2: product.color,
        grams: 0,
        weight: 0,
        weight_unit: 'kg',
        inventory_quantity: 5,
        old_inventory_quantity: 5,
        requires_shipping: true,
        taxable: false,
        barcode: '',
      };
      productObject.product.variants.push(variant);
    }
  } else {
    const variant = {
      title: `N/A / ${product.color}`,
      price: product.price,
      inventory_policy: 'deny',
      fulfillment_service: 'manual',
      inventory_management: 'shopify',
      option1: product.variants[i].option1value,
      option2: product.color,
      grams: 0,
      weight: 0,
      weight_unit: 'kg',
      inventory_quantity: 5,
      old_inventory_quantity: 5,
      requires_shipping: true,
      taxable: false,
      barcode: '',
    };
    productObject.product.variants.push(variant);
  }
  for (let i = 0; i < product.images.length; i++) {
    const img = {
      src: product.images[i]
    };
    productObject.images.push(img);
  }
  return productObject;
};
