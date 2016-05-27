(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['exports', 'knockout', './koco-utils'], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports, require('knockout'), require('./koco-utils'));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports, global.knockout, global.kocoUtils);
        global.kocoComponentLoader = mod.exports;
    }
})(this, function (exports, _knockout, _kocoUtils) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _knockout2 = _interopRequireDefault(_knockout);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var DEFAULT_OPTIONS = {
        localBasePath: '.',
        plugins: []
    };

    var DEFAULT_COMPONENT_CONFIG = {
        type: 'component'
    };

    var KocoComponentLoader = function () {
        function KocoComponentLoader(options) {
            _classCallCheck(this, KocoComponentLoader);

            this.options = Object.assign({}, DEFAULT_OPTIONS, options);
        }

        // second


        _createClass(KocoComponentLoader, [{
            key: 'loadComponent',
            value: function loadComponent(name, componentConfig, callback) {
                var _this = this;

                var finalComponentConfig = Object.assign({}, DEFAULT_COMPONENT_CONFIG, componentConfig);

                // todo: isBower, isNpm --else it is local
                // basePath = 'bower_components/koco-' + name + '/src';
                // todo: basePath override on componentConfig
                // componentConfig.basePath

                if (finalComponentConfig.type === 'component') {
                    (function () {
                        var componentFullName = name + '-component';
                        var basePath = finalComponentConfig.basePath || _this.options.localBasePath + '/' + componentFullName;
                        var moduleName = basePath + '/' + componentFullName;

                        var imported = (0, _kocoUtils.importModule)(moduleName, finalComponentConfig.isHtmlOnly, finalComponentConfig.isNpm);

                        var result = {
                            template: _knockout2.default.utils.parseHtmlFragment(imported.templateString)
                        };

                        if (finalComponentConfig.htmlOnly !== true) {
                            result.createViewModel = function (params, componentInfo) {
                                if ((0, _kocoUtils.isFunction)(imported.viewModel)) {
                                    var ViewModel = imported.viewModel;
                                    return new ViewModel(params, componentInfo);
                                }

                                return imported.viewModel;
                            };
                        }

                        callback(result);
                    })();
                } else {
                    (function () {
                        var component = void 0;

                        // http://stackoverflow.com/a/6260865
                        _this.options.plugins.some(function (plugin) {
                            component = plugin.loadComponent(name, finalComponentConfig);
                            return !!component;
                        });

                        if (component) {
                            callback(component);
                        } else {
                            throw new Error('Unsupported component type: ' + finalComponentConfig.type);
                        }
                    })();
                }
            }
        }]);

        return KocoComponentLoader;
    }();

    exports.default = KocoComponentLoader;
});