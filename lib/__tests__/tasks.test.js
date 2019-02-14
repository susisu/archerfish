"use strict";

const fs = require("fs");
const mkdirp = require("mkdirp");
const path = require("path");
const tmp = require("tmp-promise");
const util = require("util");

const { Profile } = require("../config");
const { findTasks } = require("../tasks");

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
});
