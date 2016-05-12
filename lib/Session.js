const
MODEL_TYPE={
    CUSTOM:0,
    WEB:1,
    BLE:2,
    CMD:3,
	REDIS:4
},
MODEL_KEYS=[
    [],
    ['input','req','res','query','ack','render'],
    ['input','offset','characteristic','callback','render'],
    ['input','render'],
    ['input','channel']
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

function Session(){}

Session.TYPE=MODEL_TYPE
Session.alloc=function(){
    var sess=new Session()
    sess.init(...arguments)
    return sess
}

Session.prototype = {
    TYPE:MODEL_TYPE,
    init:function(api, sigslot, type, args){
        this.models={}
        this.jobs=[]
        this.output=[]

        if (type){
            var
            keys=MODEL_KEYS[type],
            m=this.models
            for(var i=0,k; args.length,k=keys[i]; i++){
                m[k]=args.shift()
            }
        }
        this.type=type
        this.userData=args
        this.time=Date.now()
        this.api=api
        this.sigslot=sigslot
    },
    clone:function(api, sigslot, type, m, time, userData){
        this.models=m
        this.jobs=[]
        this.output=[]

        this.type=type
        this.userData=userData
        this.time=time
        this.api=api
        this.sigslot=sigslot
    },
    fork:function(api){
        var sess=new Session()
        sess.clone(api, this.sigslot, this.type, models, this.time, this.userData)
        this.sigslot.signalWithSession(api, sess)
    },
    getKeys:function(type){
        return MODEL_KEYS[type].slice()
    },
    has:function(key){
        return !!this.models[key]
    },
    get:function(key, def){
        var m=this.models
        return m[key] = m[key] || def || {}
    },
    set:function(key, value){
        return this.models[key] = value
    },
    commit:function(cb){
        dbUpdate(this.jobs, 0, cb)
    },
    // keys = [MID1,MID2,MID3]
    addJob:function(job, func, ctx){
        this.jobs.push([job, func, ctx])
    },
    setOutput:function(obj, func, ctx){
        var o=this.output
        if (o.length) console.warn('output[%s] is being replaced by %s',o[0],obj)
        this.output=[obj,func,ctx]
    },
    getOutput:function(){
        var o=this.output
        if (o[1]) o[1].call(o[2], o[0])
        return o[0]
    },
    log:function(...args){
        args.push('['+(Date.now()-this.time)+']')
        picoStr.log(...args)
    },
    error:function(code, msg){
        msg=msg||ERROR[code]
        picoStr.error(msg)
        return [code, msg]
    }
}

module.exports=Session
