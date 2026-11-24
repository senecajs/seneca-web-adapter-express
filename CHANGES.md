# Changes

## 2.0.0 2026-11-20

First release under the name `@seneca/web-adapter-express`. Versions up
to 1.2.1 were published as `seneca-web-adapter-express`. Version 1.3.0
was prepared but never published; its changes are part of this
release.

* Seneca 4: the peer dependency is `seneca` `^4.0.0`. Seneca 3 users
  stay on `seneca-web-adapter-express@1`.
* Renamed from `seneca-web-adapter-express` to
  `@seneca/web-adapter-express`.
* The peer dependency on the plugin is `@seneca/web` `^3.0.0`, the new
  name of `seneca-web` (it replaces `seneca-web` `^1.0.0 || ^2.0.0`).
* Node.js 24 or later (`engines.node` `>=24`).
* Behaviour change: messages for web requests are sent from the root
  Seneca instance. They were sent from the delegate seneca-web calls the
  adapter on, whose fixed arguments reached every route action:
  `fatal$: true` for routes given in the plugin options or mapped
  through the `web/mapRoutes` export (seneca-web 2.2.2 and earlier), so
  that an error replied by a route action closed Seneca and ended the
  process although the Express error handler had answered; the
  transaction id of the mapping action, shared by all requests; and
  seneca-web's `plugin$`, which replaced the action's own, so that
  `this.error(code)` in route actions lost the plugin's error templates.
* Tests: mocha 11 (`.mocharc.json` replaces `test/mocha.opts`), eslint 10
  with a flat `eslint.config.js`, requests made with `fetch` instead of
  `request`, sinon 19, passport 0.7, express-session 1.19, and Express 5
  (the tests also passed unchanged on Express 4.22). The tests read the
  action's error directly (`err.message`), without the Seneca 3
  `err.orig` fallback. New tests for route messages: not fatal, one
  transaction per request, plugin context kept. Tested with Seneca
  4.0.0 and `@seneca/web` 3.0.0 on Node.js 26.
* Documentation reorganized (Diátaxis) under `docs/`, with runnable
  examples in `docs/examples/`; the duplicate `README.MD` was removed.
  `docs` and `CHANGES.md` are included in the published package. The
  documents describe Seneca 4 only and use the new package names.
* Removed Travis CI, coveralls, docco and pre-commit, and the unused
  `body-parser`, `cookie-parser`, `password` and `request` development
  dependencies. The GitHub Actions workflow is provided as
  `.patches/0001-ci-add-the-build-workflow.patch`.
* `package.json`: `repository.url` in the `git+https` form,
  `publishConfig.access` `public`; `package-lock.json` is no longer
  committed.

## 1.2.0 2019-09-13

* Add two new options -- `includeRequest` and `includeResponse`
  These control whether you include `request$` and `response$` with payload
  Disable for less overhead (this will be the default in next major version)

## 1.1.2 2018-09-09

* Update dependencies / dev tooling.
* Travis builds updated: drop node 4, add node 10.

## 1.1.1 2018-01-05

* Update dependencies

## 1.1.0 2017-12-03

* Adds support for middleware (#13)

## 1.0.2 2016-10-02

* Allow host application to handle errors (#2)
* Update peerDependency to work with seneca-web@2.x (thanks @gknedo)

## 1.0.0 2016-09-27

* Created module, copied from `seneca-web`
