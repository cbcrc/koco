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
    const finalModuleConfigs = Object.assign({}, DEFAULT_CONFIGS, configs);
    let basePath = finalModuleConfigs.basePath || moduleName;
    const fullModuleName = `${basePath}/${moduleName}`;
    let htmlFile = finalModuleConfigs.template || `${fullModuleName}.html`;
    htmlFile = `./${htmlFile}`;
    const jsFile = `./${fullModuleName}.js`;
    const imported = {
        templateString: finalModuleConfigs.isNpm ? requireItNpm(htmlFile) : requireIt(htmlFile)
    };

    if (finalModuleConfigs.isHtmlOnly !== true) {
        imported.viewModel = finalModuleConfigs.isNpm ? requireItNpm(jsFile).default : requireIt(jsFile).default;
    }

    return imported;
}
