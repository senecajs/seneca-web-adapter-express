# Examples

Runnable programs that accompany the [tutorial](../tutorials/getting-started.md)
and the how-to guides. Each program starts an Express server on port 3000
(or `PORT`), sends requests to it with `fetch`, prints the results, and
shuts down. Remove the `demo` call to keep a server running.

The programs require the adapter from this repository with
`require('../..')`; in your own project use
`require('@seneca/web-adapter-express')`. They need the development
dependencies of this repository (`npm install`), and Node.js 22 or later.

| Program | Shows | Guide |
| ------- | ----- | ----- |
| [getting-started.js](getting-started.js) | A notes service: JSON bodies, path parameters, status codes. | [Getting started](../tutorials/getting-started.md) |
| [middleware.js](middleware.js) | Named and inline middleware for a route set and a route. | [Add middleware](../how-to/add-middleware.md) |
| [secured-routes.js](secured-routes.js) | passport login (`auth`), `secure` routes, logout with `redirect`. | [Secure routes with passport](../how-to/secure-routes-with-passport.md) |
| [custom-errors.js](custom-errors.js) | Action errors, `err.status`, coded errors, an error handler for Seneca 3 and 4. | [Handle errors and status codes](../how-to/handle-errors-and-status-codes.md) |

Run one with, for example:

```sh
node docs/examples/getting-started.js
```
