// Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

//match chars that should be escaped on string regexp
const ESCAPE_CHARS_REGEXP = /[\\.+*?\^$\[\](){}\/'#]/g;

//trailing slashes (begin/end of string)
const LOOSE_SLASHES_REGEXP = /^\/|\/$/g;
const LEGACY_SLASHES_REGEXP = /\/$/g;

//params - everything between `{ }` or `: :`
const PARAMS_REGEXP = /(?:\{|:)([^}:]+)(?:\}|:)/g;

//used to save params during compile (avoid escaping things that
//shouldn't be escaped).
const TOKENS = {
    'OS': {
        //optional slashes
        //slash between `::` or `}:` or `\w:` or `:{?` or `}{?` or `\w{?`
        rgx: /([:}]|\w(?=\/))\/?(:|(?:\{\?))/g,
        save: '$1{{id}}$2',
        res: '\\/?'
    },
    'RS': {
        //required slashes
        //used to insert slash between `:{` and `}{`
        rgx: /([:}])\/?(\{)/g,
        save: '$1{{id}}$2',
        res: '\\/'
    },
    'RQ': {
        //required query string - everything in between `{? }`
        rgx: /\{\?([^}]+)\}/g,
        //everything from `?` till `#` or end of string
        res: '\\?([^#]+)'
    },
    'OQ': {
        //optional query string - everything in between `:? :`
        rgx: /:\?([^:]+):/g,
        //everything from `?` till `#` or end of string
        res: '(?:\\?([^#]*))?'
    },
    'OR': {
        //optional rest - everything in between `: *:`
        rgx: /:([^:]+)\*:/g,
        res: '(.*)?' // optional group to avoid passing empty string as captured
    },
    'RR': {
        //rest param - everything in between `{ *}`
        rgx: /\{([^}]+)\*\}/g,
        res: '(.+)'
    },
    // required/optional params should come after rest segments
    'RP': {
        //required params - everything between `{ }`
        rgx: /\{([^}]+)\}/g,
        res: '([^\\/?]+)'
    },
    'OP': {
        //optional params - everything between `: :`
        rgx: /:([^:]+):/g,
        res: '([^\\/?]+)?\/?'
    }
};

const LOOSE_SLASH = 1;
const STRICT_SLASH = 2;
const LEGACY_SLASH = 3;


function precompileTokens() {
    var key, cur;
    for (key in TOKENS) {
        if (TOKENS.hasOwnProperty(key)) {
            cur = TOKENS[key];
            cur.id = '__CR_' + key + '__';
            cur.save = ('save' in cur) ? cur.save.replace('{{id}}', cur.id) : cur.id;
            cur.rRestore = new RegExp(cur.id, 'g');
        }
    }
}

function captureVals(regex, pattern) {
    var vals = [],
        match;
    // very important to reset lastIndex since RegExp can have "g" flag
    // and multiple runs might affect the result, specially if matching
    // same string multiple times on IE 7-8
    regex.lastIndex = 0;
    while (match = regex.exec(pattern)) {
        vals.push(match[1]);
    }
    return vals;
}

function replaceTokens(pattern, regexpName, replaceName) {
    var cur, key;
    for (key in TOKENS) {
        if (TOKENS.hasOwnProperty(key)) {
            cur = TOKENS[key];
            pattern = pattern.replace(cur[regexpName], cur[replaceName]);
        }
    }
    return pattern;
}







class PatternLexer {
    constructor() {
        precompileTokens();
        this._slashMode = LOOSE_SLASH;
    }

    strict() {
        this._slashMode = STRICT_SLASH;
    }
    loose() {
        this._slashMode = LOOSE_SLASH;
    }
    legacy() {
        this._slashMode = LEGACY_SLASH;
    }

    getParamIds(pattern) {
        return captureVals(PARAMS_REGEXP, pattern);
    }

    compilePattern(pattern, ignoreCase) {
        pattern = pattern || '';

        if (pattern) {
            if (this._slashMode === LOOSE_SLASH) {
                pattern = pattern.replace(LOOSE_SLASHES_REGEXP, '');
            } else if (this._slashMode === LEGACY_SLASH) {
                pattern = pattern.replace(LEGACY_SLASHES_REGEXP, '');
            }

            //save tokens
            pattern = replaceTokens(pattern, 'rgx', 'save');
            //regexp escape
            pattern = pattern.replace(ESCAPE_CHARS_REGEXP, '\\$&');
            //restore tokens
            pattern = replaceTokens(pattern, 'rRestore', 'res');

            if (this._slashMode === LOOSE_SLASH) {
                pattern = '\\/?' + pattern;
            }
        }

        if (this._slashMode !== STRICT_SLASH) {
            //single slash is treated as empty and end slash is optional
            pattern += '\\/?';
        }
        return new RegExp('^' + pattern + '$', ignoreCase ? 'i' : '');
    }

    getParamValues(request, regexp, shouldTypecast) {
        var vals = regexp.exec(request);
        if (vals) {
            vals.shift();
            if (shouldTypecast) {
                vals = typecastArrayValues(vals);
            }
        }
        return vals;
    }

    getOptionalParamsIds(pattern) {
        return captureVals(TOKENS.OP.rgx, pattern);
    }

    interpolate(pattern, replacements) {
        if (typeof pattern !== 'string') {
            throw new Error('Route pattern should be a string.');
        }

        var replaceFn = function(match, prop) {
            var val;
            prop = (prop.substr(0, 1) === '?') ? prop.substr(1) : prop;
            if (replacements[prop] != null) {
                if (typeof replacements[prop] === 'object') {
                    var queryParts = [];
                    for (var key in replacements[prop]) {
                        queryParts.push(encodeURI(key + '=' + replacements[prop][key]));
                    }
                    val = '?' + queryParts.join('&');
                } else {
                    // make sure value is a string see #gh-54
                    val = String(replacements[prop]);
                }

                if (match.indexOf('*') === -1 && val.indexOf('/') !== -1) {
                    throw new Error('Invalid value "' + val + '" for segment "' + match + '".');
                }
            } else if (match.indexOf('{') !== -1) {
                throw new Error('The segment ' + match + ' is required.');
            } else {
                val = '';
            }
            return val;
        };

        if (!TOKENS.OS.trail) {
            TOKENS.OS.trail = new RegExp('(?:' + TOKENS.OS.id + ')+$');
        }

        return pattern
            .replace(TOKENS.OS.rgx, TOKENS.OS.save)
            .replace(PARAMS_REGEXP, replaceFn)
            .replace(TOKENS.OS.trail, '') // remove trailing
            .replace(TOKENS.OS.rRestore, '/'); // add slash between segments
    }
}

export default PatternLexer;