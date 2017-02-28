(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports', 'knockout'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require('knockout'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.knockout);
    global.kocoUtils = mod.exports;
  }
})(this, function (exports, _knockout) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.requireIt = requireIt;
  exports.requireItNpm = requireItNpm;
  exports.isFunction = isFunction;
  exports.importModule = importModule;
  exports.activate = activate;
  exports.postActivate = postActivate;

  var _knockout2 = _interopRequireDefault(_knockout);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function requireIt(moduleName) {
    return require.context('../../../src/modules/', true, /.*\.(js|html)$/)(moduleName);
  }

  function requireItNpm(moduleName) {
    return require.context('../../', true, /koco.*\/src\/.*\.(js|html)$/)(moduleName);
  }

  // http://stackoverflow.com/questions/5999998/how-can-i-check-if-a-javascript-variable-is-function-type
  function isFunction(functionToCheck) {
    var getType = {};

    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
  }

  var DEFAULT_CONFIGS = {
    isHtmlOnly: false,
    isNpm: false,
    basePath: null,
    template: null
  };

  function importModule(moduleName, configs) {
    var finalModuleConfigs = Object.assign({}, DEFAULT_CONFIGS, configs);
    var basePath = finalModuleConfigs.basePath || (finalModuleConfigs.isNpm ? 'koco-' + moduleName + '/src' : moduleName);
    var fullModuleName = basePath + '/' + moduleName;
    var htmlFile = finalModuleConfigs.template || fullModuleName + '.html';
    htmlFile = './' + htmlFile;
    var jsFile = './' + fullModuleName + '-ui.js';
    var imported = {
      templateString: finalModuleConfigs.isNpm ? requireItNpm(htmlFile) : requireIt(htmlFile)
    };

    if (finalModuleConfigs.isHtmlOnly !== true) {
      imported.viewModel = finalModuleConfigs.isNpm ? requireItNpm(jsFile).default : requireIt(jsFile).default;
    }

    return imported;
  }

  function activate(configs, element, params, observableActivationFlag) {
    return new Promise(function (resolve, reject) {
      try {
        (function () {
          var imported = importModule(configs.componentName, {
            isHtmlOnly: configs.isHtmlOnly,
            basePath: configs.basePath,
            isNpm: configs.isNpm,
            template: configs.template
          });
          var result = {
            template: _knockout2.default.utils.parseHtmlFragment(imported.templateString)
          };

          if (configs.isHtmlOnly === true) {
            resolve(result);
          } else {
            if (isFunction(imported.viewModel)) {
              result.viewModel = new imported.viewModel(params, {
                element: element,
                templateNodes: result.template
              });
            } else {
              result.viewModel = imported.viewModel;
            }

            if (isFunction(result.viewModel.activate)) /* based on convention */{
                if (observableActivationFlag) {
                  observableActivationFlag(true);
                }

                result.viewModel.activate(params).then(function () {
                  if (observableActivationFlag) {
                    observableActivationFlag(false);
                  }
                  resolve(result);
                }).catch(function (reason) {
                  if (observableActivationFlag) {
                    observableActivationFlag(false);
                  }
                  reject(reason);
                });
              } else {
              resolve(result);
            }
          }
        })();
      } catch (err) {
        reject(err);
      }
    });
  }

  function postActivate(configs, viewModel) {
    return new Promise(function (resolve, reject) {
      try {
        if (configs.isHtmlOnly === true) {
          resolve();
        } else if (isFunction(viewModel.postActivate)) {
          viewModel.postActivate().then(function () {
            resolve();
          }).catch(function (reason) {
            reject(reason);
          });
        } else {
          resolve();
        }
      } catch (err) {
        reject(err);
      }
    });
  }
});