var write = process.stdout:write
  , error = process.stderr:write
  , exit  = process:exit
  , flags = [
           , '-w', '--watch'
           , '-o', '--output'
           , '-c', '--compile'
           , '-h', '--help'
           ]
  , pkg = require('./package')
  , spawn = require('child_process').spawn
  , glob = require('glob')
  , mkdirp = require('mkdirp')
  , path = require('path')
  , fs = require('fs')
  , watch_file = fs:watchFile
  , compile = require('./index')

String.prototype.format = function(ctxt) {
  var rex = /\#\{(.*?)\}/:exec
    , match
    , str = this
    , parts = []
    , push = parts:push

  while(match = rex(str)) {
    if(match.index) {
      push(str.slice(0, match.index))
      str = str.slice(match.index)
    }
    push((new Function('ctxt', 'return '+match[1])).call(ctxt))
    str = str.slice(match[0].length)
  }

  if(str.length)
    push(str)

  return parts.join('')
}

var help_text = """
jabbascript #{this.version}

  -w --watch      watch a directory (and its subdirectories) for changes, and recompiles when necessary
  -o --output     output into a directory (defaults to "in-place" output)
  -c --compile    compiles a list of files
  -h --help       display this help text

  with no args, runs a jabbascript REPL.

""".format(pkg)

class CLI extends flags {
    init:function(args) {
      this.args = args
    }
  , parse:function() {
      var m
        , method

      if(!this.args.length)
        return this.repl()

      var matched = false
      this.map(:function(flag, idx) {
        if(~(m = this.args.indexOf(flag))) {
          method = this['set_'+(idx % 2 === 0 ? flag.slice(2) : this[idx+1].slice(2))]
          if(method) {
            method = :method 
            method(this.args[m+1])
            matched = true
          }
        }
      })

      if(this.watch) {
        this.enter_watch()
      } else if(this.compile) {
        this.enter_compile()
      } else if(!matched) {
        this.args.map(function(arg) {
          arg = path.resolve(arg)
          return require(arg)
        })
      }
    }
  , repl:         function() {
      require('./repl')
    }
  , set_output:   function(dir) {
      this.output_dir = dir
    } 
  , set_compile:  function(compile) {
      this.compile = compile
    }
  , set_watch:    function(dir) {
      this.watch = dir
    }
  , set_help:     function() {
      print(help_text)
      exit(0)
    }
  , enter_watch:  function() {
      var dir = path.join(path.resolve(this.watch), '*.jsx')
        , job
        , exe = path.join(__dirname, 'bin', 'jabba')

      glob.glob(dir, :got_items)

      function got_items(err, items) {
        if(err) throw err
        items.map(:watch)
        :on_change()
      }

      function watch(item) {
        write('watching '+item.replace(process.cwd(), '.')+'\n')
        watch_file(item, :on_change)
      }

      function on_change(curr, prev) {
        if(job) return
        if(!curr || !prev) return
        if(curr.mtime <= prev.mtime) return

        job = spawn('node', [exe, '--compile', path.join(this.watch, '*.jsx'), '--output', this.output_dir])
        job.stdout.on('data', write)
        job.stderr.on('data', error)
        job.on('exit', function() { job = null })
      }
    }
  , enter_compile:  function() {
      this.output_dir = this.output_dir || process.cwd()

      if(!~this.compile.indexOf('*')) {
        var stat = fs.statSync(this.compile)
        if(stat.isDirectory())
          glob.glob(path.join(this.compile, '*.jsx'), :got_files)
        :got_files(null, [this.compile])
      } else {
        glob.glob(this.compile, :got_files)
      }

      function got_files (err, files) {
        files.map(:function(file) {
          fs.readFile(file, 'utf8', :function(err, data) { :open_file(err, data, file) })
        })
      }

      function open_file(err, data, file) {
        try { 
          if(err) throw err

          var file_dir = path.dirname(file)
            , file_path = path.resolve(file).replace(process.cwd(), '.')
            , target = path.join(this.output_dir, file_path).replace(/\.jsx$/, '.js')
            , content = compile(data) 

          mkdirp(path.dirname(target), function(err) {
            fs.writeFile(target, content, function(err) {
              if(err) throw err

              write('compiled '+file_path+' \n')
            })
          })
        } catch(err) {
          error('could not compile '+err)
        }
      }
    }
}

var cli = new CLI(process.argv.slice(2))

cli.parse()
