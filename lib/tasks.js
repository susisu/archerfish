"use strict";

const glob = require("glob");
const path = require("path");
const util = require("util");

const { getLogger } = require("../lib/logger");
const screenshot = require("../lib/screenshot");
const sleep = require("../lib/sleep");

const globAsync = util.promisify(glob);

const logger = getLogger("cli");

/**
 * Finds all tasks for the profile.
 * @param {Profile} profile
 * @param {string[]} globs
 * @returns {Promise<string[]>} The absolute paths of task files.
 */
async function findTasks(profile, globs) {
  const completedGlobs = globs.length === 0 ? ["**/*.js"] : globs;
  const taskFilePaths = await globAll(completedGlobs, {
    cwd     : profile.tasksDirPath(),
    nodir   : true,
    absolute: true,
  });
  if (taskFilePaths.length === 0) {
    throw new Error("no tasks found");
  }
  return taskFilePaths;
}

/**
 * Finds all files and directories that match to one of given globs.
 * @param {string[]} globs
 * @param {Object} opts - Options passed to the `glob` package.
 * @returns {Promise<string[]>} The list of found files and directories.
 */
async function globAll(globs, opts) {
  const allMatches = [];
  for (const g of globs) {
    const matches = await globAsync(g, opts);
    Array.prototype.push.apply(allMatches, matches);
  }
  return distinct(allMatches);
}

/**
 * Removes duplicate elements from an array.
 * @param {Array} arr
 * @returns {Array}
 */
function distinct(arr) {
  return arr.filter((elem, i) => arr.indexOf(elem) === i);
}

/**
 * Runs all tasks.
 * @param {Profile} profile
 * @param {Browser} browser
 * @param {string[]} taskFilePaths - The paths to the task files.
 * @returns {Promise<void>}
 */
async function runTasks(profile, browser, taskFilePaths) {
  logger.trace("Runing tasks...");
  for (const taskFilePath of taskFilePaths) {
    try {
      const task = require(taskFilePath);
      await task({
        profile   : profile,
        browser   : browser,
        getLogger : getLogger,
        sleep     : sleep,
        screenshot: screenshot(profile, taskFilePath),
      });
    } catch (err) {
      const shortName = path.relative(profile.tasksDirPath(), taskFilePath);
      if (err && err.stack) {
        logger.error(`Task '${shortName}' failed:\n${err.stack}`);
      } else {
        logger.error(`Task '${shortName}' failed:\n${err}`);
      }
    }
  }
  logger.info("All tasks finished!");
}

/**
 * Runs a hook script if exists.
 * @param {Profile} profile
 * @param {Browser} browser
 * @param {string} key
 * @returns {Promise<void>}
 */
async function runHook(profile, browser, key) {
  if (profile.hooks[key] !== undefined) {
    logger.trace(`Running ${key} hook...`);
    const hook = require(path.resolve(profile.rootDirPath(), profile.hooks[key]));
    await hook({
      profile  : profile,
      browser  : browser,
      getLogger: getLogger,
      sleep    : sleep,
    });
  }
}

module.exports = {
  findTasks,
  runTasks,
  runHook,
};
