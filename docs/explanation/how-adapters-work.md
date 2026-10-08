# How seneca-web adapters work

seneca-web separates two concerns: deciding which HTTP routes exist and
which action each one triggers (the route map), and talking to a
particular web framework (the adapter). This page explains the division,
the lifecycle, and the design decisions in this adapter.

## Two halves

**seneca-web** owns the route map. Its mapper turns

```js
{ pin: 'role:note,cmd:*', prefix: '/notes', map: { list: true, load: { GET: true, suffix: '/:id' } } }
```

into route objects with a `path`, a list of `methods`, a `pattern`
(`role:note,cmd:list`), and flags such as `autoreply`, `redirect`,
`middleware`, `auth` and `secure`. It stores the context (the web
framework object), the adapter and the options, and exposes them through
the actions `role:web,routes:*` and `role:web,set:server` and the exports
`web/context`, `web/mapRoutes` and `web/setServer`.

**The adapter** owns the framework. It is a function
`(options, context, auth, routes, done)`: it registers one framework
route per route object and method, and inside each route handler it
builds a Seneca message, sends it, and converts the reply into a
response. This adapter does that with Express's `app.get`, `app.post` and
so on, `res.send`, `res.redirect` and `next(err)`. The hapi, koa and
connect adapters do the same with their frameworks.

## Lifecycle

1. `seneca.use(SenecaWeb, config)` runs the plugin definition, which
   merges the options and adds the actions.
2. Seneca runs the plugin's initialization action, `init:web`. It calls
   `setServer`, which stores the context, adapter, auth and options, and
   maps the routes given in the configuration by calling the adapter.
   This happens asynchronously, before `ready` fires.
3. `seneca.ready(fn)` runs once the routes exist. This is where to start
   listening (`seneca.export('web/context')().listen(port)`) and where to
   add Express handlers that must come after the routes.
4. Later `role:web` messages or `web/mapRoutes` calls map more routes
   through the same adapter, with the stored context and options unless
   the message carries its own.

## A request

For `GET /notes/2` on the route above:

1. Express matches `app.get('/notes/:id', ...)`, runs the route's
   middleware, then the adapter's handler.
2. The handler collects the body (raw text when `parseBody` is on,
   otherwise `req.body`), and builds the message
   `{ args: { body, route, params, query, user }, request$, response$ }`.
3. It sends the message with `seneca.act('role:note,cmd:load', message)`.
   Seneca finds the action by pattern, exactly as for any other message.
   The action does not know, and does not need to know, that the message
   came from HTTP.
4. The reply becomes the response: an error goes to Express error
   handlers, a `redirect` route redirects, an `autoreply` route sends the
   result as JSON. See [Response handling](../reference/response-handling.md).

## Why messages are sent from the root instance

Seneca gives each plugin a *delegate* instance whose fixed arguments
identify the plugin (`plugin$`) and, during loading, mark everything it
does as fatal (`fatal$: true`), so that a broken plugin stops the process
instead of running half configured. Actions run on delegates too, which
add the transaction id of the message being handled (`tx$`). Fixed
arguments are copied into every message sent from a delegate, and with
Seneca's default `strict.fixedargs` the sender's fixed arguments override
those of the message and those of the delegate the receiving action runs
on. They cannot be removed by creating another delegate or by setting
`fatal$: false` in the message.

seneca-web calls the adapter with such a delegate. In 2.2.2 and earlier
it is the delegate of the `init:web` action for routes given in the
plugin options, the delegate of the `role:web` action for routes mapped
by message, and the plugin delegate for the `web/mapRoutes` export.
Versions of this adapter up to 1.2.1 sent every web request message from
that instance, with three effects on route actions:

* For routes given in the plugin options or mapped through the export,
  every message was fatal. An error replied by a route action made
  Seneca log a fatal error, close the instance and call its exit
  function, even though the Express error handler had already answered
  the request. On Seneca 3.38 and 4.0.0 the process exited; on
  4.0.0-rc5, whose default exit function only prints `EXIT`, the next
  request failed with `seneca: closed` and crashed the process.
* All requests shared the transaction id of the mapping action.
* Actions ran with seneca-web's `plugin$` instead of their own, so
  `this.error(code)` could not find the plugin's error templates.

Tests that create a fresh instance for every test, map routes by
message, or never trigger an action error did not notice.

Since 1.3.0 the adapter sends from `this.root`. The root instance has no
fixed arguments, so route messages are ordinary messages, the same as
those an application sends from its top level instance. A delegate of
the root that carries a `plugin$`, which a seneca-web change in
development after 2.2.2 passes to adapters, would still have the third
effect; that is why the adapter does not use the instance it is called
on even then.

## Limits of the design

* One request is one message and one reply. Streaming responses and
  server sent events need `autoreply: false` and direct use of
  `msg.response$`.
* `request$` and `response$` are only available in the process that
  received the request. Properties ending in `$` are not sent over
  Seneca transports, so an action running in another service sees
  `msg.args` only (body, params, query, user and route).
* The adapter has no options of its own beyond the four it reads; the
  route map is seneca-web's, and authentication is passport's.
