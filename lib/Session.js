const
MODEL_KEYS={},
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
},

pStr=require('pico-common').export('pico/str'),
jobFunc = function(ctx, func, models, cb){
    if (!func || !models || !models.length) return cb()
    func.apply(ctx, models.concat([cb]))
},
jobRun = function(jobs, index, cb){
    const job=jobs[index++]
    if (!job) return cb()

    jobFunc(job[JOB_CONTEXT], job[JOB_FUNC], job[JOB_MODEL_KEYS], (err)=>{
        if (err) return cb(err)
        jobRun(jobs, index, cb)
    })
}

function Session(){}

Session.alloc=function(){
    const sess=new Session()
    sess.init(...arguments)
    return sess
}
Session.addType=function(key,type){
	const old=MODEL_KEYS[key]
	if (old) console.warn(`Session.model[${key}] changed from ${old} to ${type}`)
	MODEL_KEYS[key]=type
}

Session.prototype = {
	/*
	 * @param params: rest api params, params will be stored in ctx.userData, args overwrite params if same key occurred
	 * @param args: arguments pass in from signal function, undefined args will be store in ctx.args
	 */
    init(api, sigslot, type, params, args){
        this.models={}
        this.jobs=[]
        this.output=[]

        if (type){
            for(let i=0,keys=MODEL_KEYS[type],m=this.models,k; args.length,k=keys[i]; i++){
                m[k]=args.shift()
            }
        }
        this.type=type
        this.params=params // rest params
        this.args=args // remaining arguments
        this.time=Date.now()
        this.api=api
        this.sigslot=sigslot
    },
    clone(api, sigslot, type, m, time, userData){
        this.models=m
        this.jobs=[]
        this.output=[]

        this.type=type
        this.userData=userData
        this.time=time
        this.api=api
        this.sigslot=sigslot
    },
    fork(api){
        const sess=new Session()
        sess.clone(api, this.sigslot, this.type, models, this.time, this.userData)
        this.sigslot.signalWithSession(api, sess)
    },
    getKeys(type){
        return MODEL_KEYS[type].slice()
    },
    has(key){
        return !!this.models[key]
    },
    getReadonly(key){ return this.models[key] },
    get(key){ const m=this.models; return m[key] = m[key] || {} },
    getArray(key){ const m=this.models; return m[key] = m[key] || [] },
    getSet(key){ const m=this.models; return m[key] = m[key] || new Set },
    getWeakSet(key){ const m=this.models; return m[key] = m[key] || new WeakSet },
    getMap(key){ const m=this.models; return m[key] = m[key] || new Map },
    getWeakMap(key){ const m=this.models; return m[key] = m[key] || new WeakMap },
    set(key, value){
        return this.models[key] = value
    },
    commit(cb){
        jobRun(this.jobs, 0, cb)
    },
    // keys = [MID1,MID2,MID3]
    addJob(job, func, ctx){
        this.jobs.push([job, func, ctx])
    },
    setOutput(obj, func, ctx){
        const o=this.output
        if (o.length) console.warn('output[%s] is being replaced by %s',o[0],obj)
        this.output=[obj,func,ctx]
    },
    getOutput(){
        const o=this.output
        if (o[1]) o[1].call(o[2], o[0])
        return o[0]
    },
    log:function callee(...args){
        args.push(`[${Date.now()-this.time}]`)
        pStr.log(callee,...args)
    },
    error:function callee(code, msg=ERROR[code], ...args){
        pStr.error(callee,msg,...args)
        return [code, msg]
    }
}

module.exports=Session
