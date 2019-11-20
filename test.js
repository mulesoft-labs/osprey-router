/* global describe, it, before */

require('es6-promise').polyfill()

const methods = require('methods')
const expect = require('chai').expect
const Router = require('./')
const wp = require('webapi-parser')

/* Helps using popsicle-server with popsicle version 12+.
 *
 * Inspired by popsicle 12.0+ code.
 */
function makeFetcher (app) {
  const compose = require('throwback').compose
  const Request = require('servie').Request
  const popsicle = require('popsicle')
  const popsicleServer = require('popsicle-server')
  const finalhandler = require('finalhandler')

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

  const popsicleServerMiddleware = popsicleServer(createServer(app))
  const middleware = compose([
    responseBodyMiddleware,
    popsicleServerMiddleware,
    popsicle.middleware
  ])

  return {
    fetch: popsicle.toFetch(middleware, Request)
  }
}

before(async function () {
  await wp.WebApiParser.init()
})

describe('Router', function () {
  it('should be a function', function () {
    expect(Router).to.be.a('function')
  })

  it('should return a function', function () {
    expect(new Router()).to.be.a('function')
  })

  it('should reject missing callback', function () {
    const router = new Router()

    expect(Function.prototype.bind.call(router, router, {}, {}))
      .to.throw(/argument callback is required/)
  })

  it('should not crash with invalid decode', function () {
    const router = new Router()
    const params = [
      new wp.model.domain.Parameter()
        .withName('id')
        .withRequired(true)
        .withSchema(
          new wp.model.domain.ScalarShape()
            .withName('schema')
            .withDataType('http://www.w3.org/2001/XMLSchema#string'))
    ]

    router.get('/{id}', params, function (req, res, next) {
      return next()
    }, helloWorld)

    return makeFetcher(router).fetch('/foo%d', {
      method: 'GET'
    })
      .then(function (res) {
        expect(res.status).to.equal(400)
      })
  })

  it('should accept webapi-parser.Parameter[] as uri parameters', async function () {
    const params = [
      new wp.model.domain.Parameter()
        .withName('id')
        .withRequired(true)
        .withSchema(
          new wp.model.domain.ScalarShape()
            .withName('schema')
            .withDataType('http://www.w3.org/2001/XMLSchema#integer')),
      new wp.model.domain.Parameter()
        .withName('name')
        .withRequired(false)
        .withSchema(
          new wp.model.domain.ScalarShape()
            .withName('schema')
            .withDataType('http://www.w3.org/2001/XMLSchema#string'))
    ]
    const router = new Router({ ramlUriParameters: params })
    expect(router.ramlUriParameters).to.deep.equal(params)
  })

  describe('Router#all(path, fn)', function () {
    it('should be chainable', function () {
      const router = new Router()

      expect(router.all('/', helloWorld)).to.equal(router)
    })

    it('should respond to all methods', function () {
      const router = new Router()

      router.all('/', helloWorld)

      return Promise.all(methods.map(function (method) {
        // This is tricky.
        if (method === 'connect') {
          return
        }

        return makeFetcher(router).fetch('/', {
          method: method
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
      const router = new Router()

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
      const router = new Router()

      for (let i = 0; i < 6000; i++) {
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
        const router = new Router()

        router[method]('/foo', helloWorld)

        return makeFetcher(router).fetch('/foo', {
          method: method
        })
          .then(function (res) {
            expect(res.status).to.equal(200)
            expect(res.body).to.equal(
              method === 'head' ? '' : 'hello, world'
            )
          })
      })

      it('Router#' + method + ' should accept an array', function () {
        const router = new Router()

        router[method]('/foo', [helloWorld])

        return makeFetcher(router).fetch('/foo', {
          method: method
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

      it('Router#' + method + ' webapi-parser.Parameter[]', function () {
        const router = new Router()
        const params = [
          new wp.model.domain.Parameter()
            .withName('id')
            .withRequired(true)
            .withSchema(
              new wp.model.domain.ScalarShape()
                .withName('schema')
                .withDataType('http://a.ml/vocabularies/shapes#number'))
        ]

        router[method]('/{id}', params, function (req, res) {
          res.setHeader('x-typeof', typeof req.params.id)
          res.end()
        })

        return makeFetcher(router).fetch('/123', {
          method: method
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
      const router = new Router()

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
      const router = new Router()

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
      const router = new Router()

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

    it('should accept a path and webapi-parser.Parameter[]', function () {
      const router = new Router()
      const params = [
        new wp.model.domain.Parameter()
          .withName('path')
          .withRequired(true)
          .withSchema(
            new wp.model.domain.ScalarShape()
              .withName('schema')
              .withDataType('http://www.w3.org/2001/XMLSchema#string')
              .withValues([
                new wp.model.domain.ScalarNode('foo', 'string'),
                new wp.model.domain.ScalarNode('bar', 'string')
              ])
          )
      ]

      router.use('/{path}', params, function (req, res) {
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
    const router = new Router()
    const params = [
      new wp.model.domain.Parameter()
        .withName('id')
        .withRequired(true)
        .withSchema(
          new wp.model.domain.ScalarShape()
            .withName('schema')
            .withDataType('http://a.ml/vocabularies/shapes#number'))
    ]

    router.use('/{id}', params, function (req, res, next) {
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
