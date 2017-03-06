(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports', 'knockout', 'promise-defer', './koco-utils', './byroads', './router-state-push', './route', './router-event'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require('knockout'), require('promise-defer'), require('./koco-utils'), require('./byroads'), require('./router-state-push'), require('./route'), require('./router-event'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.knockout, global.promiseDefer, global.kocoUtils, global.byroads, global.routerStatePush, global.route, global.routerEvent);
    global.router = mod.exports;
  }
})(this, function (exports, _knockout, _promiseDefer, _kocoUtils, _byroads, _routerStatePush, _route, _routerEvent) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _knockout2 = _interopRequireDefault(_knockout);

  var _promiseDefer2 = _interopRequireDefault(_promiseDefer);

  var _byroads2 = _interopRequireDefault(_byroads);

  var _routerStatePush2 = _interopRequireDefault(_routerStatePush);

  var _route2 = _interopRequireDefault(_route);

  var _routerEvent2 = _interopRequireDefault(_routerEvent);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
  };

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

  var _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  var DEFAULT_SETTINGS = {
    localBasePath: '.',
    routerBasePath: 'koco/src',
    baseUrl: '/'
  };

  var DEFAULT_OPTIONS = {
    replace: false,
    force: false
  };

  var NAVIGATION_CANCELED_MSG = 'navigation canceled';

  // http://stackoverflow.com/a/21489870
  function makeQuerableDeferred(deferred) {
    // Don't create a wrapper for promises that can already be queried.
    if (deferred.isResolved) return deferred;

    var _isResolved = false;
    var _isRejected = false;

    // Observe the promise, saving the fulfillment in a closure scope.
    var wrappedPromise = deferred.promise.then(function (v) {
      _isResolved = true;return v;
    }, function (e) {
      _isRejected = true;throw e;
    });

    var result = _extends({}, deferred, {
      isFulfilled: function isFulfilled() {
        return _isResolved || _isRejected;
      },
      isResolved: function isResolved() {
        return _isResolved;
      },
      isRejected: function isRejected() {
        return _isRejected;
      }
    });

    result.promise = wrappedPromise;

    return result;
  }

  var Router = function () {
    function Router(settings) {
      var _this = this;

      _classCallCheck(this, Router);

      this.settings = Object.assign({}, DEFAULT_SETTINGS, settings);

      this.byroads = new _byroads2.default();

      _knockout2.default.components.register('router', {
        basePath: this.settings.routerBasePath,
        isNpm: true
      });

      this.page = _knockout2.default.observable(null);
      this.route = _knockout2.default.observable(null);
      this.pageTitle = _knockout2.default.observable('');

      this.context = _knockout2.default.pureComputed(function () {
        return {
          page: _this.page(),
          route: _this.route(),
          pageTitle: _this.pageTitle()
        };
      });

      this.route.subscribe(function (route) {
        if (route) {
          _this.pageTitle(_this.getPageTitle(route));
          _this.setPageTitle(route);
        }
      });

      this._pages = {};

      this.navigating = new _routerEvent2.default();

      this.cachedPages = {};

      this.isNavigating = _knockout2.default.observable(false);
      this.isActivating = _knockout2.default.observable(false);

      this.routerState = new _routerStatePush2.default(this);
    }

    _createClass(Router, [{
      key: 'registerPage',
      value: function registerPage(name, pageConfig) {
        pageConfig = pageConfig || {};

        if (!name) {
          throw new Error('Router.registerPage - Argument missing exception: name');
        }

        if (this.isRegisteredPage(name)) {
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
      key: 'getRegisteredPage',
      value: function getRegisteredPage(name) {
        return this._pages[name];
      }
    }, {
      key: 'addRoute',
      value: function addRoute(pattern, routeConfig) {
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

        if (!this.isRegisteredPage(pageName)) {
          throw new Error('Router.addRoute - The page \'' + pageName + '\' is not registered. Please register the page before adding a route that refers to it.');
        }

        var priority = void 0;

        if (routeConfig && routeConfig.priority) {
          priority = routeConfig.priority;
        }

        var route = this.byroads.addRoute(pattern, priority);

        // TODO: Lier la page tout de suite au lieu de le faire à chaque fois qu'on crée un Route

        route.params = params;
        route.pageName = pageName;
        route.pageTitle = pageTitle;
        route.cached = cached;
        route.rules = rules;
      }
    }, {
      key: 'toPushStateOptions',
      value: function toPushStateOptions(route, options) {
        if (!route) {
          throw new Error('route is mandatory');
        }

        return {
          url: route.url,
          pageTitle: this.getPageTitle(route),
          stateObject: options.stateObject || {},
          replace: options.replace || false
        };
      }
    }, {
      key: 'unknownRouteHandler',
      value: function unknownRouteHandler() {
        console.log('404 - Please override the router.unknownRouteHandler function to handle unknown routes.');
      }
    }, {
      key: 'guardRoute',
      value: function guardRoute() /* matchedRoute, newUrl */{
        return true;
      }
    }, {
      key: 'getMatchedRoute',
      value: function getMatchedRoute(url, options) {
        var _this2 = this;

        return new Promise(function (resolve, reject) {
          if (_this2.byroads.getNumRoutes() === 0) {
            reject('No route has been added to the router yet.');
          }

          var matchedRoute = _this2.getPrioritizedMatchedRoute(url);

          var guardRouteResult = true;

          if (!options.force) {
            guardRouteResult = _this2.guardRoute(matchedRoute, url);
          }

          if (guardRouteResult !== true) {
            if (guardRouteResult === false) {
              reject('guardRoute has blocked navigation.');
            } else if (typeof guardRouteResult === 'string' || guardRouteResult instanceof String) {
              // recursive
              _this2.getMatchedRoute(guardRouteResult, options).then(function (x) {
                return resolve(x);
              }, function (y) {
                return reject(y);
              });
            } else {
              reject('guardRoute has returned an invalid value. Only string or boolean are supported.');
            }
          } else {
            resolve(matchedRoute);
          }
        });
      }
    }, {
      key: 'getPrioritizedRoute',
      value: function getPrioritizedRoute(matchedRoutes /* , newUrl */) {
        return matchedRoutes[0];
      }
    }, {
      key: 'setPageTitle',
      value: function setPageTitle(route) {
        document.title = this.getPageTitle(route);
      }
    }, {
      key: 'getPageTitle',
      value: function getPageTitle(route) {
        return route.pageTitle || route.page.title;
      }
    }, {
      key: 'setUrlSilently',
      value: function setUrlSilently(options) {
        var matchedRoute = this.getPrioritizedMatchedRoute(options.url);
        if (!matchedRoute) {
          throw new Error('No route found for URL ' + options.url);
        } else {
          this.routerState.pushState(options);
          this.route(matchedRoute);
        }
      }
    }, {
      key: 'navigate',
      value: function navigate(url, options) {
        var _this3 = this;

        if (this.navigationDeferred && !this.navigationDeferred.isFulfilled) {
          this.navigationDeferred.reject('navigation cancelled');
        }

        this.navigationDeferred = makeQuerableDeferred((0, _promiseDefer2.default)());

        // todo: configurable
        this.navigationDeferred.promise.catch(function (ex) {
          if (ex !== NAVIGATION_CANCELED_MSG) {
            console.log(ex);
          }
        });

        var finalOptions = Object.assign({}, DEFAULT_OPTIONS, options || {});

        this.navigating.canRoute(finalOptions).then(function (can) {
          if (can) {
            _this3.isNavigating(true);
            return _this3.getMatchedRoute(url, finalOptions);
          }
          return Promise.reject(NAVIGATION_CANCELED_MSG);
        }).then(function (route) {
          if (route) {
            return (0, _kocoUtils.activate)(route.page, _this3.settings.element, { route: route, isDialog: false }, _this3.isActivating).then(function (page) {
              return {
                route: route,
                page: page
              };
            });
          }
          return Promise.reject('404');
        }).then(function (context) {
          var pushStateOptions = _this3.toPushStateOptions(context.route, finalOptions);
          _this3.routerState.pushState(pushStateOptions);

          var previousPage = _this3.page();

          _this3.page(null);
          _this3.route(null);

          if (previousPage && previousPage.viewModel && (0, _kocoUtils.isFunction)(previousPage.viewModel.dispose)) {
            previousPage.viewModel.dispose();
          }

          _this3.page(context.page);
          _this3.route(context.route);

          return (0, _kocoUtils.postActivate)(context.route.page, context.page.viewModel);
        }).then(function () {
          _this3.navigationDeferred.resolve();
          _this3.isNavigating(false);
        }).catch(function (reason) {
          if (reason !== 'navigation hijacked') {
            /* reset url */
            var route = _this3.route();
            if (route) {
              var pushStateOptions = _this3.toPushStateOptions(route, {
                replace: true
              });
              _this3.routerState.pushState(pushStateOptions);
            }

            if (reason == '404') {
              _this3.navigationDeferred.resolve();
            } else {
              _this3.navigationDeferred.reject(reason);
            }

            _this3.isNavigating(false);

            if (reason == '404') {
              // covention pour les 404
              // TODO: passer plus d'info... ex. url demandée originalement, url finale tenant comptre de guardRoute
              _this3.unknownRouteHandler();
            }
          }
        });

        return this.navigationDeferred.promise;
      }
    }, {
      key: 'currentUrl',
      value: function currentUrl() {
        return window.location.pathname + window.location.search + window.location.hash;
      }
    }, {
      key: 'convertMatchedRoutes',
      value: function convertMatchedRoutes(matchedRoutes, url) {
        var result = [];

        for (var i = 0; i < matchedRoutes.length; i++) {
          var matchedRoute = matchedRoutes[i];
          var page = this.getRegisteredPage(matchedRoute.route.pageName);
          var route = new _route2.default(url, matchedRoute, page);
          result.push(route);
        }

        return result;
      }
    }, {
      key: 'getPrioritizedMatchedRoute',
      value: function getPrioritizedMatchedRoute(newUrl) {
        // Replace all (/.../g) leading slash (^\/) or (|) trailing slash (\/$) with an empty string.
        var cleanedUrl = newUrl.replace(/^\/|\/$/g, '');

        // Remove hash
        cleanedUrl = cleanedUrl.replace(/#.*$/g, '');

        var byroadsMatchedRoutes = this.byroads.getMatchedRoutes(cleanedUrl, true);
        var prioritizedMatchedRoute = null;

        if (byroadsMatchedRoutes.length > 0) {
          var convertedMatchedRoutes = this.convertMatchedRoutes(byroadsMatchedRoutes, newUrl);
          prioritizedMatchedRoute = this.getPrioritizedRoute(convertedMatchedRoutes, newUrl);
        }

        return prioritizedMatchedRoute;
      }
    }, {
      key: 'reload',
      value: function reload() {
        var _this4 = this;

        return new Promise(function (resolve) {
          // hack pour rafraichir le formulaire car certain components ne supportent pas bien le two-way data binding!!!! - problematique!
          // todo: (à tester) je ne suis pas certain que ca fonctionne ... knockout doit détecter que c'est le même objet et ne rien faire...
          _this4.context(Object.assign({}, _this4.context()));
          resolve();
        });
      }
    }]);

    return Router;
  }();

  exports.default = Router;
});