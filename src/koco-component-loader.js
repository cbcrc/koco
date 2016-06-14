import ko from 'knockout';
import { importModule, isFunction } from './koco-utils';

class KocoComponentLoader {
  loadComponent(name, componentConfig, callback) {
    const imported = importModule(name, {
      isHtmlOnly: componentConfig.isHtmlOnly,
      isNpm: componentConfig.isNpm,
      basePath: componentConfig.basePath,
      template: componentConfig.template
    });

    const result = {
      template: ko.utils.parseHtmlFragment(imported.templateString)
    };

    if (componentConfig.isHtmlOnly !== true) {
      result.createViewModel = (params, componentInfo) => {
        if (isFunction(imported.viewModel)) {
          const ViewModel = imported.viewModel;
          return new ViewModel(params, componentInfo);
        }

        return imported.viewModel;
      };
    }

    callback(result);
  }
}

export default new KocoComponentLoader();
