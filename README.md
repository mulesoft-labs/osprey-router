# Osprey Router

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

Path matching utility based on the [RAML spec](https://github.com/raml-org/raml-spec/blob/master/raml-0.8.md#template-uris-and-uri-parameters).

## Installation

```shell
npm install osprey-router --save
```

## Usage

You must require the module and call it as a function with options to get the path matching utility back.

```javascript
var pathMatch = require('osprey-router')({ ... });

// Create a simple path matching instance.
var match = patchMatch('/{route}', { route: { type: 'string' } });

match('/test'); //=> { match: '/test', params: { route: 'test' } }
```

### Initialization Options

* **end** - When set to `false`, the route will only match the beginning of paths.
* **strict** - When set to `true`, the route must match exactly without trailing slash.
* **sensitive** - When set to `true`, the route will be case-sensitive.

### Routes

The route is a string that can be interpolated with parameters. E.g. `/{route}`.

### Parameters

Parameters in the route string can be defined by passing in an object definition adhering to the [RAML spec](https://github.com/raml-org/raml-spec/blob/master/raml-0.8.md#named-parameters). For example, to specify that `{route}` is a integer greater than `5` we would pass in:

```javascript
pathMatch('/{route}', {
  route: {
    type: 'integer',
    minimum: 6
  }
}); //=> [Function]
```

#### Optional parameters

Parameters can be optional according to the [RAML spec](https://github.com/raml-org/raml-spec/blob/master/raml-0.8.md#required). To set the parameter to be optional, you must set `required: false`. With this option set, `/{route}` will match just `/`. When the parameter is optional and not matched, the parameter value will be set to `undefined`.

### Matching the path

The path matching instance will return a function after you give it the route template. This function is used to match the current path against the route template. If the route does not match, `false` is returned. If it does match, an object will be returned.

```javascript
{
  match: '/123',
  params: {
    route: 123
  }
}
```

The above is an example of passing the path `/123` to the result of the previous example. Notice that parameters will be automatically sanitized to the native JavaScript types.

## License

Apache 2.0

[npm-image]: https://img.shields.io/npm/v/osprey-router.svg?style=flat
[npm-url]: https://npmjs.org/package/osprey-router
[travis-image]: https://img.shields.io/travis/mulesoft-labs/osprey-router.svg?style=flat
[travis-url]: https://travis-ci.org/mulesoft-labs/osprey-router
[coveralls-image]: https://img.shields.io/coveralls/mulesoft-labs/osprey-router.svg?style=flat
[coveralls-url]: https://coveralls.io/r/mulesoft-labs/osprey-router?branch=master
