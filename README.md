# PlayKit JS hotspots - plugin for the [PlayKit JS Player]

[![Build Status](https://github.com/kaltura/playkit-js-hotspots/actions/workflows/run_canary_full_flow.yaml/badge.svg)](https://github.com/kaltura/playkit-js-hotspots/actions/workflows/run_canary_full_flow.yaml)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![](https://img.shields.io/npm/v/@playkit-js/hotspots/latest.svg)](https://www.npmjs.com/package/@playkit-js/hotspots)
[![](https://img.shields.io/npm/v/@playkit-js/hotspots/canary.svg)](https://www.npmjs.com/package/@playkit-js/hotspots/v/canary)

PlayKit JS hotspots is written in [ECMAScript6], statically analysed using [Typescript] and transpiled in ECMAScript5 using [Babel].

[typescript]: https://www.typescriptlang.org/
[ecmascript6]: https://github.com/ericdouglas/ES6-Learning#articles--tutorials
[babel]: https://babeljs.io

## Getting Started

### Prerequisites

The plugin requires [Kaltura Player] to be loaded first.

[kaltura player]: https://github.com/kaltura/kaltura-player-js

### Installing

First, clone and run [yarn] to install dependencies:

[yarn]: https://yarnpkg.com/lang/en/

```
git clone https://github.com/kaltura/playkit-js-hotspots.git
cd playkit-js-hotspots
yarn install
```

### Building

Then, build the player

```javascript
yarn run build
```

### Embed the library in your test page

Finally, add the bundle as a script tag in your page, and initialize the player

```html
<script type="text/javascript" src="/PATH/TO/FILE/kaltura-player.js"></script>
<!--Kaltura player-->
<script type="text/javascript" src="/PATH/TO/FILE/playkit-kaltura-cuepoints.js"></script>
<!--PlayKit cuepoints plugin-->
<script type="text/javascript" src="/PATH/TO/FILE/playkit-hotspots.js"></script>
<!--PlayKit hotspots plugin-->
<div id="player-placeholder" style="height:360px; width:640px">
  <script type="text/javascript">
    var playerContainer = document.querySelector("#player-placeholder");
    var config = {
     ...
     targetId: 'player-placeholder',
     plugins: {
      hotspots: { ... },
      kalturaCuepoints: { ... },
     }
     ...
    };
    var player = KalturaPlayer.setup(config);
    player.loadMedia(...);
  </script>
</div>
```

## Documentation

hotspots plugin configuration can been found here:

- **[Configuration](#configuration)**

hotspots plugin dependencies can been found here:

- **[Dependencies](#dependencies)**

### And coding style tests

We use ESLint [recommended set](http://eslint.org/docs/rules/) with some additions for enforcing [Flow] types and other rules.

See [ESLint config](.eslintrc.json) for full configuration.

We also use [.editorconfig](.editorconfig) to maintain consistent coding styles and settings, please make sure you comply with the styling.

## Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/kaltura/playkit-js-hotspots/tags).

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE.md](LICENSE.md) file for details

## Commands

Run dev server: `yarn dev`;<br/>
Bump version: `yarn release`;<br/>

<a name="configuration"></a>
## Configuration

#### Configuration Structure

```js
//Default configuration
"hotspots" = {};
```
##

<a name="dependencies"></a>
## Dependencies

Plugin dependencies:<br/>
<a href="https://github.com/kaltura/playkit-js-kaltura-cuepoints">Cue Points</a><br/>

### Dev env

Node version: up to 14+<br/>
If nvm installed: `nvm use` change version of current terminal to required.<br/>

### ARM Architecture support

Install dependencies with `npm install --target_arch=x64` set target arch for running it through Rosetta (requires Rosetta installation).<br/>