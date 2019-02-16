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
        await screenshot(page, "nyancat", { type: "png" });
        await screenshot(page, null, { type: "jpeg" });
        await screenshot(page, "hello/world/!");
        const screenshotsDirPath = path.resolve(dir.path, "screenshots/foo");
        expect(browser.screenshots).toEqual([
          "test.png",
          "test-nyancat.png",
          "test-1.jpg",
          "test-helloworld.png",
        ].map(fileName => path.resolve(screenshotsDirPath, fileName)));
      }, { unsafeCleanup: true });
    });

    it("should throw Error if unknown image type is given", async () => {
      await tmp.withDir(async dir => {
        const profile = new Profile("foo", dir.path, {});
        const taskFilePath = path.resolve(dir.path, "tasks/foo/test.js");
        const screenshot = generateScreenshotFun(profile, taskFilePath);
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await expect(
          screenshot(page, null, { type: "nyancat" })
        ).rejects.toThrowError(/unknown type/);
      }, { unsafeCleanup: true });
    });
  });
});
