module.exports={
    setup: function(context, cb){
        var sigslot=context.sigslot
        //sigslot.signalAt('* * * * * *', 'sayHello')
        cb()
    },
    sep:function(msg,next){console.log(msg); return next()},
    route:function(req, next){
        switch(req.method){
        case 'POST': return next()
        case 'GET': this.setOutput(this.time)
        default: return next(null, this.sigslot.abort())
        }
    },
    help:function(next){
        next(`api ${this.api} is not supported by pico yet`)
    },
    sayHello:function(next){
        console.log(Date.now())
        next()
    }
}
