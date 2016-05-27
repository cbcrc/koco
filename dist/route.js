(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(["exports"], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports);
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports);
        global.route = mod.exports;
    }
})(this, function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var Route = function Route(url, matchedRoute, page) {
        _classCallCheck(this, Route);

        this.url = url;
        this.urlParams = matchedRoute.params;
        this.pattern = matchedRoute.route._pattern; // eslint-disable-line no-underscore-dangle
        this.params = matchedRoute.route.params;
        this.pageTitle = matchedRoute.route.pageTitle;
        this.page = page;
        this.cached = matchedRoute.route.cached;
    };

    exports.default = Route;
});