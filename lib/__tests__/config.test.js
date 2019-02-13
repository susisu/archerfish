"use strict";

const fs = require("fs");
const json5 = require("json5");
const path = require("path");
const tmp = require("tmp-promise");
const util = require("util");

const { Config, Profile, configFileName, initConfig, loadConfig } = require("../config");

const chmodAsync = util.promisify(fs.chmod);
const mkdirAsync = util.promisify(fs.mkdir);
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

describe("config", () => {
  describe("Config", () => {
    describe("constructor()", () => {
      it("should create a new Config instance", () => {
        const config = new Config("/path/to/project/archerfish.json5", {
          profiles: {
            foo: {},
          },
        });
        expect(config).toBeInstanceOf(Config);
      });

      it("should throw TypeError if configuration data is not an object", () => {
        expect(() =>
          new Config("/path/to/project/archerfish.json5", null)
        ).toThrow(TypeError);
      });

      it("should be ok if 'profiles' does not exist", () => {
        expect(() =>
          new Config("/path/to/project/archerfish.json5", {})
        ).not.toThrow(TypeError);
      });

      it("should throw TypeError if 'profiles' is not an object", () => {
        expect(() =>
          new Config("/path/to/project/archerfish.json5", {
            profiles: 42,
          })
        ).toThrow(TypeError);
      });
    });

    describe("#getProfile()", () => {
      it("should get a profile defined in the configuration", () => {
        const config = new Config("/path/to/project/archerfish.json5", {
          profiles: {
            foo: {},
          },
        });
        const profile = config.getProfile("foo");
        expect(profile).toBeInstanceOf(Profile);
        expect(profile.name).toBe("foo");
      });

      it("should throw Error if no profile with the specified name is found", () => {
        const config = new Config("/path/to/project/archerfish.json5", {
          profiles: {
            foo: {},
          },
        });
        expect(() =>
          config.getProfile("bar")
        ).toThrowError(/not configured/);
      });
    });
  });

  describe("Profile", () => {
    describe("constructor()", () => {
      it("should create a new Profile instance", () => {
        const profile = new Profile("foo", "/path/to/project", {
          hooks: {
            beforeAll: "path/to/beforeAll.js",
          },
          data: 42,
        });
        expect(profile).toBeInstanceOf(Profile);
      });

      it("should throw Error if profile name is invalid", () => {
        expect(() =>
          new Profile("invalid-name", "/path/to/project", {})
        ).toThrowError(/invalid profile name/);
      });

      it("should throw TypeError if profile data is not an object", () => {
        expect(() =>
          new Profile("foo", "/path/to/project", null)
        ).toThrow(TypeError);
      });

      it("should throw TypeError if 'hooks' is specified but not an object", () => {
        expect(() =>
          new Profile("foo", "/path/to/project", {
            hooks: 42,
          })
        ).toThrow(TypeError);
      });

      it("should throw TypeError if a hook script path is not a string", () => {
        expect(() =>
          new Profile("foo", "/path/to/project", {
            hooks: {
              beforeAll: 42,
            },
          })
        ).toThrow(TypeError);
      });
    });

    describe("#name", () => {
      it("should retrive the name of the profile", () => {
        const profile = new Profile("foo", "/path/to/project", {});
        expect(profile.name).toBe("foo");
      });
    });

    describe("#hooks", () => {
      it("should retrive the hook associated to the profile", () => {
        const profile = new Profile("foo", "/path/to/project", {
          hooks: {
            beforeAll: "path/to/beforeAll.js",
            afterAll : "path/to/afterAll.js",
          },
        });
        const hooks = profile.hooks;
        expect(hooks).toEqual({
          beforeAll: "path/to/beforeAll.js",
          afterAll : "path/to/afterAll.js",
        });
        expect(Object.isFrozen(hooks)).toBe(true);
      });
    });

    describe("#data", () => {
      it("should retrive the data associated to the profile", () => {
        const profile = new Profile("foo", "/path/to/project", {
          data: {
            nyan  : "cat",
            answer: 42,
          },
        });
        const data = profile.data;
        expect(data).toEqual({
          nyan  : "cat",
          answer: 42,
        });
        expect(Object.isFrozen(data)).toBe(true);
      });
    });

    describe("#rootDirPath()", () => {
      it("should retrieve the path to the project root directory of the profile", () => {
        {
          const profile = new Profile("foo", "/path/to/project", {});
          expect(profile.rootDirPath()).toBe("/path/to/project");
        }
        {
          const profile = new Profile("foo_bar", "/path/to/project", {});
          expect(profile.rootDirPath()).toBe("/path/to/project");
        }
      });
    });

    describe("#tasksDirPath()", () => {
      it("should retrieve the path to the tasks directory of the profile", () => {
        {
          const profile = new Profile("foo", "/path/to/project", {});
          expect(profile.tasksDirPath()).toBe("/path/to/project/tasks/foo");
        }
        {
          const profile = new Profile("foo_bar", "/path/to/project", {});
          expect(profile.tasksDirPath()).toBe("/path/to/project/tasks/foo");
        }
      });
    });

    describe("#screenshotsDirPath()", () => {
      it("should retrieve the path to the screenshots directory of the profile", () => {
        {
          const profile = new Profile("foo", "/path/to/project", {});
          expect(profile.screenshotsDirPath()).toBe("/path/to/project/screenshots/foo");
        }
        {
          const profile = new Profile("foo_bar", "/path/to/project", {});
          expect(profile.screenshotsDirPath()).toBe("/path/to/project/screenshots/foo_bar");
        }
      });
    });
  });

  describe("initConfig()", () => {
    it("should initialize a configuration file at the current working directory", async () => {
      await tmp.withDir(async dir => {
        await initConfig(dir.path);
        const content = await readFileAsync(path.resolve(dir.path, configFileName), "utf8");
        const configData = JSON.parse(content);
        expect(configData).toEqual({
          profiles: {},
        });
      }, { unsafeCleanup: true });
    });

    it("should do nothing if there is already a configuration file", async () => {
      await tmp.withDir(async dir => {
        const dummyContent = "nyancat";
        await writeFileAsync(path.resolve(dir.path, configFileName), dummyContent, "utf8");
        await initConfig(dir.path);
        const content = await readFileAsync(path.resolve(dir.path, configFileName), "utf8");
        expect(content).toBe(dummyContent);
      }, { unsafeCleanup: true });
    });

    it("should fail if some unknown error has occurred", async () => {
      await tmp.withDir(async dir => {
        const childDirPath = path.resolve(dir.path, "child");
        await mkdirAsync(childDirPath);
        const content = json5.stringify({
          profiles: {},
        });
        await writeFileAsync(path.resolve(childDirPath, configFileName), content, "utf8");
        await chmodAsync(childDirPath, 0o000);
        await expect(initConfig(childDirPath)).rejects.toThrowError(/EACCES/);
        await chmodAsync(childDirPath, 0o777);
      }, { unsafeCleanup: true });
    });
  });

  describe("loadConfig()", () => {
    it("should load a configuration at the nearest ancestor directory", async () => {
      await tmp.withDir(async dir => {
        // parent
        const parentContent = json5.stringify({
          profiles: {
            foo: {},
          },
        });
        await writeFileAsync(path.resolve(dir.path, configFileName), parentContent, "utf8");
        // child
        const childDirPath = path.resolve(dir.path, "child");
        await mkdirAsync(childDirPath);
        const childContent = json5.stringify({
          profiles: {
            bar: {},
          },
        });
        await writeFileAsync(path.resolve(childDirPath, configFileName), childContent, "utf8");
        // grandchild
        const grandchildDirPath = path.resolve(childDirPath, "grandchild");
        await mkdirAsync(grandchildDirPath);

        const parentConfig = await loadConfig(dir.path);
        expect(parentConfig.getProfile("foo").rootDirPath()).toEqual(dir.path);
        const childConfig = await loadConfig(childDirPath);
        expect(childConfig.getProfile("bar").rootDirPath()).toEqual(childDirPath);
        const grandchildConfig = await loadConfig(grandchildDirPath);
        expect(grandchildConfig.getProfile("bar").rootDirPath()).toEqual(childDirPath);
      }, { unsafeCleanup: true });
    });

    it("should fail if configuration is invalid", async () => {
      await tmp.withDir(async dir => {
        const content = json5.stringify({
          profiles: 42,
        });
        await writeFileAsync(path.resolve(dir.path, configFileName), content, "utf8");
        await expect(loadConfig(dir.path)).rejects.toThrowError(/failed to load/);
      }, { unsafeCleanup: true });
    });

    it("should fail if a configuration file exists but cannot be accessed", async () => {
      await tmp.withDir(async dir => {
        const content = json5.stringify({
          profiles: {},
        });
        await writeFileAsync(path.resolve(dir.path, configFileName), content, {
          encoding: "utf8",
          mode    : 0o000,
        });
        await expect(loadConfig(dir.path)).rejects.toThrowError(/EACCES/);
      }, { unsafeCleanup: true });
    });

    it("should fail if no configuration file found", async () => {
      await tmp.withDir(async dir => {
        await expect(loadConfig(dir.path)).rejects.toThrowError(/no configuration file found/);
      }, { unsafeCleanup: true });
    });
  });
});
