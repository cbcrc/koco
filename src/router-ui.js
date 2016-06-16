import ko from 'knockout';
import koco from 'koco';
import { isFunction } from './koco-utils';


class Router {
  constructor() {
    this.xyz = ko.observable();

    koco.viewModel.subscribe(() => {
        const previousViewModel = this.xyz();

        this.xyz(null);

        if (previousViewModel && previousViewModel.data && isFunction(previousViewModel.data.dispose)) {
            previousViewModel.data.dispose();
          }

          const viewModel = koco.viewModel();
          if (viewModel) {
            this.xyz({ nodes: viewModel.page.template, data: viewModel.page.viewModel });
          }
        });
    }
  }

  export default Router;
