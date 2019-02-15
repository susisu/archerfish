"use strict";

const fs = require("fs");
const json5 = require("json5");
const mkdirp = require("mkdirp");
const tmp = require("tmp-promise");
const path = require("path");
const util = require("util");

const { configFileName } = require("../config");
const { init, run } = require("../cli");

const mkdirAsync = util.promisify(fs.mkdir);
const mkdirpAsync = util.promisify(mkdirp);
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

describe("cli", () => {
  describe("init()", () => {
    it("should initialize a configuration file at the current working directory", async () => {
      await tmp.withDir(async dir => {
        await init(dir.path);
        const content = await readFileAsync(path.resolve(dir.path, configFileName), "utf8");
        const configData = json5.parse(content);
        expect(configData).toEqual({
          profiles: {},
        });
      }, { unsafeCleanup: true });
    });
  });

  describe("run()", () => {
    it("should run tasks associated to the profile", async () => {
      await tmp.withDir(async dir => {
        // prepare configuration
        const content = json5.stringify({
          profiles: {
            test: {
              hooks: {
                beforeAll: "beforeAll.js",
                afterAll : "afterAll.js",
              },
            },
          },
        });
        await writeFileAsync(path.resolve(dir.path, configFileName), content, "utf8");
        // prepare task files
        const tasksDirPath = path.resolve(dir.path, "tasks", "test");
        await mkdirpAsync(tasksDirPath);
        const taskFileNames = [
          "pages/main.js",
          "pages/header.js",
          "nyancat.js",
        ];
        const taskFilePaths = taskFileNames.map(fileName => path.resolve(tasksDirPath, fileName));
        await mkdirAsync(path.resolve(tasksDirPath, "pages"));
        const taskContent = `
          "use strict";

          const path = require("path");

          module.exports = async ({ browser, screenshot }) => {
            browser.tasks.push(path.basename(__filename));
            const page = await browser.newPage();
            await screenshot(page);
          };
        `;
        for (const taskFilePath of taskFilePaths) {
          await writeFileAsync(taskFilePath, taskContent, "utf8");
        }
        // prepare hook script
        const hookContent = `
          "use strict";

          const path = require("path");

          module.exports = async ({ browser }) => {
            browser.hooks.push(path.basename(__filename));
          };
        `;
        const hookFileNames = [
          "beforeAll.js",
          "afterAll.js",
        ];
        const hookFilePaths = hookFileNames.map(fileName => path.resolve(dir.path, fileName));
        for (const hookFilePath of hookFilePaths) {
          await writeFileAsync(hookFilePath, hookContent, "utf8");
        }
        // check
        const browser = await run(dir.path, "test", [], {});
        const screenshotsDirPath = path.resolve(dir.path, "screenshots", "test");
        const screenshotFilePaths = taskFileNames.map(fileName =>
          path.resolve(screenshotsDirPath, fileName.replace(/\.js$/, "-0.png"))
        );
        expect(browser.tasks.sort()).toEqual(
          taskFilePaths.map(filePath => path.basename(filePath)).sort()
        );
        expect(browser.hooks).toEqual(hookFileNames); // correctly ordered
        expect(browser.screenshots.sort()).toEqual(screenshotFilePaths.sort());
      }, { unsafeCleanup: true });
    });
  });
});
