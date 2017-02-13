(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports', 'knockout', 'promise-defer', './koco-utils', './byroads', './router-state-push', './route', './context', './router-event'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require('knockout'), require('promise-defer'), require('./koco-utils'), require('./byroads'), require('./router-state-push'), require('./route'), require('./context'), require('./router-event'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.knockout, global.promiseDefer, global.kocoUtils, global.byroads, global.routerStatePush, global.route, global.context, global.routerEvent);
    global.router = mod.exports;
  }
})(this, function (exports, _knockout, _promiseDefer, _kocoUtils, _byroads, _routerStatePush, _route, _context, _routerEvent) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _knockout2 = _interopRequireDefault(_knockout);

  var _promiseDefer2 = _interopRequireDefault(_promiseDefer);

  var _byroads2 = _interopRequireDefault(_byroads);

  var _routerStatePush2 = _interopRequireDefault(_routerStatePush);

  var _route2 = _interopRequireDefault(_route);

  var _context2 = _interopRequireDefault(_context);

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

  // todo: reject(...arguments) pour les promises anglobantes
  /* todo: refactoring
    - internalNavigatingTask == context creation and activation (shared with dialoger)
    - navigatingTask == navigation process
  */

  var DEFAULT_SETTINGS = {
    localBasePath: '.',
    routerBasePath: 'koco/src',
    baseUrl: '/'
  };

  var DEFAULT_NAVIGATION_OPTIONS = {
    replace: false,
    force: false
  };

  var DEFAULT_BUILD_NEW_CONTEXT_OPTIONS = {
    force: false
  };

  function toPushStateOptions(context, options) {
    if (!context) {
      throw new Error('context is mandatory');
    }

    if (!context.route) {
      throw new Error('route is mandatory');
    }

    return {
      url: context.route.url,
      pageTitle: context.pageTitle,
      stateObject: options.stateObject || {},
      replace: options.replace || false
    };
  }

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

  // TODO: Allow overriding page-activator in route config
  // todo: refactoring
  // remove functions that should be private from prototype .. ex. getRegisteredPage

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

      this.context = _knockout2.default.observable(null);

      this.page = _knockout2.default.pureComputed(function () {
        var context = _this.context();

        return context ? context.page : null;
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
      key: 'buildNewContext',
      value: function buildNewContext(url, options, context, buildNewContextDeferred) {
        var internalDeferred = buildNewContextDeferred;

        if (!internalDeferred) {
          internalDeferred = (0, _promiseDefer2.default)();
        }

        var filnalOptions = Object.assign({}, DEFAULT_BUILD_NEW_CONTEXT_OPTIONS, options || {});

        if (!context) {
          context = new _context2.default();
        }

        if (this.byroads.getNumRoutes() === 0) {
          internalDeferred.reject('No route has been added to the router yet.');
          return internalDeferred.promise;
        }

        var matchedRoute = this.updateRoute(url, context);
        var guardRouteResult = true;

        if (!filnalOptions.force) {
          guardRouteResult = this.guardRoute(matchedRoute, url);
        }

        if (guardRouteResult !== true) {
          if (guardRouteResult === false) {
            internalDeferred.reject('guardRoute has blocked navigation.');
            return internalDeferred.promise;
          } else if (typeof guardRouteResult === 'string' || guardRouteResult instanceof String) {
            return this.buildNewContext(guardRouteResult, filnalOptions, context, internalDeferred);
          }

          internalDeferred.reject('guardRoute has returned an invalid value. Only string or boolean are supported.');
          return internalDeferred.promise;
        }

        if (matchedRoute) {
          var previousContext = this.cachedPages[url];

          if (previousContext) {
            internalDeferred.resolve(previousContext);
            return internalDeferred.promise;
          }

          return this.activateAsync(context).then(function (activatedContext) {
            internalDeferred.resolve(activatedContext);
            return internalDeferred.promise;
          }).catch(function (ex) {
            internalDeferred.reject(ex);
            return internalDeferred.promise;
          });
        }

        internalDeferred.reject('404');
        return internalDeferred.promise;
      }
    }, {
      key: 'getPrioritizedRoute',
      value: function getPrioritizedRoute(matchedRoutes /* , newUrl */) {
        return matchedRoutes[0];
      }
    }, {
      key: 'setPageTitle',
      value: function setPageTitle(pageTitle) {
        document.title = pageTitle;
      }
    }, {
      key: 'setUrlSilently',
      value: function setUrlSilently(options) {
        this.routerState.pushState(options);
        var context = this.context();

        if (context && context.route) {
          var matchedRoute = this.updateRoute(options.url, context);

          if (!matchedRoute) {
            throw new Error('No route found for URL ' + options.url);
          }
        }
      }
    }, {
      key: 'navigate',
      value: function navigate(url, options) {
        var _this2 = this;

        if (this.navigationDeferred && !this.navigationDeferred.isFulfilled) {
          this.navigationDeferred.reject('navigation cancelled');
        }

        this.navigationDeferred = makeQuerableDeferred((0, _promiseDefer2.default)());

        // todo: configurable
        this.navigationDeferred.promise.catch(function (ex) {
          console.log(ex);
        });

        var finalOptions = Object.assign({}, DEFAULT_NAVIGATION_OPTIONS, options || {});

        var buildNewContextPromise = void 0;

        if (finalOptions.force) {
          this.isNavigating(true);
          buildNewContextPromise = this.buildNewContext(url, finalOptions);
        } else {
          buildNewContextPromise = this.navigating.canRoute(finalOptions).then(function (can) {
            if (can) {
              _this2.isNavigating(true);
              return _this2.buildNewContext(url, finalOptions);
            }
            return Promise.reject('navigation cancelled by router.navigating.canRoute');
          }, function (err) {
            _this2.navigationDeferred.reject(err);
          });
        }

        buildNewContextPromise.then(function (context) {
          if (context) {
            var pushStateOptions = toPushStateOptions(context, finalOptions);
            _this2.routerState.pushState(pushStateOptions);

            var previousContext = _this2.context();

            _this2.context(null);

            if (previousContext) {
              if (previousContext.route.cached) {
                _this2.cachedPages[previousContext.route.url] = previousContext;
              } else if (previousContext.page && previousContext.page.viewModel && (0, _kocoUtils.isFunction)(previousContext.page.viewModel.dispose)) {
                previousContext.page.viewModel.dispose();
              }
            }

            context.isDialog = false;
            _this2.context(context);
            _this2.setPageTitle(context.pageTitle);
          }

          return _this2.postActivate(_this2.context());
        }).then(function (value) {
          // equivalent of always for postActivate
          _this2.navigationDeferred.resolve(value);
          _this2.isNavigating(false);
        }).catch(function (reason) {
          if (reason !== 'navigation hijacked') {
            _this2.resetUrl();

            if (reason == '404') {
              _this2.navigationDeferred.resolve();
            } else {
              _this2.navigationDeferred.reject(reason);
            }

            _this2.isNavigating(false);

            if (reason == '404') {
              // covention pour les 404
              // TODO: passer plus d'info... ex. url demandée originalement, url finale tenant comptre de guardRoute
              _this2.unknownRouteHandler();
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
      key: 'resetUrl',
      value: function resetUrl() {
        var context = this.context();

        if (context) {
          var pushStateOptions = toPushStateOptions(context, {
            replace: true // todo: valider que c'est la bonne valeur
          });
          this.routerState.pushState(pushStateOptions);
        }
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
      key: 'updateRoute',
      value: function updateRoute(newUrl, context) {
        // Replace all (/.../g) leading slash (^\/) or (|) trailing slash (\/$) with an empty string.
        var cleanedUrl = newUrl.replace(/^\/|\/$/g, '');

        // Remove hash
        cleanedUrl = cleanedUrl.replace(/#.*$/g, '');

        var matchedRoutes = this.byroads.getMatchedRoutes(cleanedUrl, true);
        var matchedRoute = null;

        if (matchedRoutes.length > 0) {
          var convertedMatchedRoutes = this.convertMatchedRoutes(matchedRoutes, newUrl);
          matchedRoute = this.getPrioritizedRoute(convertedMatchedRoutes, newUrl);

          context.addMatchedRoute(matchedRoute);
        }

        return matchedRoute;
      }
    }, {
      key: 'activateAsync',
      value: function activateAsync(context) {
        var _this3 = this;

        return new Promise(function (resolve, reject) {
          try {
            (function () {
              var registeredPage = context.route.page;
              // let basePath = registeredPage.basePath || this.settings.localBasePath + '/' + registeredPage.componentName;
              // let moduleName = basePath + '/' + registeredPage.componentName;
              var imported = (0, _kocoUtils.importModule)(registeredPage.componentName, {
                isHtmlOnly: registeredPage.isHtmlOnly,
                basePath: registeredPage.basePath,
                isNpm: registeredPage.isNpm,
                template: registeredPage.template
              });
              var result = {
                template: _knockout2.default.utils.parseHtmlFragment(imported.templateString)
              };

              if (registeredPage.isHtmlOnly === true) {
                context.page = result;
                resolve(context);
              } else {
                if ((0, _kocoUtils.isFunction)(imported.viewModel)) {
                  result.viewModel = new imported.viewModel(context, {
                    element: _this3.settings.element,
                    templateNodes: result.template
                  });
                } else {
                  result.viewModel = imported.viewModel;
                }

                // todo: rename activate to activateAsync?
                if ((0, _kocoUtils.isFunction)(result.viewModel.activate)) /* based on convention */{
                    _this3.isActivating(true);

                    result.viewModel.activate(context).then(function () {
                      context.page = result;
                      _this3.isActivating(false);
                      resolve(context);
                    }).catch(function (reason) {
                      _this3.isActivating(false);
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
    }, {
      key: 'postActivate',
      value: function postActivate(context) {
        return new Promise(function (resolve, reject) {
          try {
            var registeredPage = context.route.page;

            if (registeredPage.isHtmlOnly === true) {
              resolve();
            } else {
              var viewModel = context.page.viewModel;

              if (viewModel.postActivate) {
                viewModel.postActivate().then(function () {
                  resolve();
                }).catch(function (reason) {
                  reject(reason);
                });
              } else {
                resolve();
              }
            }
          } catch (err) {
            reject(err);
          }
        });
      }
    }, {
      key: 'reload',
      value: function reload() {
        var _this4 = this;

        return new Promise(function (resolve) {
          // hack pour rafraichir le formulaire car certain components ne supportent pas bien le two-way data binding!!!! - problematique!
          // todo: (à tester) je ne pense pas que ca fonctionne ... knockout doit détecter que c'est le même objet et ne rien faire...
          // il faudrait peut-être Object.assign({}, this.context()) --- créer une copie
          _this4.context(Object.assign({}, _this4.context()));
          resolve();
        });
      }
    }]);

    return Router;
  }();

  exports.default = Router;
});