(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports', 'knockout', './koco-utils', './byroads', './router-state-push', './route', './context', './router-event'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require('knockout'), require('./koco-utils'), require('./byroads'), require('./router-state-push'), require('./route'), require('./context'), require('./router-event'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.knockout, global.kocoUtils, global.byroads, global.routerStatePush, global.route, global.context, global.routerEvent);
    global.router = mod.exports;
  }
})(this, function (exports, _knockout, _kocoUtils, _byroads, _routerStatePush, _route, _context, _routerEvent) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _knockout2 = _interopRequireDefault(_knockout);

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

  // todo: reject(...arguments) pour les promises anglobantes

  function convertMatchedRoutes(self, matchedRoutes, url) {
    var result = [];

    for (var i = 0; i < matchedRoutes.length; i++) {
      var matchedRoute = matchedRoutes[i];
      var page = self.getRegisteredPage(matchedRoute.route.pageName);
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
          // let basePath = registeredPage.basePath || self.settings.localBasePath + '/' + registeredPage.componentName;
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
                element: self.settings.element,
                templateNodes: result.template
              });
            } else {
              result.viewModel = imported.viewModel;
            }

            // todo: rename activate to activateAsync?
            if ((0, _kocoUtils.isFunction)(result.viewModel.activate)) /* based on convention */{
                self.isActivating(true);

                result.viewModel.activate(context).then(function () {
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

  function postActivate(self) {
    return new Promise(function (resolve, reject) {
      try {
        var viewModel = self.context().page.viewModel;

        if (viewModel.postActivate) {
          viewModel.postActivate().then(function () {
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

  var DEFAULT_SETTINGS = {
    localBasePath: '.',
    routerBasePath: 'koco/src',
    baseUrl: '/'
  };

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

      this._navigatingTask = null;
      this._internalNavigatingTask = null;
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
      value: function guardRoute() /*matchedRoute, newUrl*/{
        return true;
      }
    }, {
      key: '_navigateInner',
      value: function _navigateInner(newUrl, options, context) {
        var _this2 = this,
            _arguments = arguments;

        var defaultOptions = {
          force: false
        };

        var filnalOptions = Object.assign(defaultOptions, options || {});

        if (!context) {
          context = new _context2.default();
        }

        if (this.byroads.getNumRoutes() === 0) {
          this._internalNavigatingTask.reject('No route has been added to the router yet.');
          return;
        }

        var matchedRoute = updateRoute(this, newUrl, context);
        var guardRouteResult = true;

        if (!filnalOptions.force) {
          guardRouteResult = this.guardRoute(matchedRoute, newUrl);
        }

        if (guardRouteResult === false) {
          this._internalNavigatingTask.reject('guardRoute has blocked navigation.');
          return;
        } else if (guardRouteResult === true) {
          // continue
        } else if (typeof guardRouteResult === 'string' || guardRouteResult instanceof String) {
            this._navigateInner(guardRouteResult, filnalOptions, context);
            return;
          } else {
            this._internalNavigatingTask.reject('guardRoute has returned an invalid value. Only string or boolean are supported.');
            return;
          }

        if (matchedRoute) {
          var previousContext = this.cachedPages[newUrl];

          if (previousContext) {
            this._internalNavigatingTask.resolve(previousContext);
          } else {
            activateAsync(this, context).then(function (activatedContext) {
              _this2._internalNavigatingTask.resolve(activatedContext);
            }).catch(function () {
              _this2._internalNavigatingTask.reject.apply(_this2, _arguments);
            });
          }
        } else {
          this._internalNavigatingTask.reject('404');
        }
      }
    }, {
      key: 'getPrioritizedRoute',
      value: function getPrioritizedRoute(matchedRoutes /*, newUrl*/) {
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
          var matchedRoute = updateRoute(this, options.url, context);

          if (!matchedRoute) {
            throw new Error('No route found for URL ' + options.url);
          }
        }
      }
    }, {
      key: 'navigate',
      value: function navigate(url, options) {
        var _this3 = this,
            _arguments2 = arguments;

        // so on était déjà en train de naviguer on hijack la premiere navigation (récupère le dfd) et on kill le internalDefered
        if (this._internalNavigatingTask /* && this._internalNavigatingTask.dfd && this._internalNavigatingTask.dfd.state() === 'pending'*/) {
            this._internalNavigatingTask.reject('navigation hijacked');
          } else {
          this._navigatingTask = {};

          this._navigatingTask.promise = new Promise(function (resolve, reject) {
            _this3._navigatingTask.resolve = resolve;
            _this3._navigatingTask.reject = reject;
          });

          // todo: configurable
          this._navigatingTask.promise.catch(function (ex) {
            console.log(ex);
          });
        }

        setTimeout(function () {
          var defaultOptions = {
            replace: false,
            stateChanged: false,
            force: false
          };

          options = Object.assign(defaultOptions, options || {});

          _this3._internalNavigatingTask = {
            options: options
          };

          _this3._internalNavigatingTask.promise = new Promise(function (resolve, reject) {
            _this3._internalNavigatingTask.resolve = resolve;
            _this3._internalNavigatingTask.reject = reject;
          });

          _this3._internalNavigatingTask.promise.then(function (context) {
            if (context) {
              var pushStateOptions = toPushStateOptions(_this3, context, _this3._internalNavigatingTask.options);
              _this3.routerState.pushState(pushStateOptions);

              var previousContext = _this3.context();

              if (previousContext && previousContext.route.cached) {
                _this3.cachedPages[previousContext.route.url] = previousContext;
              }

              context.isDialog = false;
              _this3.context(context);
              _this3.setPageTitle(context.pageTitle);
            }

            return postActivate(_this3);
          }).then(function () {
            // equivalent of always for postActivate
            _this3._navigatingTask.resolve.apply(_this3, _arguments2);
            _this3._navigatingTask = null;
            _this3._internalNavigatingTask = null;
            _this3.isActivating(false);
            _this3.isNavigating(false);
          }).catch(function (reason) {
            if (reason !== 'navigation hijacked') {
              resetUrl(_this3);

              if (reason == '404') {
                _this3._navigatingTask.resolve.apply(_this3, _arguments2);
              } else {
                _this3._navigatingTask.reject.apply(_this3, _arguments2);
              }

              _this3._navigatingTask = null;
              _this3._internalNavigatingTask = null;
              _this3.isActivating(false);
              _this3.isNavigating(false);

              if (reason == '404') {
                // covention pour les 404
                // TODO: passer plus d'info... ex. url demandée originalement, url finale tenant comptre de guardRoute
                _this3.unknownRouteHandler();
              }
            }
          });

          if (options.force) {
            _this3.isNavigating(true);
            _this3._navigateInner(url, options);
          } else {
            _this3.navigating.canRoute(options).then(function (can) {
              if (can) {
                _this3.isNavigating(true);
                _this3._navigateInner(url, options);
              } else {
                _this3._internalNavigatingTask.reject('routing cancelled by router.navigating.canRoute');
              }
            }, function () {
              _this3._internalNavigatingTask.reject.apply(_this3, _arguments2);
            });
          }
        }, 0);

        // TODO: S'assurer que canRoute() === false, remet l'url précédente sur back/forward button

        return this._navigatingTask.promise;
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
});