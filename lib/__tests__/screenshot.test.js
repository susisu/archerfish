"use strict";

const path = require("path");
const puppeteer = require("puppeteer"); // mocked
const tmp = require("tmp-promise");

const { Profile } = require("../config");
const { generateScreenshotFun } = require("../screenshot");

describe("screenshot", () => {
  describe("generateScreenshotFun()", () => {
    it("should generate a function that takes a screenshot of a target", async () => {
      await tmp.withDir(async dir => {
        const profile = new Profile("foo", dir.path, {});
        const taskFilePath = path.resolve(dir.path, "tasks/foo/test.js");
        const screenshot = generateScreenshotFun(profile, taskFilePath);
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await screenshot(page);
        await screenshot(page, { type: "png" });
        await screenshot(page, { type: "jpeg" });
        const screenshotsDirPath = path.resolve(dir.path, "screenshots/foo");
        expect(browser.screenshots).toEqual(
          [".png", ".png", ".jpg"].map((ext, i) =>
            path.resolve(screenshotsDirPath, `test-${i}${ext}`)
          )
        );
      }, { unsafeCleanup: true });
    });

    it("should throw Error if unknown image type is given", async () => {
      await tmp.withDir(async dir => {
        const profile = new Profile("foo", dir.path, {});
        const taskFilePath = path.resolve(dir.path, "tasks/foo/test.js");
        const screenshot = generateScreenshotFun(profile, taskFilePath);
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await expect(screenshot(page, { type: "nyancat" })).rejects.toThrowError(/unknown type/);
      }, { unsafeCleanup: true });
    });
  });
});
