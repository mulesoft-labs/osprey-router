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
 * Constructs a router instance.
 *
 * @param {Object} options Following options are supported:
 *    ramlUriParameters. Array<webapi-parser.Parameter>
 *    RAMLVersion: String.
 * @return {Engine}
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
 * Creates a `raml-path-match` compatible `.use`.
 *
 * When uri parameters schema is passed as a second parameter,
 * it must be an array of `webapi-parser.Parameter`.
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
 * Creates a `raml-path-match` compatible route.
 *
 * @param  {String} path
 * @param  {Object | Array<webapi-parser.Parameter>} schema
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

//
/**
 * Create Router#VERB functions.
 *
 * Callbacks' params are as follows:
 * @param  {String} path
 * @param  {Object | Array<webapi-parser.Parameter>} schema
 */
methods.concat('all').forEach(function (methodName) {
  Router.prototype[methodName] = function (path, schema) {
    const hasSchema = !isMiddleware(schema)
    if (hasSchema) {
      schema = extractParams(schema)
    }
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
  const isFunction = typeof value === 'function'
  const firstElementIsFunction = (
    Array.isArray(value) && typeof value[0] === 'function')
  return isFunction || firstElementIsFunction
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
    const sch = param.schema
    const type = sch.dataType.value().split('#').pop()
    const paramData = {
      name: name,
      displayName: name,
      required: !!param.required.value(),
      type: [type]
    }
    if (sch.values && sch.values.length > 0) {
      paramData.enum = sch.values.map(val => val.value.value())
    }
    const extraData = {
      format: sch.format.option,
      default: sch.defaultValueStr.option,
      minimum: sch.minimum.option,
      maximum: sch.maximum.option,
      multipleOf: sch.multipleOf.option,
      minLength: sch.minLength.option,
      maxLength: sch.maxLength.option,
      pattern: sch.pattern.option
    }
    Object.entries(extraData).forEach(([key, val]) => {
      if (val !== null && val !== undefined) {
        paramData[key] = val
      }
    })
    data[name] = paramData
  })
  return data
}
