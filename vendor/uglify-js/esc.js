var x = {
      y: function() {
                   return function() {
                                 return this.z;
                                         }.bind(this);
                       },
             z: 3
};

console.log(x.y()())
