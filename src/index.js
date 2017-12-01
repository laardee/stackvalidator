'use strict';

const klaw = require('klaw');
const path = require('path');
const fs = require('fs-extra');
const AWS = require('aws-sdk');
const Queue = require('promise-queue');
const chalk = require('chalk');

const maxConcurrent = 1;
const maxQueue = Infinity;
const queue = new Queue(maxConcurrent, maxQueue);

const config = {
  region: AWS.config.region || 'eu-west-1',
};

const cloudFormation = new AWS.CloudFormation(config);

const getTemplates = (rootPath) =>
  new Promise((resolve, reject) => {
    const templates = [];
    let counter = 0;
    klaw(rootPath)
      .on('data', item => {
        const ext = path.extname(item.path);
        if (['.yml', '.json'].includes(ext)) {
          const contents = fs.readFileSync(item.path).toString();
          counter = counter + 1;
          if (counter > 1000) {
            return reject(new Error(`Lots of json and yml files found, is '${rootPath}/*' really the path you want to validate?`))
          } else if ((/AWSTemplateFormatVersion/g).test(contents)){
            console.log(chalk.yellow(item.path.replace(new RegExp(rootPath, 'g'), ' └ ')));
            templates.push(item);
          }
        }
      })
      .on('error', (error, item) =>
        reject(error))
      .on('end', () =>
        resolve({ templates }));
  });

const validate = (templatePath, delay, count = 1, total = 1) =>
  new Promise((resolve) => {
      console.log(`Validate [${count}/${total}]: ${templatePath}`);
      return setTimeout(() => cloudFormation.validateTemplate({
        TemplateBody: fs.readFileSync(templatePath).toString()
      }).promise()
        .then(result => {
          console.log(chalk.green(` ✓ [${templatePath}]`));
          return resolve(result);
        })
        .catch(error => {
          console.log(chalk.red(` ✗ [${templatePath}]`));
          console.log(chalk.red(JSON.stringify(error, null, 2)));
          return resolve({error});
        }), delay)
    });

async function validateTemplate(templatePath, delay, count, total) {
  try {
    await validate(templatePath, delay, count, total);
  } catch (ex) {
    console.log(ex);
  }
}

const printPercent = (done, total) => {
  const number = done / total;
  const bar = '████████████████████';
  const count = Math.floor(number * bar.length);
  const meter = `${chalk.white(bar.substr(bar.length-count))}${chalk.gray(bar.substr(count))}`;
  console.log(meter, `${done} done out of ${total}`);
  // console.log('\x1Bc');
};

async function validateTemplates(rootPath, delay) {
  try {
    console.log(chalk.yellow(`Scanning templates...\r\n${rootPath}`));
    const { templates } = await getTemplates(rootPath);
    const templatePaths = templates.map(template => template.path);
    console.log(chalk.yellow(`Found ${templatePaths.length} template${templatePaths.length !== 1 ? 's' : ''}`));
    console.log(chalk.yellow('---------------------------'));
    templatePaths.map((template, index) =>
      queue.add(() =>
        validateTemplate(template, delay, index + 1, templatePaths.length)));
  } catch (exception) {
    console.log(chalk.red(`[ERROR] ${exception.message}`));
    process.exit(1);
  }
}

module.exports = {
  validateTemplates,
  validateTemplate,
};
