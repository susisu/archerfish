# archerfish
[![Build Status](https://travis-ci.com/susisu/archerfish.svg?branch=master)](https://travis-ci.com/susisu/archerfish)

Automates taking screenshots.

## Usage
### Installation
First, create a directory and initialize an npm package.

``` shell
mkdir my-archerfish-tasks
cd my-archerfish-tasks
yarn init # follow the instruction
```

Then install archerfish and initialize the project.

``` shell
yarn add @susisu/archerfish
yarn archerfish init
```

### Creating profile
Profiles are configured in `archerfish.json5` in the project root directory.

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
Task files are placed in `tasks/<profileName>` directory.

A task is a JavaScript module that exports an asynchronous function. The function is executed by the task runner. See `example/tasks/github/example.js` for a working example.

### Running tasks
To run all tasks, invoke the task runner with a profile name.

``` shell
yarn archerfish run <profileName>
```

You can also run only some tasks specified by globs relative to the `tasks/<profileName>` directory. For example,

``` shell
yarn archerfish run <profileName> 'mypage/**/*.js'
```

Screenshots are saved to `screenshots/<profileName>` by default.

### Creating subprofile
Multiple subprofiles can be defined for each profile.

``` json5
{
  "profiles": {
    "foo"    : { /* ... */ },
    "foo_bar": { /* ... */ }
  }
}
```

A profile whose name is separeted by `_` is considered to be a subprofile. In this example, `foo_bar` is a subprofile of `foo`. When you run `yarn archerfish run foo_bar '**/*.js'`, tasks are loaded from `tasks/foo`, while screenshots are saved to `screenshots/foo_bar`.

Actually, there is no need for the parent profile to exist at all.

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

The data can be accessed by `profile.data` from each task.

### Defining hooks
Hooks are useful to prepare something before / clean something after all tasks.

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

A hook script takes the same form as a task, that is, a JavaScript module that exports an asynchronous function.

## License
[MIT License](http://opensource.org/licenses/mit-license.php)

## Author
Susisu ([GitHub](https://github.com/susisu), [Twitter](https://twitter.com/susisu2413))
