JABBASCRIPT
===========

>
> VEENA WANNA WONGA SOLO!
>

Jabbascript is the result of being presented with the question (not but 12 hours ago!) what I would
change about JavaScript -- at the language level -- if I could.

Well, it turns out, I really don't want to change that much. I've tried CoffeeScript; it left me with
a syntactic sugar headache. Maybe I can't help myself: I just really like JavaScript the way it is!

That said, I recently saw @jashkenas propose a [simple class syntax](https://gist.github.com/1329619)
that desugars nicely to ES3/5. I've loosely adapted it here, along with two other changes.

## THE CLASS SYNTAX

> `class [NAME] [extends EXPR] EXPR` 
>
> returns a Function

````javascript

// the new class syntax:

var X = class {
    init:function(x, y) {
        this.x = x
        this.y = y
    }
}

// desugars to:

var X = function(x, y) {
  if(this.init)
    this.init.apply(this, [].slice.call(arguments))
}

X.prototype.init = function(x, y) {
    this.x = x
    this.y = y
}

// named classes:

class GaryBusey {
    // `init` is the magic constructor.
    yell:function() {
        return "GLADLY"
    }
}


// and linking prototypes:

// to function constructors...
class MyList extends Array {
    map:function() {
        // superclass methods are available on `superclass`.
        return MyList.superclass.map.call(this, [].slice.call(arguments)) 
    }
}

// and objects.
class MyList extends {a:1} {
    a:2
}

````

## THE BINARY TIGHT-BINDING LOOKUP OPERATOR

> `[NAME | DOT | LOOKUP] : [NAME]`
>
> attempts to return a function bound to the LHS from an attribute on the RHS

This may prove to be a bad idea.

Basically, when a `:` is encountered in a terminal position in a lookup chain,
it automatically binds the function at the name being looked up to the rest of the chain.

An example:

````javascript

    var contrived = {
        examples : {
            are : {
                the: {
                    best:function() { return this.message }
                    message:"don't you think?"
                }
            }
        }
    }

    var a_note = contrived.examples.are.the:best

    a_note()    // === "don't you think?"

    // this actually desugars to:

    var a_note = contrived.examples.are.the.best.bind(contrived.examples.are.the)

    // #### WARNING, these are buggy right now. You cannot use them in ?: ternaries. ####

````

## THE UNARY TIGHT-BINDING OPERATOR

> `: EXPR`
>
> returns the function represented by EXPR bound to the current value of `this`.

When used in a unary position, the `colon` binds the function to the right to the current value of `this`.

````
var x = {
    messageFactory: function() {
        return :function() {
            console.log('message from '+this.name)
        }
    },
    name:"gary busey"
}


````

It binds tighter than most unary operations (due to a gross, hacky solution), so you can write functions like this:


````

class Parent {
    init:function(name, age) {
        this.name = name
    }
}

class Child extends Parent {
    init:function(name, age, toys) {
        this.toys = toys

        // ooo:
        :Child.superclass.init(name, age)
    }
}

````

## How to use

`require`'ing jabbascript will add a require hook for `.jsx` files. These files can contain the formulations above.

If you spot any bugs, lemme know. There's sure to be millions.

## An admonition

This is very much so a WIP. It is licensed MIT.
