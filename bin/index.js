'use strict';

var validateTemplate = function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(templatePath, delay) {
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return validate(templatePath, delay);

          case 3:
            _context.next = 8;
            break;

          case 5:
            _context.prev = 5;
            _context.t0 = _context['catch'](0);

            console.log(_context.t0);

          case 8:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[0, 5]]);
  }));

  return function validateTemplate(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

var validateTemplates = function () {
  var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(rootPath, delay) {
    var _ref3, templates, templatePaths;

    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.prev = 0;
            _context2.next = 3;
            return getTemplates(rootPath);

          case 3:
            _ref3 = _context2.sent;
            templates = _ref3.templates;
            templatePaths = templates.map(function (template) {
              return template.path;
            });

            console.log(chalk.yellow('Found ' + templatePaths.length + ' template' + (templatePaths.length !== 1 ? 's' : '') + '\r\n' + rootPath));
            console.log(chalk.yellow(templatePaths.join(',\n').replace(new RegExp(rootPath, 'g'), ' └ ')));
            console.log(chalk.yellow('---------------------------'));
            templatePaths.forEach(function (template) {
              return queue.add(function () {
                return validateTemplate(template, delay);
              });
            });
            _context2.next = 16;
            break;

          case 12:
            _context2.prev = 12;
            _context2.t0 = _context2['catch'](0);

            console.log(chalk.red('[ERROR] ' + _context2.t0.message));
            process.exit(1);

          case 16:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[0, 12]]);
  }));

  return function validateTemplates(_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
}();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var klaw = require('klaw');
var path = require('path');
var fs = require('fs-extra');
var AWS = require('aws-sdk');
var Queue = require('promise-queue');
var chalk = require('chalk');

var maxConcurrent = 1;
var maxQueue = Infinity;
var queue = new Queue(maxConcurrent, maxQueue);

var config = {
  region: AWS.config.region || 'eu-west-1'
};

var cloudFormation = new AWS.CloudFormation(config);

var getTemplates = function getTemplates(rootPath) {
  return new Promise(function (resolve, reject) {
    var templates = [];
    var counter = 0;
    klaw(rootPath).on('data', function (item) {
      var ext = path.extname(item.path);
      if (['.yml', '.json'].includes(ext)) {
        var contents = fs.readFileSync(item.path).toString();
        counter = counter + 1;
        if (counter > 1000) {
          return reject(new Error('Lots of json and yml files found, is \'' + rootPath + '/*\' really the path you want to validate?'));
        } else if (/AWSTemplateFormatVersion/g.test(contents)) {
          templates.push(item);
        }
      }
    }).on('error', function (error, item) {
      return reject(error);
    }).on('end', function () {
      return resolve({ templates: templates });
    });
  });
};

var validate = function validate(templatePath, delay) {
  return new Promise(function (resolve) {
    console.log('Validate:', templatePath);
    return setTimeout(function () {
      return cloudFormation.validateTemplate({
        TemplateBody: fs.readFileSync(templatePath).toString()
      }).promise().then(function (result) {
        console.log(chalk.green(' \u2713 [' + templatePath + ']'));
        return resolve(result);
      }).catch(function (error) {
        console.log(chalk.red(' \u2717 [' + templatePath + ']'));
        console.log(chalk.red(JSON.stringify(error, null, 2)));
        return resolve({ error: error });
      });
    }, delay);
  });
};

module.exports = {
  validateTemplates: validateTemplates,
  validateTemplate: validateTemplate
};