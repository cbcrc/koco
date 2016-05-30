import ko from 'knockout';
import { importModule, isFunction } from './koco-utils';
import Byroads from './byroads';
import RouterState from './router-state-push';
import Route from './route';
import Context from './context';
import RouterEvent from './router-event';


// todo: reject(...arguments) pour les promises anglobantes

function convertMatchedRoutes(self, matchedRoutes, url) {
    const result = [];

    for (let i = 0; i < matchedRoutes.length; i++) {
        const matchedRoute = matchedRoutes[i];
        const page = self.getRegisteredPage(matchedRoute.route.pageName);
        const route = new Route(url, matchedRoute, page);
        result.push(route);
    }

    return result;
}

function updateRoute(self, newUrl, context) {
    // Replace all (/.../g) leading slash (^\/) or (|) trailing slash (\/$) with an empty string.
    let cleanedUrl = newUrl.replace(/^\/|\/$/g, '');

    // Remove hash
    cleanedUrl = cleanedUrl.replace(/#.*$/g, '');

    const matchedRoutes = self.byroads.getMatchedRoutes(cleanedUrl, true);
    let matchedRoute = null;

    if (matchedRoutes.length > 0) {
        matchedRoute = self.getPrioritizedRoute(convertMatchedRoutes(self,
            matchedRoutes, newUrl), newUrl);

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
    const context = self.context();

    if (context) {
        const pushStateOptions = toPushStateOptions(self, context, {
            replace: !self._internalNavigatingTask.options.stateChanged
        });
        self.routerState.pushState(pushStateOptions);
    }
}

function activateAsync(self, context) {
    return new Promise((resolve, reject) => {
        try {
            let registeredPage = context.route.page;
            // let basePath = registeredPage.basePath || self.settings.localBasePath + '/' + registeredPage.componentName;
            // let moduleName = basePath + '/' + registeredPage.componentName;
            let imported = importModule(registeredPage.componentName, {
                isHtmlOnly: registeredPage.isHtmlOnly,
                basePath: registeredPage.basePath,
                isNpm: registeredPage.isNpm,
                template: registeredPage.template
            });
            let result = {
                template: ko.utils.parseHtmlFragment(imported.templateString)
            };

            if (registeredPage.htmlOnly === true) {
                context.page = result;
                resolve(context);
            } else {
                if (isFunction(imported.viewModel)) {
                    result.viewModel = new imported.viewModel(context, {
                        element: self.router,
                        templateNodes: result.template
                    });
                } else {
                    result.viewModel = imported.viewModel;
                }

                if (isFunction(result.viewModel.activateAsync)) /* based on convention */ {
                    self.isActivating(true);

                    result.viewModel.activateAsync()
                        .then(function() {
                            context.page = result;
                            resolve(context);
                        })
                        .catch(function(reason) {
                            reject(reason);
                        });
                } else {
                    context.page = result;
                    resolve(context);
                }
            }
        } catch (err) {
            reject(err);
        }
    });
}

function postActivateAsync(self) {
    return new Promise((resolve, reject) => {
        try {
            var viewModel = self.context().page.viewModel;

            if (viewModel.postActivateAsync) {
                viewModel.postActivateAsync()
                    .then(function() {
                        resolve();
                    })
                    .catch(function(reason) {
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

const DEFAULT_SETTINGS = {
    localBasePath: '.',
    routerBasePath: 'koco/src'
};

// TODO: Allow overriding page-activator in route config
// todo: refactoring
// remove functions that should be private from prototype .. ex. getRegisteredPage
class Router {
    constructor(settings) {
        var self = this;

        self.settings = Object.assign({}, DEFAULT_SETTINGS, settings);

        self.byroads = new Byroads();

        ko.components.register('router', {
            isHtmlOnly: true,
            basePath: self.settings.routerBasePath,
            isNpm: true
        });

        self.context = ko.observable(null);

        self.page = ko.pureComputed(function() {
            var context = self.context();

            return context ? context.page : null;
        });

        self._pages = {};

        self.navigating = new RouterEvent();

        self.cachedPages = {};

        self._navigatingTask = null;
        self._internalNavigatingTask = null;
        self.isNavigating = ko.observable(false);
        self.isActivating = ko.observable(false);

        self.routerState = new RouterState(self);

        // todo: this sucks?
        self.router = document.getElementsByTagName('router')[0];
    }

    registerPage(name, pageConfig) {
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

        ko.components.register(componentName, {
            type: 'page'
        });

        this._pages[name] = page;
    }

    isRegisteredPage(name) {
        return name in this._pages;
    }

    getRegisteredPage(name) {
        return this._pages[name];
    }

    addRoute(pattern, routeConfig) {
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

        if (routeConfig.hasOwnProperty('pageTitle') &&
            (typeof routeConfig.pageTitle === 'string' || routeConfig.pageTitle instanceof String)) {
            pageTitle = routeConfig.pageTitle;
        }

        if (routeConfig.hasOwnProperty('params') &&
            (typeof routeConfig.params === 'object' ||
                routeConfig.params instanceof Object)) {
            params = routeConfig.params;
        }

        if (routeConfig.hasOwnProperty('pageName') &&
            (typeof routeConfig.pageName === 'string' || routeConfig.pageName instanceof String)) {
            pageName = routeConfig.pageName;
        }

        if (routeConfig.hasOwnProperty('rules') && (typeof routeConfig.rules === 'object' || routeConfig.rules instanceof Object)) {
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
    unknownRouteHandler() {
        // var self = this;

        // TODO: Bon format d'url - ou ca prend le #/ ???
        // self.navigateAsync('page-non-trouvee');
        alert('404 - Please override the router.unknownRouteHandler function to handle unknown routes.');
    }

    // Cette méthode peut être overriden au besoin par le end user
    guardRoute( /*matchedRoute, newUrl*/ ) {
        // var self = this;

        return true;
    }

    // should not be exposed but it is for dialoger...
    _navigateInner(newUrl, options, context) {
        var self = this;

        const defaultOptions = {
            force: false
        };

        const filnalOptions = Object.assign(defaultOptions, options || {});

        if (!context) {
            context = new Context();
        }

        if (self.byroads.getNumRoutes() === 0) {
            self._internalNavigatingTask.reject('No route has been added to the router yet.');
            return;
        }

        const matchedRoute = updateRoute(self, newUrl, context);
        let guardRouteResult = true;

        if (!filnalOptions.force) {
            guardRouteResult = self.guardRoute(matchedRoute, newUrl);
        }

        if (guardRouteResult === false) {
            self._internalNavigatingTask.reject('guardRoute has blocked navigation.');
            return;
        } else if (guardRouteResult === true) {
            // continue
        } else if (typeof guardRouteResult === 'string' || guardRouteResult instanceof String) {
            self._navigateInner(guardRouteResult, filnalOptions, context);
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
                activateAsync(self, context)
                    .then(function(context) {
                        self._internalNavigatingTask.resolve(context);
                    })
                    .catch(function() {
                        self._internalNavigatingTask.reject.apply(self, arguments);
                    });
            }
        } else {
            self._internalNavigatingTask.reject('404');
        }
    }

    // Cette méthode peut être overriden au besoin par le end user
    getPrioritizedRoute(matchedRoutes /*, newUrl*/ ) {
        // var self = this;

        return matchedRoutes[0];
    }

    setPageTitle(pageTitle) {
        // var self = this;

        document.title = pageTitle;
    }

    setUrlSilently(options) {
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
    navigateAsync(url, options) {
        var self = this;

        // so on était déjà en train de naviguer on hijack la premiere navigation (récupère le dfd) et on kill le internalDefered
        if (self._internalNavigatingTask /* && self._internalNavigatingTask.dfd && self._internalNavigatingTask.dfd.state() === 'pending'*/ ) {
            self._internalNavigatingTask.reject('navigation hijacked');
        } else {
            self._navigatingTask = {};

            self._navigatingTask.promise = new Promise((resolve, reject) => {
                self._navigatingTask.resolve = resolve;
                self._navigatingTask.reject = reject;
            });
        }

        setTimeout(function() {
            var defaultOptions = {
                replace: false,
                stateChanged: false,
                force: false
            };

            options = Object.assign(defaultOptions, options || {});

            self._internalNavigatingTask = {
                options: options
            };

            self._internalNavigatingTask.promise = new Promise((resolve, reject) => {
                self._internalNavigatingTask.resolve = resolve;
                self._internalNavigatingTask.reject = reject;
            });

            self._internalNavigatingTask.promise
                .then(function(context) {
                    if (context) {
                        var pushStateOptions = toPushStateOptions(self, context,
                            self._internalNavigatingTask.options);
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
                })
                .then(function() { // equivalent of always for postActivateAsync
                    self._navigatingTask.resolve.apply(this, arguments);
                    self._navigatingTask = null;
                    self._internalNavigatingTask = null;
                    self.isActivating(false);
                    self.isNavigating(false);
                })
                .catch(function(reason) {
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
                self.navigating.canRoute(options).then(function(can) {
                    if (can) {
                        self.isNavigating(true);
                        self._navigateInner(url, options);
                    } else {
                        self._internalNavigatingTask.reject('routing cancelled by router.navigating.canRoute');
                    }
                }, function() {
                    self._internalNavigatingTask.reject.apply(this, arguments);
                });
            }
        }, 0);


        // TODO: S'assurer que canRoute() === false, remet l'url précédente sur back/forward button

        return self._navigatingTask.promise;
    }

    currentUrl() {
        return window.location.pathname + window.location.search + window.location.hash;
    }
}

export default Router;
