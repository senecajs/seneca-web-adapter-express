'use strict'

const assert = require('assert')
const Seneca = require('seneca')
const Web = require('seneca-web')
const Express = require('express')
const adapter = require('..')

const BASE = 'http://127.0.0.1:3000'

// Promise wrapper around seneca.act (Seneca 3 has no built in promises).
function act(seneca, pattern, msg) {
  return new Promise((resolve, reject) => {
    seneca.act(pattern, msg, (err, out) => (err ? reject(err) : resolve(out)))
  })
}

// A plugin with error templates, to check that route actions keep their
// own plugin context (this.error finds the templates through it).
function shop() {
  this.add('role:test,cmd:coded', function (msg, reply) {
    reply(this.error('missing_item'))
  })
}

shop.errors = {
  missing_item: 'An order needs an item.',
}

// Routes given in the plugin options are mapped while Seneca loads the
// plugin. The messages sent for web requests must not inherit what the
// instance doing the mapping carries: fatal$ from plugin loading, which
// makes any action error close Seneca and exit the process, the
// transaction id of the mapping action, and the plugin$ of seneca-web.
describe('route messages', () => {
  let si = null
  let server = null
  let exitCode = null

  beforeEach((done) => {
    exitCode = null
    const app = Express()

    si = Seneca({
      log: 'silent',
      // A fatal error ends with system.exit. Record the call, so that a
      // regression fails a test instead of ending the test run.
      system: {
        exit: (code) => {
          exitCode = code
        },
      },
    })

    si.add('role:test,cmd:boom', (msg, reply) => reply(new Error('aw snap!')))
    si.add('role:test,cmd:inspect', (msg, reply, meta) => {
      reply({ fatal: true === msg.fatal$, tx: meta.tx })
    })

    si.use(shop)

    si.use(Web, {
      adapter,
      context: app,
      routes: {
        pin: 'role:test,cmd:*',
        map: { boom: true, inspect: true, coded: true },
      },
    })

    si.ready(() => {
      // Added after the routes, so Express runs it for their errors.
      app.use((err, req, res, next) => {
        if (res.headersSent) {
          return next(err)
        }
        res.status(500).send({ message: (err.orig || err).message })
      })
      server = app.listen(3000, done)
    })
  })

  afterEach((done) => {
    server.close(() => si.close(done))
  })

  it('are not fatal', async () => {
    const res = await fetch(BASE + '/inspect')
    assert.equal((await res.json()).fatal, false)
  })

  it('keep the server running after an action error', async () => {
    for (let i = 0; i < 2; i++) {
      const boom = await fetch(BASE + '/boom')
      assert.equal(boom.status, 500)
      assert.deepEqual(await boom.json(), { message: 'aw snap!' })
    }

    const res = await fetch(BASE + '/inspect')
    assert.equal(res.status, 200)
    assert.equal(exitCode, null)
  })

  it('keep the plugin context of the route action', async () => {
    const res = await fetch(BASE + '/coded')
    assert.equal(res.status, 500)
    assert.deepEqual(await res.json(), {
      message: 'seneca: An order needs an item.',
    })
  })

  it('have their own transaction', async () => {
    const first = await (await fetch(BASE + '/inspect')).json()
    const second = await (await fetch(BASE + '/inspect')).json()
    assert.notEqual(first.tx, second.tx)
  })

  it('have their own transaction when mapped at runtime', async () => {
    await act(si, 'role:web', {
      routes: { pin: 'role:test,cmd:*', map: { inspect: { GET: true, alias: '/later' } } },
    })

    const first = await (await fetch(BASE + '/later')).json()
    const second = await (await fetch(BASE + '/later')).json()
    assert.equal(first.fatal, false)
    assert.notEqual(first.tx, second.tx)
  })
})
