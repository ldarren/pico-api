module.exports = {
	setup(){
	},
	sep(msg, out){
		Object.assign(out, {msg})
		return this.next()
	},
	route(req, out){
		switch(req.method){
		case 'POST': return this.next()
		case 'GET': Object.assign(out, {t: Date.now()})
		// Falls through
		default: return this.next()
		}
	},
	help(){
		return this.next(this.error(404, `api ${this.api} is not supported yet`))
	},
	sayNow(out){
		Object.assign(out, {now: Date.now()})
		return this.next()
	}
}
