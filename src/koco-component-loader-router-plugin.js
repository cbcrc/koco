export default class KocoComponentLoaderRouterPlugin {
    constructor(router) {
        this.router = router;
    }

    loadComponent(name, componentConfig) {
        let result = null;

        if (componentConfig.type === 'page') {
            result = this.router.component;
        }

        return result;
    }
}
