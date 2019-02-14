"use strict";

/**
 * Creates a promise that resolves after the specified time (in milliseconds).
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  });
}

module.exports = {
  sleep,
};
