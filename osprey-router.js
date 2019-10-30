const Engine = require('router/engine')
const methods = require('methods')
const flatten = require('array-flatten')
const ramlPath = require('raml-path-match')
const extend = require('xtend')
const slice = Array.prototype.slice

/**
 * Expose `router`.
 */
module.exports = router

/**
 * Initialize router instance.
 *
 * @param  {Object}   options
 * @return {Function}
 */
function router (options) {
  return new Router(options)
}

/**
 * Construct a router instance.
 */
function Router (options) {
  const router = Engine.call(this, options)

  // Construct with default URI parameters.
  router.ramlUriParameters = options
    ? extractParams(options.ramlUriParameters)
    : {}
  router.RAMLVersion = options ? options.RAMLVersion : undefined

  return router
}

/**
 * Inherits from the router engine.
 */
Router.prototype = Object.create(Engine.prototype)

/**
 * Create a `raml-path-match` compatible `.use`.
 */
Router.prototype.use = function use () {
  let offset = 0
  let path = '/'
  let schema

  if (!isMiddleware(arguments[0])) {
    path = arguments[0]
    offset = 1

    if (!isMiddleware(arguments[1])) {
      schema = extractParams(arguments[1])
      offset = 2
    }
  }

  const callbacks = flatten(slice.call(arguments, offset))
  const params = extend(this.ramlUriParameters, schema)

  const match = ramlPath(path, params, {
    sensitive: this.caseSensitive,
    strict: this.strict,
    end: false,
    RAMLVersion: this.RAMLVersion
  })

  this.ramlUriParameters = params

  return Engine.prototype.use.call(this, path, match, callbacks)
}

/**
 * Create a `raml-path-match` compatible route.
 */
Router.prototype.route = function route (path, schema) {
  const params = extend(this.ramlUriParameters, extractParams(schema))

  const match = ramlPath(path, params, {
    sensitive: this.caseSensitive,
    strict: this.strict,
    end: true,
    RAMLVersion: this.RAMLVersion
  })

  this.ramlUriParameters = params

  return Engine.prototype.route.call(this, path, match)
}

// create Router#VERB functions
methods.concat('all').forEach(function (methodName) {
  Router.prototype[methodName] = function (path, schema) {
    schema = extractParams(schema)
    const hasSchema = !isMiddleware(schema)
    const route = this.route(path, hasSchema ? schema : null)

    route[methodName].apply(route, slice.call(arguments, hasSchema ? 2 : 1))

    return this
  }
})

/**
 * Check if a value is possible middleware.
 *
 * @param  {*}       value
 * @return {Boolean}
 */
function isMiddleware (value) {
  return typeof value === 'function' || Array.isArray(value)
}

/**
 * Extracts uri parameters data from AMF model.
 *
 * @param  {Array<webapi-parser.Parameter>} params
 * @return {Object} Uri params data compatible with 'raml-path-match'
 */
function extractParams (params) {
  if (!params || !Array.isArray(params) || params.length < 1) {
    return params
  }
  const data = {}
  params.forEach(param => {
    const name = param.name.value()
    data[name] = {
      name: name,
      displayName: name,
      required: !!param.required.value(),
      type: [param.schema.dataType.value().split('#').pop()]
    }
  })
  return data
}
