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

const readTemplates = (rootPath) =>
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
            templates.push(item);
          }
        }
      })
      .on('error', (error, item) =>
        reject(error))
      .on('end', () =>
        resolve({ templates }));
  });

const validate = (templatePath, delay) =>
  new Promise((resolve) => {
      console.log('Validate:', templatePath);
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

async function validateTemplate(templatePath, delay) {
  try {
    await validate(templatePath, delay);
  } catch (ex) {
    console.log(ex);
  }
}

async function validateTemplates(rootPath, delay) {
  try {
    const { templates } = await readTemplates(rootPath);
    const templatePaths = templates.map(template => template.path);
    console.log(chalk.yellow(`Found ${templatePaths.length} template${templatePaths.length !== 1 ? 's' : ''}\r\n${rootPath}`));
    console.log(chalk.yellow(templatePaths.join(',\n').replace(new RegExp(rootPath, 'g'), ' └ ')));
    console.log(chalk.yellow('---------------------------'));
    templatePaths.forEach(template =>
      queue.add(() =>
        validateTemplate(template, delay)));
  } catch (exception) {
    console.log(chalk.red(`[ERROR] ${exception.message}`));
    process.exit(1);
  }

}

module.exports = {
  validateTemplates,
  validateTemplate,
};
