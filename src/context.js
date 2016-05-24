// Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

export default class Context {
    constructor() {
        this.matchedRoutes = [];
    }

    addMatchedRoute(route) {
        this.route = route;
        this.matchedRoutes.push(route);

        this.pageTitle = route.pageTitle || route.page.title;
    }
}
