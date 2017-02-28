import ko from 'knockout';
import koco from 'koco';

class Router {
  constructor(/* params, componentInfo */) {
    this.template = ko.pureComputed(() => {
      const kocoViewModel = koco.viewModel();

      if (kocoViewModel && kocoViewModel.page) {
        return { nodes: kocoViewModel.page.template, data: kocoViewModel.page.viewModel };
      }

      return null;
    });
  }
}

export default Router;
