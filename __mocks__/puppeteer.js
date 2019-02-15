"use strict";

class Page {
  constructor(browser) {
    this.browser = browser;
  }

  async screenshot(opts) {
    this.browser.screenshots.push(opts.path);
  }
}

class Browser {
  constructor() {
    this.tasks = [];
    this.hooks = [];
    this.screenshots = [];
  }

  async newPage() {
    return new Page(this);
  }

  async close() {
  }
}

module.exports = {
  async launch() {
    return new Browser();
  },
};
