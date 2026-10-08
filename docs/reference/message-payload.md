# Message payload

The message the adapter sends for each request, and the route object it
carries. The values below were printed by an action on Seneca 4.0.0-rc5
with Express 4.22; Seneca 3 sends the same message.

## Shape

For a route with the pattern `role:note,cmd:load`, the action receives:

```js
{
  role: 'note',          // from the route pattern
  cmd: 'load',
  args: {
    body: ...,           // see below
    route: { ... },      // the route object
    params: { id: '7' }, // req.params
    query: { x: '1' },   // req.query
    user: null,          // req.user, or null
  },
  request$: req,         // when includeRequest is true (default)
  response$: res,        // when includeResponse is true (default)
}
```

The adapter sends it with `seneca.act(route.pattern, payload)` from the
root instance (see [The sending instance](adapter-contract.md#the-sending-instance)),
so the pattern properties come from the pattern string and nothing else
is added: the keys an action sees are `args`, `request$`, `response$`
and the pattern properties.

## `args.body`

| `parseBody` | Body parser installed | `args.body` |
| ----------- | --------------------- | ----------- |
| `true` (default) | no | The raw request body as a string, `''` when there is none. Not parsed, whatever the content type. |
| `true` | yes | The request never completes (the parser has consumed the stream). Do not combine. |
| `false` | yes | `req.body` as set by the parser, for example an object for JSON. |
| `false` | no | `{}` |

See [Parse request bodies](../how-to/parse-request-bodies.md).

## `args.params`, `args.query`

`req.params` (path parameters such as `:id`, as strings) and `req.query`
(the parsed query string), as Express provides them.

## `args.user`

`req.user`, or `null` when it is not set. With passport this is the
deserialized user of the session; see
[Secure routes with passport](../how-to/secure-routes-with-passport.md).

## `args.route`

The route object built by seneca-web, for example for
`echo: { POST: true, GET: true, suffix: '/:id' }` with `pin: 'role:t,cmd:*'`:

```js
{
  prefix: false,
  postfix: false,
  suffix: '/:id',
  part: 'echo',
  pin: 'role:t,cmd:*',
  alias: false,
  methods: ['POST', 'GET'],
  autoreply: true,
  redirect: false,
  auth: false,
  middleware: false,
  secure: false,
  pattern: 'role:t,cmd:echo',
  path: '/echo/:id',
}
```

The meaning of each property is listed in
[Adapter contract](adapter-contract.md#the-route-object).

## `request$` and `response$`

The Express request and response objects, for reading headers, cookies,
the session or values set by middleware (`msg.request$`), and for setting
the status code or headers, or writing the response yourself
(`msg.response$`). They are present by default; turn them off with the
`includeRequest` and `includeResponse` [options](options.md) when actions
do not need them. Seneca logs messages in action errors and in debug
logging, and the two objects make those entries long.

Properties ending in `$` are not sent over Seneca transports. An action
in another process (reached through `seneca.client`) receives the
pattern properties and `args`, but not `request$` or `response$`.

## Meta data

Each request is a separate message with its own transaction id
(`meta.tx`), route messages are not fatal (`msg.fatal$` is not set), and
the action runs with its own plugin context. Versions up to 1.2.1 sent
the messages with the fixed arguments of the instance seneca-web called
the adapter on; see [The sending instance](adapter-contract.md#the-sending-instance).
