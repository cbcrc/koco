'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.isFunction = isFunction;
exports.importModule = importModule;
function requireIt(moduleName) {
    return require.context('../../../modules/', true, /.*\.(js|html)$/)(moduleName);
}

function requireItNpm(moduleName) {
    return require.context('../../', true, /koco.*\/src\/.*\.(js|html)$/)(moduleName);
}

// http://stackoverflow.com/questions/5999998/how-can-i-check-if-a-javascript-variable-is-function-type
function isFunction(functionToCheck) {
    var getType = {};

    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

function importModule(moduleName, htmlOnly, isNpm) {
    var htmlFile = moduleName + '.html';
    var jsFile = moduleName + '.js';
    var imported = {
        templateString: isNpm ? requireItNpm(htmlFile) : requireIt(htmlFile)
    };

    if (htmlOnly !== true) {
        imported.viewModel = isNpm ? requireItNpm(jsFile).default : requireIt(jsFile).default;
    }

    return imported;
}