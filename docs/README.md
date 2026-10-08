# @seneca/web-adapter-express documentation

The documentation follows the [Diátaxis](https://diataxis.fr/) structure:
tutorials to learn, how-to guides for tasks, reference to look things
up, and explanation to understand the design. The route map itself is
documented by [seneca-web](https://github.com/senecajs/seneca-web); these
pages cover what this adapter does with it.

## Tutorials

| Tutorial | What you build |
| -------- | -------------- |
| [Getting started](tutorials/getting-started.md) | A notes service: actions exposed as HTTP routes, JSON bodies, path parameters, status codes, requests with fetch. |

The programs from the tutorial and the guides are in [examples](examples/).

## How-to guides

| Guide | Covers |
| ----- | ------ |
| [Parse request bodies](how-to/parse-request-bodies.md) | Express body parsers with `parseBody: false`, the raw body with `parseBody: true`, the hang when both are used. |
| [Add middleware](how-to/add-middleware.md) | Named and inline middleware for route sets and routes, order, unknown names. |
| [Secure routes with passport](how-to/secure-routes-with-passport.md) | Login with an `auth` route, `secure` routes, logout with `redirect`, the session cookie. |
| [Handle errors and status codes](how-to/handle-errors-and-status-codes.md) | Error handlers after the routes, `err.status`, Seneca 3 and 4 error objects, status codes on success, logging. |
| [Map routes at runtime](how-to/map-routes-at-runtime.md) | `role:web` messages, `web/mapRoutes`, `role:web,set:server`, option replacement, Express ordering. |
| [Migrate from Seneca 3](how-to/migrate-from-seneca-3.md) | Packages, error handlers, tests, `ready`, transports, legacy options. |

## Reference

| Reference | Describes |
| --------- | --------- |
| [Options](reference/options.md) | `parseBody`, `includeRequest`, `includeResponse`, `middleware`: types, defaults, effects, where they come from. |
| [Message payload](reference/message-payload.md) | `msg.args` (`body`, `route`, `params`, `query`, `user`), `request$`, `response$`, the route object. |
| [Adapter contract](reference/adapter-contract.md) | The adapter function, the route object, registration, the sending instance, errors. |
| [Response handling](reference/response-handling.md) | What each action outcome becomes in HTTP: errors, redirect, autoreply, status codes, secured routes. |

## Explanation

| Explanation | Topic |
| ----------- | ----- |
| [How seneca-web adapters work](explanation/how-adapters-work.md) | seneca-web and the adapter, lifecycle, a request, why messages are sent from the root instance, limits. |
| [Express specifics](explanation/express-specifics.md) | Registration order, body parsing, error handlers, Express 4 and 5, sessions. |
| [Seneca 3 versus 4](explanation/seneca-3-vs-4.md) | Errors, fatal messages, promises and `ready`, transports, options, logging. |

## Feature index

Every option, route property, payload field, error, action and export
that concerns the adapter, with the page that documents it. The adapter
adds no actions, exports, decorations or command line flags of its own.

| Feature | Kind | Documented in |
| ------- | ---- | ------------- |
| `parseBody` | option | [Options](reference/options.md), [Parse request bodies](how-to/parse-request-bodies.md) |
| `includeRequest` | option | [Options](reference/options.md), [Message payload](reference/message-payload.md) |
| `includeResponse` | option | [Options](reference/options.md), [Message payload](reference/message-payload.md) |
| `middleware` (named middleware map) | option | [Options](reference/options.md), [Add middleware](how-to/add-middleware.md) |
| `express(options, context, auth, routes, done)` | module export (the adapter) | [Adapter contract](reference/adapter-contract.md) |
| `context` (Express app or Router) | adapter argument | [Adapter contract](reference/adapter-contract.md), [Express specifics](explanation/express-specifics.md) |
| `auth` (passport instance) | adapter argument | [Adapter contract](reference/adapter-contract.md), [Secure routes with passport](how-to/secure-routes-with-passport.md) |
| Route `path`, `methods`, `pattern` | route properties | [Adapter contract](reference/adapter-contract.md#the-route-object) |
| Route `middleware` | route property | [Add middleware](how-to/add-middleware.md), [Adapter contract](reference/adapter-contract.md) |
| Route `redirect` | route property | [Response handling](reference/response-handling.md) |
| Route `autoreply` | route property | [Response handling](reference/response-handling.md) |
| Route `auth` (`strategy`, `pass`, `fail`) | route property | [Secure routes with passport](how-to/secure-routes-with-passport.md), [Response handling](reference/response-handling.md) |
| Route `secure` (`fail`) | route property | [Secure routes with passport](how-to/secure-routes-with-passport.md), [Response handling](reference/response-handling.md) |
| `msg.args.body` | payload field | [Message payload](reference/message-payload.md), [Parse request bodies](how-to/parse-request-bodies.md) |
| `msg.args.route` | payload field | [Message payload](reference/message-payload.md) |
| `msg.args.params`, `msg.args.query` | payload fields | [Message payload](reference/message-payload.md) |
| `msg.args.user` | payload field | [Message payload](reference/message-payload.md), [Secure routes with passport](how-to/secure-routes-with-passport.md) |
| `msg.request$`, `msg.response$` | payload fields | [Message payload](reference/message-payload.md), [Response handling](reference/response-handling.md) |
| Action errors passed with `next(err)` | behaviour | [Handle errors and status codes](how-to/handle-errors-and-status-codes.md), [Response handling](reference/response-handling.md) |
| Error `no context provided` | adapter error | [Adapter contract](reference/adapter-contract.md#errors) |
| Error `expected valid middleware, got <value>` | adapter error | [Adapter contract](reference/adapter-contract.md#errors), [Add middleware](how-to/add-middleware.md) |
| Route messages sent from the root instance (no inherited `fatal$`, `tx$` or `plugin$`) | behaviour | [Adapter contract](reference/adapter-contract.md#the-sending-instance), [How seneca-web adapters work](explanation/how-adapters-work.md#why-messages-are-sent-from-the-root-instance) |
| `role:web,routes:*`, `role:web,set:server`, `init:web` | seneca-web actions used with the adapter | [Map routes at runtime](how-to/map-routes-at-runtime.md), [How seneca-web adapters work](explanation/how-adapters-work.md) |
| `web/context`, `web/mapRoutes`, `web/setServer` | seneca-web exports used with the adapter | [Map routes at runtime](how-to/map-routes-at-runtime.md), [Getting started](tutorials/getting-started.md) |
| `read-body.js` | internal helper (raw body reader) | [Parse request bodies](how-to/parse-request-bodies.md) |

## Other documents

* [Change log](../CHANGES.md)
* [Code of conduct](../CODE_OF_CONDUCT.md)
* [License](../LICENSE)
