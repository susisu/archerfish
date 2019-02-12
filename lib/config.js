"use strict";

const fs = require("fs");
const json5 = require("json5");
const path = require("path");
const util = require("util");

const { getLogger } = require("../lib/logger");

const readFileAsync = util.promisify(fs.readFile);
const statAsync = util.promisify(fs.stat);
const writeFileAsync = util.promisify(fs.writeFile);

const logger = getLogger("cli");

/**
 * Checks whether a value is an object.
 * @param {*} val
 * @returns {boolean}
 */
function isObject(val) {
  return typeof val === "object" && val !== null;
}

class Config {
  /**
   * @param {string} filePath
   * @param {Object} config
   */
  constructor(filePath, config) {
    if (!isObject(config)) {
      throw new TypeError("invalid configuration: configration must be an object");
    }
    const rootDirPath = path.dirname(filePath);
    this._profiles = readProfiles(rootDirPath, config);
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
 * @param {Object} config
 * @returns {Map<string, Profile>}
 */
function readProfiles(rootDirPath, config) {
  const profiles = new Map();
  if (config["profiles"] === undefined) {
    return profiles;
  }
  if (!isObject(config["profiles"])) {
    throw new TypeError("invalid configuration: 'profiles' must be an object");
  }
  for (const [name, profile] of Object.entries(config["profiles"])) {
    profiles.set(name, new Profile(name, rootDirPath, profile));
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
   * @param {Object} profile
   */
  constructor(name, rootDirPath, profile) {
    Profile.assertNameValid(name);
    if (!isObject(profile)) {
      throw new Error(`invalid profile '${name}': profile must be an object`);
    }
    this._name = name;
    this._rootDirPath = rootDirPath;
    this._hooks = readHooks(name, profile);
    this._data = Object.freeze(Object.assign({}, profile["data"]));
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
 * @param {Object|undefined} profile
 * @returns {Object} An object containing paths to the hook scripts.
 */
function readHooks(profileName, profile) {
  const hooks = {
    beforeAll: undefined,
    afterAll : undefined,
  };
  if (profile["hooks"] === undefined) {
    return Object.freeze(hooks);
  }
  if (!isObject(profile["hooks"])) {
    throw new Error(`invalid profile '${profileName}': hooks must be an object`);
  }
  for (const key of Object.keys(hooks)) {
    if (profile["hooks"][key] === undefined) {
      continue;
    }
    if (typeof profile["hooks"][key] !== "string") {
      throw new Error(`invalid profile '${profileName}': hook '${key}' must be a file path`);
    }
    hooks[key] = profile["hooks"][key];
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
 * Loads the configuration file.
 * @param {string} cwd - Path to the current working directory.
 * @returns {Promise<Config>}
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

module.exports = {
  Config,
  Profile,
  initConfig,
  loadConfig,
};
