const { runMain, show } = require('bench')

const express = require('express')
const Seneca = require('seneca')
const SenecaWeb = require('seneca-web')
const adapter = require('..')
const Request = require('request')

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
      includeResponse: reqres
    },
    routes: [
      {
        pin: 'cmd:*',
        map: {
          test: { get: true }
        }
      }
    ]
  })

  instance.add('cmd:test', (_, done) =>
    setTimeout(() => done({ ok: true }), 40)
  )

  await new Promise((resolve, reject) =>
    instance.ready(err => (err ? reject(err) : resolve()))
  )

  const app = instance.export('web/context')()

  await new Promise((resolve, reject) =>
    servers.push(app.listen(port, err => (err ? reject(err) : resolve())))
  )

  instances.push(instance)
}

;(async () => {
  await setup(true, true, PRINT_PORT_WITHREQ)
  await setup(true, false, PRINT_PORT_WITHOUTREQ)
  await setup(false, true, NON_PRINT_PORT_WITHREQ)
  await setup(false, false, NON_PRINT_PORT_WITHOUTREQ)
  runMain()
})().catch(err => {
  console.error(err)
  process.exit(1)
})

exports.compare = {
  'with test("print") with req/res': done => {
    Request(
      `http://localhost:${PRINT_PORT_WITHREQ}/test`,
      { method: 'GET' },
      () => done()
    )
  },
  'with test("print"), without req/res': done => {
    Request(
      `http://localhost:${PRINT_PORT_WITHOUTREQ}/test`,
      { method: 'GET' },
      () => done()
    )
  },
  'without test("print"), with req/res': done => {
    Request(
      `http://localhost:${NON_PRINT_PORT_WITHREQ}/test`,
      { method: 'GET' },
      () => done()
    )
  },
  'without test("print"), without req/res': done => {
    Request(
      `http://localhost:${NON_PRINT_PORT_WITHOUTREQ}/test`,
      { method: 'GET' },
      () => done()
    )
  }
}

exports.done = async data => {
  await Promise.all(
    servers.map(server => new Promise(resolve => server.close(resolve)))
  )
  await Promise.all(
    instances.map(instance => new Promise(resolve => instance.close(resolve)))
  )
  show(data)
}
