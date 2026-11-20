# Seneca 3 versus 4

Version 2 of this adapter runs on Seneca 4 only, with `@seneca/web` 3.
Seneca 3 users stay on `seneca-web-adapter-express@1` and
`seneca-web@2`. This page explains what changes for applications using
the adapter when they move from Seneca 3, and what stays the same. The
adapter's tests run on Seneca 4.0.0. For the step by step procedure see
[Migrate from Seneca 3](../how-to/migrate-from-seneca-3.md).

## Unchanged

The route map, the adapter options, the message payload
(`args.body/route/params/query/user`, `request$`, `response$`), redirect
and autoreply handling, middleware, `auth` and `secure` routes, and the
`role:web` actions and exports of the plugin all behave the same. The
plugin definition style the plugin uses (`function web(options)`) is
supported by both versions.

## Errors reaching Express

Seneca 3 (`legacy.error: true` by default) wraps an action error in an
`act_execute` error: `err.message` starts with `seneca: Action ...
failed:`, the original is `err.orig`, and `err.details.message` repeats
its message. Own properties of the original, such as `status`, are
copied onto the wrapper. Seneca 4 passes the original error to the act
callback, and therefore to Express, unchanged; `legacy.error` has no
effect. Errors created with `this.error` are Seneca errors and are not
wrapped on either version. Handlers written for Seneca 3 that read
`err.orig` read `err` on Seneca 4.

## Fatal messages

Both versions mark plugin loading as fatal through the plugin delegate's
fixed arguments, and both copy fixed arguments into messages, so the
adapter's choice of [sending instance](../reference/adapter-contract.md#the-sending-instance)
(2.0.0) matters on both. With the adapter up to 1.2.1 and routes given
in the plugin options, the first action error ended the process.

## Promises and `ready`

Seneca 4 has `seneca.post`, `seneca.message`, `await seneca.ready()` and
`await seneca.close()` built in; Seneca 3 needed seneca-promisify. The
adapter itself uses callbacks (`seneca.act`).

## Transports

Seneca 3 bundles seneca-transport; Seneca 4 does not, and `listen` or
`client` without a transport plugin does nothing. Load
`@seneca/transport` explicitly when web routes are served by actions in
other processes. In both versions `request$` and `response$` stay in the
process that received the request.

## Options

Seneca 4 validates options strictly. It rejects unknown options,
including an unknown `legacy` flag and a top level plugin option such as
`web`. The Seneca 3 legacy flags that Seneca 4 removed, such as
`legacy.transport`, are ignored with a deprecation warning. Plugin
options come only from `use()` and `options.plugin.<name>`. This does
not affect the adapter, whose options travel inside the plugin options
of `@seneca/web`.

## Logging

Both versions log action errors with the full message. With
`includeRequest` and `includeResponse` on, the entries include the
serialized Express objects; Seneca 4 at `log: 'warn'` prints them.
