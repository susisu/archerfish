"use strict";

const fs = require("fs");
const json5 = require("json5");
const path = require("path");
const util = require("util");

const { isObject } = require("./utils");
const { hookKeys } = require("./tasks");
const { getLogger } = require("./logger");

const readFileAsync = util.promisify(fs.readFile);
const statAsync = util.promisify(fs.stat);
const writeFileAsync = util.promisify(fs.writeFile);

class Config {
  /**
   * @param {string} filePath
   * @param {Object} configData
   */
  constructor(filePath, configData) {
    if (!isObject(configData)) {
      throw new TypeError("invalid configuration: configration must be an object");
    }
    const rootDirPath = path.dirname(filePath);
    this._profiles = readProfiles(rootDirPath, configData);
  }

  /**
   * Gets the profile by name.
   * @param {string} name
   * @returns {Profile}
   */
  getProfile(name) {
    if (!this._profiles.has(name)) {
      throw new Error(`profile '${name}' is not configured`);
    }
    return this._profiles.get(name);
  }
}

/**
 * Reads profiles from a raw configuration data.
 * @param {string} rootDirPath
 * @param {Object} configData
 * @returns {Map<string, Profile>}
 */
function readProfiles(rootDirPath, configData) {
  const profiles = new Map();
  if (configData["profiles"] === undefined) {
    return profiles;
  }
  if (!isObject(configData["profiles"])) {
    throw new TypeError("invalid configuration: 'profiles' must be an object");
  }
  for (const [name, profileData] of Object.entries(configData["profiles"])) {
    profiles.set(name, new Profile(name, rootDirPath, profileData));
  }
  return profiles;
}

class Profile {
  /**
   * Asserts validity of a profile name.
   * @param {string} name
   * @returns {void}
   */
  static assertNameValid(name) {
    if (!/^[A-Za-z0-9]+(_[A-Za-z0-9]+)?$/.test(name)) {
      throw new Error(`invalid profile name: '${name}'`);
    }
  }

  /**
   * @param {string} name
   * @param {string} rootDirPath
   * @param {Object} profileData
   */
  constructor(name, rootDirPath, profileData) {
    Profile.assertNameValid(name);
    if (!isObject(profileData)) {
      throw new TypeError(`invalid profile '${name}': profile must be an object`);
    }
    this._name = name;
    this._rootDirPath = rootDirPath;
    this._hooks = readHooks(name, profileData);
    this._data = Object.freeze(Object.assign({}, profileData["data"]));
  }

  /** @type {string} */
  get name() {
    return this._name;
  }

  /** @type {Object} */
  get hooks() {
    return this._hooks;
  }

  /** @type {*} */
  get data() {
    return this._data;
  }

  /**
   * Returns the root directory path.
   * @returns {string}
   */
  rootDirPath() {
    return this._rootDirPath;
  }

  /**
   * Returns the tasks directory path of the profile.
   * @returns {string}
   */
  tasksDirPath() {
    // Uses the parent profile name if the profile is a subprofile.
    const dirName = this._name.split("_")[0];
    return path.resolve(this._rootDirPath, "tasks", dirName);
  }

  /**
   * Returns the screenshots directory path of the profile.
   * @returns {string}
   */
  screenshotsDirPath() {
    return path.resolve(this._rootDirPath, "screenshots", this._name);
  }
}

/**
 * Reads hooks from a raw profile data.
 * @param {string} profileName
 * @param {Object|undefined} profileData
 * @returns {Object} An object containing paths to the hook scripts.
 */
function readHooks(profileName, profileData) {
  const hooks = {};
  if (profileData["hooks"] === undefined) {
    return Object.freeze(hooks);
  }
  if (!isObject(profileData["hooks"])) {
    throw new TypeError(`invalid profile '${profileName}': hooks must be an object`);
  }
  for (const key of Object.values(hookKeys)) {
    if (profileData["hooks"][key] === undefined) {
      continue;
    }
    if (typeof profileData["hooks"][key] !== "string") {
      throw new TypeError(`invalid profile '${profileName}': hook '${key}' must be a file path`);
    }
    hooks[key] = profileData["hooks"][key];
  }
  return Object.freeze(hooks);
}

/**
 * @type {string}
 */
const configFileName = "archerfish.json5";

/**
 * The content of a configuration file created when a project is initialized.
 * @type {string}
 */
const initialConfig = [
  "{",
  "  \"profiles\": {}",
  "}",
].join("\n") + "\n";

/**
 * Creates a configuration file if not exists.
 * @param {string} cwd - Path to the current working directory.
 * @returns {Promise<void>}
 */
async function initConfig(cwd) {
  const logger = getLogger("cli");
  const configFilePath = path.resolve(cwd, configFileName);
  let exists = true;
  try {
    await statAsync(configFilePath);
  } catch (err) {
    if (err.code === "ENOENT") {
      exists = false;
    } else {
      throw err;
    }
  }
  if (exists) {
    logger.error("Project is already initialized.");
    return;
  }
  await writeFileAsync(configFilePath, initialConfig, "utf8");
  logger.info(`Initialized project: ${configFilePath}`);
}

/**
 * Loads the configuration file.
 * @param {string} cwd - Path to the current working directory.
 * @returns {Promise<Config>}
 */
async function loadConfig(cwd) {
  const logger = getLogger("cli");
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
      content = await readFileAsync(configFilePath, "utf8");
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

module.exports = {
  Config,
  Profile,
  configFileName,
  initConfig,
  loadConfig,
};
