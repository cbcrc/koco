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
      const registeredPage = context.route.page;
      // let basePath = registeredPage.basePath || self.settings.localBasePath + '/' + registeredPage.componentName;
      // let moduleName = basePath + '/' + registeredPage.componentName;
      const imported = importModule(registeredPage.componentName, {
        isHtmlOnly: registeredPage.isHtmlOnly,
        basePath: registeredPage.basePath,
        isNpm: registeredPage.isNpm,
        template: registeredPage.template
      });
      const result = {
        template: ko.utils.parseHtmlFragment(imported.templateString)
      };

      if (registeredPage.isHtmlOnly === true) {
        context.page = result;
        resolve(context);
      } else {
        if (isFunction(imported.viewModel)) {
          result.viewModel = new imported.viewModel(context, {
            element: self.settings.element,
            templateNodes: result.template
          });
        } else {
          result.viewModel = imported.viewModel;
        }

        // todo: rename activate to activateAsync?
        if (isFunction(result.viewModel.activate)) /* based on convention */ {
          self.isActivating(true);

          result.viewModel.activate(context)
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

function postActivate(self) {
  return new Promise((resolve, reject) => {
    try {
      const viewModel = self.context().page.viewModel;

      if (viewModel.postActivate) {
        viewModel.postActivate()
          .then(() => {
            resolve();
          })
          .catch((reason) => {
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
  routerBasePath: 'koco/src',
  baseUrl: '/'
};

// TODO: Allow overriding page-activator in route config
// todo: refactoring
// remove functions that should be private from prototype .. ex. getRegisteredPage
class Router {
  constructor(settings) {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, settings);

    this.byroads = new Byroads();

    ko.components.register('router', {
      basePath: this.settings.routerBasePath,
      isNpm: true
    });

    this.context = ko.observable(null);

    this.page = ko.pureComputed(() => {
      const context = this.context();

      return context ? context.page : null;
    });

    this._pages = {};

    this.navigating = new RouterEvent();

    this.cachedPages = {};

    this._navigatingTask = null;
    this._internalNavigatingTask = null;
    this.isNavigating = ko.observable(false);
    this.isActivating = ko.observable(false);

    this.routerState = new RouterState(this);
  }

  registerPage(name, pageConfig) {
    pageConfig = pageConfig || {};

    if (!name) {
      throw new Error('Router.registerPage - Argument missing exception: name');
    }

    if (this.isRegisteredPage(name)) {
      throw new Error(`Router.registerPage - Duplicate page: ${name}`);
    }

    const componentName = `${name}-page`;

    const page = Object.assign({
      name,
      title: '',
      componentName
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
    routeConfig = routeConfig || {};

    // TODO: Valider que page exist else throw...
    let params = {}; // Not to be confused with url params extrated by byroads.js
    let pageName = pattern;
    let pageTitle = '';
    let cached = false;
    let rules = {};

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

    if (routeConfig.hasOwnProperty('rules') &&
      (typeof routeConfig.rules === 'object' || routeConfig.rules instanceof Object)) {
      rules = routeConfig.rules;
    }

    if (!this.isRegisteredPage(pageName)) {
      throw new Error(`Router.addRoute - The page \'${pageName}\' is not registered. Please register the page before adding a route that refers to it.`);
    }

    let priority;

    if (routeConfig && routeConfig.priority) {
      priority = routeConfig.priority;
    }

    const route = this.byroads.addRoute(pattern, priority);

    // TODO: Lier la page tout de suite au lieu de le faire à chaque fois qu'on crée un Route

    route.params = params;
    route.pageName = pageName;
    route.pageTitle = pageTitle;
    route.cached = cached;
    route.rules = rules;
  }

  // Cette méthode peut être overriden au besoin par le end user
  unknownRouteHandler() {
    console.log('404 - Please override the router.unknownRouteHandler function to handle unknown routes.');
  }

  // Cette méthode peut être overriden au besoin par le end user
  guardRoute( /*matchedRoute, newUrl*/ ) {
    return true;
  }

  // should not be exposed; but it is, for dialoger...
  _navigateInner(newUrl, options, context) {
    const defaultOptions = {
      force: false
    };

    const filnalOptions = Object.assign(defaultOptions, options || {});

    if (!context) {
      context = new Context();
    }

    if (this.byroads.getNumRoutes() === 0) {
      this._internalNavigatingTask.reject('No route has been added to the router yet.');
      return;
    }

    const matchedRoute = updateRoute(this, newUrl, context);
    let guardRouteResult = true;

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
        activateAsync(this, context)
          .then((activatedContext) => {
            this._internalNavigatingTask.resolve(activatedContext);
          })
          .catch(() => {
            this._internalNavigatingTask.reject.apply(this, arguments);
          });
      }
    } else {
      this._internalNavigatingTask.reject('404');
    }
  }

  // Cette méthode peut être overriden au besoin par le end user
  getPrioritizedRoute(matchedRoutes /*, newUrl*/ ) {
    return matchedRoutes[0];
  }

  setPageTitle(pageTitle) {
    document.title = pageTitle;
  }

  setUrlSilently(options) {
    this.routerState.pushState(options);
    const context = this.context();

    if (context && context.route) {
      const matchedRoute = updateRoute(this, options.url, context);

      if (!matchedRoute) {
        throw new Error(`No route found for URL ${options.url}`);
      }
    }
  }

  // stateChanged option - for back and forward buttons (and onbeforeunload eventually)
  // Dans le cas du back or forward button, l'url doit etre remise sur la stack dans resetUrl
  navigate(url, options) {
    // so on était déjà en train de naviguer on hijack la premiere navigation (récupère le dfd) et on kill le internalDefered
    if (this._internalNavigatingTask /* && this._internalNavigatingTask.dfd && this._internalNavigatingTask.dfd.state() === 'pending'*/ ) {
      this._internalNavigatingTask.reject('navigation hijacked');
    } else {
      this._navigatingTask = {};

      this._navigatingTask.promise = new Promise((resolve, reject) => {
        this._navigatingTask.resolve = resolve;
        this._navigatingTask.reject = reject;
      });

      // todo: configurable
      this._navigatingTask.promise.catch(ex => {
        console.log(ex);
      });
    }

    setTimeout(() => {
      const defaultOptions = {
        replace: false,
        stateChanged: false,
        force: false
      };

      options = Object.assign(defaultOptions, options || {});

      this._internalNavigatingTask = {
        options
      };

      this._internalNavigatingTask.promise = new Promise((resolve, reject) => {
        this._internalNavigatingTask.resolve = resolve;
        this._internalNavigatingTask.reject = reject;
      });

      this._internalNavigatingTask.promise
        .then((context) => {
          if (context) {
            const pushStateOptions = toPushStateOptions(this, context,
              this._internalNavigatingTask.options);
            this.routerState.pushState(pushStateOptions);

            const previousContext = this.context();

            if (previousContext && previousContext.route.cached) {
              this.cachedPages[previousContext.route.url] = previousContext;
            }

            context.isDialog = false;
            this.context(context);
            this.setPageTitle(context.pageTitle);
          }

          return postActivate(this);
        })
        .then(() => { // equivalent of always for postActivate
          this._navigatingTask.resolve.apply(this, arguments);
          this._navigatingTask = null;
          this._internalNavigatingTask = null;
          this.isActivating(false);
          this.isNavigating(false);
        })
        .catch((reason) => {
          if (reason !== 'navigation hijacked') {
            resetUrl(this);

            if (reason == '404') {
              this._navigatingTask.resolve.apply(this, arguments);
            } else {
              this._navigatingTask.reject.apply(this, arguments);
            }

            this._navigatingTask = null;
            this._internalNavigatingTask = null;
            this.isActivating(false);
            this.isNavigating(false);

            if (reason == '404') {
              // covention pour les 404
              // TODO: passer plus d'info... ex. url demandée originalement, url finale tenant comptre de guardRoute
              this.unknownRouteHandler();
            }
          }
        });

      if (options.force) {
        this.isNavigating(true);
        this._navigateInner(url, options);
      } else {
        this.navigating.canRoute(options).then((can) => {
          if (can) {
            this.isNavigating(true);
            this._navigateInner(url, options);
          } else {
            this._internalNavigatingTask.reject('routing cancelled by router.navigating.canRoute');
          }
        }, () => {
          this._internalNavigatingTask.reject.apply(this, arguments);
        });
      }
    }, 0);


    // TODO: S'assurer que canRoute() === false, remet l'url précédente sur back/forward button

    return this._navigatingTask.promise;
  }

  currentUrl() {
    return window.location.pathname + window.location.search + window.location.hash;
  }
}

export default Router;
