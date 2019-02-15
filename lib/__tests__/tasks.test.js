"use strict";

const fs = require("fs");
const mkdirp = require("mkdirp");
const path = require("path");
const tmp = require("tmp-promise");
const util = require("util");

const { Profile } = require("../config");
const { findTasks, runTasks, runHook } = require("../tasks");

const mkdirAsync = util.promisify(fs.mkdir);
const mkdirpAsync = util.promisify(mkdirp);
const writeFileAsync = util.promisify(fs.writeFile);

describe("tasks", () => {
  describe("findTasks()", () => {
    it("should finds list of the absolute paths of task files", async () => {
      await tmp.withDir(async dir => {
        const profile = new Profile("foo", dir.path, {});
        // prepare tasks directory
        const tasksDirPath = profile.tasksDirPath();
        await mkdirpAsync(tasksDirPath);
        // create task files
        const expectedFilePaths = [
          "pages/main.js",
          "pages/header.js",
          "nyancat.js",
        ].map(relPath => path.resolve(tasksDirPath, relPath));
        await mkdirAsync(path.resolve(tasksDirPath, "pages"));
        for (const filePath of expectedFilePaths) {
          await writeFileAsync(filePath, "", "utf8");
        }
        await writeFileAsync(path.resolve(tasksDirPath, "dummy.js"), "", "utf8");
        // check
        const matchedPaths = await findTasks(profile, ["pages/**/*.js", "nyancat.js"]);
        expect(matchedPaths.sort()).toEqual(expectedFilePaths.sort());
      }, { unsafeCleanup: true });
    });

    it("should find all task files if no globs are specified", async () => {
      await tmp.withDir(async dir => {
        const profile = new Profile("foo", dir.path, {});
        // prepare tasks directory
        const tasksDirPath = profile.tasksDirPath();
        await mkdirpAsync(tasksDirPath);
        // create task files
        const expectedFilePaths = [
          "pages/main.js",
          "pages/header.js",
          "nyancat.js",
        ].map(relPath => path.resolve(tasksDirPath, relPath));
        await mkdirAsync(path.resolve(tasksDirPath, "pages"));
        for (const filePath of expectedFilePaths) {
          await writeFileAsync(filePath, "", "utf8");
        }
        // check
        const matchedPaths = await findTasks(profile, []);
        expect(matchedPaths.sort()).toEqual(expectedFilePaths.sort());
      }, { unsafeCleanup: true });
    });

    it("should return the same file path only once even if matched multiple times", async () => {
      await tmp.withDir(async dir => {
        const profile = new Profile("foo", dir.path, {});
        // prepare tasks directory
        const tasksDirPath = profile.tasksDirPath();
        await mkdirpAsync(tasksDirPath);
        // create task files
        const expectedFilePaths = [
          "pages/main.js",
          "pages/header.js",
          "nyancat.js",
        ].map(relPath => path.resolve(tasksDirPath, relPath));
        await mkdirAsync(path.resolve(tasksDirPath, "pages"));
        for (const filePath of expectedFilePaths) {
          await writeFileAsync(filePath, "", "utf8");
        }
        // check
        const matchedPaths = await findTasks(profile, ["**/*.js", "pages/**/*.js", "mnyancat.js"]);
        expect(matchedPaths.sort()).toEqual(expectedFilePaths.sort());
      }, { unsafeCleanup: true });
    });

    it("should fail if no tasks found", async () => {
      await tmp.withDir(async dir => {
        const profile = new Profile("foo", dir.path, {});
        await mkdirpAsync(path.resolve(dir.path, "tasks", "foo"), { recursive: true });
        await expect(findTasks(profile, ["**/*.js"])).rejects.toThrow(/no tasks found/);
      }, { unsafeCleanup: true });
    });
  });

  describe("runTasks()", () => {
    it("should run specified tasks", async () => {
      await tmp.withDir(async dir => {
        const profile = new Profile("foo", dir.path, {});
        // prepare tasks directory
        const tasksDirPath = profile.tasksDirPath();
        await mkdirpAsync(tasksDirPath);
        // create task files
        const filePaths = [
          "pages/main.js",
          "pages/header.js",
          "nyancat.js",
        ].map(relPath => path.resolve(tasksDirPath, relPath));
        await mkdirAsync(path.resolve(tasksDirPath, "pages"));
        const taskContent = `
          "use strict";

          const path = require("path");

          module.exports = async ({ browser }) => {
            browser.witnesses.push(path.basename(__filename));
          };
        `;
        for (const filePath of filePaths) {
          await writeFileAsync(filePath, taskContent, "utf8");
        }
        // check
        // pass dummy object as browser
        const browser = {
          witnesses: [],
        };
        await runTasks(profile, browser, filePaths);
        expect(browser.witnesses.sort()).toEqual(filePaths.map(p => path.basename(p)).sort());
      }, { unsafeCleanup: true });
    });

    it("should pass tasks correct arguments", async () => {
      await tmp.withDir(async dir => {
        const profile = new Profile("foo", dir.path, {});
        // prepare tasks directory
        const tasksDirPath = profile.tasksDirPath();
        await mkdirpAsync(tasksDirPath);
        // create task file
        const taskContent = `
          "use strict";

          module.exports = async args => {
            args.browser.args = args;
          };
        `;
        const filePath = path.resolve(tasksDirPath, "nyancat.js");
        await writeFileAsync(filePath, taskContent, "utf8");
        // check
        // pass dummy object as browser
        const browser = {
          args: undefined,
        };
        await runTasks(profile, browser, [filePath]);
        expect(browser.args.profile).toBe(profile);
        expect(browser.args.browser).toBe(browser);
        expect(browser.args.getLogger).toBeInstanceOf(Function);
        expect(browser.args.sleep).toBeInstanceOf(Function);
        expect(browser.args.screenshot).toBeInstanceOf(Function);
      }, { unsafeCleanup: true });
    });

    it("should continue running all tasks even if any of tasks failed", async () => {
      await tmp.withDir(async dir => {
        const profile = new Profile("foo", dir.path, {});
        // prepare tasks directory
        const tasksDirPath = profile.tasksDirPath();
        await mkdirpAsync(tasksDirPath);
        // create task files
        const filePaths = [
          "pages/main.js",
          "pages/header.js",
          "nyancat.js",
        ].map(relPath => path.resolve(tasksDirPath, relPath));
        await mkdirAsync(path.resolve(tasksDirPath, "pages"));
        const taskContent = `
          "use strict";

          const path = require("path");

          module.exports = async ({ browser }) => {
            const basename = path.basename(__filename);
            browser.witnesses.push(basename);
            throw basename === "nyancat.js" ? new Error("nyancat") : undefined;
          };
        `;
        for (const filePath of filePaths) {
          await writeFileAsync(filePath, taskContent, "utf8");
        }
        // check
        // pass dummy object as browser
        const browser = {
          witnesses: [],
        };
        await runTasks(profile, browser, filePaths);
        expect(browser.witnesses.sort()).toEqual(filePaths.map(p => path.basename(p)).sort());
      }, { unsafeCleanup: true });
    });
  });

  describe("runHook()", () => {
    it("should run the hook script specified by a key", async () => {
      await tmp.withDir(async dir => {
        const profile = new Profile("foo", dir.path, {
          hooks: {
            beforeAll: "hook.js",
          },
        });
        // create hook script
        const hookContent = `
          "use strict";

          const path = require("path");

          module.exports = async ({ browser }) => {
            browser.witness = path.basename(__filename);
          };
        `;
        const hookFilePath = path.resolve(dir.path, "hook.js");
        await writeFileAsync(hookFilePath, hookContent, "utf8");
        // check
        // pass dummy object as browser
        const browser = {
          witness: undefined,
        };
        await runHook(profile, browser, "beforeAll");
        expect(browser.witness).toBe(path.basename(hookFilePath));
      }, { unsafeCleanup: true });
    });

    it("should pass tasks correct arguments", async () => {
      await tmp.withDir(async dir => {
        const profile = new Profile("foo", dir.path, {
          hooks: {
            beforeAll: "hook.js",
          },
        });
        // create hook script
        const hookContent = `
          "use strict";

          module.exports = async args => {
            args.browser.args = args;
          };
        `;
        const hookFilePath = path.resolve(dir.path, "hook.js");
        await writeFileAsync(hookFilePath, hookContent, "utf8");
        // check
        // pass dummy object as browser
        const browser = {
          args: undefined,
        };
        await runHook(profile, browser, "beforeAll");
        expect(browser.args.profile).toBe(profile);
        expect(browser.args.browser).toBe(browser);
        expect(browser.args.getLogger).toBeInstanceOf(Function);
        expect(browser.args.sleep).toBeInstanceOf(Function);
      }, { unsafeCleanup: true });
    });

    it("should fail if the hook script has failed", async () => {
      await tmp.withDir(async dir => {
        const profile = new Profile("foo", dir.path, {
          hooks: {
            beforeAll: "hook.js",
          },
        });
        // create hook script
        const hookContent = `
          "use strict";

          module.exports = async () => {
            throw new Error("hook");
          };
        `;
        const hookFilePath = path.resolve(dir.path, "hook.js");
        await writeFileAsync(hookFilePath, hookContent, "utf8");
        // check
        // pass dummy object as browser
        const browser = {};
        await expect(runHook(profile, browser, "beforeAll")).rejects.toThrowError(/hook/);
      }, { unsafeCleanup: true });
    });

    it("should skip if hook script for the specified key is not defined", async () => {
      await tmp.withDir(async dir => {
        const profile = new Profile("foo", dir.path, {
          hooks: {
            beforeAll: "hook.js",
          },
        });
        // pass dummy object as browser
        const browser = {
          witness: undefined,
        };
        await runHook(profile, browser, "afterAll");
        expect(browser.witness).toBe(undefined);
      }, { unsafeCleanup: true });
    });
  });
});
