# Migrate from Seneca 3

How to move an application that uses seneca-web with this adapter from
Seneca 3 to Seneca 4. Seneca's own guide,
[Migrate from Seneca 3](https://github.com/senecajs/seneca/blob/master/docs/how-to/migrate-from-seneca-3.md),
covers the core changes; this page covers what matters for web routes.
The differences are explained in [Seneca 3 versus 4](../explanation/seneca-3-vs-4.md).

## 1. Update the packages

```sh
npm uninstall seneca-web seneca-web-adapter-express
npm install seneca@^4 @seneca/web @seneca/web-adapter-express
```

Node.js 24 or later is required by Seneca 4. Adapter 2.0.0 declares the
peer dependencies `seneca: "^4.0.0"` and `@seneca/web: "^3.0.0"`. Both
packages have new names: versions of the adapter up to 1.2.1 were
published as `seneca-web-adapter-express`, and versions of the plugin up
to 2.2.2 as `seneca-web`. Require the new names:

```js
const SenecaWeb = require('@seneca/web')
const Adapter = require('@seneca/web-adapter-express')
```

## 2. Update Express error handlers

Seneca 4 passes the action's error through unchanged; Seneca 3 wrapped
it. Replace reads of the wrapper:

| Seneca 3 code | Seneca 4 code |
| --- | --- |
| `err.orig.message` | `err.message` |
| `err.details.message` | `err.message` |
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

## 4. Use the built in promises

Seneca 4 has promises built in: `await seneca.ready()`,
`await seneca.close()`, `seneca.post` and `seneca.message`. Remove
`seneca-promisify` and its `use` call. Start listening once Seneca is
ready, as before.

## 5. Load a transport if you use one

Seneca 4 has no network transport in core. If some routes are served by
actions on another process (`seneca.client(...)`), install
`@seneca/transport` and load it with `seneca.use('@seneca/transport')`
before `listen` or `client`. `request$` and `response$` never travel
over a transport; actions on the other side see `msg.args` only.

## 6. Remove legacy options

Seneca 4 accepts `legacy: true|false` or
`legacy: { error, meta, builtin_actions }`. The Seneca 3 flags that it
removed, such as `legacy.transport` or `legacy.error_codes`, are ignored
with a `SENECA_DEP_LEGACY_FLAG` warning and will be rejected by Seneca 5;
any other flag is rejected at startup. `legacy.error` has no effect:
errors always use the Seneca 4 format.

## 7. Nothing to change in the route map

Route configuration (`pin`, `map`, `prefix`, `alias`, `middleware`,
`auth`, `secure`, `redirect`, `autoreply`) and the adapter options are the
same on both versions, and the message payload is the same.
