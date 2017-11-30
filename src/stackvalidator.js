#!/usr/bin/env node

'use strict';

const {
  validateTemplate,
  validateTemplates
} = require('./index');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const args = require('yargs').argv;

console.log(chalk.yellow('***** AWS CloudFormation Stack Validator *****'));
console.log(chalk.yellow('usage: stackvalidator path-to-stacks offset-in-ms'));

const normalizedPath = path.normalize(args.path || '.');
const delay = args.delay || 100;

fs.lstat(normalizedPath, (error, stats) => {
  if (error) {
    return console.log(error);
  }
  if (stats && stats.isDirectory()) {
    return validateTemplates(path.resolve(normalizedPath), delay);
  } else if (stats && stats.isFile()) {
    return validateTemplate(path.resolve(normalizedPath), delay);
  }
  console.log('Invalid command.');
});
