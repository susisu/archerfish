# archerfish
[![Build Status](https://travis-ci.com/susisu/archerfish.svg?branch=master)](https://travis-ci.com/susisu/archerfish)

Automates taking screenshots using [Puppeteer](https://github.com/GoogleChrome/puppeteer).

## Usage
### Installation
First, create a directory and initialize a Node.js package.

``` shell
mkdir my-archerfish-tasks
cd my-archerfish-tasks
yarn init # follow the instruction
```

Then install archerfish and initialize the project.

``` shell
yarn add puppeteer @susisu/archerfish
yarn archerfish init
```

### Creating profile
*Profiles* are configured in `archerfish.json5` in the project root directory.

``` json5
{
  "profiles": {
    <profileName>: {}
  }
}
```

A profile name must consist of `A-Za-z0-9`. We keep the profile configuration empty here.

See [json5.org](https://json5.org) for available syntax in JSON5.

### Creating tasks
A profile can have multiple *tasks*. Task files are placed in `tasks/<profileName>` directory.

A task is a JavaScript (CommonJS) module that exports an asynchronous function. 

``` javascript
module.exports = async ({ profile, browser, screenshot }) => {
  // ...
};
```

The following arguments are passed to each task function:

- `profile`: the profile object that may contain [user customized data](#providing-customized-data-to-tasks).
- `browser`: a [Browser object](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-browser) created by Puppeteer.
- `screenshot(target, name = null, opts = {})`: takes a screenshot of given target ([page](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-page) or [element](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-elementhandle)).
- `sleep(ms)`: sleeps for given duration (in milliseconds).
- `getLogger(name)`: gets a logger instance by name. A logger has `.trace()`, `.info()`, `.warn()`, and `.error()` methods.

See [example/tasks/github/example.js](https://github.com/susisu/archerfish/blob/master/example/tasks/github/example.js) for a working example.

### Running tasks
To run all tasks associated to a profile, invoke `archerfish run` with the profile name.

``` shell
yarn archerfish run <profileName>
```

You can also run only some tasks specified by globs relative to the `tasks/<profileName>` directory. For example,

``` shell
yarn archerfish run <profileName> 'mypage/**/*.js'
```

Screenshots taken by tasks are saved to `screenshots/<profileName>` directory by default.

### Creating subprofile
Multiple *subprofiles* can be defined for each profile.

``` json5
{
  "profiles": {
    "foo"    : { /* ... */ },
    "foo_bar": { /* ... */ }
  }
}
```

A profile whose name is separeted by `_` is considered to be a subprofile. In this example, `foo_bar` is a subprofile of `foo`. When you run `yarn archerfish run foo_bar`, tasks are loaded from `tasks/foo`, while screenshots are saved to `screenshots/foo_bar`.

NOTE: Actually, there is no need for the parent profile to exist at all.

### Providing customized data to tasks
You can provide customized data to the tasks for each profile.

``` json5
{
  "profiles": {
    "foo": {
      "data": <any data you want>
    }
  }
}
```

The data is set to `profile.data` and can be referenced from tasks.

### Defining hooks
*Hooks* are useful to prepare something before / clean something after all tasks.

``` json5
{
  "profiles": {
    "foo": {
      "hooks": {
        "beforeAll": <path to the script run before all tasks>,
        "afterAll" : <path to the script run after all tasks>
      }
    }
  }
}
```

A hook script takes the same form as a task i.e. a JavaScript module that exports an asynchronous function, except that it cannot take screenshots.

In the `beforeAll` hook, you can also register additional arguments for subsequent tasks. For example, if you `register` an argument named `foo`,

``` javascript
module.exports = async ({ register }) => {
  register({ foo: 42 });
};
```

then `foo` will be available in all the subsequent tasks.

``` javascript
module.exports = async ({ foo }) => {
  // You can use foo = 42 here.
};
```

### Running tasks concurrently
By default, tasks are run sequentially. To run tasks concurrently, use `--max-concurrency` (alias: `-C`) flag to set maximum number of concurrent workers.

``` shell
yarn archerfish run <profileName> --max-concurrency <int>
```

When you enable concurrency, make sure that your tasks are safe to be run concurrently. For example, cookies are shared by all tasks and may cause unexpected behavior if multiple tasks access them simultaneously.

## License
[MIT License](http://opensource.org/licenses/mit-license.php)

## Author
Susisu ([GitHub](https://github.com/susisu), [Twitter](https://twitter.com/susisu2413))
