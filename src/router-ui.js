import ko from 'knockout';
import koco from 'koco';

class Router {
  constructor() {
    this.first = ko.observable(false);
    this.xyz = ko.observable();
    this.abc = ko.observable();

    koco.viewModel.subscribe(() => {
      let result = null;
      this.first(!this.first());
      const viewModel = koco.viewModel();
      if (viewModel) {
        result = { nodes: viewModel.page.template, data: viewModel.page.viewModel };
      } else {
        result = null;
      }

      if (this.first()) {
        this.xyz(result);
      } else {
        this.abc(result);
      }
    });
  }
}

export default Router;
