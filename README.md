# Osprey Router

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

Simple middleware-style router for [RAML](https://github.com/raml-org/raml-spec/blob/master/versions/raml-10/raml-10.md#template-uris-and-uri-parameters) based on [router](https://github.com/pillarjs/router).

## Installation

```shell
npm install osprey-router --save
```

## Usage

This module is an instance of [router](https://github.com/pillarjs/router) with support for RAML paths and parameters.

### Router(options)

All options and functions from [router](https://github.com/pillarjs/router) are supported, except the second argument can be an optional `uriParameters` schema. For example:

```js
var finalhandler = require('finalhandler')
var http = require('http')
var Router = require('osprey-router')

var router = Router()

router.get('/{userId}', {
  userId: {
    type: 'integer'
  }
}, function (req, res) {
  console.log(typeof req.params.userId) //=> "number"

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(req.params.userId)
})

var server = http.createServer(function (req, res) {
  router(req, res, finalhandler(req, res))
})

server.listen(3000)
```

When you specify the parameter type, it'll automatically be parsed in the native JavaScript type.

## License

Apache 2.0

[npm-image]: https://img.shields.io/npm/v/osprey-router.svg?style=flat
[npm-url]: https://npmjs.org/package/osprey-router
[travis-image]: https://img.shields.io/travis/mulesoft-labs/osprey-router.svg?style=flat
[travis-url]: https://travis-ci.org/mulesoft-labs/osprey-router
[coveralls-image]: https://img.shields.io/coveralls/mulesoft-labs/osprey-router.svg?style=flat
[coveralls-url]: https://coveralls.io/r/mulesoft-labs/osprey-router?branch=master
