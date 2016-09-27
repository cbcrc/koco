import ko from 'knockout';
import koco from 'koco';

class Router {
  constructor(/* params, componentInfo */) {
    this.template = ko.observable();

    koco.viewModel.subscribe(viewModel => {
      this.template(null);

      if (viewModel) {
        this.template({ nodes: viewModel.page.template, data: viewModel.page.viewModel });
      }
    });
  }
}

export default Router;
