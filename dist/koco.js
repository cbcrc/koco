(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports', 'knockout', './router', './koco-component-loader'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require('knockout'), require('./router'), require('./koco-component-loader'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.knockout, global.router, global.kocoComponentLoader);
    global.koco = mod.exports;
  }
})(this, function (exports, _knockout, _router, _kocoComponentLoader) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _knockout2 = _interopRequireDefault(_knockout);

  var _router2 = _interopRequireDefault(_router);

  var _kocoComponentLoader2 = _interopRequireDefault(_kocoComponentLoader);

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

  function getRouterElement() {
    var routerElements = document.getElementsByTagName('router');

    if (routerElements.length < 1) {
      throw new Error('Cannot initialize koco without any router in the page.');
    }

    if (routerElements.length > 1) {
      throw new Error('Cannot initialize koco with more than one router in the page.');
    }

    return routerElements[0];
  }

  var Koco = function () {
    function Koco() {
      var _this = this;

      _classCallCheck(this, Koco);

      this.isInitialized = false;
      this._router = null;
      this.viewModel = _knockout2.default.pureComputed(function () {
        return _this._router.context();
      });
    }

    _createClass(Koco, [{
      key: 'init',
      value: function init(settings) {
        if (this.isInitialized) {
          throw 'koco is already initialized.';
        }

        this.isInitialized = true;

        // todo: private - see http:// stackoverflow.com/a/22160051
        this._router = new _router2.default(Object.assign({}, settings, { element: getRouterElement() }));

        _knockout2.default.components.loaders.unshift(_kocoComponentLoader2.default);
      }
    }, {
      key: 'registerComponent',
      value: function registerComponent(name, config) {
        _knockout2.default.components.register(name, config || {});
      }
    }, {
      key: 'start',
      value: function start() {
        if (!this.isInitialized) {
          throw 'koco is not is not initialized yet.';
        }

        return this._router.navigate(this._router.currentUrl(), {
          replace: true
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