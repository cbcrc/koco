(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports', 'knockout', 'koco'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require('knockout'), require('koco'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.knockout, global.koco);
    global.routerUi = mod.exports;
  }
})(this, function (exports, _knockout, _koco) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _knockout2 = _interopRequireDefault(_knockout);

  var _koco2 = _interopRequireDefault(_koco);

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

  var Router = function Router() /* params, componentInfo */{
    _classCallCheck(this, Router);

    this.template = _knockout2.default.pureComputed(function () {
      var kocoViewModel = _koco2.default.viewModel();

      if (kocoViewModel && kocoViewModel.page) {
        return { nodes: kocoViewModel.page.template, data: kocoViewModel.page.viewModel };
      }

      return null;
    });
  };

  exports.default = Router;
});