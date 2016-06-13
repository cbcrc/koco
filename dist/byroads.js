(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['exports', './pattern-lexer'], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports, require('./pattern-lexer'));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports, global.patternLexer);
        global.byroads = mod.exports;
    }
})(this, function (exports, _patternLexer) {
    // Copyright (c) CBC/Radio-Canada. All rights reserved.
    // Licensed under the MIT license. See LICENSE file in the project root for full license information.

    /**
     * Most of the code comes from Crossroads.js
     */

    /** @license
     * crossroads <http://millermedeiros.github.com/crossroads.js/>
     * Author: Miller Medeiros | MIT License
     * v0.12.0 (2013/01/21 13:47)
     */

    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _patternLexer2 = _interopRequireDefault(_patternLexer);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    //todo:export...
    var NORM_AS_ARRAY = function NORM_AS_ARRAY(req, vals) {
        return [vals.vals_];
    };

    var NORM_AS_OBJECT = function NORM_AS_OBJECT(req, vals) {
        return [vals];
    };

    var UNDEF;

    // Helpers -----------
    //====================

    // IE 7-8 capture optional groups as empty strings while other browsers
    // capture as `undefined`
    var _hasOptionalGroupBug = /t(.+)?/.exec('t')[1] === '';

    function arrayIndexOf(arr, val) {
        if (arr.indexOf) {
            return arr.indexOf(val);
        } else {
            //Array.indexOf doesn't work on IE 6-7
            var n = arr.length;
            while (n--) {
                if (arr[n] === val) {
                    return n;
                }
            }
            return -1;
        }
    }

    function arrayRemove(arr, item) {
        var i = arrayIndexOf(arr, item);
        if (i !== -1) {
            arr.splice(i, 1);
        }
    }

    function isKind(val, kind) {
        return '[object ' + kind + ']' === Object.prototype.toString.call(val);
    }

    function isRegExp(val) {
        return isKind(val, 'RegExp');
    }

    function isArray(val) {
        return isKind(val, 'Array');
    }

    function isFunction(val) {
        return typeof val === 'function';
    }

    //borrowed from AMD-utils
    function typecastValue(val) {
        var r;
        if (val === null || val === 'null') {
            r = null;
        } else if (val === 'true') {
            r = true;
        } else if (val === 'false') {
            r = false;
        } else if (val === UNDEF || val === 'undefined') {
            r = UNDEF;
        } else if (val === '' || isNaN(val)) {
            //isNaN('') returns false
            r = val;
        } else {
            //parseFloat(null || '') returns NaN
            r = parseFloat(val);
        }
        return r;
    }

    function typecastArrayValues(values) {
        var n = values.length,
            result = [];
        while (n--) {
            result[n] = typecastValue(values[n]);
        }
        return result;
    }

    //borrowed from AMD-Utils
    function decodeQueryString(str, shouldTypecast) {
        var queryArr = (str || '').replace('?', '').split('&'),
            n = queryArr.length,
            obj = {},
            item,
            val;
        while (n--) {
            item = queryArr[n].split('=');
            val = shouldTypecast ? typecastValue(item[1]) : item[1];
            obj[item[0]] = typeof val === 'string' ? decodeURIComponent(val) : val;
        }
        return obj;
    }

    var Route = function () {
        function Route(pattern, priority, router) {
            _classCallCheck(this, Route);

            var isRegexPattern = isRegExp(pattern),
                patternLexer = router.patternLexer;
            this._router = router;
            this._pattern = pattern;
            this._paramsIds = isRegexPattern ? null : patternLexer.getParamIds(pattern);
            this._optionalParamsIds = isRegexPattern ? null : patternLexer.getOptionalParamsIds(pattern);
            this._matchRegexp = isRegexPattern ? pattern : patternLexer.compilePattern(pattern, router.ignoreCase);
            this._priority = priority || 0;
            this.rules = void 0;
        }

        _createClass(Route, [{
            key: 'match',
            value: function match(request) {
                request = request || '';
                return this._matchRegexp.test(request) && this._validateParams(request); //validate params even if regexp because of `request_` rule.
            }
        }, {
            key: '_validateParams',
            value: function _validateParams(request) {
                var rules = this.rules,
                    values = this._getParamsObject(request),
                    key;
                for (key in rules) {
                    // normalize_ isn't a validation rule... (#39)
                    if (key !== 'normalize_' && rules.hasOwnProperty(key) && !this._isValidParam(request, key, values)) {
                        return false;
                    }
                }
                return true;
            }
        }, {
            key: '_isValidParam',
            value: function _isValidParam(request, prop, values) {
                var validationRule = this.rules[prop],
                    val = values[prop],
                    isValid = false,
                    isQuery = prop.indexOf('?') === 0;

                if (val == null && this._optionalParamsIds && arrayIndexOf(this._optionalParamsIds, prop) !== -1) {
                    isValid = true;
                } else if (isRegExp(validationRule)) {
                    if (isQuery) {
                        val = values[prop + '_']; //use raw string
                    }
                    isValid = validationRule.test(val);
                } else if (isArray(validationRule)) {
                    if (isQuery) {
                        val = values[prop + '_']; //use raw string
                    }
                    isValid = this._isValidArrayRule(validationRule, val);
                } else if (isFunction(validationRule)) {
                    isValid = validationRule(val, request, values);
                }

                return isValid; //fail silently if validationRule is from an unsupported type
            }
        }, {
            key: '_isValidArrayRule',
            value: function _isValidArrayRule(arr, val) {
                if (!this._router.ignoreCase) {
                    return arrayIndexOf(arr, val) !== -1;
                }

                if (typeof val === 'string') {
                    val = val.toLowerCase();
                }

                var n = arr.length,
                    item,
                    compareVal;

                while (n--) {
                    item = arr[n];
                    compareVal = typeof item === 'string' ? item.toLowerCase() : item;
                    if (compareVal === val) {
                        return true;
                    }
                }
                return false;
            }
        }, {
            key: '_getParamsObject',
            value: function _getParamsObject(request) {
                var shouldTypecast = this._router.shouldTypecast,
                    values = this._router.patternLexer.getParamValues(request, this._matchRegexp, shouldTypecast),
                    o = {},
                    n = values.length,
                    param,
                    val;
                while (n--) {
                    val = values[n];
                    if (this._paramsIds) {
                        param = this._paramsIds[n];
                        if (param.indexOf('?') === 0 && val) {
                            //make a copy of the original string so array and
                            //RegExp validation can be applied properly
                            o[param + '_'] = val;
                            //update vals_ array as well since it will be used
                            //during dispatch
                            val = decodeQueryString(val, shouldTypecast);
                            values[n] = val;
                        }
                        // IE will capture optional groups as empty strings while other
                        // browsers will capture `undefined` so normalize behavior.
                        // see: #gh-58, #gh-59, #gh-60
                        if (_hasOptionalGroupBug && val === '' && arrayIndexOf(this._optionalParamsIds, param) !== -1) {
                            val = void 0;
                            values[n] = val;
                        }
                        o[param] = val;
                    }
                    //alias to paths and for RegExp pattern
                    o[n] = val;
                }
                o.request_ = shouldTypecast ? typecastValue(request) : request;
                o.vals_ = values;
                return o;
            }
        }, {
            key: '_getParamsArray',
            value: function _getParamsArray(request) {
                var norm = this.rules ? this.rules.normalize_ : null,
                    params;
                norm = norm || this._router.normalizeFn; // default normalize
                if (norm && isFunction(norm)) {
                    params = norm(request, this._getParamsObject(request));
                } else {
                    params = this._getParamsObject(request).vals_;
                }
                return params;
            }
        }, {
            key: 'interpolate',
            value: function interpolate(replacements) {
                var str = this._router.patternLexer.interpolate(this._pattern, replacements);
                if (!this._validateParams(str)) {
                    throw new Error('Generated string doesn\'t validate against `Route.rules`.');
                }
                return str;
            }
        }, {
            key: 'dispose',
            value: function dispose() {
                this._router.removeRoute(this);
            }
        }, {
            key: 'toString',
            value: function toString() {
                return '[Route pattern:"' + this._pattern + '"]';
            }
        }]);

        return Route;
    }();

    var Byroads = function () {
        function Byroads() {
            _classCallCheck(this, Byroads);

            this._routes = [];
            this.ignoreCase = true;
            this.shouldTypecast = false;
            this.normalizeFn = NORM_AS_OBJECT;
            this.patternLexer = new _patternLexer2.default();
        }

        _createClass(Byroads, [{
            key: 'create',
            value: function create() {
                return new Byroads();
            }
        }, {
            key: 'addRoute',
            value: function addRoute(pattern, priority) {
                var route = new Route(pattern, priority, this);
                this._sortedInsert(route);
                return route;
            }
        }, {
            key: 'removeRoute',
            value: function removeRoute(route) {
                arrayRemove(this._routes, route);
            }
        }, {
            key: 'removeAllRoutes',
            value: function removeAllRoutes() {
                this._routes.length = 0;
            }
        }, {
            key: 'getNumRoutes',
            value: function getNumRoutes() {
                return this._routes.length;
            }
        }, {
            key: '_sortedInsert',
            value: function _sortedInsert(route) {
                //simplified insertion sort
                var routes = this._routes,
                    n = routes.length;
                do {
                    --n;
                } while (routes[n] && route._priority <= routes[n]._priority);
                routes.splice(n + 1, 0, route);
            }
        }, {
            key: 'getMatchedRoutes',
            value: function getMatchedRoutes(request, returnAllMatchedRoutes) {
                request = request || '';

                var res = [],
                    routes = this._routes,
                    n = routes.length,
                    route;

                //should be decrement loop since higher priorities are added at the end of array
                while (route = routes[--n]) {
                    if ((!res.length || returnAllMatchedRoutes) && route.match(request)) {
                        res.push({
                            route: route,
                            params: route._getParamsArray(request)
                        });
                    }
                    if (!returnAllMatchedRoutes && res.length) {
                        break;
                    }
                }
                return res;
            }
        }, {
            key: 'toString',
            value: function toString() {
                return '[byroads numRoutes:' + this.getNumRoutes() + ']';
            }
        }]);

        return Byroads;
    }();

    exports.default = Byroads;
});