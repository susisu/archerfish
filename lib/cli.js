"use strict";

const puppeteer = require("puppeteer");

const { getLogger } = require("../lib/logger");
const { Profile, initConfig, loadConfig } = require("../lib/config");
const { findTasks, runTasks, runHook } = require("../lib/tasks");

const logger = getLogger("cli");

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
 * @returns {Promise<void>}
 */
async function run(cwd, profileName, globs) {
  Profile.assertNameValid(profileName);
  const config = await loadConfig(cwd);
  const profile = config.getProfile(profileName);
  const matches = await findTasks(profile, globs);
  logger.trace("Launching browser...");
  const browser = await puppeteer.launch();
  await runHook(profile, browser, "beforeAll");
  await runTasks(profile, browser, matches);
  await runHook(profile, browser, "afterAll");
  await browser.close();
}

module.exports = {
  init,
  run,
};
