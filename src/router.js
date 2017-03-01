import ko from 'knockout';
import defer from 'promise-defer';
import { activate, postActivate, isFunction } from './koco-utils';
import Byroads from './byroads';
import RouterState from './router-state-push';
import Route from './route';
import RouterEvent from './router-event';

const DEFAULT_SETTINGS = {
  localBasePath: '.',
  routerBasePath: 'koco/src',
  baseUrl: '/'
};

const DEFAULT_OPTIONS = {
  replace: false,
  force: false
};

const NAVIGATION_CANCELED_MSG = 'navigation canceled';

// http://stackoverflow.com/a/21489870
function makeQuerableDeferred(deferred) {
  // Don't create a wrapper for promises that can already be queried.
  if (deferred.isResolved) return deferred;

  let isResolved = false;
  let isRejected = false;

  // Observe the promise, saving the fulfillment in a closure scope.
  const wrappedPromise = deferred.promise.then(
    (v) => { isResolved = true; return v; },
    (e) => { isRejected = true; throw e; });

  const result = {
    ...deferred,
    isFulfilled: () => isResolved || isRejected,
    isResolved: () => isResolved,
    isRejected: () => isRejected
  };

  result.promise = wrappedPromise;

  return result;
}

class Router {
  constructor(settings) {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, settings);

    this.byroads = new Byroads();

    ko.components.register('router', {
      basePath: this.settings.routerBasePath,
      isNpm: true
    });

    this.page = ko.observable(null);
    this.route = ko.observable(null);
    this.pageTitle = ko.observable('');

    this.context = ko.pureComputed(() => ({
      page: this.page(),
      route: this.route(),
      pageTitle: this.pageTitle()
    }));

    this.route.subscribe((route) => {
      if (route) {
        this.pageTitle(this.getPageTitle(route));
        this.setPageTitle(route);
      }
    });

    this._pages = {};

    this.navigating = new RouterEvent();

    this.cachedPages = {};

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

  toPushStateOptions(route, options) {
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

  // Cette méthode peut être overriden au besoin par le end user
  unknownRouteHandler() {
    console.log('404 - Please override the router.unknownRouteHandler function to handle unknown routes.');
  }

  // Cette méthode peut être overriden au besoin par le end user
  guardRoute( /* matchedRoute, newUrl */ ) {
    return true;
  }

  getMatchedRoute(url, options) {
    return new Promise((resolve, reject) => {
      if (this.byroads.getNumRoutes() === 0) {
        reject('No route has been added to the router yet.');
      }

      const matchedRoute = this.getPrioritizedMatchedRoute(url);

      let guardRouteResult = true;

      if (!options.force) {
        guardRouteResult = this.guardRoute(matchedRoute, url);
      }

      if (guardRouteResult !== true) {
        if (guardRouteResult === false) {
          reject('guardRoute has blocked navigation.');
        } else if (typeof guardRouteResult === 'string' || guardRouteResult instanceof String) {
          // recursive
          this.getMatchedRoute(guardRouteResult, options)
            .then(x => resolve(x), y => reject(y));
        }

        reject('guardRoute has returned an invalid value. Only string or boolean are supported.');
      } else {
        resolve(matchedRoute);
      }
    });
  }

  // Cette méthode peut être overriden au besoin par le end user
  getPrioritizedRoute(matchedRoutes /* , newUrl */ ) {
    return matchedRoutes[0];
  }

  // Cette méthode peut être overriden au besoin par le end user
  setPageTitle(route) {
    document.title = this.getPageTitle(route);
  }

  // Cette méthode peut être overriden au besoin par le end user
  getPageTitle(route) {
    return route.pageTitle || route.page.title;
  }

  setUrlSilently(options) {
    const matchedRoute = this.getPrioritizedMatchedRoute(options.url);
    if (!matchedRoute) {
      throw new Error(`No route found for URL ${options.url}`);
    } else {
      this.routerState.pushState(options);
      this.route(matchedRoute);
    }
  }

  // stateChanged option - for back and forward buttons (and onbeforeunload eventually)
  // Dans le cas du back or forward button, l'url doit etre remise sur la stack dans resetUrl
  // TODO: S'assurer que canRoute() === false, remet l'url précédente sur back/forward button
  navigate(url, options) {
    if (this.navigationDeferred && !this.navigationDeferred.isFulfilled) {
      this.navigationDeferred.reject('navigation cancelled');
    }

    this.navigationDeferred = makeQuerableDeferred(defer());

    // todo: configurable
    this.navigationDeferred.promise.catch((ex) => {
      if (ex !== NAVIGATION_CANCELED_MSG) {
        console.log(ex);
      }
    });

    const finalOptions = Object.assign({}, DEFAULT_OPTIONS, options || {});

    this.navigating.canRoute(finalOptions)
      .then((can) => {
        if (can) {
          this.isNavigating(true);
          return this.getMatchedRoute(url, finalOptions);
        }
        return Promise.reject(NAVIGATION_CANCELED_MSG);
      })
      .then((route) => {
        if (route) {
          return activate(route.page, this.settings.element, { route: route, isDialog: false }, this.isActivating)
            .then(page => ({
              route: route,
              page: page
            }));
        }
        return Promise.reject('404');
      })
      .then((context) => {
        const pushStateOptions = this.toPushStateOptions(context.route, finalOptions);
        this.routerState.pushState(pushStateOptions);

        const previousPage = this.page();

        this.page(null);
        this.route(null);

        if (previousPage && previousPage.viewModel && isFunction(previousPage.viewModel.dispose)) {
          previousPage.viewModel.dispose();
        }

        this.page(context.page);
        this.route(context.route);

        return postActivate(context.route.page, context.page.viewModel);
      })
      .then(() => {
        this.navigationDeferred.resolve();
        this.isNavigating(false);
      })
      .catch((reason) => {
        if (reason !== 'navigation hijacked') {
          /* reset url */
          const route = this.route();
          if (route) {
            const pushStateOptions = this.toPushStateOptions(route, {
              replace: true
            });
            this.routerState.pushState(pushStateOptions);
          }

          if (reason == '404') {
            this.navigationDeferred.resolve();
          } else {
            this.navigationDeferred.reject(reason);
          }

          this.isNavigating(false);

          if (reason == '404') {
            // covention pour les 404
            // TODO: passer plus d'info... ex. url demandée originalement, url finale tenant comptre de guardRoute
            this.unknownRouteHandler();
          }
        }
      });

    return this.navigationDeferred.promise;
  }

  currentUrl() {
    return window.location.pathname + window.location.search + window.location.hash;
  }

  convertMatchedRoutes(matchedRoutes, url) {
    const result = [];

    for (let i = 0; i < matchedRoutes.length; i++) {
      const matchedRoute = matchedRoutes[i];
      const page = this.getRegisteredPage(matchedRoute.route.pageName);
      const route = new Route(url, matchedRoute, page);
      result.push(route);
    }

    return result;
  }

  getPrioritizedMatchedRoute(newUrl) {
    // Replace all (/.../g) leading slash (^\/) or (|) trailing slash (\/$) with an empty string.
    let cleanedUrl = newUrl.replace(/^\/|\/$/g, '');

    // Remove hash
    cleanedUrl = cleanedUrl.replace(/#.*$/g, '');

    const byroadsMatchedRoutes = this.byroads.getMatchedRoutes(cleanedUrl, true);
    let prioritizedMatchedRoute = null;

    if (byroadsMatchedRoutes.length > 0) {
      const convertedMatchedRoutes = this.convertMatchedRoutes(byroadsMatchedRoutes, newUrl);
      prioritizedMatchedRoute = this.getPrioritizedRoute(convertedMatchedRoutes, newUrl);
    }

    return prioritizedMatchedRoute;
  }

  reload() {
    return new Promise((resolve) => {
      // hack pour rafraichir le formulaire car certain components ne supportent pas bien le two-way data binding!!!! - problematique!
      // todo: (à tester) je ne suis pas certain que ca fonctionne ... knockout doit détecter que c'est le même objet et ne rien faire...
      this.context(Object.assign({}, this.context()));
      resolve();
    });
  }
}

export default Router;
