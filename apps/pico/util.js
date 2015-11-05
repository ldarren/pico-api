module.exports={
    sep:function(next){console.log('###'); return next()},
    route:function(req, evt, next){
        switch(req.method){
        case 'POST': return next()
        case 'GET': this.setOutput(evt.time)
        default: return next(null, this.sigslot.abort())
        }
    },
    help:function(next){
        next(`api ${this.api} is not supported by pico yet`)
    }
}
