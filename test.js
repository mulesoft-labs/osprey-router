/* global describe, it */

require('es6-promise').polyfill()

var methods = require('methods')
var expect = require('chai').expect
var Router = require('./')

/* Helps using popsicle-server with popsicle version 12+.
 *
 * Inspired by popsicle 12.0+ code.
 */
function makeFetcher (app) {
  var compose = require('throwback').compose
  var Request = require('servie').Request
  var popsicle = require('popsicle')
  var popsicleServer = require('popsicle-server').server
  var finalhandler = require('finalhandler')

  // Set response text to "body" property to mimic popsicle v10
  // response interface.

  function responseBodyMiddleware (req, next) {
    return next().then(res => {
      return res.text().then(body => {
        res.body = body
        return res
      })
    })
  }

  function createServer (router) {
    return function (req, res) {
      router(req, res, finalhandler(req, res))
    }
  }

  var popsicleServerMiddleware = popsicleServer(createServer(app))
  var middleware = compose([
    responseBodyMiddleware,
    popsicleServerMiddleware,
    popsicle.middleware
  ])

  return {
    fetch: popsicle.toFetch(middleware, Request)
  }
}

describe('Router', function () {
  it('should be a function', function () {
    expect(Router).to.be.a('function')
  })

  it('should return a function', function () {
    expect(new Router()).to.be.a('function')
  })

  it('should reject missing callback', function () {
    var router = new Router()

    expect(Function.prototype.bind.call(router, router, {}, {}))
      .to.throw(/argument callback is required/)
  })

  it('should not crash with invalid decode', function () {
    var router = new Router()

    router.get('/{id}', { id: { type: 'string' } }, function (req, res, next) {
      return next()
    }, helloWorld)

    return makeFetcher(router).fetch('/foo%d', {
      method: 'GET'
    })
      .then(function (res) {
        expect(res.status).to.equal(400)
      })
  })

  describe('Router#all(path, fn)', function () {
    it('should be chainable', function () {
      var router = new Router()

      expect(router.all('/', helloWorld)).to.equal(router)
    })

    it('should respond to all methods', function () {
      var router = new Router()

      router.all('/', helloWorld)

      return Promise.all(methods.map(function (method) {
        // This is tricky.
        if (method === 'connect') {
          return
        }

        return makeFetcher(router).fetch('/', {
          method
        })
          .then(function (res) {
            expect(res.status).to.equal(200)
            expect(res.body).to.equal(
              method === 'head' ? '' : 'hello, world'
            )
          })
      }))
    })

    it('should accept arrays', function () {
      var router = new Router()

      router.all('/', [helloWorld])

      return makeFetcher(router).fetch('/', {
        method: 'GET'
      })
        .then(function (res) {
          expect(res.status).to.equal(200)
          expect(res.body).to.equal('hello, world')
        })
    })

    it('should not stack overflow with many registered routes', function () {
      var router = new Router()

      for (var i = 0; i < 6000; i++) {
        router.get('/thing' + i, helloWorld)
      }

      router.get('/', helloWorld)

      return makeFetcher(router).fetch('/', {
        method: 'GET'
      })
        .then(function (res) {
          expect(res.status).to.equal(200)
          expect(res.body).to.equal('hello, world')
        })
    })
  })

  describe('methods', function () {
    methods.forEach(function (method) {
      if (method === 'connect') {
        return
      }

      it('Router#' + method, function () {
        var router = new Router()

        router[method]('/foo', helloWorld)

        return makeFetcher(router).fetch('/foo', {
          method
        })
          .then(function (res) {
            expect(res.status).to.equal(200)
            expect(res.body).to.equal(
              method === 'head' ? '' : 'hello, world'
            )
          })
      })

      it('Router#' + method + ' should accept an array', function () {
        var router = new Router()

        router[method]('/foo', [helloWorld])

        return makeFetcher(router).fetch('/foo', {
          method
        })
          .then(function (res) {
            expect(res.status).to.equal(200)
            expect(res.body).to.equal(
              method === 'head' ? '' : 'hello, world'
            )
          })
      })
    })
  })

  describe('schemas', function () {
    methods.forEach(function (method) {
      if (method === 'connect') {
        return
      }

      it('Router#' + method, function () {
        var router = new Router()

        router[method]('/{id}', {
          id: {
            type: 'number'
          }
        }, function (req, res) {
          res.setHeader('x-typeof', typeof req.params.id)
          res.end()
        })

        return makeFetcher(router).fetch('/123', {
          method
        })
          .then(function (res) {
            expect(res.status).to.equal(200)
            expect(res.headers.get('x-typeof')).to.equal('number')
          })
      })
    })
  })

  describe('Router#use(path, fn)', function () {
    it('should be able to use a middleware function', function () {
      var router = new Router()

      router.use(function (req, res) {
        res.setHeader('x-url', req.url)
        res.end()
      })

      return makeFetcher(router).fetch('/foo', {
        method: 'GET'
      })
        .then(function (res) {
          expect(res.status).to.equal(200)
          expect(res.headers.get('x-url')).to.equal('/foo')
        })
    })

    it('should accept arrays', function () {
      var router = new Router()

      router.use([function (req, res) {
        res.setHeader('x-url', req.url)
        res.end()
      }])

      return makeFetcher(router).fetch('/foo', {
        method: 'GET'
      })
        .then(function (res) {
          expect(res.status).to.equal(200)
          expect(res.headers.get('x-url')).to.equal('/foo')
        })
    })

    it('should accept a path', function () {
      var router = new Router()

      router.use('/foo', function (req, res) {
        res.setHeader('x-url', req.url)
        res.end()
      })

      return makeFetcher(router).fetch('/foo', {
        method: 'GET'
      })
        .then(function (res) {
          expect(res.status).to.equal(200)
          expect(res.headers.get('x-url')).to.equal('/')
        })
    })

    it('should accept a path and schema', function () {
      var router = new Router()

      router.use('/{path}', {
        path: {
          type: 'string',
          enum: [
            'foo',
            'bar'
          ]
        }
      }, function (req, res) {
        res.setHeader('x-url', req.url)
        res.end()
      })

      return makeFetcher(router).fetch('/bar', {
        method: 'GET'
      })
        .then(function (res) {
          expect(res.status).to.equal(200)
          expect(res.headers.get('x-url')).to.equal('/')
        })
    })
  })

  it('should allow re-use of uri parameters', function () {
    var router = new Router()

    router.use('/{id}', {
      id: {
        type: 'number'
      }
    }, function (req, res, next) {
      next()
    })

    router.use('/{id}', function (req, res) {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(req.params))
    })

    return makeFetcher(router).fetch('/12345', {
      method: 'GET'
    })
      .then(function (res) {
        expect(res.status).to.equal(200)
        expect(JSON.parse(res.body)).to.deep.equal({ id: 12345 })
      })
      .then(function () {
        return makeFetcher(router).fetch('/abc', {
          method: 'GET'
        })
      })
      .then(function (res) {
        expect(res.status).to.equal(404)
      })
  })
})

function helloWorld (req, res) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/plain')
  res.end('hello, world')
}
