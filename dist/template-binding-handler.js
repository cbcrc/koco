(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['knockout', './koco-utils'], factory);
  } else if (typeof exports !== "undefined") {
    factory(require('knockout'), require('./koco-utils'));
  } else {
    var mod = {
      exports: {}
    };
    factory(global.knockout, global.kocoUtils);
    global.templateBindingHandler = mod.exports;
  }
})(this, function (_knockout, _kocoUtils) {
  'use strict';

  var _knockout2 = _interopRequireDefault(_knockout);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  //get a new native template engine to start with
  // Copyright (c) CBC/Radio-Canada. All rights reserved.
  // Licensed under the MIT license. See LICENSE file in the project root for full license information.

  /**
   * Extends the template binding handler to be able to load external templates
   * Code based on https://github.com/rniemeyer/knockout-amd-helpers/blob/master/src/amdTemplateEngine.js
   **/
  var engine = new _knockout2.default.nativeTemplateEngine(),
      sources = {};

  engine.defaultPath = '';
  engine.defaultSuffix = '.html';
  engine.defaultRequireTextPluginName = 'text';

  _knockout2.default.templateSources.requireTemplate = function (key) {
    this.key = key;
    this.template = _knockout2.default.observable(' '); //content has to be non-falsey to start with
    this.requested = false;
    this.retrieved = false;
  };

  _knockout2.default.templateSources.requireTemplate.prototype.text = function () {
    // when the template is retrieved, check if we need to load it
    if (!this.requested && this.key) {

      // todo: isNpm?
      var templateContent = void 0;
      var moduleName = './' + this.key + engine.defaultSuffix;
      if (this.key.startsWith('koco-')) {
        templateContent = (0, _kocoUtils.requireItNpm)(moduleName);
      } else {
        templateContent = (0, _kocoUtils.requireIt)(moduleName);
      }
      // require([engine.defaultRequireTextPluginName + '!' + addTrailingSlash(engine.defaultPath) + this.key + engine.defaultSuffix],
      //     function(templateContent) {
      this.retrieved = true;
      this.template(templateContent);
      //}.bind(this));

      this.requested = true;
    }

    //if template is currently empty, then clear it
    if (!this.key) {
      this.template('');
    }

    //always return the current template
    if (arguments.length === 0) {
      return this.template();
    }
  };

  //our engine needs to understand when to create a 'requireTemplate' template source
  engine.makeTemplateSource = function (template, doc) {
    var el;

    //if a name is specified
    if (typeof template === 'string') {
      //if there is an element with this id and it is a script tag, then use it
      el = (doc || document).getElementById(template);

      if (el && el.tagName.toLowerCase() === 'script') {
        return new _knockout2.default.templateSources.domElement(el);
      }

      //otherwise pull the template in using the AMD loader's text plugin
      if (!(template in sources)) {
        sources[template] = new _knockout2.default.templateSources.requireTemplate(template);
      }

      //keep a single template source instance for each key, so everyone depends on the same observable
      return sources[template];
    }
    //if there is no name (foreach/with) use the elements as the template, as normal
    else if (template && (template.nodeType === 1 || template.nodeType === 8)) {
        return new _knockout2.default.templateSources.anonymousTemplate(template);
      }
  };

  //override renderTemplate to properly handle afterRender prior to template being available
  engine.renderTemplate = function (template, bindingContext, options, templateDocument) {
    var templateSource,
        existingAfterRender = options && options.afterRender,
        localTemplate = options && options.templateProperty && bindingContext.$module && bindingContext.$module[options.templateProperty];

    //restore the original afterRender, if necessary
    if (existingAfterRender) {
      existingAfterRender = options.afterRender = options.afterRender.original || options.afterRender;
    }

    //if a module is being loaded, and that module has the template property (of type `string` or `function`) - use that as the source of the template.
    if (localTemplate && (typeof localTemplate === 'function' || typeof localTemplate === 'string')) {
      templateSource = {
        text: function text() {
          return typeof localTemplate === 'function' ? localTemplate.call(bindingContext.$module) : localTemplate;
        }
      };
    } else {
      templateSource = engine.makeTemplateSource(template, templateDocument);
    }

    //wrap the existing afterRender, so it is not called until template is actually retrieved
    if (typeof existingAfterRender === 'function' && templateSource instanceof _knockout2.default.templateSources.requireTemplate && !templateSource.retrieved) {
      options.afterRender = function () {
        if (templateSource.retrieved) {
          existingAfterRender.apply(this, arguments);
        }
      };

      //keep track of the original, so we don't double-wrap the function when template name changes
      options.afterRender.original = existingAfterRender;
    }

    return engine.renderTemplateSource(templateSource, bindingContext, options);
  };

  //expose the template engine at least to be able to customize the path/suffix/plugin at run-time
  _knockout2.default.amdTemplateEngine = engine;

  //make this new template engine our default engine
  _knockout2.default.setTemplateEngine(engine);
});