![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] plugin

# @seneca/web-adapter-express

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

## Install

```sh
npm install seneca-web-adapter-express
```

## Quick Example

```js
var SenecaWeb = require('seneca-web')
var Express = require('express')
var context = Express.Router()
require('seneca')()
  .use(SenecaWeb, { context: context, adapter: require('seneca-web-adapter-express') })
```

## More Examples

See [test/](test/) for usage examples.

## Motivation

Express adapter for [seneca-web](https://github.com/senecajs/seneca-web). Maps HTTP routes to Seneca actions.

## Support

If you're using this module and need help, you can:

- Post a [github issue][]
- Tweet to [@senecajs][]

## API

Configured via [seneca-web](https://github.com/senecajs/seneca-web) options.

## Contributing

The [Senecajs org][] encourages open participation. If you feel you can help in any way, be it with documentation, examples, extra testing, or new features please get in touch.

### Running tests

```sh
npm run test
```

## Background

Part of the [seneca-web](https://github.com/senecajs/seneca-web) adapter family.

[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Coverage Status][coveralls-badge]][coveralls-url]
[![Dependency Status][david-badge]][david-url]
[Sponsor]: http://nearform.com
[Logo]: http://senecajs.org/files/assets/seneca-logo.png
[npm-badge]: https://badge.fury.io/js/seneca-web-adapter-express.svg
[npm-url]: https://badge.fury.io/js/seneca-web-adapter-express
[travis-badge]: https://travis-ci.org/senecajs/seneca-web-adapter-express.svg?branch=master
[travis-url]: https://travis-ci.org/senecajs/seneca-web-adapter-express
[coveralls-badge]: https://coveralls.io/repos/github/senecajs/seneca-web-adapter-express/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/senecajs/seneca-web-adapter-express?branch=master
[david-badge]: https://david-dm.org/senecajs/seneca-web-adapter-express.svg
[david-url]: https://david-dm.org/senecajs/seneca-web-adapter-express
[Senecajs org]: https://github.com/senecajs/
[MIT]: ./LICENSE
