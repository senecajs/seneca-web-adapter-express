# Parse request bodies

How to get the body of a `POST`, `PUT` or `PATCH` request into
`msg.args.body`, either parsed by Express or as the raw text. The option
is described in the [Options reference](../reference/options.md).

## Let Express parse the body (recommended)

1. Add a body parser to the app before loading seneca-web. Express 4.16
   and later ship `express.json()` and `express.urlencoded()`:

   ```js
   const app = Express()
   app.use(Express.json())
   ```

2. Turn the adapter's own body reading off:

   ```js
   seneca.use(SenecaWeb, {
     adapter: Adapter,
     context: app,
     options: { parseBody: false },
     routes: ...,
   })
   ```

3. Read the parsed body in the action. It is whatever the parser put in
   `req.body`, so an object for JSON:

   ```js
   seneca.add('role:note,cmd:create', function (msg, reply) {
     reply({ text: msg.args.body.text })
   })
   ```

With `parseBody: false` and no parser, `msg.args.body` is `{}`.

## Read the raw body (no parser)

With the default `parseBody: true`, the adapter reads the request stream
itself and delivers the body as a string. It does not parse it, whatever
the content type:

```js
seneca.add('role:note,cmd:create', function (msg, reply) {
  const data = JSON.parse(msg.args.body) // '{"text":"buy milk"}'
  reply({ text: data.text })
})
```

A request without a body (for example a `GET`) gives the empty string.
The reader concatenates the chunks as UTF-8 text and has no size limit;
if clients can send large bodies, check `msg.request$.headers['content-length']`
or use a body parser with a `limit`.

## Do not combine the two

With `parseBody: true` and a body parsing middleware on the same route,
the parser consumes the request stream first. The adapter then waits for
data that never comes, and the request never completes: no response and
no error. The symptom is a client that hangs on every request with a
body. Set `parseBody: false` whenever a body parser is installed.

## Routes mapped later

When routes are added with `seneca.act('role:web', { routes, options })`,
the `options` object given in the message replaces the plugin options
for that call. An options object without `parseBody` behaves like
`parseBody: false`. See [Map routes at runtime](map-routes-at-runtime.md).
