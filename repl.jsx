stdin = process.openStdin()
stdout = process.stdout

var compile   = require('./index')
  , readline  = require('readline')
  , inspect   = require('util'):inspect
  , Script    = require('vm')
  , Module    = require('module')

var REPL_PROMPT = "jabba>" 
  , REPL_PROMPT_MULTILINE = '------> '
  , REPL_PROMPT_CONTINUATION = '......> '
  , ENABLED_COLORS = !process.env.NODE_DISABLE_COLORS
  , ACCESSOR  = /\s*([\w\.]+)(?:\.(\w*))$/
  , SIMPLEVAR = /(\w+)$/i

var repl

function error (err) {
  stdout.write (err.stack || ''+err)+'\n'
}

function autocomplete (text) {
  return complete_attribute(text) || complete_variable(text) || [[], text]
}

function complete_attribute (text) {
  var match

  if(match = text.match(ACCESSOR)) {
    var all     = match[0]
      , obj     = match[1]
      , prefix  = match[2]
      , val

    try {
      val = Script.runInThisContext(obj)
    } catch(err) {
      return
    }
    return [get_completions(prefix, Object.getOwnPropertyNames(Object(val))), prefix]
  }
}

function complete_variable (text) {
  var free
    , vars
    , completions

  free = text.match(SIMPLEVAR)
  free = free ? free[1] : null
  free = text === '' ? '' : free
  if(free) {
    vars = Script.runInThisContext('Object.getOwnPropertyNames(Object(this))')
    return [get_completions(free, vars), free]
  } 
}

function get_completions(prefix, candidates) {
  return candidates.filter(function(item) {
    return item.indexOf(prefix) === 0
  })
}

if(readline.createInterface.length < 3) {
  repl = readline.createInterface(stdin, autocomplete)
  stdin.on('data', repl:write)
} else {
  repl = readline.createInterface(stdin, stdout, autocomplete)
}

process.on('uncaughtException', error)

var backlog = ''
  , multiline_mode = false

repl.input.on('keypress', function(char, key) {
  if(!(key && key.ctrl && !key.meta && !key.shift && key.name == 'v')) {
    return
  }

  var pos = repl.cursor
    , prompt = !multiline_mode ? REPL_PROMPT : REPL_PROMPT_MULTILINE

  repl.output.cursorTo(0)
  repl.output.clearLine(1)
  multiline_mode = !multiline_mode

  backlog = ''
  repl.setPrompt(prompt)
  repl.prompt()
  repl.output.cursorTo(prompt.length + (repl.cursor = pos))
})

repl.input.on('keypress', function(char, key) {
  if(!(multiline_mode && repl.line))
    return

  if(!(key && key.ctrl && !key.meta && !key.shift && key.name === 'd'))
    return

  multiline_mode = false
  repl._line()
})

repl.on('attemptClose', function() {
  if(multiline_mode) {
    multiline_mode = false
    repl.output.cursorTo(0)
    repl.output.clearLine(1)
    repl._onLine(repl.line)
    return
  }

  if(backlog) {
    backlog = ''
    repl.output.write('\n')
    repl.setPrompt(REPL_PROMPT)
    repl.prompt()
  } else {
    repl.close()
  }
})

repl.on('close', function() {
  repl.output.write('\n')
  repl.input.destroy()
})

repl.on('line', function(buffer) {
  if(multiline_mode) {
    backlog += buffer + '\n'
    repl.setPrompt(REPL_PROMPT_CONTINUATION)
    repl.prompt()
  }

  if(!buffer.toString().trim() && !backlog) {
    repl.prompt()
    return
  }

  var code = backlog += buffer
  
  if(code[code.length-1] === '\\') {
    backlog = backlog.slice(0, -1) + '\n'
    repl.setPrompt(REPL_PROMPT_CONTINUATION)
    repl.prompt()
    return
  }

  repl.setPrompt(REPL_PROMPT)
  backlog = ''

  var _ = global._
    , scr
    , ret

  try {
    _ = global._
    scr = new Function('_', 'return '+compile("_=("+code+")"))
  } catch(err) {
    backlog = code+'\n'
    repl.setPrompt(REPL_PROMPT_CONTINUATION)
    repl.prompt()
    return
  }

  try {
    ret = scr(global._)

    if(!ret)
        global._ = _

    repl.output.write(inspect(ret, false, 2, ENABLED_COLORS) + '\n')
  } catch(err) {
    error(err)
  }
  repl.prompt()
})

repl.setPrompt(REPL_PROMPT)
repl.prompt()
