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

    if (sess){
        for(var i=0,s; s=sess[i]; i++){
            this[s]=args.shift()
        }
    }

    this.type=type
    this.time=this.time||Date.now()
    this.userData=args
    this.jobs=[]
}

Session.TYPE=SESSION_TYPE

Session.prototype = {
    addJob:function(models, job, func, context){
        if (!models.check(job)) return 'invalid job desc'
        this.jobs.push(Array.prototype.slice.call(arguments, 1))
    },
    job: function(){
        var j = []
        for(var i=0,l=arguments.length; i<l;){
            j.push([arguments[i++],arguments[i++]])
        }
        return j
    },
    data: function(){return this.data},
    log: picoStr.log,
    error: picoStr.error
}

module.exports=Session
