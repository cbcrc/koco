import ko from 'knockout';
import koco from 'koco';

class Router {
  constructor() {
    this.xyz = ko.observable();

    koco.viewModel.subscribe(() => {
      this.xyz(null);

      const viewModel = koco.viewModel();
      if (viewModel) {
        this.xyz({ nodes: viewModel.page.template, data: viewModel.page.viewModel });
      }
    });
  }
}

export default Router;
