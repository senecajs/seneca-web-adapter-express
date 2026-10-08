![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] plugin

# @seneca/web-adapter-express

The [Express](https://expressjs.com) adapter for
[seneca-web](https://github.com/senecajs/seneca-web): it registers the
routes of a seneca-web route map on an Express app or router, turns each
request into a Seneca message, and sends the action's reply back as the
response, with optional authentication through
[passport](https://www.passportjs.org/). Works with Seneca 3 and Seneca 4
(prerelease `4.0.0-rc5` and later), seneca-web 2.x and Express 4 and 5;
tested on Node.js 24 and 22.

[![npm version][npm-badge]][npm-url]
[![build][build-badge]][build-url]

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

## Install

```sh
npm install @seneca/web-adapter-express seneca-web express seneca
```

Versions up to 1.2.1 were published as `seneca-web-adapter-express`;
from the next version (1.3.0) the package is
`@seneca/web-adapter-express`. `seneca` and `seneca-web` are peer
dependencies.

## Quick Example

```js
const Seneca = require('seneca')
const SenecaWeb = require('seneca-web')
const Express = require('express')

const app = Express()

const seneca = Seneca({ log: 'warn' })
  .add('role:greeting,cmd:hello', function (msg, reply) {
    reply({ hello: msg.args.query.name || 'world' })
  })
  .use(SenecaWeb, {
    adapter: require('@seneca/web-adapter-express'),
    context: app,
    routes: {
      prefix: '/api',
      pin: 'role:greeting,cmd:*',
      map: { hello: true }, // GET /api/hello -> role:greeting,cmd:hello
    },
  })

seneca.ready(function () {
  app.listen(3000)
  // GET http://127.0.0.1:3000/api/hello?name=Seneca -> {"hello":"Seneca"}
})
```

The action receives the request data in `msg.args` (`body`, `params`,
`query`, `user`, `route`) and the Express objects as `msg.request$` and
`msg.response$`; its reply is sent as JSON. Errors go to your Express
error handlers.

## More Examples

* [Getting started](docs/tutorials/getting-started.md): a notes service
  with JSON bodies, path parameters and status codes, run and explained.
* How-to guides: [parse request bodies](docs/how-to/parse-request-bodies.md),
  [add middleware](docs/how-to/add-middleware.md),
  [secure routes with passport](docs/how-to/secure-routes-with-passport.md),
  [handle errors and status codes](docs/how-to/handle-errors-and-status-codes.md),
  [map routes at runtime](docs/how-to/map-routes-at-runtime.md),
  [migrate from Seneca 3](docs/how-to/migrate-from-seneca-3.md).
* Runnable programs for the tutorial and the guides are in
  [docs/examples](docs/examples/).

The full documentation index is [docs/README.md](docs/README.md).

## Motivation

seneca-web describes which URLs reach which Seneca actions; this
adapter does the Express part. It registers the routes, builds a message
from each request and turns the reply into the response, so actions stay
plain Seneca actions that know nothing about routing. See
[How seneca-web adapters work](docs/explanation/how-adapters-work.md) and
[Express specifics](docs/explanation/express-specifics.md).

## Support

* Open a [GitHub issue][github issue] for bugs and questions about this
  adapter.
* The [Seneca documentation](https://senecajs.org) covers Seneca itself,
  and [seneca-web](https://github.com/senecajs/seneca-web) documents the
  route map.
* Commercial support is available from [Voxgig](https://www.voxgig.com).

## API

The module exports the adapter function, which seneca-web calls; see the
[Adapter contract](docs/reference/adapter-contract.md).

Adapter options (`options` in the seneca-web plugin options), see
[Options](docs/reference/options.md):

| Option | Default | Purpose |
| ------ | ------- | ------- |
| `parseBody` | `true` | Read the raw request body into `msg.args.body` as a string. Set `false` when a body parser is installed. |
| `includeRequest` | `true` | Attach the Express request as `msg.request$`. |
| `includeResponse` | `true` | Attach the Express response as `msg.response$`. |
| `middleware` | none | Named middleware that routes refer to by name. |

The message for each request, see [Message payload](docs/reference/message-payload.md):

| Property | Value |
| -------- | ----- |
| `args.body` | Raw body string, or `req.body` with `parseBody: false`. |
| `args.params`, `args.query` | `req.params`, `req.query`. |
| `args.user` | `req.user`, or `null`. |
| `args.route` | The route object from seneca-web. |
| `request$`, `response$` | The Express request and response. |

What each outcome becomes in HTTP (errors, `redirect`, `autoreply`,
`auth`, `secure`), see [Response handling](docs/reference/response-handling.md).
Every option, property and error is listed in the
[feature index](docs/README.md#feature-index).

## Contributing

The [Senecajs org][] encourages open participation. If you feel you can
help in any way, be it with documentation, examples, extra testing, or
new features please get in touch.

To run the tests (ESLint, then Mocha) on Node.js 24 or 22:

```sh
npm install
npm test
```

The tests run against the Seneca and Express versions in
`devDependencies` (`seneca@^4.0.0-rc5`, the Seneca 4 prerelease, and
`express@^5.1.0`). To test against other versions, install them without
saving, for example `npm install --no-save seneca@3 express@4`, then
`npm test`; `npm install` restores the defaults. `npm run coverage`
writes a coverage report to `coverage/`. The examples run with
`node docs/examples/<name>.js` and exit on their own.

The GitHub Actions workflow for continuous integration is provided as a
patch in [`.patches/`](.patches/README.md), because adding workflow
files needs a GitHub token with the `workflow` scope; apply it with
`git am .patches/*.patch`.

## Background

The adapter was created in 2016 (version 1.0.0) from the Express support
in seneca-web, when seneca-web moved framework code into separate
adapter packages. Middleware support came in 1.1.0 and the
`includeRequest` and `includeResponse` options in 1.2.0. Version 1.3.0
adds Seneca 4 support and sends route messages from the root instance,
so that they no longer inherit `fatal$` from plugin loading or
seneca-web's `plugin$`. It was published as `seneca-web-adapter-express`
up to 1.2.1, and is published as `@seneca/web-adapter-express` from the
next version. The change log is in [CHANGES.md](CHANGES.md).

| Adapter | Seneca | seneca-web | Express | Node.js |
| ------- | ------ | ---------- | ------- | ------- |
| 1.3.x | 3.x and 4.x (from 4.0.0-rc5) | 2.x | 4 and 5 | 22 and later; tested on 24 and 22 |
| 1.2.x | 2.x and 3.x | 1.x and 2.x | 4 | 8 to 12 |

Licensed under [MIT][].

[npm-badge]: https://badge.fury.io/js/%40seneca%2Fweb-adapter-express.svg
[npm-url]: https://www.npmjs.com/package/@seneca/web-adapter-express
[build-badge]: https://github.com/senecajs/seneca-web-adapter-express/actions/workflows/build.yml/badge.svg
[build-url]: https://github.com/senecajs/seneca-web-adapter-express/actions/workflows/build.yml
[MIT]: ./LICENSE
[Senecajs org]: https://github.com/senecajs/
[Seneca.js]: https://www.npmjs.com/package/seneca
[github issue]: https://github.com/senecajs/seneca-web-adapter-express/issues
