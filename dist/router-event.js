(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(["exports"], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports);
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports);
        global.routerEvent = mod.exports;
    }
})(this, function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

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

    // Copyright (c) CBC/Radio-Canada. All rights reserved.
    // Licensed under the MIT license. See LICENSE file in the project root for full license information.

    function checkSubscriber(subscribers, options, index) {
        // TODO: Refactore!!
        return new Promise(function (resolve /* , reject*/) {
            // No more subscribers to check
            if (index >= subscribers.length) {
                resolve(true);
            }

            var subscriber = subscribers[index];
            var handlerResult = subscriber.handler.call(subscriber.context, options);

            if (!handlerResult) {
                resolve(false);
            }

            Promise.all([handlerResult]).then(function (result) {
                if (!result) {
                    resolve(false);
                }

                checkSubscriber(subscribers, options, index + 1).then(function (r) {
                    resolve(r);
                });
            });
        });
    }

    var RouterEvent = function () {
        function RouterEvent() {
            _classCallCheck(this, RouterEvent);

            this.subscribers = [];
        }

        _createClass(RouterEvent, [{
            key: "subscribe",
            value: function subscribe(handler, context) {
                this.subscribers.push({
                    handler: handler,
                    context: context
                });
            }
        }, {
            key: "canRoute",
            value: function canRoute(options) {
                return checkSubscriber(this.subscribers, options, 0);
            }
        }, {
            key: "unsubscribe",
            value: function unsubscribe(handler, context) {
                var unsubArgs = arguments;

                this.subscribers = this.subscribers.filter(function (subscriber) {
                    if (unsubArgs.length === 2) {
                        return subscriber.context !== context && subscriber.handler !== handler;
                    }
                    return subscriber.handler !== handler;
                });
            }
        }]);

        return RouterEvent;
    }();

    exports.default = RouterEvent;
});