var
picoStr=require('pico').export('pico/str'),
SESSION_TYPE={
    CUSTOM:0,
    WEB:1
},
SESSION=[
    [],
    ['data','time','req','res','query','ack']
],
Session=function(type){
    var
    args = Array.prototype.slice.call(arguments, Session.length),
    sess=SESSION[type]

    for(var i=0,s; s=sess[i]; i++){
        this[s]=args.shift()
    }

    this.type=type
    this.time=this.time||Date.now()
    this.userData=args
    this.jobs=[]
}

Session.prototype = {
    addJob:function(modelInfos, func, context){
        this.jobs.push(Array.prototype.slice.call(arguments))
    },
    data: function(){return this.data},
    log: picoStr.log,
    error: picoStr.error
}

module.exports=Session
