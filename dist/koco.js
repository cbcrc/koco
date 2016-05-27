(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['exports', 'knockout', './router', './koco-component-loader', './koco-component-loader-router-plugin'], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports, require('knockout'), require('./router'), require('./koco-component-loader'), require('./koco-component-loader-router-plugin'));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports, global.knockout, global.router, global.kocoComponentLoader, global.kocoComponentLoaderRouterPlugin);
        global.koco = mod.exports;
    }
})(this, function (exports, _knockout, _router, _kocoComponentLoader, _kocoComponentLoaderRouterPlugin) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _knockout2 = _interopRequireDefault(_knockout);

    var _router2 = _interopRequireDefault(_router);

    var _kocoComponentLoader2 = _interopRequireDefault(_kocoComponentLoader);

    var _kocoComponentLoaderRouterPlugin2 = _interopRequireDefault(_kocoComponentLoaderRouterPlugin);

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

    var Koco = function () {
        function Koco(name) {
            _classCallCheck(this, Koco);

            this.isInitialized = false;
            this._router = null;
        }

        _createClass(Koco, [{
            key: 'init',
            value: function init(settings) {
                if (this.isInitialized) {
                    throw 'koco is already initialized.';
                }

                this.isInitialized = true;

                // todo: private - see http:// stackoverflow.com/a/22160051
                this._router = new _router2.default(settings);

                _knockout2.default.components.loaders.unshift(new _kocoComponentLoader2.default({
                    plugins: [new _kocoComponentLoaderRouterPlugin2.default(this._router)]
                }));
            }
        }, {
            key: 'registerPage',
            value: function registerPage(name, pageConfig) {
                if (!this.isInitialized) {
                    throw 'koco is not is not initialized yet.';
                }

                this._router.registerPage(name, pageConfig);
            }
        }, {
            key: 'isRegisteredPage',
            value: function isRegisteredPage(name) {
                if (!this.isInitialized) {
                    throw 'koco is not is not initialized yet.';
                }

                return this._router.isRegisteredPage(name);
            }
        }, {
            key: 'addRoute',
            value: function addRoute(pattern, routeConfig) {
                if (!this.isInitialized) {
                    throw 'koco is not is not initialized yet.';
                }

                this._router.addRoute(pattern, routeConfig);
            }
        }, {
            key: 'setUrlSilently',
            value: function setUrlSilently(options) {
                if (!this.isInitialized) {
                    throw 'koco is not is not initialized yet.';
                }

                this._router.setUrlSilently(options);
            }
        }, {
            key: 'navigateAsync',
            value: function navigateAsync(url, options) {
                if (!this.isInitialized) {
                    throw 'koco is not is not initialized yet.';
                }

                return this._router.navigateAsync(url, options);
            }
        }, {
            key: 'registerComponent',
            value: function registerComponent(name, config) {
                if (!this.isInitialized) {
                    throw 'koco is not is not initialized yet.';
                }

                _knockout2.default.components.register(name, config || {});
            }
        }, {
            key: 'fireAsync',
            value: function fireAsync() {
                var _this = this;

                if (!this.isInitialized) {
                    throw 'koco is not is not initialized yet.';
                }

                // how come I have to do this?
                var self = this;
                // should return context (to be renamed to viewModel since
                // the root level of the hierarchy refers to the viewModel
                // parameter you supplied to ko.applyBindings(viewModel)
                // http:// knockoutjs.com/documentation/binding-context.html)
                return new Promise(function (resolve, reject) {
                    try {
                        _this.navigateAsync('', {
                            replace: true
                        }).then(function () {
                            resolve({ kocoContext: self._router.context });
                        }).catch(function () {
                            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                                args[_key] = arguments[_key];
                            }

                            reject(args);
                        });
                    } catch (err) {
                        reject(err);
                    }
                });
            }
        }, {
            key: 'router',
            get: function get() {
                if (!this.isInitialized) {
                    throw 'koco is not is not initialized yet.';
                }

                return this._router;
            }
        }]);

        return Koco;
    }();

    exports.default = new Koco();
});