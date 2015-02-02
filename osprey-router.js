var Engine = require('router/engine');
var methods = require('methods');
var flatten = require('array-flatten');
var ramlPath = require('raml-path-match');
var slice = Array.prototype.slice;

/**
 * Expose `router`.
 */
module.exports = router;

/**
 * Initialize router instance.
 *
 * @param  {Object}   options
 * @return {Function}
 */
function router (options) {
  return new Router(options);
}

/**
 * Construct a router instance.
 */
function Router (options) {
  return Engine.call(this, options);
}

/**
 * Inherits from the router engine.
 */
Router.prototype = Object.create(Engine.prototype);

/**
 * Create a `raml-path-match` compatible `.use`.
 */
Router.prototype.use = function use () {
  var offset = 0;
  var path = '/';
  var schema = {};

  if (typeof arguments[0] !== 'function') {
    path = arguments[0];
    offset = 1;

    if (typeof arguments[1] !== 'function') {
      schema = arguments[1];
      offset = 2;
    }
  }

  var callbacks = flatten(slice.call(arguments, offset));

  var match = ramlPath(path, schema, {
    sensitive: this.caseSensitive,
    strict: this.strict,
    end: false
  });

  return Engine.prototype.use.call(this, path, match, callbacks);
};

/**
 * Create a `raml-path-match` compatible route.
 */
Router.prototype.route = function route(path, schema) {
  var match = ramlPath(path, schema, {
    sensitive: this.caseSensitive,
    strict: this.strict,
    end: true
  });

  return Engine.prototype.route.call(this, path, match);
};

// create Router#VERB functions
methods.concat('all').forEach(function (method){
  Router.prototype[method] = function (path, schema) {
    var hasSchema = typeof schema !== 'function';
    var route = this.route(path, hasSchema ? schema : null);

    route[method].apply(route, slice.call(arguments, hasSchema ? 2 : 1));

    return this;
  };
});
