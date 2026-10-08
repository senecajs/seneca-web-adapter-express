'use strict'

const assert = require('assert')
const Sinon = require('sinon')
const Seneca = require('seneca')
const Web = require('seneca-web')

const Express = require('express')
const Session = require('express-session')
const Passport = require('passport')
const Strategy = require('passport-local').Strategy

const BASE = 'http://127.0.0.1:3000'

const LoginStub = Sinon.stub()
const user = { id: 123 }

Passport.use(new Strategy(LoginStub))
Passport.serializeUser((item, cb) => cb(null, user.id))
Passport.deserializeUser((id, cb) => cb(null, user))

const Routes = [
  {
    pin: 'role:admin,cmd:*',
    map: {
      home: { GET: true, alias: '/' },
      profile: { GET: true, secure: { fail: '/' } },
      login: {
        POST: true,
        auth: { strategy: 'local', pass: '/profile', fail: '/' },
      },
    },
  },
]

function AuthPlugin() {
  const si = this
  si.add('role:admin,cmd:profile', (msg, cb) => cb(null, msg.args.user))
  si.add('role:admin,cmd:home', (msg, cb) => cb(null, { msg: 'please login' }))
  return { name: 'AuthPlugin' }
}

// Posts a login form as JSON without following the redirect.
function login() {
  return fetch(BASE + '/login', {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'test', password: 'test' }),
  })
}

// Builds a Cookie header from the Set-Cookie headers of a response.
function cookiesOf(res) {
  return res.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')
}

describe('secured route', () => {
  let si = null
  let server = null
  let app = null

  beforeEach((done) => {
    LoginStub.reset()
    server = Express()
    server.use(Express.json())
    server.use(
      Session({ secret: 'magically', resave: false, saveUninitialized: false })
    )
    server.use(Passport.initialize())
    server.use(Passport.session())
    si = Seneca({ log: 'test' })
    si.use(AuthPlugin)
    si.use(Web, {
      adapter: require('..'),
      context: server,
      routes: Routes,
      auth: Passport,
    })
    si.ready(() => {
      app = server.listen(3000, done)
    })
  })

  afterEach((done) => {
    si.close(() => app.close(done))
  })

  it('should redirect upon auth failure', async () => {
    LoginStub.callsArgWith(2, null, false)
    const res = await fetch(BASE + '/profile', { redirect: 'manual' })
    assert.equal(res.status, 302)
    assert.equal(res.headers.get('location'), '/')
  })

  it('should fail and redirect user back to home', async () => {
    LoginStub.callsArgWith(2, null, false)
    const res = await login()
    assert.equal(res.status, 302)
    assert.equal(res.headers.get('location'), '/')
  })

  it('should log user in and redirect properly to profile, return user properly', async () => {
    LoginStub.callsArgWith(2, null, true)
    const res = await login()
    assert.equal(res.status, 302)
    assert.equal(res.headers.get('location'), '/profile')

    const profile = await fetch(BASE + '/profile', {
      headers: { cookie: cookiesOf(res) },
    })
    assert.equal(profile.status, 200)
    assert.deepEqual(await profile.json(), user)
  })
})
