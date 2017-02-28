import ko from 'knockout';

export function requireIt(moduleName) {
  return require.context('../../../src/modules/', true, /.*\.(js|html)$/)(moduleName);
}

export function requireItNpm(moduleName) {
  return require.context('../../', true, /koco.*\/src\/.*\.(js|html)$/)(moduleName);
}

// http://stackoverflow.com/questions/5999998/how-can-i-check-if-a-javascript-variable-is-function-type
export function isFunction(functionToCheck) {
  const getType = {};

  return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

const DEFAULT_CONFIGS = {
  isHtmlOnly: false,
  isNpm: false,
  basePath: null,
  template: null
};

export function importModule(moduleName, configs) {
  const finalModuleConfigs = Object.assign({}, DEFAULT_CONFIGS, configs);
  const basePath = finalModuleConfigs.basePath ||
    (finalModuleConfigs.isNpm ? `koco-${moduleName}/src` : moduleName);
  const fullModuleName = `${basePath}/${moduleName}`;
  let htmlFile = finalModuleConfigs.template || `${fullModuleName}.html`;
  htmlFile = `./${htmlFile}`;
  const jsFile = `./${fullModuleName}-ui.js`;
  const imported = {
    templateString: finalModuleConfigs.isNpm ? requireItNpm(htmlFile) : requireIt(htmlFile)
  };

  if (finalModuleConfigs.isHtmlOnly !== true) {
    imported.viewModel = finalModuleConfigs.isNpm ?
      requireItNpm(jsFile).default : requireIt(jsFile).default;
  }

  return imported;
}

export function activate(configs, element, params, observableActivationFlag) {
  return new Promise((resolve, reject) => {
    try {
      const imported = importModule(configs.componentName, {
        isHtmlOnly: configs.isHtmlOnly,
        basePath: configs.basePath,
        isNpm: configs.isNpm,
        template: configs.template
      });
      const result = {
        template: ko.utils.parseHtmlFragment(imported.templateString)
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

        if (isFunction(result.viewModel.activate)) /* based on convention */ {
          if (observableActivationFlag) {
            observableActivationFlag(true);
          }

          result.viewModel.activate(params)
            .then(() => {
              if (observableActivationFlag) {
                observableActivationFlag(false);
              }
              resolve(result);
            })
            .catch((reason) => {
              if (observableActivationFlag) {
                observableActivationFlag(false);
              }
              reject(reason);
            });
        } else {
          resolve(result);
        }
      }
    } catch (err) {
      reject(err);
    }
  });
}

export function postActivate(configs, viewModel) {
  return new Promise((resolve, reject) => {
    try {
      if (configs.isHtmlOnly === true) {
        resolve();
      } else if (isFunction(viewModel.postActivate)) {
        viewModel.postActivate()
          .then(() => {
            resolve();
          })
          .catch((reason) => {
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
