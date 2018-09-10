'use strict'

const assert = require('assert')
const Sinon = require('sinon')
const Request = require('request')
const Seneca = require('seneca')
const Web = require('seneca-web')

const Express = require('express')
const Session = require('express-session')
const Passport = require('passport')
const Strategy = require('passport-local').Strategy
const json = require('body-parser').json

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
        auth: { strategy: 'local', pass: '/profile', fail: '/' }
      }
    }
  }
]

function AuthPlugin() {
  const si = this
  si.add('role:admin,cmd:profile', (msg, cb) => cb(null, msg.args.user))
  si.add('role:admin,cmd:home', (msg, cb) => cb(null, { msg: 'please login' }))
  return { name: 'AuthPlugin' }
}

describe('secured route', () => {
  let si = null
  let server = null
  let app = null

  beforeEach(done => {
    LoginStub.reset()
    server = Express()
    server.use(json())
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
      auth: Passport
    })
    si.ready(() => {
      app = server.listen(3000, done)
    })
  })

  afterEach(done => {
    app.close(done)
  })

  it('should redirect upon auth failure', done => {
    LoginStub.callsArgWith(2, null, false)
    Request.get(
      'http://127.0.0.1:3000/profile',
      { followRedirect: false },
      (err, res) => {
        assert.equal(err, null)
        assert(res.headers.location)
        assert.equal(res.headers.location, '/')
        done()
      }
    )
  })

  it('should fail and redirect user back to home', done => {
    LoginStub.callsArgWith(2, null, false)
    Request.post(
      'http://127.0.0.1:3000/login',
      { followRedirect: false, json: { username: 'test', password: 'test' } },
      (err, res) => {
        assert.equal(err, null)
        assert(res.headers.location)
        assert.equal(res.headers.location, '/')
        done()
      }
    )
  })

  it('should log user in and redirect properly to profile, return user properly', done => {
    LoginStub.callsArgWith(2, null, true)
    const jar = Request.jar()
    Request.post(
      'http://127.0.0.1:3000/login',
      { jar, json: { username: 'test', password: 'test' } },
      (err, res) => {
        assert.equal(err, null)
        assert(res.headers.location)
        assert.equal(res.headers.location, '/profile')

        Request.get(
          'http://127.0.0.1:3000/profile',
          { jar },
          (err, res, body) => {
            assert.equal(err, null)
            body = JSON.parse(body)
            assert.deepEqual(body, user)
            done()
          }
        )
      }
    )
  })
})
