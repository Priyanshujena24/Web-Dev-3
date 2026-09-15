'use strict';

const isEven = require('./modules/isEven');
const { log } = require('./modules/logger');

const suppliedNumber = process.argv[2] ?? '10';
const number = Number(suppliedNumber);

log('Module demonstration started.');
if (!Number.isInteger(number)) {
  console.error('Please provide an integer. Example: node app.js 12');
  process.exitCode = 1;
} else {
  console.log(`${number} is ${isEven(number) ? 'even' : 'odd'}.`);
  log('Module demonstration finished.');
}

