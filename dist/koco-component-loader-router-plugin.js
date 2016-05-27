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
        global.kocoComponentLoaderRouterPlugin = mod.exports;
    }
})(this, function (exports) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

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

    var KocoComponentLoaderRouterPlugin = function () {
        function KocoComponentLoaderRouterPlugin(router) {
            _classCallCheck(this, KocoComponentLoaderRouterPlugin);

            this.router = router;
        }

        _createClass(KocoComponentLoaderRouterPlugin, [{
            key: 'loadComponent',
            value: function loadComponent(name, componentConfig) {
                var result = null;

                if (componentConfig.type === 'page') {
                    result = this.router.component;
                }

                return result;
            }
        }]);

        return KocoComponentLoaderRouterPlugin;
    }();

    exports.default = KocoComponentLoaderRouterPlugin;
});