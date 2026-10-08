// Middleware: functions that run before the route handler, given for a
// whole route set or for one route, by name or as functions.
//
// Run with: node docs/examples/middleware.js
//
// This file requires the adapter from this repository. In your own project
// use: const Adapter = require('@seneca/web-adapter-express')

const Seneca = require('seneca')
const SenecaWeb = require('seneca-web')
const Express = require('express')
const Adapter = require('../..')

const PORT = Number(process.env.PORT || 3000)

// Named middleware, referenced from the routes by key.
const middleware = {
  log: (req, res, next) => {
    console.log('  middleware log:', req.method, req.url)
    next()
  },
  requireKey: (req, res, next) => {
    if ('letmein' !== req.get('x-api-key')) {
      return res.status(401).json({ error: 'api key required' })
    }
    next()
  },
}

// Middleware can also be passed as a function.
function stamp(req, res, next) {
  req.stamped = true
  next()
}

const app = Express()

const seneca = Seneca({ log: 'warn' })

seneca.add('role:api,cmd:public', (msg, reply) => {
  reply({ cmd: 'public', stamped: true === msg.request$.stamped })
})

seneca.add('role:api,cmd:private', (msg, reply) => {
  reply({ cmd: 'private', stamped: true === msg.request$.stamped })
})

seneca.use(SenecaWeb, {
  adapter: Adapter,
  context: app,
  middleware,
  routes: {
    pin: 'role:api,cmd:*',
    // runs for every route of this set
    middleware: 'log',
    map: {
      public: true,
      // runs after the route set middleware, in this order
      private: { GET: true, middleware: ['requireKey', stamp] },
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

async function demo(server) {
  const base = 'http://127.0.0.1:' + PORT

  async function show(path, headers) {
    const res = await fetch(base + path, { headers })
    console.log('GET', path, '->', res.status, await res.text())
  }

  try {
    await show('/public')
    await show('/private')
    await show('/private', { 'x-api-key': 'letmein' })
  } catch (err) {
    console.error('request failed:', err.message)
    process.exitCode = 1
  } finally {
    server.close()
    seneca.close(() => console.log('closed'))
  }
}
