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

import PatternLexer from './pattern-lexer';



//todo:export...
const NORM_AS_ARRAY = function(req, vals) {
    return [vals.vals_];
};

const NORM_AS_OBJECT = function(req, vals) {
    return [vals];
};




var UNDEF;

// Helpers -----------
//====================

// IE 7-8 capture optional groups as empty strings while other browsers
// capture as `undefined`
const _hasOptionalGroupBug = (/t(.+)?/).exec('t')[1] === '';

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
        item, val;
    while (n--) {
        item = queryArr[n].split('=');
        val = shouldTypecast ? typecastValue(item[1]) : item[1];
        obj[item[0]] = (typeof val === 'string') ? decodeURIComponent(val) : val;
    }
    return obj;
}

class Route {
    constructor(pattern, priority, router) {
        var isRegexPattern = isRegExp(pattern),
            patternLexer = router.patternLexer;
        this._router = router;
        this._pattern = pattern;
        this._paramsIds = isRegexPattern ? null : patternLexer.getParamIds(pattern);
        this._optionalParamsIds = isRegexPattern ? null : patternLexer.getOptionalParamsIds(pattern);
        this._matchRegexp = isRegexPattern ? pattern : patternLexer.compilePattern(pattern, router.ignoreCase);
        this._priority = priority || 0;
        this.rules = void(0);
    }

    match(request) {
        request = request || '';
        return this._matchRegexp.test(request) && this._validateParams(request); //validate params even if regexp because of `request_` rule.
    }

    _validateParams(request) {
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

    _isValidParam(request, prop, values) {
        var validationRule = this.rules[prop],
            val = values[prop],
            isValid = false,
            isQuery = (prop.indexOf('?') === 0);

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

    _isValidArrayRule(arr, val) {
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
            compareVal = (typeof item === 'string') ? item.toLowerCase() : item;
            if (compareVal === val) {
                return true;
            }
        }
        return false;
    }

    _getParamsObject(request) {
        var shouldTypecast = this._router.shouldTypecast,
            values = this._router.patternLexer.getParamValues(request, this._matchRegexp, shouldTypecast),
            o = {},
            n = values.length,
            param, val;
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
                    val = void(0);
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

    _getParamsArray(request) {
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

    interpolate(replacements) {
        var str = this._router.patternLexer.interpolate(this._pattern, replacements);
        if (!this._validateParams(str)) {
            throw new Error('Generated string doesn\'t validate against `Route.rules`.');
        }
        return str;
    }

    dispose() {
        this._router.removeRoute(this);
    }

    toString() {
        return '[Route pattern:"' + this._pattern + '"]';
    }
}

class Byroads {
    constructor() {
        this._routes = [];
        this.ignoreCase = true;
        this.shouldTypecast = false;
        this.normalizeFn = NORM_AS_OBJECT;
        this.patternLexer = new PatternLexer();
    }

    create() {
        return new Byroads();
    }

    addRoute(pattern, priority) {
        var route = new Route(pattern, priority, this);
        this._sortedInsert(route);
        return route;
    }

    removeRoute(route) {
        arrayRemove(this._routes, route);
    }

    removeAllRoutes() {
        this._routes.length = 0;
    }

    getNumRoutes() {
        return this._routes.length;
    }

    _sortedInsert(route) {
        //simplified insertion sort
        var routes = this._routes,
            n = routes.length;
        do {
            --n;
        } while (routes[n] && route._priority <= routes[n]._priority);
        routes.splice(n + 1, 0, route);
    }

    getMatchedRoutes(request, returnAllMatchedRoutes) {
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

    toString() {
        return '[byroads numRoutes:' + this.getNumRoutes() + ']';
    }
}

export default Byroads;
