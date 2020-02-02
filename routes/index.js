const express = require('express');
const router = express.Router();
const helpers = require('../helpers/helpers');
const fs = require('fs');
const path = require('path');

router.get('/', async (req, res, next) => {
  const botSettings = await helpers.getBotSettings();
  res.status = 200;
  res.json(botSettings);
});

router.get('/status', (req, res, next) => {
  res.status = 200;
  res.json({
    status: 'BOT SERVER IS ACTIVE',
  });
});

router.get('/restart', (req, res, next) => {
  process.exit(0);
});

router.get('/downloadcsvs', (req, res, next) => {
  const csvsPath = path.resolve(__dirname, '../csvs.zip');
  if (fs.existsSync(csvsPath)) {
    res.download(csvsPath)
  } else {
    res.json({error: 'No CSVs found for Bot'});
  }
});

module.exports = router;
