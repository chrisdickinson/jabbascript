var burrito = require('./vendor/burrito')
  , uglify = require('./vendor/uglify-js')
  , fs = require('fs')

var klass = function (__obj_or_fn, __props, __ret) {
  var Object = {}.constructor

  __obj_or_fn = __obj_or_fn || Object 
  __ret.prototype = Object.create(
    typeof __obj_or_fn === 'function' ? __obj_or_fn.prototype : __obj_or_fn
  )

  for(var __key in __props) if(__props.hasOwnProperty(__key))
    __ret.prototype[__key] = __props[__key]

  __ret.prototype.constructor = __ret
  __ret.superclass = typeof __obj_or_fn === 'function' ? __obj_or_fn.prototype : __obj_or_fn
  return __ret
}

function compile(str) {
  return burrito(str, function parse (node) {
    if(node.name === 'class') {
      var name = node.node[1]
        , extend = node.node[2]
        , expr = node.node[3]
        , src = klass.toString()
        , ret = "function NAME() { if(this.init) this.init.apply(this, [].slice.call(arguments)) }"
                  .replace('NAME', name || '')
        , preamble = node.parent().name === 'stat' ? 'var '+name+' = ' : ''

      var code = '[function('+(name||'__')+') { '+(name||'__')+' = '+ret+'; return ('+src+')('+
            (extend ? uglify.uglify.gen_code(extend) : 'null')+', '+
            burrito('('+uglify.uglify.gen_code(expr)+')', parse).slice(0, -1)+','+(name||'__')+') }][0]()'

      return node.wrap(preamble+code)
    } else if(node.name === 'unary-prefix' && node.value[0] === ':') {

        if(node.value[1][0].name === 'call') {
          var orig_call = uglify.uglify.gen_code(node.value[1][1])
            , full_call = burrito(uglify.uglify.gen_code(node.value[1]), parse).slice(0, -1)
            , lookup = burrito('('+orig_call+');', parse).slice(0, -1)+'.bind(this)'
            , call = full_call.replace(orig_call, '')

          return node.wrap(lookup+call)
        }

        return node.wrap(burrito('('+uglify.uglify.gen_code(node.value[1])+')', parse).slice(0, -1)+'.bind(this)')
    } else if(node.name === 'binary' || node.name === 'assign') {
      var lhs = node.value[1]
        , rhs = node.value[2]
        , hit = 0

      if(Array.isArray(lhs)) {
        if(lhs[0] === 'unary-prefix' && lhs[1] === ':') {
          hit |= 1
          if(lhs[2][0].name === 'call') {
            var orig_call = uglify.uglify.gen_code(lhs[2][1])
              , full_call = burrito(uglify.uglify.gen_code(lhs[2]), parse).slice(0, -1)
              , lookup = burrito('('+orig_call+');', parse).slice(0, -1)+'.bind(this)'
              , call = full_call.replace(orig_call, '')

            return node.wrap(lookup+call)
          }
          lhs = burrito(lookup+call, parse)
        }
      }

      if(Array.isArray(rhs)) {
        if(rhs[0] === 'unary-prefix' && rhs[1] === ':') {
          hit |= 2

          if(rhs[2][0].name === 'call') {
            var orig_call = uglify.uglify.gen_code(rhs[2][1])
              , full_call = burrito(uglify.uglify.gen_code(rhs[2]), parse).slice(0, -1)
              , lookup = burrito('('+orig_call+');', parse).slice(0, -1)+'.bind(this)'
              , call = full_call.replace(orig_call, '')

            rhs = burrito(lookup+call, parse)
          } else {
            rhs = burrito('('+uglify.uglify.gen_code(rhs[2])+')', parse).slice(0, -1)+'.bind(this)'
          }
        }
      }

      if(hit) {

        node.wrap(function(expr, _lhs, _rhs) {
          var op = node.value[0]
          if(node.name === 'assign') {
            op = node.value[0] === true ? '=' : node.value[0]+'='
            _lhs = uglify.uglify.gen_code(lhs)

          }
          
          return [hit & 1 ? lhs : _lhs, op, hit & 2 ? rhs : _rhs].join(' ')
        })
      }
    } else if (node.name === 'colon') {
      var lhs = uglify.uglify.gen_code(Array.isArray(node.node[1]) ? node.node[1] : ['name', node.node[1]])
        , rhs = node.node[2]

      return node.wrap(lhs+'.'+rhs+'.bind('+lhs+')')
    }

  })
}

require.extensions['.jsx'] = function(module, filename) {
  var content = compile(fs.readFileSync(filename, 'utf8'), {
    filename: filename
  })

  return module._compile(content, filename)
}

module.exports = compile
