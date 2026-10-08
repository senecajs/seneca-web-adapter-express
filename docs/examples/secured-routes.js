// Secured routes: a passport login route (auth) and routes that require a
// logged in user (secure), with express-session keeping the login.
//
// Run with: node docs/examples/secured-routes.js
//
// This file requires the adapter from this repository. In your own project
// use: const Adapter = require('@seneca/web-adapter-express')

const Seneca = require('seneca')
const SenecaWeb = require('seneca-web')
const Express = require('express')
const Session = require('express-session')
const Passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const Adapter = require('../..')

const PORT = Number(process.env.PORT || 3000)

const users = { ann: { id: 1, name: 'ann', password: 'secret' } }

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

Passport.deserializeUser((id, done) => {
  const user = Object.values(users).find((user) => user.id === id)
  done(null, user ? { id: user.id, name: user.name } : false)
})

const app = Express()
app.use(Express.json())
app.use(Session({ secret: 'change me', resave: false, saveUninitialized: false }))
app.use(Passport.initialize())
app.use(Passport.session())

function site() {
  this.add('role:site,cmd:home', (msg, reply) => {
    reply({ message: 'please log in', user: msg.args.user })
  })

  // Only reached with a logged in user: msg.args.user is req.user.
  this.add('role:site,cmd:profile', (msg, reply) => {
    reply({ user: msg.args.user })
  })

  // The route has redirect: '/', so the adapter redirects once the action
  // has replied. passport 0.6 and later need a callback for logout.
  this.add('role:site,cmd:logout', (msg, reply) => {
    msg.request$.logout((err) => reply(err))
  })

  // The login route redirects on success and failure, so passport never
  // reaches the route handler and no action is needed for cmd:login.
}

const seneca = Seneca({ log: 'warn' })

seneca.use(site)

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

seneca.ready(function (err) {
  if (err) {
    console.error('startup failed:', err.message)
    return seneca.close(() => process.exit(1))
  }

  const server = app.listen(PORT, () => {
    console.log('listening on http://127.0.0.1:' + PORT)
    demo(server)
  })

  // For example the port is in use: release Seneca before exiting.
  server.on('error', (err) => {
    console.error('listen failed:', err.message)
    seneca.close(() => process.exit(1))
  })
})

// Walk through the login flow, carrying the session cookie by hand.
async function demo(server) {
  const base = 'http://127.0.0.1:' + PORT
  let cookie = ''

  async function show(method, path, body) {
    const res = await fetch(base + path, {
      method,
      redirect: 'manual',
      headers: {
        cookie,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const setCookie = res.headers.getSetCookie()
    if (0 < setCookie.length) {
      cookie = setCookie.map((entry) => entry.split(';')[0]).join('; ')
    }
    const location = res.headers.get('location')
    console.log(
      method,
      path,
      '->',
      res.status,
      location ? 'redirect to ' + location : await res.text()
    )
  }

  try {
    await show('GET', '/')
    await show('GET', '/profile')
    await show('POST', '/login', { username: 'ann', password: 'wrong' })
    await show('POST', '/login', { username: 'ann', password: 'secret' })
    await show('GET', '/profile')
    await show('GET', '/logout')
    await show('GET', '/profile')
  } catch (err) {
    console.error('request failed:', err.message)
    process.exitCode = 1
  } finally {
    server.close()
    seneca.close(() => console.log('closed'))
  }
}
