import ko from 'knockout';
import Router from './router';
import KocoComponentLoader from './koco-component-loader';
import KocoComponentLoaderRouterPlugin from './koco-component-loader-router-plugin';

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
        this._router = new Router(settings);

        ko.components.loaders.unshift(new KocoComponentLoader({
            plugins: [new KocoComponentLoaderRouterPlugin(this._router)]
        }));
    }

    registerComponent(name, config) {
        ko.components.register(name, config || {});
    }

    fireAsync() {
        if (!this.isInitialized) {
            throw 'koco is not is not initialized yet.';
        }

        return this._router.navigateAsync(this._router.currentUrl(), {
            replace: true
        });
    }
}

export default new Koco();
