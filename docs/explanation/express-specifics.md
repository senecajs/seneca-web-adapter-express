# Express specifics

Things that follow from how Express works and that affect applications
using this adapter.

## Registration order

Express runs middleware and route handlers in the order they were added
to the app. seneca-web adds the routes during plugin initialization,
after `seneca.use(SenecaWeb, ...)` returns and before `ready` fires. Two
consequences:

* Middleware that must run before the routes (body parsers, sessions,
  passport) is added before `seneca.use(SenecaWeb, ...)`, or at least
  before Seneca is ready.
* Handlers that must run after the routes (error handlers, a catch-all
  404) are added inside `seneca.ready`, or the app is structured so that
  order does not matter: give seneca-web an `express.Router()` as the
  context, mount the router with `app.use(router)`, and add the error
  handler after the mount. Routes added to the router at any later time
  are still covered by the handler.

## Body parsing

Express does not parse bodies by default. The adapter's `parseBody`
option reads the raw body itself, which is enough for simple cases and
for frameworks without parsers, but it cannot coexist with a body parser
on the same route: a request stream can be read once. The hang that
results (no response, no error) is the most common problem reported with
this adapter. The rule is: body parser installed, `parseBody: false`.

## Error handlers

Express treats a function with four parameters `(err, req, res, next)`
as an error handler. The adapter calls `next(err)` with the Seneca
error, so these handlers see action failures. Without one, Express's
default handler answers with the error's `status` or 500, an HTML stack
trace in development, and prints the stack to standard error.

## Express 4 and 5

The adapter calls only `app[method](path, ...handlers)`, `res.send`,
`res.redirect` and `next`, which behave the same in Express 4 and 5. The
test suite passes on both (4.22 and 5.2). Differences that affect
applications are Express's own: Express 5 uses a stricter path syntax
(`/:id` is fine, wildcards changed), `req.query` is read only, and
`express.json()` replaces the `body-parser` package. Express 5 requires
Node.js 18 or later.

## Sessions and passport

`auth` routes call `passport.authenticate(strategy, { failureRedirect,
successRedirect })`, and `secure` routes check `req.user`. Both rely on
`passport.initialize()`, and persistent logins rely on
`passport.session()` with a session middleware, all added before the
routes. passport 0.6 and later make `req.logout` asynchronous (it takes
a callback) and regenerate the session on login; the examples in this
repository use passport 0.7 and express-session 1.19.
