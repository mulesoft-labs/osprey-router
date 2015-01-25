var finalhandler = require('finalhandler');

module.exports = createServer;

function createServer (router) {
  return function (req, res) {
    router(req, res, finalhandler(req, res));
  };
}
