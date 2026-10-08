## 1.3.0 2026-10-08

* Seneca 4 prerelease support. The tests pass against `seneca@4.0.0-rc5`
  (the development dependency), the unreleased 4.0.0 and Seneca 3.38,
  with seneca-web 2.2.2 and with the seneca-web development version that
  calls adapters with a root delegate. New peer dependency
  `seneca: ">=3 || >=4.0.0-rc5"`; Seneca 3 remains supported.
* Fix: messages for web requests are sent from the root Seneca
  instance. They were sent from the delegate seneca-web calls the
  adapter on, whose fixed arguments reached every route action:
  `fatal$: true` for routes given in the plugin options or mapped through
  the `web/mapRoutes` export (seneca-web 2.2.2 and earlier), so that an
  error replied by a route action closed Seneca and ended the process
  although the Express error handler had answered; the transaction id of
  the mapping action, shared by all requests; and seneca-web's `plugin$`,
  which replaced the action's own, so that `this.error(code)` in route
  actions lost the plugin's error templates.
* Node.js 24 and 22.
* Tests: mocha 11 (`.mocharc.json` replaces `test/mocha.opts`), eslint 10
  with a flat `eslint.config.js`, requests made with `fetch` instead of
  `request`, sinon 19, passport 0.7, express-session 1.19. The tests for
  custom errors and invalid middleware read the error message in a way
  that works on Seneca 3 and 4. New tests for route messages: not fatal,
  one transaction per request, plugin context kept. Also verified with
  Express 5.2.
* Documentation reorganized (Diátaxis) under `docs/`, with runnable
  examples in `docs/examples/`; the duplicate `README.MD` was removed.
  `docs` and `CHANGES.md` are included in the published package.
* Removed Travis CI, coveralls, docco and pre-commit, and the unused
  `body-parser`, `cookie-parser`, `password` and `request` development
  dependencies. The GitHub Actions workflow is provided as
  `.patches/0001-ci-add-the-build-workflow.patch`.
* The package is published as `@seneca/web-adapter-express` from this
  version; versions up to 1.2.1 were published as
  `seneca-web-adapter-express`.

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
