'use strict'

const assert = require('assert')
const Seneca = require('seneca')
const Web = require('seneca-web')
const Express = require('express')
const adapter = require('..')

const BASE = 'http://127.0.0.1:3000'

describe('passing req/res', () => {
  let app = null
  let server = null
  let si = null

  const routes = [
    {
      pin: 'cmd:*',
      map: {
        test: { get: true },
      },
    },
  ]

  beforeEach((done) => {
    app = Express()
    server = app.listen(3000, () => {
      si = Seneca({ log: 'silent' })
      si.add('cmd:test', (msg, done) =>
        done(null, { req: !!msg.request$, res: !!msg.response$ })
      )
      si.ready(done)
    })
  })

  afterEach((done) => {
    si.close(() => server.close(done))
  })

  describe('default case', () => {
    beforeEach((done) => {
      si.use(Web, { adapter, context: app, routes })
      si.ready(done)
    })

    it('should work properly', async () => {
      const res = await fetch(BASE + '/test')
      const result = await res.json()
      assert.equal(result.req, true)
      assert.equal(result.res, true)
    })
  })

  describe('passing true', () => {
    beforeEach((done) => {
      si.use(Web, {
        adapter,
        context: app,
        routes,
        options: { includeRequest: true, includeResponse: true },
      })
      si.ready(done)
    })

    it('should work properly', async () => {
      const res = await fetch(BASE + '/test')
      const result = await res.json()
      assert.equal(result.req, true)
      assert.equal(result.res, true)
    })
  })

  describe('passing false', () => {
    beforeEach((done) => {
      si.use(Web, {
        adapter,
        context: app,
        routes,
        options: { includeRequest: false, includeResponse: false },
      })
      si.ready(done)
    })

    it('should work properly', async () => {
      const res = await fetch(BASE + '/test')
      const result = await res.json()
      assert.equal(result.req, false)
      assert.equal(result.res, false)
    })
  })
})
