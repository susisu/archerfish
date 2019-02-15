"use strict";

const mkdirp = require("mkdirp");
const path = require("path");
const util = require("util");

const mkdirpAsync = util.promisify(mkdirp);

const extByType = new Map([
  ["png", ".png"],
  ["jpeg", ".jpg"],
]);

/**
 * @param {Profile} profile
 * @param {string} taskFilePath
 * @returns {Function} `(type: string) => string`
 */
function generateScreenshotFilePath(profile, taskFilePath) {
  const taskFileName = path.relative(profile.tasksDirPath(), taskFilePath);
  const screenshotFileName = taskFileName.replace(/.js$/, "");
  const screenshotFilePathBase = path.resolve(profile.screenshotsDirPath(), screenshotFileName);
  let counter = 0;
  return type => {
    if (!extByType.has(type)) {
      throw new Error(`unknown type '${type}'`);
    }
    const ext = extByType.get(type);
    const n = counter;
    counter += 1;
    return `${screenshotFilePathBase}-${n}${ext}`;
  };
}

/**
 * Generates a function that takes a screenshot of a page or an element.
 * @param {Profile} profile
 * @param {string} taskFilePath
 * @returns {Function} `(target: Page | Element, opts?: Obeject) => Promise<void>`
 */
function generateScreenshotFun(profile, taskFilePath) {
  const genFilePath = generateScreenshotFilePath(profile, taskFilePath);
  return async (target, opts) => {
    const type = (opts ? opts.type : undefined) || "png";
    const filePath = genFilePath(type);
    await mkdirpAsync(path.dirname(filePath));
    await target.screenshot(Object.assign({}, {
      path: filePath,
      type: type,
    }, opts || {}));
  };
}

module.exports = {
  generateScreenshotFun,
};
