# Map routes at runtime

How to add routes after seneca-web has been loaded, for example from
another plugin, and what to watch for. The actions and exports used here
belong to seneca-web; the adapter is called the same way as at startup
(see [Adapter contract](../reference/adapter-contract.md)).

## Send a `role:web` message

```js
seneca.act(
  'role:web',
  {
    routes: {
      pin: 'role:report,cmd:*',
      map: { daily: true, weekly: { GET: true, suffix: '/:week' } },
    },
  },
  function (err, reply) {
    if (err) return console.error(err.message)
    console.log(reply.routes.map((route) => route.path))
    // [ '/daily', '/weekly/:week' ]
  }
)
```

The message matches seneca-web's `role:web,routes:*` action, which maps
the routes and calls the adapter with the plugin's context, `auth` and
options. The reply is `{ routes }`, the list of route objects described
in [Message payload](../reference/message-payload.md#argsroute).

The exported function does the same without a message. It takes the
same object as the message, so the routes go in a `routes` property:

```js
seneca.export('web/mapRoutes')({ routes }, callback)
```

Errors thrown while mapping, such as an unknown middleware name, are
thrown from this call instead of being given to the callback.

## Override the options for one call

A `role:web` message may carry `options`, `context`, `adapter` or `auth`
for that call only:

```js
seneca.act('role:web', { routes, options: { parseBody: false } }, cb)
```

The `options` object replaces the plugin options for the call rather
than merging with them. Options left out are undefined, which means:
`parseBody` off, `includeRequest` and `includeResponse` on, and no named
`middleware`, so a route that names middleware fails with a `TypeError`.
Repeat the `middleware` map if the new routes use names.

## Replace the server

`role:web,set:server` changes the defaults used by later mappings and
optionally maps routes at once:

```js
seneca.act(
  'role:web,set:server',
  { context: Express(), adapter: Adapter, options: { parseBody: false }, routes },
  cb
)
```

## Express ordering

Express runs middleware and handlers in registration order. Routes added
at runtime come after everything the app already has, so a catch-all 404
handler or an error handler registered earlier does not apply to them.
Use an `express.Router()` as the context and mount it before those
handlers, or register the handlers after the last mapping. See
[Express specifics](../explanation/express-specifics.md).
