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

    this.jOBS=[]
    this.oUTPUT=null
}

Session.TYPE=SESSION_TYPE

Session.prototype = {
    addJob:function(models, job, func, context){
        if (!models.check(job)) return 'invalid job desc'
        this.jOBS.push(Array.prototype.slice.call(arguments, 1))
    },
    getJobs:function(){
        return this.jOBS
    },
    setOutput:function(key, models){
        if (this.oUTPUT) console.warn('output[%s] is being replaced by %s',this.oUTPUT,key)
        if ('object' === typeof models) this.oUTPUT=models[key]
        else this.oUTPUT=key
    },
    getOutput:function(){
        return this.oUTPUT
    },
    log: picoStr.log,
    error: picoStr.error
}

module.exports=Session
