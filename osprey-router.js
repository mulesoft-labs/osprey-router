const ramlPathMatch = require('raml-path-match')
const Engine = require('router/engine')
const methods = require('methods')
const flatten = require('array-flatten').flatten
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
 * Constructs a router instance.
 *
 * @param {Object} options Following options are supported:
 *    ramlUriParameters. Array.<webapi-parser.Parameter>
 * @return {Engine}
 */
function Router (options) {
  const router = Engine.call(this, options)

  // Construct with default URI parameters.
  router.ramlUriParameters = options
    ? options.ramlUriParameters
    : []

  return router
}

/**
 * Inherits from the router engine.
 */
Router.prototype = Object.create(Engine.prototype)

/**
 * Creates a `raml-path-match` compatible `.use`.
 *
 * When uri parameters schema is passed as a second parameter,
 * it must be an array of `webapi-parser.Parameter`.
 */
Router.prototype.use = function use () {
  let offset = 0
  let path = '/'
  let uriParams

  if (!isMiddleware(arguments[0])) {
    path = arguments[0]
    offset = 1

    if (!isMiddleware(arguments[1])) {
      uriParams = arguments[1]
      offset = 2
    }
  }

  const callbacks = flatten(slice.call(arguments, offset))

  uriParams = extendParams(this.ramlUriParameters, uriParams)

  const match = ramlPathMatch(path, uriParams, {
    sensitive: this.caseSensitive,
    strict: this.strict,
    end: false
  })

  this.ramlUriParameters = uriParams

  return Engine.prototype.use.call(this, path, match, callbacks)
}

/**
 * Creates a `raml-path-match` compatible route.
 *
 * @param  {String}                          path
 * @param  {Array.<webapi-parser.Parameter>} uriParams
 */
Router.prototype.route = function route (path, uriParams) {
  uriParams = extendParams(this.ramlUriParameters, uriParams)

  const match = ramlPathMatch(path, uriParams, {
    sensitive: this.caseSensitive,
    strict: this.strict,
    end: true
  })

  this.ramlUriParameters = uriParams

  return Engine.prototype.route.call(this, path, match)
}

//
/**
 * Create Router#VERB functions.
 *
 * Callbacks' params are as follows:
 * @param  {String}                         path
 * @param  {Array.<webapi-parser.Parameter>} uriParams
 */
methods.concat('all').forEach(function (methodName) {
  Router.prototype[methodName] = function (path, uriParams) {
    const hasUriParams = !isMiddleware(uriParams)
    const route = this.route(path, hasUriParams ? uriParams : null)

    route[methodName].apply(route, slice.call(arguments, hasUriParams ? 2 : 1))

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
  const isFunction = typeof value === 'function'
  const firstElementIsFunction = (
    Array.isArray(value) && typeof value[0] === 'function')
  return isFunction || firstElementIsFunction
}

/**
 * Extends target list of Parameters with a source one.
 * Parameters from source override parameters from target with
 * the same IDs.
 *
 * @param  {Array.<webapi-parser.Parameter>} target
 * @param  {Array.<webapi-parser.Parameter>} source
 * @return {Boolean}
 */
function extendParams (target, source) {
  target = target || []
  source = source || []
  const params = [...source]
  const sourceIds = source.map(p => p.id)
  target.forEach(param => {
    if (!sourceIds.includes(param.id)) {
      params.push(param)
    }
  })
  return params
}
