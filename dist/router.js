'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _knockout = require('knockout');

var _knockout2 = _interopRequireDefault(_knockout);

var _kocoUtils = require('./koco-utils');

var _byroads = require('./byroads');

var _byroads2 = _interopRequireDefault(_byroads);

var _routerStatePush = require('./router-state-push');

var _routerStatePush2 = _interopRequireDefault(_routerStatePush);

var _route = require('./route');

var _route2 = _interopRequireDefault(_route);

var _context = require('./context');

var _context2 = _interopRequireDefault(_context);

var _routerEvent = require('./router-event');

var _routerEvent2 = _interopRequireDefault(_routerEvent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// todo: reject(...arguments) pour les promises anglobantes

function convertMatchedRoutes(self, matchedRoutes, url) {
    var result = [];

    for (var i = 0; i < matchedRoutes.length; i++) {
        var matchedRoute = matchedRoutes[i];
        var page = self._getRegisteredPage(matchedRoute.route.pageName);
        var route = new _route2.default(url, matchedRoute, page);
        result.push(route);
    }

    return result;
}

function updateRoute(self, newUrl, context) {
    // Replace all (/.../g) leading slash (^\/) or (|) trailing slash (\/$) with an empty string.
    var cleanedUrl = newUrl.replace(/^\/|\/$/g, '');

    // Remove hash
    cleanedUrl = cleanedUrl.replace(/#.*$/g, '');

    var matchedRoutes = self.byroads.getMatchedRoutes(cleanedUrl, true);
    var matchedRoute = null;

    if (matchedRoutes.length > 0) {
        matchedRoute = self.getPrioritizedRoute(convertMatchedRoutes(self, matchedRoutes, newUrl), newUrl);

        context.addMatchedRoute(matchedRoute);
    }

    return matchedRoute;
}

function toPushStateOptions(self, context, options) {
    if (!context) {
        throw new Error('router.toPushStateOptions - context is mandatory');
    }

    if (!context.route) {
        throw new Error('router.toPushStateOptions - context.route is mandatory');
    }

    return {
        url: context.route.url,
        pageTitle: context.pageTitle,
        stateObject: options.stateObject || {},
        replace: options.replace || false
    };
}

function resetUrl(self) {
    var context = self.context();

    if (context) {
        var pushStateOptions = toPushStateOptions(self, context, {
            replace: !self._internalNavigatingTask.options.stateChanged
        });
        self.routerState.pushState(pushStateOptions);
    }
}

function activateAsync(self, context) {
    return new Promise(function (resolve, reject) {
        try {
            (function () {
                var registeredPage = context.route.page;
                var basePath = registeredPage.basePath || self.settings.localBasePath + '/' + registeredPage.componentName;
                var moduleName = basePath + '/' + registeredPage.componentName;
                var imported = (0, _kocoUtils.importModule)(moduleName, registeredPage.isHtmlOnly);
                var result = {
                    template: _knockout2.default.utils.parseHtmlFragment(imported.templateString)
                };

                if (registeredPage.htmlOnly === true) {
                    context.page = result;
                    resolve(context);
                } else {
                    if ((0, _kocoUtils.isFunction)(imported.viewModel)) {
                        result.viewModel = new imported.viewModel(context, {
                            element: self.router,
                            templateNodes: result.template
                        });
                    } else {
                        result.viewModel = imported.viewModel;
                    }

                    if ((0, _kocoUtils.isFunction)(result.viewModel.activateAsync)) /* based on convention */{
                            self.isActivating(true);

                            result.viewModel.activateAsync().then(function () {
                                context.page = result;
                                resolve(context);
                            }).catch(function (reason) {
                                reject(reason);
                            });
                        } else {
                        context.page = result;
                        resolve(context);
                    }
                }
            })();
        } catch (err) {
            reject(err);
        }
    });
}

function postActivateAsync(self) {
    return new Promise(function (resolve, reject) {
        try {
            var viewModel = self.context().page.viewModel;

            if (viewModel.postActivateAsync) {
                viewModel.postActivateAsync().then(function () {
                    resolve();
                }).catch(function (reason) {
                    reject(reason);
                });
            } else {
                resolve();
            }
        } catch (err) {
            reject(err);
        }
    });
}

// TODO: Allow overriding page-activator in route config
// todo: refactoring
// remove functions that should be private from prototype .. ex. _getRegisteredPage

var Router = function () {
    function Router(settings) {
        _classCallCheck(this, Router);

        var self = this;

        self.byroads = new _byroads2.default();

        // __moduleName is part of systemjs
        // var routerBasePath = __moduleName.replace(/^(?:\/\/|[^\/]+)*\//, '');
        // var routerBasePath = __fileName.replace(/^(?:\/\/|[^\/]+)*\//, '');
        // routerBasePath = routerBasePath.substr(0, routerBasePath.lastIndexOf('/'));

        _knockout2.default.components.register('router', {
            isHtmlOnly: true,
            basePath: settings.routerBasePath
        });

        self.context = _knockout2.default.observable(null);

        self.page = _knockout2.default.pureComputed(function () {
            var context = self.context();

            return context ? context.page : null;
        });

        self._pages = {};

        self.navigating = new _routerEvent2.default();

        self.cachedPages = {};

        self._navigatingTask = null;
        self._internalNavigatingTask = null;
        self.isNavigating = _knockout2.default.observable(false);
        self.isActivating = _knockout2.default.observable(false);

        self.settings = {
            localBasePath: '.'
        };

        self.routerState = new _routerStatePush2.default(self);

        self.settings = Object.assign({}, self.settings, settings);

        // todo: this sucks?
        self.router = document.getElementsByTagName('router')[0];
    }

    _createClass(Router, [{
        key: 'registerPage',
        value: function registerPage(name, pageConfig) {
            var self = this;
            pageConfig = pageConfig || {};

            if (!name) {
                throw new Error('Router.registerPage - Argument missing exception: name');
            }

            if (self.isRegisteredPage(name)) {
                throw new Error('Router.registerPage - Duplicate page: ' + name);
            }

            var componentName = name + '-page';

            var page = Object.assign({
                name: name,
                title: '',
                componentName: componentName
            }, pageConfig);

            _knockout2.default.components.register(componentName, {
                type: 'page'
            });

            this._pages[name] = page;
        }
    }, {
        key: 'isRegisteredPage',
        value: function isRegisteredPage(name) {
            return name in this._pages;
        }
    }, {
        key: '_getRegisteredPage',
        value: function _getRegisteredPage(name) {
            return this._pages[name];
        }
    }, {
        key: 'addRoute',
        value: function addRoute(pattern, routeConfig) {
            var self = this;
            routeConfig = routeConfig || {};

            // TODO: Valider que page exist else throw...
            var params = {}; // Not to be confused with url params extrated by byroads.js
            var pageName = pattern;
            var pageTitle = '';
            var cached = false;
            var rules = {};

            if (routeConfig.hasOwnProperty('cached') && typeof routeConfig.cached === 'boolean') {
                cached = routeConfig.cached;
            }

            if (routeConfig.hasOwnProperty('pageTitle') && (typeof routeConfig.pageTitle === 'string' || routeConfig.pageTitle instanceof String)) {
                pageTitle = routeConfig.pageTitle;
            }

            if (routeConfig.hasOwnProperty('params') && (_typeof(routeConfig.params) === 'object' || routeConfig.params instanceof Object)) {
                params = routeConfig.params;
            }

            if (routeConfig.hasOwnProperty('pageName') && (typeof routeConfig.pageName === 'string' || routeConfig.pageName instanceof String)) {
                pageName = routeConfig.pageName;
            }

            if (routeConfig.hasOwnProperty('rules') && (_typeof(routeConfig.rules) === 'object' || routeConfig.rules instanceof Object)) {
                rules = routeConfig.rules;
            }

            if (!self.isRegisteredPage(pageName)) {
                throw new Error('Router.addRoute - The page \'' + pageName + '\' is not registered. Please register the page before adding a route that refers to it.');
            }

            var priority;

            if (routeConfig && routeConfig.priority) {
                priority = routeConfig.priority;
            }

            var route = self.byroads.addRoute(pattern, priority);

            // TODO: Lier la page tout de suite au lieu de le faire à chaque fois qu'on crée un Route

            route.params = params;
            route.pageName = pageName;
            route.pageTitle = pageTitle;
            route.cached = cached;
            route.rules = rules;
        }

        // Cette méthode peut être overriden au besoin par le end user

    }, {
        key: 'unknownRouteHandler',
        value: function unknownRouteHandler() {
            // var self = this;

            // TODO: Bon format d'url - ou ca prend le #/ ???
            // self.navigateAsync('page-non-trouvee');
            alert('404 - Please override the router.unknownRouteHandler function to handle unknown routes.');
        }

        // Cette méthode peut être overriden au besoin par le end user

    }, {
        key: 'guardRoute',
        value: function guardRoute() /*matchedRoute, newUrl*/{
            // var self = this;

            return true;
        }

        // Cette méthode peut être overriden au besoin par le end user

    }, {
        key: 'getPrioritizedRoute',
        value: function getPrioritizedRoute(matchedRoutes /*, newUrl*/) {
            // var self = this;

            return matchedRoutes[0];
        }
    }, {
        key: 'setPageTitle',
        value: function setPageTitle(pageTitle) {
            // var self = this;

            document.title = pageTitle;
        }
    }, {
        key: 'setUrlSilently',
        value: function setUrlSilently(options) {
            var self = this;

            self.routerState.pushState(options);

            var context = self.context();

            if (context && context.route) {
                var matchedRoute = updateRoute(self, options.url, context);

                if (!matchedRoute) {
                    throw new Error('No route found for URL ' + options.url);
                }
            }
        }

        // stateChanged option - for back and forward buttons (and onbeforeunload eventually)
        // Dans le cas du back or forward button, l'url doit etre remise sur la stack dans resetUrl

    }, {
        key: 'navigateAsync',
        value: function navigateAsync(url, options) {
            var self = this;

            // so on était déjà en train de naviguer on hijack la premiere navigation (récupère le dfd) et on kill le internalDefered
            if (self._internalNavigatingTask /* && self._internalNavigatingTask.dfd && self._internalNavigatingTask.dfd.state() === 'pending'*/) {
                    self._internalNavigatingTask.reject('navigation hijacked');
                } else {
                self._navigatingTask = {};

                self._navigatingTask.promise = new Promise(function (resolve, reject) {
                    self._navigatingTask.resolve = resolve;
                    self._navigatingTask.reject = reject;
                });
            }

            setTimeout(function () {
                var defaultOptions = {
                    replace: false,
                    stateChanged: false,
                    force: false
                };

                options = Object.assign(defaultOptions, options || {});

                self._internalNavigatingTask = {
                    options: options
                };

                self._internalNavigatingTask.promise = new Promise(function (resolve, reject) {
                    self._internalNavigatingTask.resolve = resolve;
                    self._internalNavigatingTask.reject = reject;
                });

                self._internalNavigatingTask.promise.then(function (context) {
                    if (context) {
                        var pushStateOptions = toPushStateOptions(self, context, self._internalNavigatingTask.options);
                        self.routerState.pushState(pushStateOptions);

                        var previousContext = self.context();

                        if (previousContext && previousContext.route.cached) {
                            self.cachedPages[previousContext.route.url] = previousContext;
                        }

                        context.isDialog = false;
                        self.context(context);
                        self.setPageTitle(context.pageTitle);
                    }

                    return postActivateAsync(self);
                }).then(function () {
                    // equivalent of always for postActivateAsync
                    self._navigatingTask.resolve.apply(this, arguments);
                    self._navigatingTask = null;
                    self._internalNavigatingTask = null;
                    self.isActivating(false);
                    self.isNavigating(false);
                }).catch(function (reason) {
                    if (reason !== 'navigation hijacked') {
                        resetUrl(self);

                        self._navigatingTask.reject.apply(this, arguments);
                        self._navigatingTask = null;
                        self._internalNavigatingTask = null;
                        self.isActivating(false);
                        self.isNavigating(false);

                        if (reason == '404') {
                            // covention pour les 404
                            // TODO: passer plus d'info... ex. url demandée originalement, url finale tenant comptre de guardRoute
                            self.unknownRouteHandler();
                        }
                    }
                });

                if (options.force) {
                    self.isNavigating(true);
                    self._navigateInner(url, options);
                } else {
                    self.navigating.canRoute(options).then(function (can) {
                        if (can) {
                            self.isNavigating(true);
                            self._navigateInner(url, options);
                        } else {
                            self._internalNavigatingTask.reject('routing cancelled by router.navigating.canRoute');
                        }
                    }, function () {
                        self._internalNavigatingTask.reject.apply(this, arguments);
                    });
                }
            }, 0);

            // TODO: S'assurer que canRoute() === false, remet l'url précédente sur back/forward button

            return self._navigatingTask.promise;
        }
    }, {
        key: '_navigateInner',
        value: function _navigateInner(newUrl, options, context) {
            var self = this;

            var defaultOptions = {
                force: false
            };

            options = Object.assign(defaultOptions, options || {});

            if (!context) {
                context = new _context2.default();
            }

            if (self.byroads.getNumRoutes() === 0) {
                self._internalNavigatingTask.reject('No route has been added to the router yet.');
                return;
            }

            var matchedRoute = updateRoute(self, newUrl, context);
            var guardRouteResult = true;

            if (!options.force) {
                guardRouteResult = self.guardRoute(matchedRoute, newUrl);
            }

            if (guardRouteResult === false) {
                self._internalNavigatingTask.reject('guardRoute has blocked navigation.');
                return;
            } else if (guardRouteResult === true) {
                // continue
            } else if (typeof guardRouteResult === 'string' || guardRouteResult instanceof String) {
                    self._navigateInner(guardRouteResult, options, context);
                    return;
                } else {
                    self._internalNavigatingTask.reject('guardRoute has returned an invalid value. Only string or boolean are supported.');
                    return;
                }

            if (matchedRoute) {
                var previousContext = self.cachedPages[newUrl];

                if (previousContext) {
                    self._internalNavigatingTask.resolve(previousContext);
                } else {
                    activateAsync(self, context).then(function (context) {
                        self._internalNavigatingTask.resolve(context);
                    }).catch(function () {
                        self._internalNavigatingTask.reject.apply(self, arguments);
                    });
                }
            } else {
                self._internalNavigatingTask.reject('404');
            }
        }
    }, {
        key: 'currentUrl',
        value: function currentUrl() {
            return window.location.pathname + window.location.search + window.location.hash;
        }
    }]);

    return Router;
}();

exports.default = Router;