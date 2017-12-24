'use strict'

const Code = require('code')
const Lab = require('lab')
const Request = require('request')
const Seneca = require('seneca')
const Web = require('seneca-web')
const Express = require('express')
const BodyParser = require('body-parser')

const expect = Code.expect
const lab = (exports.lab = Lab.script())
const describe = lab.describe
const it = lab.it
const beforeEach = lab.beforeEach
const afterEach = lab.afterEach

describe('express', () => {
  let si = null
  let server = null
  let app = null

  const middleware = {
    head: function(req, res, next) {
      res.type = 'application/json'
      res.status = 200
      next()
    },
    body: function(req, res) {
      res.json({ success: true })
    }
  }

  beforeEach(done => {
    app = Express()
    server = app.listen(3000, () => {
      si = Seneca({ log: 'silent' })
      si.use(Web, { adapter: require('..'), context: app, middleware })
      si.ready(done)
    })
  })

  afterEach(done => {
    server.close(done)
  })

  it('by default routes autoreply', done => {
    var config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          ping: true
        }
      }
    }

    si.add('role:test,cmd:ping', (msg, reply) => {
      reply(null, { res: 'pong!' })
    })

    si.act('role:web', config, (err) => {
      if (err) return done(err)

      Request('http://127.0.0.1:3000/ping', (err, res, body) => {
        if (err) return done(err)

        body = JSON.parse(body)

        expect(body).to.be.equal({ res: 'pong!' })
        done()
      })
    })
  })

  it('multiple routes supported', done => {
    var config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          one: true,
          two: true
        }
      }
    }

    si.add('role:test,cmd:one', (msg, reply) => {
      reply(null, { res: 'pong!' })
    })

    si.add('role:test,cmd:two', (msg, reply) => {
      reply(null, { res: 'ping!' })
    })

    si.act('role:web', config, (err) => {
      if (err) return done(err)

      Request('http://127.0.0.1:3000/one', (err, res, body) => {
        if (err) return done(err)

        body = JSON.parse(body)
        expect(body).to.be.equal({ res: 'pong!' })

        Request('http://127.0.0.1:3000/two', (err, res, body) => {
          if (err) return done(err)

          body = JSON.parse(body)
          expect(body).to.be.equal({ res: 'ping!' })
          done()
        })
      })
    })
  })

  it('post without body parser defined', done => {
    var config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          echo: {
            POST: true
          }
        }
      }
    }

    si.add('role:test,cmd:echo', (msg, reply) => {
      reply(null, { value: msg.args.body })
    })

    si.act('role:web', config, (err) => {
      if (err) return done(err)

      Request.post(
        'http://127.0.0.1:3000/echo',
        { json: { foo: 'bar' } },
        (err, res, body) => {
          if (err) return done(err)
          expect(body.value).to.be.equal('{"foo":"bar"}')
          done()
        }
      )
    })
  })

  it('post with body parser defined', done => {
    var config = {
      options: {
        parseBody: false
      },
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          echo: {
            POST: true
          }
        }
      }
    }

    app.use(BodyParser.json())

    si.add('role:test,cmd:echo', (msg, reply) => {
      reply(null, msg.args.body)
    })

    si.act('role:web', config, (err) => {
      if (err) return done(err)

      Request.post(
        'http://127.0.0.1:3000/echo',
        { json: { foo: 'bar' } },
        (err, res, body) => {
          if (err) return done(err)
          expect(body).to.be.equal({ foo: 'bar' })
          done()
        }
      )
    })
  })

  it('should redirect properly', done => {
    var config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          redirect: {
            GET: true,
            redirect: '/'
          }
        }
      }
    }

    si.add('role:test,cmd:redirect', (msg, reply) => reply())

    si.act('role:web', config, (err) => {
      if (err) return done(err)

      Request.get(
        'http://127.0.0.1:3000/redirect',
        { followRedirect: false },
        (err, res) => {
          if (err) return done(err)
          expect(res.headers.location).to.exist()
          expect(res.headers.location).to.equal('/')
          done()
        }
      )
    })
  })

  it('should handle custom errors properly', done => {
    var config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          boom: true
        }
      }
    }

    si.add('role:test,cmd:boom', (msg, reply) => reply(new Error('aw snap!')))

    si.act('role:web', config, (err) => {
      if (err) return done(err)

      app.use((err, req, res, next) => {
        if (res.headersSend) {
          return next(err)
        }
        res
          .status(400)
          .send({ message: err.orig.message.replace('gate-executor: ', '') })
      })

      Request.get(
        'http://127.0.0.1:3000/boom',
        { followRedirect: false },
        (err, res, body) => {
          if (err) return done(err)
          body = JSON.parse(body)
          expect(res.statusCode).to.equal(400)
          expect(body).to.be.equal({ message: 'aw snap!' })
          done()
        }
      )
    })
  })

  describe('middleware', () => {
    it('blows up on invalid middleware input', done => {
      var config = {
        routes: {
          pin: 'role:test,cmd:*',
          middleware: ['total not valid'],
          map: {
            ping: true
          }
        }
      }
      si.act('role:web', config, (err) => {
        expect(err.details.message).to.equal(
          'expected valid middleware, got total not valid'
        )
        done()
      })
    })

    it('should call middleware routes properly - passing as strings', done => {
      var config = {
        routes: {
          pin: 'role:test,cmd:*',
          middleware: ['head', 'body'],
          map: {
            ping: true
          }
        }
      }

      si.add('role:test,cmd:ping', (msg, reply) => {
        reply(null, { res: 'ping!' })
      })

      si.act('role:web', config, (err) => {
        if (err) return done(err)

        Request('http://127.0.0.1:3000/ping', (err, res, body) => {
          if (err) return done(err)
          body = JSON.parse(body)
          expect(res.statusCode).to.equal(200)
          expect(body).to.be.equal({ success: true })
          done()
        })
      })
    })
    it('should call middleware routes properly - passing as functions', done => {
      var config = {
        routes: {
          pin: 'role:test,cmd:*',
          map: {
            ping: true
          }
        }
      }

      si.add('role:test,cmd:ping', (msg, reply) => {
        reply(null, { res: 'ping!' })
      })

      si.add('role:web,routes:*', function(msg, cb) {
        msg.routes.middleware = [
          function(req, res, next) {
            res.type = 'application/json'
            res.status = 200
            next()
          },
          function(req, res) {
            res.json({ success: true })
          }
        ]
        this.prior(msg, cb)
      })

      si.act('role:web', config, (err) => {
        if (err) return done(err)

        Request('http://127.0.0.1:3000/ping', (err, res, body) => {
          if (err) return done(err)
          body = JSON.parse(body)
          expect(res.statusCode).to.equal(200)
          expect(body).to.be.equal({ success: true })
          done()
        })
      })
    })
  })
})
