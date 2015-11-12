const
MODEL_TYPE={
    CUSTOM:0,
    WEB:1
},
MODEL_KEYS=[
    [],
    ['input','req','res','query','ack']
],
JOB_MODEL_KEYS = 0,
JOB_FUNC = 1,
JOB_CONTEXT = 2,
ERROR = {
    200: 'OK',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    415: 'Unsupported Media Type',
    419: 'Authentication Timeout',
    500: 'Internal Server Error'
}

var
picoStr=require('pico').export('pico/str'),
sessions=[],
dbExec = function(ctx, func, models, cb){
    if (!func || !models || !models.length) return cb()
    func.apply(ctx, models.concat([cb]))
},
dbUpdate = function(jobs, index, cb){
    var job=jobs[index++]
    if (!job) return cb()

    dbExec(job[JOB_CONTEXT], job[JOB_FUNC], job[JOB_MODEL_KEYS], (err)=>{
        if (err) return cb(err)
        dbUpdate(jobs, index, cb)
    })
}

function Session(){
    var jobs=output=models=null

    this.init=function(api, sigslot, type, args){
        models={}
        jobs=[]
        output=[]

        if (type){
            var keys=MODEL_KEYS[type]
            for(var i=0,k; args.length,k=keys[i]; i++){
                models[k]=args.shift()
            }
        }
        this.type=type
        this.userData=args
        this.time=Date.now()
        this.api=api
        this.sigslot=sigslot
    }
    this.clone=function(api, sigslot, type, m, time, userData){
        models=m
        jobs=[]
        output=[]

        this.type=type
        this.userData=userData
        this.time=time
        this.api=api
        this.sigslot=sigslot
    }
    this.fork=function(api){
        var sess=sessions.pop() || new Session()
        sess.clone(api, this.sigslot, this.type, models, this.time, this.userData)
        this.sigslot.signalWithSession(api, sess)
    }
    this.free=function(){
        jobs= models= output= this.type= this.userData= this.time= this.api= this.sigslot=null
        sessions.push(this)
    }
    this.get=function(key){
        return models[key] = models[key] || {}
    }
    this.set=function(key, value){
        return models[key] = value
    }
    this.commit=function(cb){
        dbUpdate(jobs, 0, cb)
    }
    // keys = [MID1,MID2,MID3]
    this.addJob=function(job, func, ctx){
        jobs.push([job, func, ctx])
    }
    this.setOutput=function(obj, func, ctx){
        if (output.length) console.warn('output[%s] is being replaced by %s',output[0],obj)
        output=[obj,func,ctx]
    }
    this.getOutput=function(){
        if (output[1]) output[1].call(output[2], output[0])
        return output[0]
    }
}

Session.prototype = {
    log:function(){
        var wtime=Array.prototype.slice.call(arguments)
        wtime.push('['+(Date.now()-this.time)+']')
        picoStr.log.apply(picoStr, wtime)
    },
    error:function(code, msg){
        msg=msg||ERROR[code]
        picoStr.error(msg)
        return [code, msg]
    }
}

module.exports={
    TYPE: MODEL_TYPE,
    alloc: function(){
        var sess=sessions.pop() || new Session()
        sess.init.apply(sess, arguments)
        return sess
    },
    free: function(sess){
        sess.free()
    }
}
