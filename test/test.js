/* eslint-env mocha */

var assert = require('assert')
var fs = require('fs')
var nr = require('../lib/nr')
var line = nr.rli._events.line
var osHomedir = require('os').homedir()
var path = require('path')
var result = null

nr.writer = function (obj) {
  result = obj
  if (result && typeof obj === 'object') {
    return JSON.stringify(result)
  } else {
    return String(result)
  }
}

function reset () {
  // delete nr require cache
  delete require.cache[require.resolve('../lib/nr.js')]

  // now require and setup nr
  nr = require('../lib/nr')
  line = nr.rli._events.line
  result = null
  nr.writer = function (obj) {
    result = obj
    if (result && typeof obj === 'object') {
      return JSON.stringify(result)
    } else {
      return String(result)
    }
  }
}

describe('nr', function () {
  it('should evaluate simple input', function (done) {
    line('R.map(R.identity, [1, 2, 3])')
    assert.deepStrictEqual(result, [1, 2, 3])
    done()
  })

  it('should evaluate multiline input', function (done) {
    line('var moo = R.prop(')
    line('  "moo"')
    line(');')
    line('var value = moo({')
    line('  moo: "cow"')
    line('})')
    line('value')
    assert.strictEqual(result, 'cow')
    done()
  })

  it('should evaluate multiple Ramda method calls', function (done) {
    line('R.add(2, 5)')
    assert.deepStrictEqual(result, 7)
    result = null
    line('R.subtract(2, 5)')
    assert.deepStrictEqual(result, -3)
    done()
  })

  it('should not throw in magic mode', function (done) {
    line('var fixed = {}; Object.preventExtensions(fixed); fixed.newProp = 1')
    assert.strictEqual(result, 1)
    done()
  })

  it('should throw in strict mode set via command line option', function (done) {
    // enable strict mode
    var previousArgv = process.argv
    process.argv = previousArgv.concat('--use_strict')

    // now require and setup nr (it should now run with strict mode enabled)
    reset()
    // reset argv to previous value
    process.argv = previousArgv

    line('var fixed = {}; Object.preventExtensions(fixed); fixed.newProp = 1')
    assert.strictEqual(result, null)
    done()
  })

  it('should not overwrite R', function (done) {
    line('R="foobar"')
    assert.strictEqual(result, 'foobar')
    result = null
    line('typeof R')
    assert.strictEqual(result, 'object')
    done()
  })

  it('should save and load repl history across multiple sessions', function (done) {
    var historyPath = path.join(osHomedir, '.nr_repl_history')

    // delete any previously created history file
    fs.unlinkSync(historyPath)

    reset() // new session
    line('1+2')
    reset() // new session
    line('null')
    reset() // new session
    line('"foobar"')
    reset() // new session

    // check history (as thoroughly as possible)
    var historyFileContent = fs.readFileSync(historyPath, 'utf-8')
    assert.strictEqual(historyFileContent, ['1+2', 'null', '"foobar"', ''].join('\n'))
    line('.load ' + historyPath)
    assert.strictEqual(result, 'foobar')
    done()
  })
})
