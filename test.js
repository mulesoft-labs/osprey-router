/* global describe, it */

require('es6-promise').polyfill()

var methods = require('methods')
var expect = require('chai').expect
var popsicle = require('popsicle')
var server = require('popsicle-server')
var finalhandler = require('finalhandler')
var Router = require('./')

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

    return popsicle.request('/foo%d')
      .use(server(createServer(router)))
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

        return popsicle.request({ url: '/', method: method })
          .use(server(createServer(router)))
          .then(function (res) {
            expect(res.status).to.equal(200)
            expect(res.body).to.equal(
              method === 'head' ? null : 'hello, world'
            )
          })
      }))
    })

    it('should accept arrays', function () {
      var router = new Router()

      router.all('/', [helloWorld])

      return popsicle.request('/')
        .use(server(createServer(router)))
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

      return popsicle.request('/')
        .use(server(createServer(router)))
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

        return popsicle.request({ url: '/foo', method: method })
          .use(server(createServer(router)))
          .then(function (res) {
            expect(res.status).to.equal(200)
            expect(res.body).to.equal(
              method === 'head' ? null : 'hello, world'
            )
          })
      })

      it('Router#' + method + ' should accept an array', function () {
        var router = new Router()

        router[method]('/foo', [helloWorld])

        return popsicle.request({ url: '/foo', method: method })
          .use(server(createServer(router)))
          .then(function (res) {
            expect(res.status).to.equal(200)
            expect(res.body).to.equal(
              method === 'head' ? null : 'hello, world'
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

        return popsicle.request({ url: '/123', method: method })
          .use(server(createServer(router)))
          .then(function (res) {
            expect(res.status).to.equal(200)
            expect(res.get('x-typeof')).to.equal('number')
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

      return popsicle.request('/foo')
        .use(server(createServer(router)))
        .then(function (res) {
          expect(res.status).to.equal(200)
          expect(res.get('x-url')).to.equal('/foo')
        })
    })

    it('should accept arrays', function () {
      var router = new Router()

      router.use([function (req, res) {
        res.setHeader('x-url', req.url)
        res.end()
      }])

      return popsicle.request('/foo')
        .use(server(createServer(router)))
        .then(function (res) {
          expect(res.status).to.equal(200)
          expect(res.get('x-url')).to.equal('/foo')
        })
    })

    it('should accept a path', function () {
      var router = new Router()

      router.use('/foo', function (req, res) {
        res.setHeader('x-url', req.url)
        res.end()
      })

      return popsicle.request('/foo')
        .use(server(createServer(router)))
        .then(function (res) {
          expect(res.status).to.equal(200)
          expect(res.get('x-url')).to.equal('/')
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

      return popsicle.request('/bar')
        .use(server(createServer(router)))
        .then(function (res) {
          expect(res.status).to.equal(200)
          expect(res.get('x-url')).to.equal('/')
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

    return popsicle.request('/12345')
      .use(server(createServer(router)))
      .then(function (res) {
        expect(res.status).to.equal(200)
        expect(res.body).to.deep.equal({ id: 12345 })
      })
      .then(function () {
        return popsicle.request('/abc').use(server(createServer(router)))
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

function createServer (router) {
  return function (req, res) {
    router(req, res, finalhandler(req, res))
  }
}
