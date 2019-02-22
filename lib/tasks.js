"use strict";

const glob = require("glob");
const path = require("path");
const util = require("util");

const { generateScreenshotFun } = require("./screenshot");
const { sleep } = require("./sleep");
const { getLogger } = require("./logger");

const globAsync = util.promisify(glob);

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
 * @param {Object} opts - `{ maxConcurrency?: number }`
 * @returns {Promise<void>}
 */
async function runTasks(profile, browser, taskFilePaths, opts) {
  const logger = getLogger("cli");
  const concurrency = Math.min(
    taskFilePaths.length,
    Number.isInteger(opts.maxConcurrency) && opts.maxConcurrency > 0 ? opts.maxConcurrency : 1
  );
  logger.trace(`Runing tasks... (concurrency = ${concurrency})`);
  const workers = [];
  const queue = taskFilePaths.slice();
  for (let i = 0; i < concurrency; i++) {
    workers.push(startWorker(profile, browser, queue));
  }
  await Promise.all(workers);
  logger.info("All tasks finished!");
}

/**
 * Starts a concurrent worker that consumes task file paths from the queue and runs tasks.
 * @param {Profile} profile
 * @param {Browser} browser
 * @param {string[]} queue
 * @returns {Promise<void>}
 */
async function startWorker(profile, browser, queue) {
  while (queue.length > 0) {
    const taskFilePath = queue.pop();
    await runTask(profile, browser, taskFilePath);
  }
}

/**
 * Runs single task.
 * @param {Profile} profile
 * @param {Browser} browser
 * @param {string} taskFilePath - The path to the task file.
 * @returns {Promise<void>}
 */
async function runTask(profile, browser, taskFilePath) {
  const logger = getLogger("cli");
  const taskFileName = path.relative(profile.tasksDirPath(), taskFilePath);
  logger.trace(`Runing task: ${taskFileName}`);
  try {
    const task = require(taskFilePath);
    await task({
      profile   : profile,
      browser   : browser,
      getLogger : getLogger,
      sleep     : sleep,
      screenshot: generateScreenshotFun(profile, taskFilePath),
    });
  } catch (err) {
    if (err && err.stack) {
      logger.error(`Task '${taskFileName}' failed:\n${err.stack}`);
    } else {
      logger.error(`Task '${taskFileName}' failed:\n${err}`);
    }
  }
}

/**
 * @type {Object}
 */
const hookKeys = Object.freeze({
  beforeAll: "beforeAll",
  afterAll : "afterAll",
});

/**
 * Runs a hook script if exists.
 * @param {Profile} profile
 * @param {Browser} browser
 * @param {string} key
 * @returns {Promise<void>}
 */
async function runHook(profile, browser, key) {
  const logger = getLogger("cli");
  if (hookKeys[key] === undefined) {
    throw new Error(`unknown hook key '${key}'`);
  }
  if (profile.hooks[key] !== undefined) {
    logger.trace(`Running ${key} hook: ${profile.hooks[key]}`);
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
  hookKeys,
  runHook,
};
