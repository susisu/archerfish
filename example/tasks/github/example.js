"use strict";

module.exports = async ({ browser, screenshot }) => {
  const page = await browser.newPage();
  await page.setViewport({
    width            : 1280,
    height           : 720,
    deviceScaleFactor: 2,
  });
  await page.goto("https://github.com");
  await screenshot(page, "page");
  const elem = await page.$(".header-logged-out");
  await screenshot(elem, "header");
  await page.close();
};
