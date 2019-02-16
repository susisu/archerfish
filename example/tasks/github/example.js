"use strict";

module.exports = async ({ profile, browser, screenshot }) => {
  const page = await browser.newPage();
  await page.setViewport({
    width            : 1280,
    height           : 720,
    deviceScaleFactor: 2,
  });
  await page.goto("https://github.com");
  await screenshot(page, "page");
  const elem = await page.$(".Header");
  await screenshot(elem, "header");
  await page.close();
};
