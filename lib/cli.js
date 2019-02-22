"use strict";

const puppeteer = require("puppeteer");

const { findTasks, runTasks, hookKeys, runHook } = require("./tasks");
const { Profile, initConfig, loadConfig } = require("./config");
const { getLogger } = require("./logger");

/**
 * `init` subcommand.
 * @param {string} cwd - Path to the current working directory.
 * @returns {Promise<void>}
 */
async function init(cwd) {
  await initConfig(cwd);
}

/**
 * `run` subcommand.
 * @param {string} cwd - Path to the current working directory.
 * @param {string} profileName
 * @param {string[]} globs
 * @param {Object} opts - `{ maxConcurrency?: number }`
 * @returns {Promise<Browser>}
 */
async function run(cwd, profileName, globs, opts) {
  const logger = getLogger("cli");
  Profile.assertNameValid(profileName);
  const config = await loadConfig(cwd);
  const profile = config.getProfile(profileName);
  const matches = await findTasks(profile, globs);
  logger.trace("Launching browser...");
  const browser = await puppeteer.launch();
  const registeredArgs = await runHook(profile, browser, hookKeys.beforeAll, true);
  await runTasks(profile, browser, matches, {
    maxConcurrency: opts.maxConcurrency,
    registeredArgs: registeredArgs,
  });
  await runHook(profile, browser, hookKeys.afterAll, false);
  await browser.close();
  return browser;
}

module.exports = {
  init,
  run,
};
