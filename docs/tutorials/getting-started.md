# Getting started

In this tutorial you build a small notes service: three Seneca actions
exposed as HTTP routes by seneca-web, this adapter and Express. You will
see how a request becomes a Seneca message, how the reply becomes the
response, and how to set a status code. It takes about fifteen minutes.
The finished program is [docs/examples/getting-started.js](../examples/getting-started.js).

## 1. Install

You need Node.js 22 or later (24 recommended). In a new directory:

```sh
npm init -y
npm install seneca seneca-web express @seneca/web-adapter-express
```

The adapter works with Seneca 3 and Seneca 4, and with Express 4 and 5.
Versions of the adapter up to 1.2.1 were published as
`seneca-web-adapter-express`.

## 2. The service

Create `notes.js` and start with a plugin that keeps notes in memory:

```js
const Seneca = require('seneca')
const SenecaWeb = require('seneca-web')
const Express = require('express')
const Adapter = require('@seneca/web-adapter-express')

const PORT = Number(process.env.PORT || 3000)

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
```

The actions are ordinary Seneca actions. What makes them web actions is
the shape of the message they receive: the HTTP data arrives in
`msg.args` (`body`, `params`, `query`, `user` and the matched `route`),
and the Express request and response objects arrive as `msg.request$`
and `msg.response$`. The `load` action reads the `:id` path parameter
from `msg.args.params`, and `create` reads the parsed JSON body from
`msg.args.body`. Both use `msg.response$.status()` to choose the status
code of the reply.

## 3. The routes

Add the Express application, the plugin and the route map:

```js
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
```

Three things are configured here:

* `adapter` and `context`: seneca-web hands the mapped routes to this
  adapter, which registers them on the `context`, the Express app.
* `options.parseBody: false`: the adapter leaves the body to Express.
  Without this, the adapter reads the raw body itself and, because
  `express.json()` has already consumed it, the request would never
  complete. See [Parse request bodies](../how-to/parse-request-bodies.md).
* `routes`: seneca-web turns the map into routes. The `pin` says which
  actions are exposed; each key of `map` replaces the `*`. The path is
  built from `prefix`, the key (or `name`, here empty) and `suffix`, so
  the three routes are `GET /notes`, `GET /notes/:id` and `POST /notes`.
  The full set of route properties is described in the
  [seneca-web documentation](https://github.com/senecajs/seneca-web).

## 4. Start the server

Routes are registered while Seneca initializes the seneca-web plugin, so
start listening once Seneca is ready. `seneca.export('web/context')()`
returns the context, which is the Express app:

```js
seneca.ready(function (err) {
  if (err) {
    console.error('startup failed:', err.message)
    return seneca.close(() => process.exit(1))
  }

  const server = seneca.export('web/context')().listen(PORT, () => {
    console.log('listening on http://127.0.0.1:' + PORT)
  })

  // For example the port is in use: release Seneca before exiting.
  server.on('error', (err) => {
    console.error('listen failed:', err.message)
    seneca.close(() => process.exit(1))
  })
})
```

Both failure paths close the Seneca instance before the process exits.
Run `node notes.js`. It prints `listening on http://127.0.0.1:3000` and
waits for requests.

## 5. Make requests with fetch

In a second terminal, use Node's built in `fetch`:

```sh
node -e "fetch('http://127.0.0.1:3000/notes', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ text: 'buy milk' }),
}).then((res) => res.json()).then(console.log)"
# { id: '1', text: 'buy milk' }

node -e "fetch('http://127.0.0.1:3000/notes/1').then((res) => res.json()).then(console.log)"
# { id: '1', text: 'buy milk' }
```

The example program in this repository does the same from inside the
process: after `listen` it calls a `demo` function that sends six
requests, prints each result, and then closes the server and the Seneca
instance. Running it gives:

```
$ node docs/examples/getting-started.js
listening on http://127.0.0.1:3000
GET /notes -> 200 []
POST /notes -> 201 {"id":"1","text":"buy milk"}
POST /notes -> 201 {"id":"2","text":"call Ann"}
GET /notes -> 200 [{"id":"1","text":"buy milk"},{"id":"2","text":"call Ann"}]
GET /notes/2 -> 200 {"id":"2","text":"call Ann"}
GET /notes/9 -> 404 {"error":"note not found"}
closed
```

## 6. What happened

1. `seneca.use(SenecaWeb, ...)` loaded the seneca-web plugin. Its
   initialization action (`init:web`) built the route list from the map
   and called the adapter with the options, the context (the app), the
   `auth` provider (none here) and the routes.
2. For each route and method, the adapter called the matching Express
   method: `app.get('/notes', handler)`, `app.get('/notes/:id', handler)`
   and `app.post('/notes', handler)`.
3. When a request arrived, the handler built the message
   `{ args: { body, route, params, query, user }, request$, response$ }`
   and sent it with `seneca.act(route.pattern, message)`, where the
   pattern is the pin with `*` replaced by the route key, for example
   `role:note,cmd:create`.
4. The action replied. Because the route has the default `autoreply`,
   the adapter called `res.send(result)`: objects and arrays are sent as
   JSON. The status code was whatever the action had set through
   `msg.response$.status()`, or 200.

If an action replies with an `Error` instead, the adapter passes it to
Express with `next(err)`, so your Express error handlers decide the
response. [Handle errors and status codes](../how-to/handle-errors-and-status-codes.md)
shows how, including the differences between Seneca 3 and Seneca 4.

## Next steps

* [Parse request bodies](../how-to/parse-request-bodies.md) with and
  without a body parser.
* [Add middleware](../how-to/add-middleware.md) to route sets and routes.
* [Secure routes with passport](../how-to/secure-routes-with-passport.md).
* [Message payload](../reference/message-payload.md) and
  [Response handling](../reference/response-handling.md) in the reference.
* [How seneca-web adapters work](../explanation/how-adapters-work.md).
