# Response handling

What the adapter sends back for each outcome of the action. Every row
was checked with Express 4.22 and 5.2 on Seneca 4.0.0-rc5; the test
suite covers the main rows on Seneca 3.38, 4.0.0-rc5 and 4.0.0.

## After the action replies

The rules are checked in this order:

| Outcome | Route settings | HTTP result |
| ------- | -------------- | ----------- |
| Error (replied or thrown) | any | `next(err)`: Express error handlers decide. Express's default handler sends status `err.status` or `err.statusCode` when between 400 and 599, else 500, as an HTML page with the stack trace in development, or with the status message (`Internal Server Error`, `Not Found`) when `NODE_ENV` is `production`. |
| Result | `redirect: '/path'` | `302 Found`, `Location: /path`; the result is discarded. Takes precedence over `autoreply`. |
| Object or array result | `autoreply: true` (default) | `200`, JSON body (`res.send(result)`), `Content-Type: application/json; charset=utf-8`. |
| `null` or `undefined` result (`reply()`) | `autoreply: true` | `200` with an empty body and no content type. |
| Any result | `autoreply: false` | Nothing. The action must respond through `msg.response$` (`res.json`, `res.send`, `res.redirect`), otherwise the request never completes. |
| String or number result | any | Seneca rejects it with the `result_not_objarr` error (`strict.result`), which reaches Express as an error. |

## Status codes and headers

Call `msg.response$.status(code)` or `msg.response$.set(name, value)`
before replying; `res.send` keeps them:

```js
msg.response$.status(201)
reply({ created: true })
```

When the action writes the response itself on a route with `autoreply`
or `redirect`, the client receives what the action wrote. The adapter's
own `res.send` or `res.redirect` then throws `Cannot set headers after
they are sent to the client`, which Seneca reports as an `act_callback`
error (logged, and given to the `seneca.error` handler). Use
`autoreply: false` when the action writes the response itself.

## Secured routes

| Situation | HTTP result |
| --------- | ----------- |
| `secure` route, no `req.user` | `302 Found`, `Location: secure.fail`. The action is not called. |
| `auth` route, authentication fails | `302 Found`, `Location: auth.fail` (passport). |
| `auth` route, authentication succeeds, `pass` set | `302 Found`, `Location: auth.pass`. The action is not called. |
| `auth` route, authentication succeeds, no `pass` | The middleware and the action run with `msg.args.user` set. |

## Middleware

Middleware that ends the response (for example `res.status(401).json(...)`)
stops the chain; the action is not called.

## Logging

Seneca logs action errors at level `error` (`act/ERR` entries). The entry
contains the message, including `request$` and `response$` when they are
attached, so such entries are long. See
[Handle errors and status codes](../how-to/handle-errors-and-status-codes.md#6-keep-error-logs-readable).
