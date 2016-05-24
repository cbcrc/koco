"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

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