var osHomedir = require('os').homedir()
var path = require('path')
var replHistory = require('repl.history')

// store method reference in case it is overwritten later
var setDescriptor = Object.defineProperty

// create REPL server instance
var repl = require('repl')
var server = repl.start({
  prompt: 'λ > ',
  // allow strict mode via command line argument
  replMode: process.argv.indexOf('--use_strict') !== -1 ? repl.REPL_MODE_STRICT : repl.REPL_MODE_MAGIC
})

// save repl history
replHistory(server, path.join(osHomedir, '.nr_repl_history'))

// create new `ramda` instance
var R = require('ramda')

// state vars
var prevVal = R
var currVal = R

// inject ramda into the context
setDescriptor(server.context, 'R', {
  configurable: true,
  enumerable: false,
  get: function () {
    return currVal
  },
  set: function (val) {
    prevVal = currVal
    currVal = val
  }
})

var events = server._events
var line = events.line
events.line = function (cmd) {
  line[0](cmd) // actual command execution
  line[1](cmd) // history persistance
  currVal = prevVal
}

module.exports = server
