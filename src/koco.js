import ko from 'knockout';
import Router from './router';
import kocoComponentLoader from './koco-component-loader';

function getRouterElement() {
  const routerElements = document.getElementsByTagName('router');

  if (routerElements.length < 1) {
    throw new Error('Cannot initialize koco without any router in the page.');
  }

  if (routerElements.length > 1) {
    throw new Error('Cannot initialize koco with more than one router in the page.');
  }

  return routerElements[0];
}

class Koco {
  constructor() {
    this.isInitialized = false;
    this._router = null;
    this.viewModel = ko.pureComputed({
      read: function() {
        if (!this.isInitialized) {
          return null;
        }

        return this._router.context();
      },
      write: function(value) {
        if (!this.isInitialized) {
          throw 'koco is not is not initialized yet.';
        }
        return this._router.context(value);
      },
      owner: this
    });
  }

  get router() {
    if (!this.isInitialized) {
      throw 'koco is not is not initialized yet.';
    }

    return this._router;
  }

  // todo: options
  // ex. unknownRouteHandler, guardRoute, etc.
  init(settings) {
    if (this.isInitialized) {
      throw 'koco is already initialized.';
    }

    this.isInitialized = true;

    // todo: private - see http:// stackoverflow.com/a/22160051
    this._router = new Router(Object.assign({}, settings, { element: getRouterElement() }));

    ko.components.loaders.unshift(kocoComponentLoader);
  }

  registerComponent(name, config) {
    ko.components.register(name, config || {});
  }

  start() {
    if (!this.isInitialized) {
      throw 'koco is not is not initialized yet.';
    }

    return this._router.navigate(this._router.currentUrl(), {
      replace: true
    });
  }
}

export default new Koco();
