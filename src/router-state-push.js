// Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// https://developer.mozilla.org/en-US/docs/Web/API/Location
// http://medialize.github.io/URI.js/about-uris.html

// TODO: Supporter les urls complètes (on supporte relative seulement en ce moement).
// Pour, exemple, pemettre de naviguer dans un sous-domain dans la même app...

const tagNames = ['A', 'AREA'];

function getClickableElement(clckedElement /*, tagNames */ ) {
  if (tagNames.indexOf(clckedElement.tagName) > -1) {
    return clckedElement;
  }

  let cursor = clckedElement;

  while (cursor.parentNode) {
    if (tagNames.indexOf(cursor.tagName) > -1) {
      return cursor;
    }
    cursor = cursor.parentNode;
  }

  return null;
}

function backAndForwardButtonHandler(self, e) {
  // why this if???
  // if (e.state !== null) {
    self.backOrForwardDebounced(e.state);
  // }
}

// todo: rendre overridable (configuration)?
function shouldHandleNavigation(self, url) {
  return url.toLowerCase().startsWith(self.router.settings.baseUrl.toLowerCase());
}

function startsWithRootUrl(self, url) {
  return url.toLowerCase().startsWith((document.location.origin + self.router.settings.baseUrl).toLowerCase());
}

function getRelativeUrl(url) {
  return '/' + url.replace(/^(?:\/\/|[^\/]+)*\//, '');
}

function hrefClickHandler(self, e, clickableElement) {
  // Only handle left-click with no modifiers
  if (e.which !== 1 || e.shiftKey || e.altKey || e.metaKey || e.ctrlKey) {
    return;
  }

  const ignore = clickableElement.getAttribute('data-router-ignore');

  if (ignore) {
    return;
  }

  let url = clickableElement.getAttribute('href');

  // TODO: permettre un regex (ou autre) en config pour savoir si c'est un lien interne
  // car avec ça les sous-domaines vont etre exclus
  // ce qui ne doit pas nécessairement etre le cas!
  const isRelativeUrl = url.indexOf(':') === -1;
  /* var isSameDomain = url.indexOf(document.domain) > -1;*/

  // if ( /*isSameDomain || */ isRelativeUrl) {

  if (!isRelativeUrl && startsWithRootUrl(self, url)) {
    url = getRelativeUrl(url);
  }

  if (shouldHandleNavigation(self, url)) {
    e.preventDefault();
    self.setUrlDebounced(url);
  }
}

// function makeRelativeUrlStartWithSlash(self, url) {
//   const isRelativeUrl = url.indexOf(':') === -1;
//   let result = url;

//   if (isRelativeUrl) {
//     // Replace all (/.../g) leading slash (^\/) or (|) trailing slash (\/$) with an empty string.
//     result = url.replace(/^\/|\/$/g, '');
//     result = '/' + result;
//   }

//   return result;
// }

export default class RouterStatePush {
  constructor(router) {
    var self = this;

    // http://stackoverflow.com/questions/8980255/how-do-i-retrieve-if-the-popstate-event-comes-from-back-or-forward-actions-with
    self.stateId = 0;

    self.router = router;

    // TODO: Pas besoin de debounce étant donné que le router annule automatiquement les requêtes précédentes... pas certain du résultat --> à valider
    self.setUrlDebounced = /* _.debounce( */ function(url) {
      self.router.navigateAsync(url);
    };
    /* , 500, {
        'leading': true,
        'trailing': true
    });*/

    // TODO: Pas besoin de debounce étant donné que le router annule automatiquement les requêtes précédentes... pas certain du résultat --> à valider
    self.backOrForwardDebounced = /*_.debounce(*/ function(state) {
      let direction;

      if (state.id < self.stateId) {
        self.stateId--;
        direction = 'back';
      } else {
        direction = 'forward';
        self.stateId++;
      }

      return self.backOrForward(state, direction);
    };
    /* , 500, {
                    'leading': true,
                    'trailing': true
                });*/


    // prevent bug with safari (popstate is fired on page load with safari)
    document.addEventListener('DOMContentLoaded', function( /*event*/ ) {
      // back and forward button support
      window.onpopstate = function(e) {
        backAndForwardButtonHandler(self, e);
      };

    });


    // http://www.smashingmagazine.com/2013/11/an-introduction-to-dom-events/


    document.addEventListener('click', function(event) {
      var clickableElement = getClickableElement(event.target);
      if (clickableElement) {
        hrefClickHandler(self, event, clickableElement);
      }
    });
  }

  backOrForward( /* state */ ) {
    // même dans le cas où on fait back, il se peut que, dû au pipeline du router, l'url ne
    // soit pas celle du back (a cause de guardRoute par exemple)
    // il faut donc faire un replace du state à la fin pour être certain d'avoir la bonne url
    return this.router.navigateAsync(this.router.currentUrl(), {
      replace: true,
      stateChanged: true,
      // force: true
    });
  }

  pushState(options) {
    const defaultOptions = {
      url: '',
      pageTitle: '',
      stateObject: {},
      replace: false
    };

    const finalOptions = Object.assign({}, defaultOptions, options);

    finalOptions.stateObject.url = finalOptions.url;
    finalOptions.stateObject.pageTitle = finalOptions.pageTitle;

    if (finalOptions.replace) {
      finalOptions.stateObject.id = this.stateId;
      window.history.replaceState(finalOptions.stateObject,
        finalOptions.pageTitle, finalOptions.url);
    } else {
      finalOptions.stateObject.id = ++this.stateId;
      window.history.pushState(finalOptions.stateObject,
        finalOptions.pageTitle, finalOptions.url);
    }
  }
}
