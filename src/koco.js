import ko from 'knockout';
import Router from './router';
import KocoComponentLoader from './koco-component-loader';
import KocoComponentLoaderRouterPlugin from './koco-component-loader-router-plugin';

class Koco {
    constructor(name) {
        this.isInitialized = false;
        this._router = null;
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
        this._router = new Router(settings);

        ko.components.loaders.unshift(new KocoComponentLoader({
            plugins: [new KocoComponentLoaderRouterPlugin(this._router)]
        }));
    }

    registerPage(name, pageConfig) {
        if (!this.isInitialized) {
            throw 'koco is not is not initialized yet.';
        }

        this._router.registerPage(name, pageConfig);
    }

    isRegisteredPage(name) {
        if (!this.isInitialized) {
            throw 'koco is not is not initialized yet.';
        }

        return this._router.isRegisteredPage(name);
    }

    addRoute(pattern, routeConfig) {
        if (!this.isInitialized) {
            throw 'koco is not is not initialized yet.';
        }

        this._router.addRoute(pattern, routeConfig);
    }

    setUrlSilently(options) {
        if (!this.isInitialized) {
            throw 'koco is not is not initialized yet.';
        }

        this._router.setUrlSilently(options);
    }

    navigateAsync(url, options) {
        if (!this.isInitialized) {
            throw 'koco is not is not initialized yet.';
        }

        return this._router.navigateAsync(url, options);
    }

    registerComponent(name, config) {
        if (!this.isInitialized) {
            throw 'koco is not is not initialized yet.';
        }

        ko.components.register(name, config || {});
    }

    fireAsync() {
        if (!this.isInitialized) {
            throw 'koco is not is not initialized yet.';
        }

        // how come I have to do this?
        const self = this;
        // should return context (to be renamed to viewModel since
        // the root level of the hierarchy refers to the viewModel
        // parameter you supplied to ko.applyBindings(viewModel)
        // http:// knockoutjs.com/documentation/binding-context.html)
        return new Promise((resolve, reject) => {
            try {
                this.navigateAsync('', {
                    replace: true
                }).then(() => {
                    resolve({ kocoContext: self._router.context });
                }).catch((...args) => {
                    reject(args);
                });
            } catch (err) {
                reject(err);
            }
        });
    }
}

export default new Koco();
