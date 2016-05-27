import ko from 'knockout';
import { importModule, isFunction } from './koco-utils';

const DEFAULT_OPTIONS = {
    localBasePath: '.',
    plugins: []
};

const DEFAULT_COMPONENT_CONFIG = {
    type: 'component'
};

export default class KocoComponentLoader {

    constructor(options) {
        this.options = Object.assign({}, DEFAULT_OPTIONS, options);
    }

    // second
    loadComponent(name, componentConfig, callback) {
        const finalComponentConfig = Object.assign({}, DEFAULT_COMPONENT_CONFIG, componentConfig);

        // todo: isBower, isNpm --else it is local
        // basePath = 'bower_components/koco-' + name + '/src';
        // todo: basePath override on componentConfig
        // componentConfig.basePath

        if (finalComponentConfig.type === 'component') {
            const componentFullName = `${name}-component`;
            // const basePath = finalComponentConfig.basePath ||
            //     `${this.options.localBasePath}/${componentFullName}`;
            // const moduleName = `${basePath}/${componentFullName}`;

            // const imported = importModule(moduleName,
            //     finalComponentConfig.isHtmlOnly,
            //     finalComponentConfig.isNpm);

            const imported = importModule(componentFullName, {
                isHtmlOnly: finalComponentConfig.isHtmlOnly,
                isNpm: finalComponentConfig.isNpm,
                basePath: finalComponentConfig.basePath,
                template: finalComponentConfig.template
            });

            const result = {
                template: ko.utils.parseHtmlFragment(imported.templateString)
            };

            if (finalComponentConfig.htmlOnly !== true) {
                result.createViewModel = (params, componentInfo) => {
                    if (isFunction(imported.viewModel)) {
                        const ViewModel = imported.viewModel;
                        return new ViewModel(params, componentInfo);
                    }

                    return imported.viewModel;
                };
            }

            callback(result);
        } else {
            let component;

            // http://stackoverflow.com/a/6260865
            this.options.plugins.some(plugin => {
                component = plugin.loadComponent(name, finalComponentConfig);
                return !!component;
            });

            if (component) {
                callback(component);
            } else {
                throw new Error(`Unsupported component type: ${finalComponentConfig.type}`);
            }
        }
    }

    // first
    // getConfig(name, callback) {
    //     callback(null);
    // }

    // third
    // loadTemplate(name, templateConfig, callback) {
    //     //callback(null);
    // }

    // fourth
    // loadViewModel(name, componentConfig, callback) {
    //     callback(null);
    // }
}
