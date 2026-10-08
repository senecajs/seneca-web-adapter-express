const { runMain, show } = require('bench')

const express = require('express')
const Seneca = require('seneca')
const SenecaWeb = require('seneca-web')
const adapter = require('..')

const PRINT_PORT_WITHREQ = 44313
const PRINT_PORT_WITHOUTREQ = 44314
const NON_PRINT_PORT_WITHREQ = 44315
const NON_PRINT_PORT_WITHOUTREQ = 44316

const servers = []
const instances = []

const setup = async (print, reqres, port) => {
  const instance = Seneca()
  if (print) instance.test('print')

  instance.use(SenecaWeb, {
    context: express(),
    adapter,
    options: {
      includeRequest: reqres,
      includeResponse: reqres,
    },
    routes: [
      {
        pin: 'cmd:*',
        map: {
          test: { get: true },
        },
      },
    ],
  })

  instance.add('cmd:test', (_, done) =>
    setTimeout(() => done({ ok: true }), 40)
  )

  await new Promise((resolve, reject) =>
    instance.ready((err) => (err ? reject(err) : resolve()))
  )

  const app = instance.export('web/context')()

  await new Promise((resolve, reject) =>
    servers.push(app.listen(port, (err) => (err ? reject(err) : resolve())))
  )

  instances.push(instance)
}

;(async () => {
  await setup(true, true, PRINT_PORT_WITHREQ)
  await setup(true, false, PRINT_PORT_WITHOUTREQ)
  await setup(false, true, NON_PRINT_PORT_WITHREQ)
  await setup(false, false, NON_PRINT_PORT_WITHOUTREQ)
  runMain()
})().catch((err) => {
  console.error(err)
  process.exit(1)
})

const get = (port, done) =>
  fetch(`http://127.0.0.1:${port}/test`)
    .then((res) => res.text())
    .then(
      () => done(),
      () => done()
    )

exports.compare = {
  'with test("print") with req/res': (done) => get(PRINT_PORT_WITHREQ, done),
  'with test("print"), without req/res': (done) =>
    get(PRINT_PORT_WITHOUTREQ, done),
  'without test("print"), with req/res': (done) =>
    get(NON_PRINT_PORT_WITHREQ, done),
  'without test("print"), without req/res': (done) =>
    get(NON_PRINT_PORT_WITHOUTREQ, done),
}

exports.done = async (data) => {
  await Promise.all(
    servers.map((server) => new Promise((resolve) => server.close(resolve)))
  )
  await Promise.all(
    instances.map((instance) => new Promise((resolve) => instance.close(resolve)))
  )
  show(data)
}
