'use strict'

const _ = require('lodash')
const ReadBody = require('./read-body')

// This adapter handles routes for express and can authorise using
// passport.js. See ./docs/examples/secure-express.js for more info.
module.exports = function express (options, context, auth, routes, done) {
  const seneca = this

  if (!context) {
    return done(new Error('no context provided'))
  }

  // middleware is an object with keys defining middleware
  const middleware = options.middleware

  // Routes have methods as an array, we need
  // to loop once per route, per method to get
  // all of the routes correctly.
  _.each(routes, (route) => {
    // pull out middleware from the route; map strings to options' middleware.
    // if we don't get a function, blow up hard - this is a user-code problem.
    const routeMiddleware = (route.middleware || []).map(_middleware => {
      const ret = _.isString(_middleware) ? middleware[_middleware] : _middleware
      if (!_.isFunction(ret)) {
        throw new Error(`expected valid middleware, got ${_middleware}`)
      }
      return ret
    })

    _.each(route.methods, (method) => {
      // lowercase the method so we can use it
      // ala server[method] aka server.get()
      method = _.toLower(method)

      // There are 3 individual handlers depending
      // on if the route is for authorization, is
      // secure, or neither. Each is explained below.
      if (!route.auth && !route.secure) {
        unsecuredRoute(seneca, options, context, method, routeMiddleware, route)
      }
      else if (route.secure) {
        securedRoute(seneca, options, context, method, routeMiddleware, route)
      }
      else if (route.auth) {
        authRoute(seneca, options, context, method, route, routeMiddleware, auth)
      }
    })
  })

  return done(null, {routes: routes})
}

// All routes ultimately get handled by this handler
// if they have not already be redirected or responded.
function handleRoute (seneca, options, request, reply, route, next) {
  if (options.parseBody) { return ReadBody(request, finish) }
  finish(null, request.body || {})

  // Express requires a body parser to work in production
  // This util creates a body obj without neededing a parser
  // but doesn't impact loading one in.
  function finish (err, body) {
    if (err) {
      return next(err)
    }

    // This is what the seneca handler will get
    // Note! request$ and response$ will be stripped
    // if the message is sent over transport.
    const payload = {
      request$: request,
      response$: reply,
      args: {
        body: body,
        route: route,
        params: request.params,
        query: request.query,
        user: request.user || null
      }
    }

    // Call the seneca action specified in the config
    seneca.act(route.pattern, payload, (err, response) => {
      if (err) {
        return next(err)
      }

      // Redirect or reply depending on config.
      if (route.redirect) {
        return reply.redirect(route.redirect)
      }
      if (route.autoreply) {
        return reply.send(response)
      }
    })
  }
}

// Unsecured routes just call the handler directly, no magic.
function unsecuredRoute (seneca, options, context, method, middleware, route) {
  const routeArgs = [route.path]
    .concat(middleware)
    .concat([(request, reply, next) => {
      handleRoute(seneca, options, request, reply, route, next)
    }])

  context[method].apply(context, routeArgs)
}

// Auth routes call passport.authenticate and can and do redirect
// depending on pass or failure. Generally this means you don't
// need a seneca handler set as the redirects happend instead.
function authRoute (seneca, options, context, method, route, middleware, auth) {
  const opts = {
    failureRedirect: route.auth.fail,
    successRedirect: route.auth.pass
  }

  const routeArgs = [route.path]
    .concat([auth.authenticate(route.auth.strategy, opts)])
    .concat(middleware)
    .concat([(request, reply, next) => {
      handleRoute(seneca, options, request, reply, route, next)
    }])

  context[method].apply(context, routeArgs)
}

// Secured routes check if a valid req.user exists as per express
// general practices. Req.logout() clears this. The handler will
// redirect to a fail redirect in the case of unauthenticated calls.
function securedRoute (seneca, options, context, method, middleware, route) {
  const routeArgs = [route.path]
    .concat(middleware)
    .concat([(request, reply, next) => {
      if (!request.user) {
        return reply.redirect(route.secure.fail)
      }
      handleRoute(seneca, options, request, reply, route, next)
    }])

  context[method].apply(context, routeArgs)
}
