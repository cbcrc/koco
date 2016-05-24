"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

var Context = function () {
    function Context() {
        _classCallCheck(this, Context);

        this.matchedRoutes = [];
    }

    _createClass(Context, [{
        key: "addMatchedRoute",
        value: function addMatchedRoute(route) {
            this.route = route;
            this.matchedRoutes.push(route);

            this.pageTitle = route.pageTitle || route.page.title;
        }
    }]);

    return Context;
}();

exports.default = Context;