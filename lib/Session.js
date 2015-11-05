const
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
Session=function(api, sigslot){
    this.time=Date.now()
    this.api=api
    this.sigslot=sigslot
    this._jobs=[]
    this._output=[]
},
dbExec = function(ctx, func, models, cb){
    if (!func || !models || !models.length) return cb()
    func.apply(ctx, models.concat([cb]))
},
dbUpdate = function(jobs, index, cb){
    var job=jobs[index++]
    if (!job) return cb()

    dbExec(job[JOB_CONTEXT], job[JOB_FUNC], job[JOB_MODEL_KEYS], function(err){
        if (err) return cb(err)
        dbUpdate(jobs, index, cb)
    })
}

Session.TYPE=SESSION_TYPE

Session.prototype = {
    commit: function(cb){
        dbUpdate(this._models, this._jobs, 0, cb)
    },
    // keys = [MID1,MID2,MID3]
    addJob:function(job, func, ctx){
        if (!modelValidate(this._models, job)) return 'invalid job desc'
        this._jobs.push([job, func, ctx])
    },
    setOutput:function(output, func, ctx){
        if (this._output.length) console.warn('output[%s] is being replaced by %s',this._output[0],output)
        this._output=[output,func,ctx]
    },
    getOutput:function(){
        var o=this._output
        if (o[1]) o[1].call(o[2], o[0])
        return o[0]
    },
    log:function(msg){
        picoStr.log(msg,'['+(Date.now()-this.time)+']')
    },
    error:function(code, msg){
        msg=msg||ERROR[code]
        picoStr.error(msg)
        return [code, msg]
    }
}

module.exports=Session
