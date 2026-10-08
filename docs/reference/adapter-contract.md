# Adapter contract

The module exports one function, the adapter that seneca-web calls to
register routes. This page describes its arguments, what it does with
each route, its reply and its errors.

## Signature

```js
module.exports = function express(options, context, auth, routes, done)
```

| Argument | Value |
| -------- | ----- |
| `this` | The Seneca instance seneca-web calls the adapter on. The adapter sends the messages for web requests from its root instance, `this.root` (see [The sending instance](#the-sending-instance)). |
| `options` | The adapter [options](options.md). |
| `context` | The Express application, or any object with `get`, `post`, `put`, `head`, `delete`, `options` and `patch` methods that take `(path, ...handlers)`, such as an `express.Router()`. Required. |
| `auth` | The passport instance given to seneca-web as `auth`, or `null`. Required when a route has `auth`. |
| `routes` | The route objects built by seneca-web from the route map (below). |
| `done` | Callback. Called with `(null, { routes })` on success or `(err)` on failure. |

## The route object

seneca-web builds one object per entry of the route map. The adapter
uses the properties in bold; the others are kept on the object, which
actions receive as `msg.args.route`.

| Property | Type | Meaning |
| -------- | ---- | ------- |
| **`path`** | string | The Express path, built from `prefix`, `part` (the map key or `name`), `postfix` and `suffix`, or from `alias` alone. |
| **`methods`** | string[] | Upper case HTTP methods (`GET`, `POST`, `PUT`, `HEAD`, `DELETE`, `OPTIONS`, `PATCH`). `true` as the map value means `['GET']`. |
| **`pattern`** | string | The action pattern: the `pin` with `*` replaced by the map key. |
| **`middleware`** | false or array | Names or functions from the route set and the route, in that order. |
| **`redirect`** | false or string | Redirect here after the action has replied. |
| **`autoreply`** | boolean | Send the action's result as the response (default true). |
| **`auth`** | false or `{ strategy, pass, fail }` | Authenticate with passport before the handler. |
| **`secure`** | false or `{ fail }` | Require `req.user`, redirect to `fail` otherwise. |
| `pin`, `part`, `prefix`, `postfix`, `suffix`, `alias` | | Inputs of the path. |

## What the adapter does

For each route and each of its methods (lower cased):

1. Resolve `middleware`: a string is looked up in `options.middleware`;
   anything that is not a function throws
   `expected valid middleware, got <value>`.
2. Register the route on the context:
   * Plain route: `context[method](path, ...middleware, handler)`.
   * `auth` route: `context[method](path, auth.authenticate(strategy, { failureRedirect: fail, successRedirect: pass }), ...middleware, handler)`.
   * `secure` route: `context[method](path, ...middleware, guard)`,
     where `guard` redirects to `secure.fail` when `req.user` is absent
     and calls the handler otherwise.
3. Call `done(null, { routes })`.

A route with both `auth` and `secure` is registered as a `secure` route.

The handler, on each request:

1. Resolves `includeRequest` and `includeResponse` (undefined becomes true).
2. Obtains the body: the raw request text when `parseBody` is true,
   otherwise `req.body || {}`. A stream error goes to `next(err)`.
3. Builds the [message payload](message-payload.md) and sends it with
   `seneca.act(route.pattern, payload, callback)` from the
   [sending instance](#the-sending-instance).
4. Handles the reply as described in [Response handling](response-handling.md).

## The sending instance

The adapter sends the messages for web requests from the root instance,
`this.root`, whatever instance seneca-web calls it on. Seneca copies the
fixed arguments of the sending instance into every message, and with
the default `strict.fixedargs` they also replace those of the delegate
the receiving action runs on. The instances seneca-web passes carry
fixed arguments that route actions must not receive:

| Called from | Fixed arguments of the instance |
| ----------- | ------------------------------- |
| seneca-web 2.2.2 and earlier, routes in the plugin options (`init:web`) | `plugin$`, `fatal$: true`, `tx$` of the initialization |
| seneca-web 2.2.2 and earlier, a `role:web` message | `plugin$`, `tx$` of that message |
| seneca-web 2.2.2 and earlier, the `web/mapRoutes` export | `plugin$`, `fatal$: true` |
| A root delegate created with a `plugin$`, as in the seneca-web change in development after 2.2.2 | `plugin$` |

What each would do to a route action:

* `fatal$: true` makes any error the action replies fatal: Seneca closes
  the instance and ends the process.
* `tx$` puts every request into the same transaction.
* `plugin$` replaces the action's own `plugin$`, so that
  `this.error(code)` in the action no longer finds its plugin's error
  templates and the message is just `seneca: <code>`.

The root instance has no fixed arguments. Route messages are therefore
ordinary messages, like those an application sends from its top level
instance: not fatal, one transaction per request, and actions keep their
plugin context. Versions up to 1.2.1 sent from the instance as given;
see [Why messages are sent from the root instance](../explanation/how-adapters-work.md#why-messages-are-sent-from-the-root-instance).

## Errors

The adapter has no error codes. It reports failures as plain `Error`
objects, given to `done` or thrown while the routes are registered:

| Error | When | How it is reported |
| ----- | ---- | ------------------ |
| `no context provided` | `context` is missing. | `done(err)`. |
| `expected valid middleware, got <value>` | A middleware entry is neither a function nor a key of `options.middleware`. | Thrown. |
| `TypeError` | A route names middleware but `options.middleware` is not set, or a route has `auth` but no passport instance was given as `auth`. | Thrown. |

Where you see the error depends on how the routes were mapped:

* Routes in the plugin options: the `init:web` action fails, which is a
  fatal plugin initialization failure.
* A `role:web` message: the act callback receives the error. On Seneca 4
  it is the error itself (`err.message`); on Seneca 3 it is wrapped, with
  the message in `err.orig.message` and `err.details.message`.
* The `web/mapRoutes` export: a thrown error is thrown from the call; an
  error given to `done` reaches the callback.

Errors replied by actions while handling requests are not adapter
errors; they are passed to Express with `next(err)`.

## Exports and actions

The adapter adds no actions, exports or decorations to Seneca. The
actions and exports used with it belong to seneca-web: `role:web,routes:*`,
`role:web,set:server`, `init:web`, `web/context`, `web/mapRoutes` and
`web/setServer` (see [Map routes at runtime](../how-to/map-routes-at-runtime.md)).
