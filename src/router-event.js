// Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

function checkSubscriber(subscribers, options, index) {
  // TODO: Refactore!!
  return new Promise((resolve /* , reject*/ ) => {
    // No more subscribers to check
    if (index >= subscribers.length) {
      resolve(true);
    }

    const subscriber = subscribers[index];
    const handlerResult = subscriber.handler.call(subscriber.context, options);

    if (!handlerResult) {
      resolve(false);
    }

    Promise.all([handlerResult]).then(result => {
      if (!result[0]) {
        resolve(false);
      }

      checkSubscriber(subscribers, options, index + 1)
        .then(r => {
          resolve(r);
        });
    });
  });
}

export default class RouterEvent {
  constructor() {
    this.subscribers = [];
  }

  subscribe(handler, context) {
    this.subscribers.push({
      handler,
      context
    });
  }

  canRoute(options) {
    return checkSubscriber(this.subscribers, options, 0);
  }

  unsubscribe(handler, context) {
    const unsubArgs = arguments;

    this.subscribers = this.subscribers.filter(subscriber => {
      if (unsubArgs.length === 2) {
        return subscriber.context !== context && subscriber.handler !== handler;
      }
      return subscriber.handler !== handler;
    });
  }
}
