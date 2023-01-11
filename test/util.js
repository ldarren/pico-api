module.exports = {
	setup(context, cb){
		context.sigslot.signalAt('* * * * * *', 'sayHello')
		cb()
	},
	sep(msg, next){
		this.setOutput(msg)
		return next()
	},
	route(req, next){
		switch(req.method){
		case 'POST': return next()
		case 'GET': this.setOutput(this.time)
		// Falls through
		default: return next(null, this.sigslot.abort())
		}
	},
	help(next){
		next(this.error(404, `api ${this.api} is not supported yet`))
	},
	sayNow(next){
		this.setOutput(Date.now())
		next()
	}
}
