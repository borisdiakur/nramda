const test = require('ava').default
const fs = require('fs')
const path = require('path')
const repl = require('repl')
const stream = require('stream')
const stripAnsi = require('strip-ansi')
const { wrapRepl } = require('../lib/nr')

const TMP_FOLDER = path.join(
  __dirname,
  '..',
  'tmp',
  `histories--${new Date().toISOString().replace(/T.*$/, '')}--${process.pid}`
)

function over(iteratees) {
  return function () {
    let args = Array.prototype.slice.call(arguments)
    return iteratees.map((iteratee) => iteratee.apply(null, args))
  }
}

async function getNREPL(args) {
  const c = (await import('chalk')).default

  const logs = []
  const log = (line) => logs.push(line)

  const capturedOutput = []
  const exposedInput = new stream.PassThrough()
  const instrumentedRepl = repl.start({
    output: new stream.Writable({
      write(chunck, encoding, cb) {
        capturedOutput.push(chunck)
        cb()
      },
    }),
    input: exposedInput, // need to be explicit if setting put. (later could feed directly input)
    // note: using process.input cause MaxListenersExceededWarning to appear in test
  })
  const nr = wrapRepl(
    Object.assign(
      {
        replServer: instrumentedRepl,
        historyPath: path.join(TMP_FOLDER, `.nr_history-${+Date.now()}`),
      },
      args
    ),
    c
  )
  nr.log = log
  nr.logs = logs

  // helper to retrieve line to emit direct event
  nr.sendLine = function (line) {
    over(nr._events.line)(line)
    return nr // for chainable calls
  }
  nr.exposedInput = exposedInput
  nr.waitClose = function (delay = 0) {
    return new Promise((resolve) => {
      nr.on('end-of-story', resolve)
      setTimeout(() => nr.close(), delay)
    })
  }

  Object.defineProperty(nr, 'capturedOutput', {
    get() {
      return capturedOutput.join('\n')
    },
  })
  // TODO: later could use capturedOutput to add extract test (after cleaning prompts and else)
  return nr
}

test.before(() => {
  for (const folder of [path.dirname(TMP_FOLDER), TMP_FOLDER]) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder)
    }
  }
})

test('should evaluate multiline input', async (t) => {
  const nr = await getNREPL()
  nr.sendLine('const moo = R.prop(')
  nr.sendLine('  "moo"')
  nr.sendLine(')')
  nr.sendLine('const value = moo({')
  nr.sendLine('  moo: "cow"')
  nr.sendLine('})')
  nr.sendLine('value')
  await nr.waitClose()
  t.is(nr.last, 'cow')
})

test('should evaluate simple input', async (t) => {
  const nr = await getNREPL()
  nr.sendLine('1+2')
  await nr.waitClose()
  t.is(nr.last, 3)
})

test('should evaluate multiple lodash method calls', async (t) => {
  const nr = await getNREPL()
  nr.sendLine('R.add(2, 5)')
  t.deepEqual(nr.last, 7)
  nr.sendLine('R.subtract(2, 5)')
  await nr.waitClose()
  t.deepEqual(nr.last, -3)
})

test('should not throw in magic mode', async (t) => {
  const nr = await getNREPL()
  nr.sendLine('const fixed = {}; Object.preventExtensions(fixed); fixed.newProp = 1')
  await nr.waitClose()
  t.deepEqual(nr.last, 1)
})

test('should not overwrite R', async (t) => {
  const nr = await getNREPL()
  nr.sendLine('R="foobar"')
  t.deepEqual(nr.last, 'foobar')
  nr.sendLine('typeof R')
  await nr.waitClose()
  t.deepEqual(nr.last, 'object')
})

const helpText = `.ramda has the following sub-commands:
- version: print current version of ramda in use`

test('should expose .ramda commands', async (t) => {
  const nr = await getNREPL()
  nr.sendLine('.ramda')
  nr.sendLine('.ramda oups')
  nr.sendLine('.ramda help')
  nr.sendLine('.ramda version')
  await nr.waitClose()
  t.deepEqual(nr.logs.map(stripAnsi), [
    'Please provide a sub-command for .ramda',
    helpText,
    "there is no 'oups' sub-command, see available ones with '.ramda help'",
    helpText,
    'Current ramda version is 0.28.0',
  ])
})

test('should save and load repl history across multiple sessions', async (t) => {
  const historyPath = path.join(TMP_FOLDER, `.nr_repl_history-${Date.now()}`)
  const args = { historyPath } // ensure all repl instances with have same history

  // write on consecutive sessions
  await (await getNREPL(args)).sendLine('1+2').waitClose()
  await (await getNREPL(args)).sendLine('null').waitClose()
  await (await getNREPL(args)).sendLine('"foobar"').waitClose()

  // check history (as thoroughly as possible)
  const historyFileContent = fs.readFileSync(historyPath, 'utf-8')
  t.deepEqual(historyFileContent.split('\n'), ['1+2', 'null', '"foobar"', ''])

  const nr = await getNREPL()
  nr.sendLine(`.load ${historyPath}`)
  await nr.waitClose()
  t.is(nr.last, 'foobar')
})
