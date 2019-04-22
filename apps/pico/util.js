module.exports={
	setup(context, cb){
		//context.sigslot.signalAt('* * * * * *', 'sayHello')
		cb()
	},
	sep(msg,next){
		console.log(msg); return next()
	},
	route(req, next){
		switch(req.method){
		case 'POST': return next()
		case 'GET': this.setOutput(this.time)
		// fall through
		default: return next(null, this.sigslot.abort())
		}
	},
	help(next){
		next(this.error(404, `api ${this.api} is not supported yet`))
	},
	sayNow(next){
		console.log(Date.now())
		next()
	}
}
