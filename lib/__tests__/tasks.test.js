"use strict";

const fs = require("fs");
const mkdirp = require("mkdirp");
const path = require("path");
const tmp = require("tmp-promise");
const util = require("util");

const { Profile } = require("../config");
const { findTasks, runTasks } = require("../tasks");

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

          module.exports = ({ browser }) => {
            browser.witnesses.push(path.basename(__filename));
            return Promise.resolve();
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

          const path = require("path");

          module.exports = (args) => {
            args.browser.args = args;
            return Promise.resolve();
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

          module.exports = ({ browser }) => {
            const basename = path.basename(__filename);
            browser.witnesses.push(basename);
            return Promise.reject(basename === "nyancat.js" ? new Error("nyancat") : undefined);
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
});
