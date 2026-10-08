# Options

The adapter reads four options. They are given to seneca-web, which
passes them to the adapter unchanged.

## Where options come from

```js
seneca.use(SenecaWeb, {
  adapter: Adapter,
  context: app,
  auth: Passport,          // optional, used by auth routes
  middleware: { ... },     // same as options.middleware
  options: {
    parseBody: true,
    includeRequest: true,
    includeResponse: true,
    middleware: { ... },
  },
  routes: ...,
})
```

* `options` given to the plugin are merged into seneca-web's defaults
  (`{ parseBody: true }`).
* A top level `middleware` property is copied to `options.middleware`.
* An `options` object inside a `role:web` message replaces the plugin
  options for that mapping call. Options left out are then undefined; the
  table shows how undefined is treated.

## The options

| Option | Type | Default | Effect |
| ------ | ---- | ------- | ------ |
| `parseBody` | boolean | `true` (seneca-web default; undefined counts as false) | When true, the adapter reads the request stream and delivers the body as a string in `msg.args.body`. When false, `msg.args.body` is `req.body` as left by your body parsing middleware, or `{}` when there is none. Must be false when a body parser is installed, otherwise requests with a body never complete. See [Parse request bodies](../how-to/parse-request-bodies.md). |
| `includeRequest` | boolean | `true` (undefined counts as true) | Attach the Express request object to the message as `msg.request$`. |
| `includeResponse` | boolean | `true` (undefined counts as true) | Attach the Express response object to the message as `msg.response$`. Needed to set status codes or headers from an action, and for routes with `autoreply: false`. |
| `middleware` | object of functions | none | Named Express middleware. Route sets and routes refer to the names in their `middleware` property. A name that is not present fails the mapping with `expected valid middleware, got <name>`. See [Add middleware](../how-to/add-middleware.md). |

`includeRequest` and `includeResponse` are resolved on the first request
of each mapping: when they are undefined at that point the adapter sets
them to true on the options object.

## Route properties the adapter uses

These are set per route in the seneca-web route map and arrive on each
route object. They are listed in [Adapter contract](adapter-contract.md#the-route-object);
the resulting HTTP behaviour is in [Response handling](response-handling.md).
