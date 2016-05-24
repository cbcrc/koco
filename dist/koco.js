'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
// import {  } from './koco-utils';


var _knockout = require('knockout');

var _knockout2 = _interopRequireDefault(_knockout);

var _router = require('./router');

var _router2 = _interopRequireDefault(_router);

var _kocoComponentLoader = require('./koco-component-loader');

var _kocoComponentLoader2 = _interopRequireDefault(_kocoComponentLoader);

var _kocoComponentLoaderRouterPlugin = require('./koco-component-loader-router-plugin');

var _kocoComponentLoaderRouterPlugin2 = _interopRequireDefault(_kocoComponentLoaderRouterPlugin);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// todo: export function instead of class
// like redux expose multiple functions that you can pick and choose

var Koco = function () {
    // todo: options
    // ex. unknownRouteHandler, guardRoute, etc.

    function Koco(settings) {
        _classCallCheck(this, Koco);

        // todo: private - see http:// stackoverflow.com/a/22160051
        this.router = new _router2.default(settings);

        _knockout2.default.components.loaders.unshift(new _kocoComponentLoader2.default({
            plugins: [new _kocoComponentLoaderRouterPlugin2.default(this.router)]
        }));
    }

    _createClass(Koco, [{
        key: 'registerPage',
        value: function registerPage(name, pageConfig) {
            this.router.registerPage(name, pageConfig);
        }
    }, {
        key: 'isRegisteredPage',
        value: function isRegisteredPage(name) {
            return this.router.isRegisteredPage(name);
        }
    }, {
        key: 'addRoute',
        value: function addRoute(pattern, routeConfig) {
            this.router.addRoute(pattern, routeConfig);
        }
    }, {
        key: 'setUrlSilently',
        value: function setUrlSilently(options) {
            this.router.setUrlSilently(options);
        }
    }, {
        key: 'navigateAsync',
        value: function navigateAsync(url, options) {
            return this.router.navigateAsync(url, options);
        }
    }, {
        key: 'registerComponent',
        value: function registerComponent(name, config) {
            _knockout2.default.components.register(name, config || {});
        }
    }, {
        key: 'fireAsync',
        value: function fireAsync() {
            var _this = this;

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
                        resolve({ kocoContext: self.router.context });
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
    }]);

    return Koco;
}();

exports.default = Koco;