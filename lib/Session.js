var
picoStr=require('pico').export('pico/str'),
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
