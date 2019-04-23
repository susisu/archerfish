"use strict";

/**
 * Checks whether a value is an object.
 * @param {*} val
 * @returns {boolean}
 */
function isObject(val) {
  return typeof val === "object" && val !== null;
}

module.exports = {
  isObject,
};
