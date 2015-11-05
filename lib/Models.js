const
MODEL_TYPE={
    CUSTOM:0,
    WEB:1
},
MODEL_KEYS=[
    [],
    ['input','req','res','query','ack']
]

var
Models=function(type){
    var
    args = Array.prototype.slice.call(arguments, Models.length),
    keys=MODEL_TYPE[type]

    if (keys){
        for(var i=0,k; args.length,k=keys[i]; i++){
            this[k]=args.shift()
        }
    }
    this.type=type
    this.userData=args
}

Models.TYPE = MODEL_TYPE

Models.prototype={
    get: function(key){
        return this[key] = this[key] || {}
    }
}

module.exports=Models
