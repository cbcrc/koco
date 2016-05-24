// Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

export default class Route {
    constructor(url, matchedRoute, page) {
        this.url = url;
        this.urlParams = matchedRoute.params;
        this.pattern = matchedRoute.route._pattern; // eslint-disable-line no-underscore-dangle
        this.params = matchedRoute.route.params;
        this.pageTitle = matchedRoute.route.pageTitle;
        this.page = page;
        this.cached = matchedRoute.route.cached;
    }
}
