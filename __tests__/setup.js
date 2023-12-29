import { jest } from '@jest/globals';

Promise.unwrapped = () => {
  let resolve,
    reject,
    promise = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
  promise.resolve = resolve;
  promise.reject = reject;
  return promise;
};

global.jest = jest;

global.foundry = (() => {
  let promises = [];

  function __promises() {
    return promises;
  }

  function __nextPromise() {
    return promises.shift();
  }

  return {
    utils: {
      fetchJsonWithTimeout: jest.fn().mockImplementation(() => {
        const p = Promise.unwrapped();
        promises.push(p);
        return promises[promises.length - 1];
      }),
    },
    __promises,
    __nextPromise,
  };
})();

global.ui = {
  notifications: {
    error: jest.fn(),
  },
};

global.deepCopy = obj => JSON.parse(JSON.stringify(obj));
