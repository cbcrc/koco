(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports', 'knockout', 'koco', './koco-utils'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require('knockout'), require('koco'), require('./koco-utils'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.knockout, global.koco, global.kocoUtils);
    global.routerUi = mod.exports;
  }
})(this, function (exports, _knockout, _koco, _kocoUtils) {
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

  var Router = function Router() {
    var _this = this;

    _classCallCheck(this, Router);

    this.xyz = _knockout2.default.observable();

    _koco2.default.viewModel.subscribe(function () {
      var previousViewModel = _this.xyz();

      _this.xyz(null);

      if (previousViewModel && previousViewModel.data && (0, _kocoUtils.isFunction)(previousViewModel.data.dispose)) {
        previousViewModel.data.dispose();
      }

      var viewModel = _koco2.default.viewModel();
      if (viewModel) {
        _this.xyz({ nodes: viewModel.page.template, data: viewModel.page.viewModel });
      }
    });
  };

  exports.default = Router;
});