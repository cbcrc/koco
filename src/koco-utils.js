function requireIt(moduleName) {
    // todo: meilleure implémentation?
    return require.context('../../../src/', true, /.*\.(js|html)$/)(moduleName);
}

function requireItNpm(moduleName) {
    return require.context('../../', true, /koco-.*\/src\/.*\.(js|html)$/)(moduleName);
}

// http://stackoverflow.com/questions/5999998/how-can-i-check-if-a-javascript-variable-is-function-type
export function isFunction(functionToCheck) {
    const getType = {};

    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

export function importModule(moduleName, htmlOnly, isNpm) {
    const htmlFile = `${moduleName}.html`;
    const jsFile = `${moduleName}.js`;
    const imported = {
        templateString: isNpm ? requireItNpm(htmlFile) : requireIt(htmlFile)
    };

    if (htmlOnly !== true) {
        imported.viewModel = isNpm
            ? requireItNpm(jsFile).default
            : requireIt(jsFile).default;
    }

    return imported;
}
