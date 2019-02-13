"use strict";

const { Profile } = require("../config");

describe("config", () => {
  describe("Profile", () => {
    describe("constructor", () => {
      it("should create a new Profile instance", () => {
        const profile = new Profile("foo", "/path/to/project", {
          hooks: {
            beforeAll: "path/to/beforeAll.js",
          },
          data: 42,
        });
        expect(profile).toBeInstanceOf(Profile);
      });

      it("should throw Error if profile name is invalid", () => {
        expect(() =>
          new Profile("invalid-name", "/path/to/project", {})
        ).toThrow(Error);
      });

      it("should throw TypeError if profile data is not an object", () => {
        expect(() =>
          new Profile("foo", "/path/to/project", null)
        ).toThrow(TypeError);
      });

      it("should throw TypeError if 'hooks' is specified but not an object", () => {
        expect(() =>
          new Profile("foo", "/path/to/project", {
            hooks: 42,
          })
        ).toThrow(TypeError);
      });

      it("should throw TypeError if a hook script path is not a string", () => {
        expect(() =>
          new Profile("foo", "/path/to/project", {
            hooks: {
              beforeAll: 42,
            },
          })
        ).toThrow(TypeError);
      });
    });

    describe("#name", () => {
      it("should retrive the name of the profile", () => {
        const profile = new Profile("foo", "/path/to/project", {});
        expect(profile.name).toBe("foo");
      });
    });

    describe("#hooks", () => {
      it("should retrive the hook associated to the profile", () => {
        const profile = new Profile("foo", "/path/to/project", {
          hooks: {
            beforeAll: "path/to/beforeAll.js",
            afterAll : "path/to/afterAll.js",
          },
        });
        const hooks = profile.hooks;
        expect(hooks).toEqual({
          beforeAll: "path/to/beforeAll.js",
          afterAll : "path/to/afterAll.js",
        });
        expect(Object.isFrozen(hooks)).toBe(true);
      });
    });

    describe("#data", () => {
      it("should retrive the data associated to the profile", () => {
        const profile = new Profile("foo", "/path/to/project", {
          data: {
            nyan  : "cat",
            answer: 42,
          },
        });
        const data = profile.data;
        expect(data).toEqual({
          nyan  : "cat",
          answer: 42,
        });
        expect(Object.isFrozen(data)).toBe(true);
      });
    });

    describe("#rootDirPath()", () => {
      it("should retrieve the path to the project root directory of the profile", () => {
        {
          const profile = new Profile("foo", "/path/to/project", {});
          expect(profile.rootDirPath()).toBe("/path/to/project");
        }
        {
          const profile = new Profile("foo_bar", "/path/to/project", {});
          expect(profile.rootDirPath()).toBe("/path/to/project");
        }
      });
    });

    describe("#tasksDirPath()", () => {
      it("should retrieve the path to the tasks directory of the profile", () => {
        {
          const profile = new Profile("foo", "/path/to/project", {});
          expect(profile.tasksDirPath()).toBe("/path/to/project/tasks/foo");
        }
        {
          const profile = new Profile("foo_bar", "/path/to/project", {});
          expect(profile.tasksDirPath()).toBe("/path/to/project/tasks/foo");
        }
      });
    });

    describe("#screenshotsDirPath()", () => {
      it("should retrieve the path to the screenshots directory of the profile", () => {
        {
          const profile = new Profile("foo", "/path/to/project", {});
          expect(profile.screenshotsDirPath()).toBe("/path/to/project/screenshots/foo");
        }
        {
          const profile = new Profile("foo_bar", "/path/to/project", {});
          expect(profile.screenshotsDirPath()).toBe("/path/to/project/screenshots/foo_bar");
        }
      });
    });
  });
});
