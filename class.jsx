class Mammal {
  init: function(saying) {
    this.saying = saying
  }
, say_hi:function() {
    return this.saying + """
      hello world
    """
  }
}

class Cat extends Mammal {
  init:function() {
    :Cat.superclass.init("mew") 
  }
, say_hi:function() {
    console.log('saying hi', :Cat.superclass.say_hi())
    return 'meow '+:Cat.superclass.say_hi() 
  }
}

var cat = new Cat

console.log(cat.say_hi())

console.log(""" say "hi" """ + ''' "say 'bye'" ''')
