// Getting started: a small notes service whose actions are exposed as HTTP
// routes by seneca-web, this adapter and Express.
//
// Run with: node docs/examples/getting-started.js
//
// The program starts the server, makes a few requests against it with
// fetch, prints the results and shuts down. Remove the call to demo() at
// the end to keep the server running and try the routes yourself.
//
// This file requires the adapter from this repository. In your own project
// use: const Adapter = require('@seneca/web-adapter-express')

const Seneca = require('seneca')
const SenecaWeb = require('seneca-web')
const Express = require('express')
const Adapter = require('../..')

const PORT = Number(process.env.PORT || 3000)

// A plugin with three actions. Each action receives the HTTP data in
// msg.args (body, params, query, user) and the Express objects as
// msg.request$ and msg.response$.
function notes() {
  const store = []

  this.add('role:note,cmd:list', function (msg, reply) {
    reply(store)
  })

  this.add('role:note,cmd:load', function (msg, reply) {
    const note = store.find((note) => note.id === msg.args.params.id)
    if (!note) {
      msg.response$.status(404)
      return reply({ error: 'note not found' })
    }
    reply(note)
  })

  this.add('role:note,cmd:create', function (msg, reply) {
    const note = { id: String(store.length + 1), text: msg.args.body.text }
    store.push(note)
    msg.response$.status(201)
    reply(note)
  })
}

const app = Express()

// Express parses JSON bodies, so the adapter must not read them again.
app.use(Express.json())

const seneca = Seneca({ log: 'warn' })

seneca.use(notes)

seneca.use(SenecaWeb, {
  adapter: Adapter,
  context: app,
  options: { parseBody: false },
  routes: {
    pin: 'role:note,cmd:*',
    prefix: '/notes',
    map: {
      list: { GET: true, name: '' },
      load: { GET: true, name: '', suffix: '/:id' },
      create: { POST: true, name: '' },
    },
  },
})

seneca.ready(function (err) {
  if (err) {
    console.error('startup failed:', err.message)
    return seneca.close(() => process.exit(1))
  }

  // seneca.export('web/context')() returns the Express app given as context.
  const server = seneca.export('web/context')().listen(PORT, () => {
    console.log('listening on http://127.0.0.1:' + PORT)
    demo(server)
  })

  // For example the port is in use: release Seneca before exiting.
  server.on('error', (err) => {
    console.error('listen failed:', err.message)
    seneca.close(() => process.exit(1))
  })
})

// Exercise the routes, then shut everything down.
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
    await show('GET', '/notes')
    await show('POST', '/notes', { text: 'buy milk' })
    await show('POST', '/notes', { text: 'call Ann' })
    await show('GET', '/notes')
    await show('GET', '/notes/2')
    await show('GET', '/notes/9')
  } catch (err) {
    console.error('request failed:', err.message)
    process.exitCode = 1
  } finally {
    server.close()
    seneca.close(() => console.log('closed'))
  }
}
