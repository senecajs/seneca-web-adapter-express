# Add middleware

How to run Express middleware before the route handler, for a whole
route set or for single routes. The complete program is
[docs/examples/middleware.js](../examples/middleware.js).

## 1. Name the middleware

Give the plugin a `middleware` object. Its keys are the names you use in
the route map:

```js
const middleware = {
  log: (req, res, next) => {
    console.log('  middleware log:', req.method, req.url)
    next()
  },
  requireKey: (req, res, next) => {
    if ('letmein' !== req.get('x-api-key')) {
      return res.status(401).json({ error: 'api key required' })
    }
    next()
  },
}

seneca.use(SenecaWeb, { adapter: Adapter, context: app, middleware, routes })
```

`middleware` can be given at the top level (as above) or as
`options.middleware`; both reach the adapter as `options.middleware`.

## 2. Reference it from the routes

A `middleware` property on the route set applies to every route in the
set; a `middleware` property on a route applies to that route only and
runs after the set's middleware. Each can be a name, a function, or an
array of either:

```js
const routes = {
  pin: 'role:api,cmd:*',
  middleware: 'log',
  map: {
    public: true,
    private: { GET: true, middleware: ['requireKey', stamp] },
  },
}

function stamp(req, res, next) {
  req.stamped = true
  next()
}
```

The adapter registers the route as
`app.get(path, log, requireKey, stamp, handler)`, so the usual Express
rules apply: a middleware that ends the response (like `requireKey`
sending 401) stops the chain, and the action is never called.

## 3. Use what the middleware did

Middleware changes to the request are visible to the action through
`msg.request$` (when `includeRequest` is on, the default):

```js
seneca.add('role:api,cmd:private', (msg, reply) => {
  reply({ cmd: 'private', stamped: true === msg.request$.stamped })
})
```

Running the example:

```
$ node docs/examples/middleware.js
listening on http://127.0.0.1:3000
  middleware log: GET /public
GET /public -> 200 {"cmd":"public","stamped":false}
  middleware log: GET /private
GET /private -> 401 {"error":"api key required"}
  middleware log: GET /private
GET /private -> 200 {"cmd":"private","stamped":true}
closed
```

## Unknown names

A name that is not a key of the `middleware` object makes the route
mapping fail with the error `expected valid middleware, got <name>`.
When the routes come from the plugin options this is a plugin
initialization failure, which Seneca treats as fatal; when they come from
a `role:web` message, the error is given to the act callback. On Seneca
4 it is the error as thrown (`err.message`); on Seneca 3 it is wrapped,
with the message in `err.orig.message` and `err.details.message`.

## Secured routes

Passport authentication for `auth` routes runs before the route
middleware. See [Secure routes with passport](secure-routes-with-passport.md).
