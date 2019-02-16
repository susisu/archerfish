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
 * @returns {Function}
 */
function generateScreenshotFilePath(profile, taskFilePath) {
  const taskFileName = path.relative(profile.tasksDirPath(), taskFilePath);
  const screenshotFileName = taskFileName.replace(/.js$/, "");
  const screenshotFilePathBase = path.resolve(profile.screenshotsDirPath(), screenshotFileName);
  let counter = 0;
  // : (type: string, name: string | void) => string
  return (type, name) => {
    if (!extByType.has(type)) {
      throw new Error(`unknown type '${type}'`);
    }
    const ext = extByType.get(type);
    let suffix;
    if (name === null || name === undefined) {
      suffix = counter === 0 ? "" : "-" + counter.toString();
      counter += 1;
    } else {
      suffix = "-" + String(name).replace(/[^0-9A-Za-z_-]/g, "");
    }
    return screenshotFilePathBase + suffix + ext;
  };
}

/**
 * Generates a function that takes a screenshot of a page or an element.
 * @param {Profile} profile
 * @param {string} taskFilePath
 * @returns {Function}
 */
function generateScreenshotFun(profile, taskFilePath) {
  const genFilePath = generateScreenshotFilePath(profile, taskFilePath);
  // : (target: Page | Element, name?: string | void, opts?: Obeject) => Promise<void>
  return async (target, name, opts = {}) => {
    const type = typeof opts.type === "string" ? opts.type : "png";
    const filePath = genFilePath(type, name);
    await mkdirpAsync(path.dirname(filePath));
    await target.screenshot(Object.assign({}, opts, {
      type: type,
      path: filePath,
    }));
  };
}

module.exports = {
  generateScreenshotFun,
};
