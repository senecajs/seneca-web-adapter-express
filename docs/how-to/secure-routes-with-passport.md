# Secure routes with passport

How to add a login route and routes that only logged in users can reach,
using [passport](https://www.passportjs.org/) and a session. The complete
program is [docs/examples/secured-routes.js](../examples/secured-routes.js);
the redirects are listed in [Response handling](../reference/response-handling.md#secured-routes).

## 1. Set up passport and the session

Install the packages:

```sh
npm install passport passport-local express-session
```

Configure a strategy and the session serialization, then add the
middleware to the app before loading seneca-web:

```js
const Passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const Session = require('express-session')

Passport.use(
  new LocalStrategy((username, password, done) => {
    const user = users[username]
    if (!user || user.password !== password) {
      return done(null, false)
    }
    done(null, { id: user.id, name: user.name })
  })
)
Passport.serializeUser((user, done) => done(null, user.id))
Passport.deserializeUser((id, done) => done(null, findUser(id)))

const app = Express()
app.use(Express.json())
app.use(Session({ secret: 'change me', resave: false, saveUninitialized: false }))
app.use(Passport.initialize())
app.use(Passport.session())
```

`passport-local` reads `username` and `password` from `req.body`, so a
body parser is needed, and with it `parseBody: false` (step 2).

## 2. Give passport to seneca-web

```js
seneca.use(SenecaWeb, {
  adapter: Adapter,
  context: app,
  auth: Passport,
  options: { parseBody: false },
  routes: {
    pin: 'role:site,cmd:*',
    map: {
      home: { GET: true, alias: '/' },
      login: {
        POST: true,
        auth: { strategy: 'local', pass: '/profile', fail: '/' },
      },
      profile: { GET: true, secure: { fail: '/' } },
      logout: { GET: true, redirect: '/' },
    },
  },
})
```

* `auth` on the plugin is the passport instance. The adapter calls
  `auth.authenticate(strategy, { successRedirect: pass, failureRedirect: fail })`
  for routes that have an `auth` property.
* `auth` on a route makes it a login route. With both `pass` and `fail`
  set, passport redirects in both cases and the action is never called,
  so `role:site,cmd:login` needs no action. Leave out `pass` to run the
  action after a successful login instead; it receives the user in
  `msg.args.user`.
* `secure` on a route requires `req.user`. Without it the adapter
  redirects to `secure.fail` and the action is not called.

## 3. Use the user in actions

On secured routes, and on any route after login, `msg.args.user` is
`req.user`, the value your `deserializeUser` produced:

```js
seneca.add('role:site,cmd:profile', (msg, reply) => {
  reply({ user: msg.args.user })
})
```

## 4. Log out

A route with `redirect` redirects after its action replies. Call
passport's `logout` from the action; since passport 0.6 it takes a
callback:

```js
seneca.add('role:site,cmd:logout', (msg, reply) => {
  msg.request$.logout((err) => reply(err))
})
```

This needs `includeRequest` on (the default).

## 5. Try it

The example program logs in with `fetch`, carrying the session cookie by
hand:

```
$ node docs/examples/secured-routes.js
listening on http://127.0.0.1:3000
GET / -> 200 {"message":"please log in","user":null}
GET /profile -> 302 redirect to /
POST /login -> 302 redirect to /
POST /login -> 302 redirect to /profile
GET /profile -> 200 {"user":{"id":1,"name":"ann"}}
GET /logout -> 302 redirect to /
GET /profile -> 302 redirect to /
closed
```

The first `POST /login` uses a wrong password and is sent back to `fail`;
the second succeeds and is sent to `pass`. After logout the session no
longer has a user, and `/profile` redirects again.

## Notes

* The `secure` property is specific to this adapter. Other seneca-web
  adapters handle `auth` differently or not at all; see their
  documentation.
* A route with both `auth` and `secure` is treated as a `secure` route:
  passport is not called.
* Strategies other than `local` work the same way, as long as they can
  run as `passport.authenticate(strategy, options)` middleware.
