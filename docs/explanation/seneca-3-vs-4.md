# Seneca 3 versus 4

What changes for applications using this adapter when moving between
Seneca versions, and what stays the same. The adapter's tests pass on
Seneca 3.38, 4.0.0-rc5 and 4.0.0 without conditional code. For the
step by step procedure see [Migrate from Seneca 3](../how-to/migrate-from-seneca-3.md).

## Unchanged

The route map, the adapter options, the message payload
(`args.body/route/params/query/user`, `request$`, `response$`), redirect
and autoreply handling, middleware, `auth` and `secure` routes, and the
`role:web` actions and exports of seneca-web all behave the same. The
plugin definition style seneca-web uses (`function web(options)`) is
supported by both versions.

## Errors reaching Express

Seneca 3 (`legacy.error: true` by default) wraps an action error in an
`act_execute` error: `err.message` starts with `seneca: Action ...
failed:`, the original is `err.orig`, and `err.details.message` repeats
its message. Own properties of the original, such as `status`, are
copied onto the wrapper. Seneca 4 passes the original error to the act
callback, and therefore to Express, unchanged; `legacy.error` has no
effect. Errors created with `this.error` are Seneca errors and are not
wrapped on either version. Portable handlers read `(err.orig || err)`.

## Fatal messages

Both versions mark plugin loading as fatal through the plugin delegate's
fixed arguments, and both copy fixed arguments into messages, so the
adapter's choice of [sending instance](../reference/adapter-contract.md#the-sending-instance)
(1.3.0) matters on both. With the adapter up to 1.2.1 and routes given
in the plugin options, the first action error ended the process through
`process.exit(1)` on Seneca 3.38 and 4.0.0. On 4.0.0-rc5 the default
exit function only prints `EXIT`; the instance was closed, and the next
request crashed the process.

## Promises and `ready`

Seneca 4 has `seneca.post`, `seneca.message`, `await seneca.ready()` and
`await seneca.close()` built in; Seneca 3 needs seneca-promisify. The
adapter uses callbacks (`seneca.act`) and works with both. In 4.0.0-rc5
`await seneca.ready()` does not resolve on an idle instance; use the
callback form there.

## Transports

Seneca 3 bundles seneca-transport; Seneca 4 does not, and `listen` or
`client` without a transport plugin does nothing. Load
`seneca-transport` explicitly when web routes are served by actions in
other processes. In both versions `request$` and `response$` stay in the
process that received the request.

## Options

Seneca 4 validates options strictly. Legacy flags other than
`legacy.error`, `legacy.meta` and `legacy.builtin_actions` are rejected,
and plugin options come only from `use()` and `options.plugin.<name>`.
This does not affect the adapter, whose options travel inside the
seneca-web plugin options.

## Logging

Both versions log action errors with the full message. With
`includeRequest` and `includeResponse` on, the entries include the
serialized Express objects; Seneca 4 at `log: 'warn'` prints them.
