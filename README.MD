# Seneca Web Adapter Connect

[![Build Status][travis-badge]][travis-url]
[![Coverage Status][coveralls-badge]][coveralls-url]

This is an adapter for [seneca-web](https://github.com/senecajs/seneca-web/) using express.

## Installation

A peer dependency has been specified for `seneca-web`
And of course `express` must be present for this to work at all.

```
npm install --save express
npm install --save seneca-web
npm install --save seneca-web-adapter-express
```

## Usage

Please refer to the seneca-web documentation on how to load routes.

You can require this module as the adapter when using the SenecaWeb plugin

```js
const Seneca = require('seneca')
const SenecaWeb = require('seneca-web')
const Express = require('express')
const seneca = Seneca()
seneca.use(SenecaWeb, {
  context: Express(),
  adapter: require('seneca-web-adapter-express')
})
seneca.ready(() => {
  const app = seneca.export('web/context')()
  app.listen(3000)
})
```

[travis-badge]: https://travis-ci.org/senecajs/seneca-web-adapter-express.svg?branch=master
[travis-url]: https://travis-ci.org/senecajs/seneca-web-adapter-express
[coveralls-badge]: https://coveralls.io/repos/github/senecajs/seneca-web-adapter-express/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/senecajs/seneca-web-adapter-express?branch=master
