function requireIt(moduleName) {
    return require.context('../../../modules/', true, /.*\.(js|html)$/)(moduleName);
}

function requireItNpm(moduleName) {
    return require.context('../../', true, /koco.*\/src\/.*\.(js|html)$/)(moduleName);
}

// http://stackoverflow.com/questions/5999998/how-can-i-check-if-a-javascript-variable-is-function-type
export function isFunction(functionToCheck) {
    const getType = {};

    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

const DEFAULT_CONFIGS = {
    isHtmlOnly: false,
    isNpm: false,
    basePath: null,
    template: null
};

export function importModule(moduleName, configs) {
    const finalConfigs = Object.assing({}, configs, DEFAULT_CONFIGS);
    const basePath = finalComponentConfig.basePath ||
        `${this.options.localBasePath}/${moduleName}`;
    const fullModuleName = `${basePath}/${moduleName}`;
    const htmlFile = finalConfigs.template || `${fullModuleName}.html`;
    const jsFile = `${fullModuleName}.js`;
    const imported = {
        templateString: isNpm ? requireItNpm(htmlFile) : requireIt(htmlFile)
    };

    if (isHtmlOnly !== true) {
        imported.viewModel = isNpm ? requireItNpm(jsFile).default : requireIt(jsFile).default;
    }

    return imported;
}
