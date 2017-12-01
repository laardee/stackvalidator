#!/usr/bin/env node


'use strict';

require('babel-polyfill');

var _require = require('./index'),
    validateTemplate = _require.validateTemplate,
    validateTemplates = _require.validateTemplates;

var fs = require('fs-extra');
var path = require('path');
var chalk = require('chalk');
var args = require('yargs').argv;

console.log(chalk.yellow('***** AWS CloudFormation Stack Validator *****'));
console.log(chalk.yellow('usage: stackvalidator --path=path-to-stacks --delay=offset-in-ms'));

var normalizedPath = path.normalize(args.path || '.');
var delay = args.delay || 100;

fs.lstat(normalizedPath, function (error, stats) {
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