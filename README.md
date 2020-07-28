# Osprey Router

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Greenkeeper badge](https://badges.greenkeeper.io/mulesoft-labs/osprey-router.svg)](https://greenkeeper.io/)

Simple middleware-style router for [RAML](https://github.com/raml-org/raml-spec/blob/master/versions/raml-10/raml-10.md#template-uris-and-uri-parameters) based on [router](https://github.com/pillarjs/router).

## Installation

```shell
npm install osprey-router --save
```

## Usage

This module is an instance of [router](https://github.com/pillarjs/router) with support for RAML paths and parameters.

### Router(options)

All options and functions from [router](https://github.com/pillarjs/router) are supported, except the second argument can be an optional array of [webapi-parser](https://github.com/raml-org/webapi-parser) `Parameter` objects. For example:

```js
const finalhandler = require('finalhandler')
const http = require('http')
const Router = require('osprey-router')
const utils = require('./utils')

const router = Router()
const parameters = utils.getUriParameters()

router.get('/{userId}', parameters, function (req, res) {
  console.log(typeof req.params.userId)

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(req.params.userId)
})

const server = http.createServer(function (req, res) {
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
