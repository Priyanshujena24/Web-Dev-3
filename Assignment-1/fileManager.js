#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { log } = require('./modules/logger');

// Usage: node fileManager.js <create|read|update|delete> [file] [text]
const [, , action, fileName = 'test.txt', ...textParts] = process.argv;
const filePath = path.resolve(__dirname, fileName);
const text = textParts.join(' ') || 'Sample text written by Smart Utility Toolkit.\n';

const actions = {
  create() {
    log(`Creating ${fileName}...`);
    fs.writeFile(filePath, text, 'utf8', (error) => {
      if (error) return console.error(`Create failed: ${error.message}`);
      console.log(`Created: ${fileName}`);
    });
  },
  read() {
    log(`Reading ${fileName}...`);
    fs.readFile(filePath, 'utf8', (error, data) => {
      if (error) return console.error(`Read failed: ${error.message}`);
      console.log(`Contents of ${fileName}:\n${data}`);
    });
  },
  update() {
    log(`Updating ${fileName}...`);
    fs.appendFile(filePath, text, 'utf8', (error) => {
      if (error) return console.error(`Update failed: ${error.message}`);
      console.log(`Updated: ${fileName}`);
    });
  },
  delete() {
    log(`Deleting ${fileName}...`);
    fs.unlink(filePath, (error) => {
      if (error) return console.error(`Delete failed: ${error.message}`);
      console.log(`Deleted: ${fileName}`);
    });
  },
};

if (!action || !actions[action]) {
  console.error('Usage: node fileManager.js <create|read|update|delete> [file] [text]');
  process.exitCode = 1;
} else {
  actions[action]();
  log('File operation was scheduled asynchronously.');
}

