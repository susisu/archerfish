"use strict";

const path = require("path");

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
 * The content of a configuration file created when a project is initialized.
 * @type {string}
 */
const initialConfig = [
  "{",
  "  \"profiles\": {}",
  "}",
].join("\n") + "\n";

module.exports = {
  Config,
  Profile,
  initialConfig,
};
