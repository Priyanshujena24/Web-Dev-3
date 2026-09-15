#!/usr/bin/env node
'use strict';

// Usage: node calculator.js <add|subtract|multiply|divide> <number> <number>
const [, , operation, firstValue, secondValue] = process.argv;

console.log('Calculator started. Arguments:', process.argv.slice(2));

const left = Number(firstValue);
const right = Number(secondValue);

if (!operation || firstValue === undefined || secondValue === undefined) {
  console.error('Usage: node calculator.js <add|subtract|multiply|divide> <number> <number>');
  process.exitCode = 1;
} else if (!Number.isFinite(left) || !Number.isFinite(right)) {
  console.error('Error: both values must be valid finite numbers.');
  process.exitCode = 1;
} else {
  const operations = {
    add: () => left + right,
    subtract: () => left - right,
    multiply: () => left * right,
    divide: () => {
      if (right === 0) throw new Error('cannot divide by zero');
      return left / right;
    },
  };

  try {
    if (!operations[operation]) {
      throw new Error(`unsupported operation "${operation}"`);
    }
    console.log(`Result: ${operations[operation]()}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

