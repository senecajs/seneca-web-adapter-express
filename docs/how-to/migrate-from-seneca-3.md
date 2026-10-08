# Migrate from Seneca 3

How to move an application that uses seneca-web with this adapter from
Seneca 3 to Seneca 4. Seneca's own guide,
[Migrate from Seneca 3](https://github.com/senecajs/seneca/blob/master/docs/how-to/migrate-from-seneca-3.md),
covers the core changes; this page covers what matters for web routes.
The differences are explained in [Seneca 3 versus 4](../explanation/seneca-3-vs-4.md).

## 1. Update the packages

```sh
npm install seneca@^4.0.0-rc5 seneca-web@^2.2.2 @seneca/web-adapter-express@^1.3.0
```

Node.js 22 or later is required by Seneca 4. Adapter 1.3.0 declares the
peer dependency `seneca: ">=3 || >=4.0.0-rc5"`, so the same version runs
on both; `seneca-web` 2.2.2 is unchanged. Versions of the adapter up to
1.2.1 were published as `seneca-web-adapter-express`.

## 2. Update Express error handlers

Seneca 4 passes the action's error through unchanged; Seneca 3 wrapped
it. Replace reads of the wrapper with the portable form:

| Seneca 3 code | Portable code |
| --- | --- |
| `err.orig.message` | `(err.orig \|\| err).message` |
| `err.details.message` | `(err.orig \|\| err).message` |
| `'act_execute' === err.code` | not needed; test `err.status`, `err.code` or `err.message` directly |

Properties you set on the error in the action (`status`, `code`) are on
`err` itself in both versions. See
[Handle errors and status codes](handle-errors-and-status-codes.md).

## 3. Update tests

Tests that assert on the wrapped message
(`seneca: Action role:shop,cmd:price failed: ...`) must assert on the
action's own message. Tests that read `err.details.message` from the
`role:web` act callback (for example for an unknown middleware name)
must read `err.message`.

## 4. Check `ready`

Seneca 4 has promises built in, but `await seneca.ready()` does not
resolve on an idle instance in 4.0.0-rc5 (fixed in 4.0.0). In code that
may run on the prerelease use the callback form:

```js
await new Promise((resolve, reject) =>
  seneca.ready((err) => (err ? reject(err) : resolve()))
)
```

Start listening inside `ready`, as before.

## 5. Load a transport if you use one

Seneca 4 has no network transport in core. If some routes are served by
actions on another process (`seneca.client(...)`), install
`seneca-transport` and load it with `seneca.use('seneca-transport')`
before `listen` or `client`. `request$` and `response$` never travel
over a transport; actions on the other side see `msg.args` only.

## 6. Remove rejected legacy options

Seneca 4 accepts only `legacy: true|false` or
`legacy: { error, meta, builtin_actions }`. Options such as
`legacy.transport` or `legacy.error_codes` are rejected at startup.
`legacy.error` has no effect: errors always use the Seneca 4 format.

## 7. Nothing to change in the route map

Route configuration (`pin`, `map`, `prefix`, `alias`, `middleware`,
`auth`, `secure`, `redirect`, `autoreply`) and the adapter options are the
same on both versions, and the message payload is the same.
