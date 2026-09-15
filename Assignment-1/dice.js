#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const { log } = require('./modules/logger');

const requestedRolls = process.argv[2] ?? '1';
const rolls = Number(requestedRolls);

if (!Number.isInteger(rolls) || rolls < 1 || rolls > 100) {
  console.error('Provide a whole number of rolls from 1 to 100. Example: node dice.js 3');
  process.exitCode = 1;
} else {
  log(`Rolling ${rolls} dice...`);
  for (let index = 1; index <= rolls; index += 1) {
    const value = crypto.randomInt(1, 7);
    console.log(`Dice Rolled (${index}): ${value}`);
  }
}

