"use strict";

const fs = require("fs");
const json5 = require("json5");
const tmp = require("tmp-promise");
const path = require("path");
const util = require("util");

const { configFileName } = require("../config");
const { init } = require("../cli");

const readFileAsync = util.promisify(fs.readFile);

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
});
