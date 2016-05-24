import ko from 'knockout';
import Router from './router';
// import {  } from './koco-utils';
import KocoComponentLoader from './koco-component-loader';
import KocoComponentLoaderRouterPlugin from './koco-component-loader-router-plugin';

// todo: export function instead of class
// like redux expose multiple functions that you can pick and choose
export default class Koco {
    // todo: options
    // ex. unknownRouteHandler, guardRoute, etc.
    constructor(settings) {
        // todo: private - see http:// stackoverflow.com/a/22160051
        this.router = new Router(settings);

        ko.components.loaders.unshift(new KocoComponentLoader({
            plugins: [new KocoComponentLoaderRouterPlugin(this.router)]
        }));
    }

    registerPage(name, pageConfig) {
        this.router.registerPage(name, pageConfig);
    }

    isRegisteredPage(name) {
        return this.router.isRegisteredPage(name);
    }

    addRoute(pattern, routeConfig) {
        this.router.addRoute(pattern, routeConfig);
    }

    setUrlSilently(options) {
        this.router.setUrlSilently(options);
    }

    navigateAsync(url, options) {
        return this.router.navigateAsync(url, options);
    }

    registerComponent(name, config) {
        ko.components.register(name, config || {});
    }

    fireAsync() {
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
                    resolve({ kocoContext: self.router.context });
                }).catch((...args) => {
                    reject(args);
                });
            } catch (err) {
                reject(err);
            }
        });
    }
}
