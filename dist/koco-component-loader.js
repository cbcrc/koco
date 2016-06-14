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

  var KocoComponentLoader = function () {
    function KocoComponentLoader() {
      _classCallCheck(this, KocoComponentLoader);
    }

    _createClass(KocoComponentLoader, [{
      key: 'loadComponent',
      value: function loadComponent(name, componentConfig, callback) {
        var imported = (0, _kocoUtils.importModule)(name, {
          isHtmlOnly: componentConfig.isHtmlOnly,
          isNpm: componentConfig.isNpm,
          basePath: componentConfig.basePath,
          template: componentConfig.template
        });

        var result = {
          template: _knockout2.default.utils.parseHtmlFragment(imported.templateString)
        };

        if (componentConfig.isHtmlOnly !== true) {
          result.createViewModel = function (params, componentInfo) {
            if ((0, _kocoUtils.isFunction)(imported.viewModel)) {
              var ViewModel = imported.viewModel;
              return new ViewModel(params, componentInfo);
            }

            return imported.viewModel;
          };
        }

        callback(result);
      }
    }]);

    return KocoComponentLoader;
  }();

  exports.default = new KocoComponentLoader();
});