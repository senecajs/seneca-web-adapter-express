// Action errors and HTTP status codes: errors replied or thrown by actions
// reach the Express error handler, which chooses the status code. Works the
// same way on Seneca 3 and Seneca 4.
//
// Run with: node docs/examples/custom-errors.js
//
// This file requires the adapter from this repository. In your own project
// use: const Adapter = require('@seneca/web-adapter-express')

const Seneca = require('seneca')
const SenecaWeb = require('seneca-web')
const Express = require('express')
const Adapter = require('../..')

const PORT = Number(process.env.PORT || 3000)

function shop() {
  const prices = { apple: 1, pear: 2 }

  this.add('role:shop,cmd:price', function (msg, reply) {
    const item = msg.args.params.item
    if (null == prices[item]) {
      const err = new Error('unknown item: ' + item)
      err.status = 404
      return reply(err)
    }
    reply({ item, price: prices[item] })
  })

  this.add('role:shop,cmd:order', function (msg, reply) {
    if (null == msg.args.body.item) {
      return reply(this.error('missing_item'))
    }
    msg.response$.status(201)
    reply({ ordered: msg.args.body.item })
  })

  this.add('role:shop,cmd:crash', function () {
    throw new Error('database down')
  })
}

shop.errors = {
  missing_item: 'An order needs an item.',
}

const app = Express()
app.use(Express.json())

// Seneca logs every action error at level error; keep the output short.
const seneca = Seneca({ log: 'silent' })

seneca.use(shop)

seneca.use(SenecaWeb, {
  adapter: Adapter,
  context: app,
  options: { parseBody: false },
  routes: {
    pin: 'role:shop,cmd:*',
    prefix: '/shop',
    map: {
      price: { GET: true, suffix: '/:item' },
      order: { POST: true },
      crash: true,
    },
  },
})

seneca.ready(function (err) {
  if (err) {
    console.error('startup failed:', err.message)
    return seneca.close(() => process.exit(1))
  }

  // The routes exist once Seneca is ready, so an Express error handler must
  // be added here: Express only runs error handlers added after the routes.
  //
  // Seneca 3 wraps action errors and keeps the original in err.orig, copying
  // the original's own properties (such as status) onto the wrapper. Seneca
  // 4 passes the original error through. Coded errors made with this.error
  // are never wrapped.
  app.use((err, req, res, next) => {
    if (res.headersSent) {
      return next(err)
    }
    const cause = err.orig || err
    const status =
      err.status ||
      err.statusCode ||
      ('missing_item' === cause.code ? 400 : 500)
    res.status(status).json({ error: cause.message, code: cause.code })
  })

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

  async function show(method, path, body) {
    const res = await fetch(base + path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    })
    console.log(method, path, '->', res.status, await res.text())
  }

  try {
    await show('GET', '/shop/price/apple')
    await show('GET', '/shop/price/kiwi')
    await show('POST', '/shop/order', {})
    await show('POST', '/shop/order', { item: 'pear' })
    await show('GET', '/shop/crash')
    await show('GET', '/shop/price/pear')
  } catch (err) {
    console.error('request failed:', err.message)
    process.exitCode = 1
  } finally {
    server.close()
    seneca.close(() => console.log('closed'))
  }
}
