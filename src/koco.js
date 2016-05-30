import ko from 'knockout';
import Router from './router';
import KocoComponentLoader from './koco-component-loader';
import KocoComponentLoaderRouterPlugin from './koco-component-loader-router-plugin';

class Koco {
    constructor() {
        this.isInitialized = false;
        this._router = null;
        this.context = ko.pureComputed({
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
        this._router = new Router(settings);

        ko.components.loaders.unshift(new KocoComponentLoader({
            plugins: [new KocoComponentLoaderRouterPlugin(this._router)]
        }));
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
                self._router.navigateAsync(self._router.currentUrl(), {
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
