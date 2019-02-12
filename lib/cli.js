"use strict";

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const util = require("util");

const { getLogger } = require("../lib/logger");
const { Profile, configFileName, initialConfig, loadConfig } = require("../lib/config");
const { findTasks, runTasks, runHook } = require("../lib/tasks");

const statAsync = util.promisify(fs.stat);
const writeFileAsync = util.promisify(fs.writeFile);

const logger = getLogger("cli");

/**
 * `init` subcommand.
 * @param {string} cwd - Path to the current working directory.
 * @returns {Promise<void>}
 */
async function init(cwd) {
  const configFilePath = path.resolve(cwd, configFileName);
  let exists = true;
  try {
    await statAsync(configFilePath);
  } catch (err) {
    if (err.code === "ENOENT") {
      exists = false;
    }
  }
  if (exists) {
    logger.warn("Project is already initialized.");
    return;
  }
  await writeFileAsync(configFilePath, initialConfig, "utf-8");
  logger.info(`Initialized project: ${configFilePath}`);
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
