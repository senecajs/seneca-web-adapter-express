'use strict'

const Seneca = require('seneca')
const Web = require('seneca-web')
const Express = require('express')
const assert = require('assert')

const BASE = 'http://127.0.0.1:3000'

// Promise wrapper around seneca.act, so that the tests read the same way
// on Seneca 3 (no built in promises) and Seneca 4.
function act(seneca, pattern, msg) {
  return new Promise((resolve, reject) => {
    seneca.act(pattern, msg, (err, out) => (err ? reject(err) : resolve(out)))
  })
}

describe('express', () => {
  let si = null
  let server = null
  let app = null

  const middleware = {
    head: function (req, res, next) {
      res.type('application/json')
      res.status(200)
      next()
    },
    body: function (req, res) {
      res.json({ success: true })
    },
  }

  beforeEach((done) => {
    app = Express()
    server = app.listen(3000, () => {
      si = Seneca({ log: 'silent' })
      si.use(Web, { adapter: require('..'), context: app, middleware })
      si.ready(done)
    })
  })

  afterEach((done) => {
    si.close(() => server.close(done))
  })

  it('by default routes autoreply', async () => {
    const config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          ping: true,
        },
      },
    }

    si.add('role:test,cmd:ping', (msg, reply) => {
      reply(null, { res: 'pong!' })
    })

    await act(si, 'role:web', config)

    const res = await fetch(BASE + '/ping')
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { res: 'pong!' })
  })

  it('multiple routes supported', async () => {
    const config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          one: true,
          two: true,
        },
      },
    }

    si.add('role:test,cmd:one', (msg, reply) => {
      reply(null, { res: 'pong!' })
    })

    si.add('role:test,cmd:two', (msg, reply) => {
      reply(null, { res: 'ping!' })
    })

    await act(si, 'role:web', config)

    const one = await fetch(BASE + '/one')
    assert.deepEqual(await one.json(), { res: 'pong!' })

    const two = await fetch(BASE + '/two')
    assert.deepEqual(await two.json(), { res: 'ping!' })
  })

  it('post without body parser defined', async () => {
    const config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          echo: {
            POST: true,
          },
        },
      },
    }

    si.add('role:test,cmd:echo', (msg, reply) => {
      reply(null, { value: msg.args.body })
    })

    await act(si, 'role:web', config)

    const res = await fetch(BASE + '/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ foo: 'bar' }),
    })
    const body = await res.json()

    // parseBody (the default) delivers the raw body as a string.
    assert.deepEqual(body.value, '{"foo":"bar"}')
  })

  it('post with body parser defined', async () => {
    const config = {
      options: {
        parseBody: false,
      },
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          echo: {
            POST: true,
          },
        },
      },
    }

    app.use(Express.json())

    si.add('role:test,cmd:echo', (msg, reply) => {
      reply(null, msg.args.body)
    })

    await act(si, 'role:web', config)

    const res = await fetch(BASE + '/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ foo: 'bar' }),
    })

    assert.deepEqual(await res.json(), { foo: 'bar' })
  })

  it('should redirect properly', async () => {
    const config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          redirect: {
            GET: true,
            redirect: '/',
          },
        },
      },
    }

    si.add('role:test,cmd:redirect', (msg, reply) => reply())

    await act(si, 'role:web', config)

    const res = await fetch(BASE + '/redirect', { redirect: 'manual' })
    assert.equal(res.status, 302)
    assert.equal(res.headers.get('location'), '/')
  })

  it('should handle custom errors properly', async () => {
    const config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          boom: true,
        },
      },
    }

    si.add('role:test,cmd:boom', (msg, reply) => reply(new Error('aw snap!')))

    await act(si, 'role:web', config)

    // The adapter hands the action error to Express via next(err).
    // Seneca 3 wraps action errors and keeps the original in err.orig;
    // Seneca 4 passes the original error through unchanged.
    app.use((err, req, res, next) => {
      if (res.headersSent) {
        return next(err)
      }
      res.status(400).send({ message: (err.orig || err).message })
    })

    const res = await fetch(BASE + '/boom', { redirect: 'manual' })
    assert.equal(res.status, 400)
    assert.deepEqual(await res.json(), { message: 'aw snap!' })
  })

  describe('middleware', () => {
    it('blows up on invalid middleware input', async () => {
      const config = {
        routes: {
          pin: 'role:test,cmd:*',
          middleware: ['total not valid'],
          map: {
            ping: true,
          },
        },
      }

      const err = await act(si, 'role:web', config).then(
        () => null,
        (err) => err
      )

      assert.ok(err, 'expected the route mapping to fail')
      assert.equal(
        (err.orig || err).message,
        'expected valid middleware, got total not valid'
      )
    })

    it('should call middleware routes properly - passing as strings', async () => {
      const config = {
        routes: {
          pin: 'role:test,cmd:*',
          middleware: ['head', 'body'],
          map: {
            ping: true,
          },
        },
      }

      si.add('role:test,cmd:ping', (msg, reply) => {
        reply(null, { res: 'ping!' })
      })

      await act(si, 'role:web', config)

      const res = await fetch(BASE + '/ping')
      assert.equal(res.status, 200)
      assert.deepEqual(await res.json(), { success: true })
    })

    it('should call middleware routes properly - passing as functions', async () => {
      const config = {
        routes: {
          pin: 'role:test,cmd:*',
          map: {
            ping: true,
          },
        },
      }

      si.add('role:test,cmd:ping', (msg, reply) => {
        reply(null, { res: 'ping!' })
      })

      si.add('role:web,routes:*', function (msg, cb) {
        msg.routes.middleware = [
          function (req, res, next) {
            res.type('application/json')
            res.status(200)
            next()
          },
          function (req, res) {
            res.json({ success: true })
          },
        ]
        this.prior(msg, cb)
      })

      await act(si, 'role:web', config)

      const res = await fetch(BASE + '/ping')
      assert.equal(res.status, 200)
      assert.deepEqual(await res.json(), { success: true })
    })
  })
})
