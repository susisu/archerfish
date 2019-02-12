"use strict";

const fs = require("fs");
const json5 = require("json5");
const path = require("path");
const puppeteer = require("puppeteer");
const util = require("util");

const { getLogger } = require("../lib/logger");
const { Config, Profile, initialConfig } = require("../lib/config");
const { findTasks, runTasks, runHook } = require("../lib/tasks");

const statAsync = util.promisify(fs.stat);
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

const logger = getLogger("cli");

const configFileName = "archerfish.json5";

/**
 * Loads the configuration file.
 * @param {string} cwd - Path to the current working directory.
 * @returns {Config}
 */
async function loadConfig(cwd) {
  const { filePath, content } = await searchConfig(cwd);
  logger.info(`Using configuration file '${filePath}'.`);
  try {
    const data = json5.parse(content);
    return new Config(filePath, data);
  } catch (err) {
    throw new Error(`failed to load configuration file '${filePath}':\n${err}`);
  }
}

/**
 * Searches configuration file in the nearest ancestor directory.
 * @param {string} cwd - Path to the current working directory.
 * @returns {Promise<Object>} An object containing `file` and `content`.
 */
async function searchConfig(cwd) {
  const rootDirPath = path.parse(cwd).root;
  let dirPath = cwd;
  while (true) {
    const configFilePath = path.resolve(dirPath, configFileName);
    let content;
    try {
      content = await readFileAsync(configFilePath, "utf-8");
    } catch (err) {
      // ignore ENOENT; continue searching the parent directories
      if (err.code !== "ENOENT") {
        throw new Error(`failed to load configuration file '${configFilePath}':\n${err}`);
      }
    }
    if (content !== undefined) {
      return {
        filePath: configFilePath,
        content : content,
      };
    }
    if (dirPath === rootDirPath) {
      throw new Error("failed to load configuration file: no configuration file found");
    }
    dirPath = path.resolve(dirPath, "..");
  }
}

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
