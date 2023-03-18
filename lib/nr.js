const osHomedir = require('os').homedir()
const path = require('path')
const replHistory = require('repl-story')
const rPackage = require('../node_modules/ramda/package.json')

const CHALK_STYLES = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'gray',
  'dim',
]

const argsSpec = require('yargs')
  .option('use_strict', {
    description: 'Activate strict mode',
    alias: ['use-strict', 's'],
    default: false,
    boolean: true,
  })
  .option('history-path', {
    description: 'Use a custom history filename',
    alias: ['history', 'history-file'],
    string: true,
    default: path.join(osHomedir, '.nr_repl_history'),
  })
  .option('prompt.symbol', {
    description: 'Prompt symbol for the repl',
    string: true,
    default: '>',
  })
  .option('prompt.color.symbol', {
    description: 'Color for symbol part of prompt',
    default: 'red',
  })
  .option('prompt.color.flavor', {
    description: 'Color for flavor part of prompt',
    default: 'cyan',
  })
  .option('prompt.color.name', {
    description: 'Color for name part of prompt',
    default: 'blue',
  })
  .option('prompt.color.help', {
    description: 'Color for help highlight',
    default: 'green',
  })
  .option('prompt.name', {
    description: 'Base name for the prompt',
    string: true,
    default: 'λ',
  })
  .coerce('prompt', (prompt) => {
    for (const [key, color] of Object.entries(prompt.color)) {
      if (!CHALK_STYLES.includes(color))
        throw new Error(`Unsupported color '${color}' for '${key}' color`)
    }
    return prompt
  })
  .fail((message) => {
    throw new Error(`Invalid provided option: ${message}`)
  })
  .env('_NR')

const argsDefaults = argsSpec.parse([])

// store method reference in case it is overwritten later
const setDescriptors = Object.defineProperties

function injectRamdaIntoRepl(server, ramdas, promptConfig, c) {
  const currentFlavor = ramdas.initial
  const currentRamda = ramdas[currentFlavor]

  const { help: helpColor, flavor: flavorColor } = promptConfig.color

  const commandHelps = {
    version: 'print current version of ramda in use',
  }
  const ramdaSubCommands = {
    version: (repl) =>
      repl.log(`Current ramda version is ${c.bold[flavorColor](rPackage.version)}`),
    help: (repl) =>
      repl.log(
        [
          `${c.bold[helpColor]('.ramda')} has the following sub-commands:`,
          ...Object.entries(commandHelps).map(
            ([command, help]) => `- ${c.bold[helpColor](command)}: ${help}`
          ),
        ].join('\n')
      ),
  }

  const clear =
    typeof server.clearBufferedCommand === 'function'
      ? (server) => server.clearBufferedCommand()
      : (server) => {
          server.bufferedCommand = ''
        }
  server.defineCommand('ramda', {
    help: 'Configure ramda utils, commands: help, version',
    action: function (input) {
      clear(this)
      if (!input) {
        this.log('Please provide a sub-command for .ramda')
        ramdaSubCommands.help(this)
      } else {
        const subcommand = input.split(' ')[0]
        const handler = ramdaSubCommands[subcommand]
        if (!handler)
          this.log(
            `there is no '${c.bold.red(
              subcommand
            )}' sub-command, see available ones with '.ramda ${c.bold[helpColor]('help')}'`
          )
        else handler(this)
      }
      this.displayPrompt()
    },
  })

  // inject ramda into the context
  setDescriptors(server.context, {
    R: {
      configurable: true,
      enumerable: false,
      get: function () {
        return currentRamda
      },
      set: function () {
        // noop, value will still be retrieved by repl
      },
    },
  })
  return server
}

function wrapRepl(args, c) {
  const completeArgs = Object.assign({}, argsDefaults, args)
  const promptConfig = {
    ...completeArgs.prompt,
    makePrompt(flavor) {
      return `${c.bold[this.color.name](this.name)}${
        flavor ? `:/${c.bold[this.color.flavor](flavor)}` : ''
      } ${c.bold[this.color.symbol](this.symbol)} `
    },
  }
  const initialPrompt = promptConfig.makePrompt()
  const customReplServer = completeArgs.replServer instanceof repl.REPLServer

  const server = customReplServer
    ? completeArgs.replServer
    : repl.start({
        prompt: initialPrompt,
        // allow strict mode via command line argument
        replMode: completeArgs.useStrict ? repl.REPL_MODE_STRICT : repl.REPL_MODE_SLOPPY,
      })
  if (completeArgs.replServer) server.setPrompt(initialPrompt)

  // attach log method, (introduce to be overridable from outside for the tests)
  server.log = console.log

  // save repl history
  replHistory(server, completeArgs.historyPath)

  // create new `ramda` instance
  const ramda = require('ramda')

  injectRamdaIntoRepl(
    server,
    {
      vanilla: ramda,
      initial: 'vanilla',
    },
    promptConfig,
    c
  )

  return server
}

// create REPL server instance
const repl = require('repl')

async function main(argv) {
  const c = (await import('chalk')).default
  try {
    const args = argsSpec.parse(argv)
    wrapRepl(args, c)
  } catch (err) {
    console.error(c.bold.red(err.message))
    process.exit(1)
  }
}

module.exports = { main, wrapRepl }

// istanbul ignore next
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (!module.parent) {
  main(process.argv.slice(2))
}
