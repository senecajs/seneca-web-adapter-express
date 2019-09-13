'use strict'

const assert = require('assert')
const Request = require('request')
const Seneca = require('seneca')
const Web = require('seneca-web')
const Express = require('express')
const adapter = require('..')

describe('passing req/res', () => {
  let app = null
  let server = null
  let si = null

  const routes = [
    {
      pin: 'cmd:*',
      map: {
        test: { get: true }
      }
    }
  ]

  beforeEach(done => {
    app = Express()
    server = app.listen(3000, () => {
      si = Seneca({ log: 'silent' })
      si.add('cmd:test', (msg, done) =>
        done(null, { req: !!msg.request$, res: !!msg.response$ })
      )
      si.ready(done)
    })
  })

  afterEach(done => {
    server.close(done)
  })

  describe('default case', () => {
    beforeEach(done => {
      si.use(Web, { adapter, context: app, routes })
      si.ready(done)
    })

    it('should work properly', done => {
      Request(
        'http://127.0.0.1:3000/test',
        { json: true },
        (err, _, result) => {
          if (err) return done(err)
          assert.equal(result.req, true)
          assert.equal(result.res, true)
          done()
        }
      )
    })
  })

  describe('passing true', () => {
    beforeEach(done => {
      si.use(Web, {
        adapter,
        context: app,
        routes,
        options: { includeRequest: true, includeResponse: true }
      })
      si.ready(done)
    })

    it('should work properly', done => {
      Request(
        'http://127.0.0.1:3000/test',
        { json: true },
        (err, _, result) => {
          if (err) return done(err)
          assert.equal(result.req, true)
          assert.equal(result.res, true)
          done()
        }
      )
    })
  })

  describe('passing false', () => {
    beforeEach(done => {
      si.use(Web, {
        adapter,
        context: app,
        routes,
        options: { includeRequest: false, includeResponse: false }
      })
      si.ready(done)
    })

    it('should work properly', done => {
      Request(
        'http://127.0.0.1:3000/test',
        { json: true },
        (err, _, result) => {
          if (err) return done(err)
          assert.equal(result.req, false)
          assert.equal(result.res, false)
          done()
        }
      )
    })
  })
})
