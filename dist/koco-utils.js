(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports);
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports);
        global.kocoUtils = mod.exports;
    }
})(this, function (exports) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.requireIt = requireIt;
    exports.requireItNpm = requireItNpm;
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
});