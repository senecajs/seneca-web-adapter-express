# Handle errors and status codes

How to turn action failures into HTTP responses, choose status codes,
and write error handlers that work on Seneca 3 and Seneca 4. The complete
program is [docs/examples/custom-errors.js](../examples/custom-errors.js);
the rules are listed in [Response handling](../reference/response-handling.md).

## 1. Reply with an error in the action

Reply with an `Error` (or throw one). Give it a `status` when you know
the HTTP status code:

```js
this.add('role:shop,cmd:price', function (msg, reply) {
  const item = msg.args.params.item
  if (null == prices[item]) {
    const err = new Error('unknown item: ' + item)
    err.status = 404
    return reply(err)
  }
  reply({ item, price: prices[item] })
})
```

The adapter does not answer the request itself. It passes the error to
Express with `next(err)`, so Express error handlers decide what the
client sees. Express's own default handler uses `err.status` (or
`err.statusCode`) when it is between 400 and 599, and 500 otherwise. In
development it sends an HTML page with the stack trace and prints the
stack to standard error; with `NODE_ENV=production` it sends the status
message, such as `Not Found` or `Internal Server Error`.

## 2. Add an error handler after the routes

Express runs only the error handlers added after the failing route, and
seneca-web registers the routes while Seneca initializes the plugin. Add
the handler in the `ready` callback:

```js
seneca.ready(function (err) {
  if (err) {
    console.error('startup failed:', err.message)
    return seneca.close(() => process.exit(1))
  }

  app.use((err, req, res, next) => {
    if (res.headersSent) {
      return next(err)
    }
    const cause = err.orig || err
    const status =
      err.status ||
      err.statusCode ||
      ('missing_item' === cause.code ? 400 : 500)
    res.status(status).json({ error: cause.message, code: cause.code })
  })

  app.listen(3000)
})
```

Alternatively give seneca-web an `express.Router()` as the context and
mount it on the app before the error handler; routes added to the router
later are still covered:

```js
const router = Express.Router()
app.use(router)
app.use(errorHandler)
seneca.use(SenecaWeb, { adapter: Adapter, context: router, routes })
```

## 3. Know what the handler receives

The error object differs between Seneca versions:

| | Seneca 4 | Seneca 3 (default `legacy.error: true`) |
| --- | --- | --- |
| `err` | The error the action replied or threw. | A wrapper with `code: 'act_execute'`. |
| `err.message` | The action's message, for example `unknown item: kiwi`. | `seneca: Action cmd:price,role:shop failed: unknown item: kiwi.` |
| `err.orig` | Not set. | The action's error. |
| `err.details` | Whatever the action set. | `{ message, pattern, ... }` with the action's message. |
| Own properties such as `status` | On `err`. | Copied onto the wrapper, and on `err.orig`. |
| `err.callpoint` | Added by Seneca. | Added by Seneca. |

Errors created with `this.error(code, details)` inside a plugin are
Seneca errors and are not wrapped on either version: `err.code` and
`err.details` are yours, and the message is built from the plugin's
`errors` template (`seneca: An order needs an item.` in the example).

The portable form is `(err.orig || err)`: read the message and code from
it, and the status from `err`. Running the example (Seneca 4):

```
$ node docs/examples/custom-errors.js
listening on http://127.0.0.1:3000
GET /shop/price/apple -> 200 {"item":"apple","price":1}
GET /shop/price/kiwi -> 404 {"error":"unknown item: kiwi"}
POST /shop/order -> 400 {"error":"seneca: An order needs an item.","code":"missing_item"}
POST /shop/order -> 201 {"ordered":"pear"}
GET /shop/crash -> 500 {"error":"database down"}
GET /shop/price/pear -> 200 {"item":"pear","price":2}
closed
```

On Seneca 3 the same program prints the same lines; only the stack
traces and log entries differ.

## 4. Status codes for successful replies

Set the status on the response object before replying:

```js
this.add('role:shop,cmd:order', function (msg, reply) {
  msg.response$.status(201)
  reply({ ordered: msg.args.body.item })
})
```

This needs `includeResponse` on (the default). For a "not found" that is
not an error in your model, the same technique works:
`msg.response$.status(404); reply({ error: 'note not found' })`.

## 5. Replies that are not objects

Seneca requires action results to be objects or arrays (`strict.result`).
A string or number reply produces a `result_not_objarr` error, which
reaches your Express handler like any other error. Reply with an object,
or send text yourself through `msg.response$` on a route with
`autoreply: false`.

## 6. Keep error logs readable

Seneca logs every action error at level `error`, and the entry includes
the message, which carries the Express request and response objects when
`includeRequest` and `includeResponse` are on. Such entries are very
long. Turn the two options off for actions that do not need the objects,
or configure the logger to drop `act/ERR` entries for web routes.

## 7. Before version 1.3.0

With seneca-web 2.2.2 and earlier, versions of this adapter up to 1.2.1
sent the messages for routes given in the plugin options with
`fatal$: true`, inherited from plugin loading. Any error replied by one
of those route actions closed the Seneca instance and ended the process,
even when an Express handler had answered the request. Errors created
with `this.error(code)` in route actions also lost their plugin's
message template. Upgrade before relying on error handlers; see
[Why messages are sent from the root instance](../explanation/how-adapters-work.md#why-messages-are-sent-from-the-root-instance).
