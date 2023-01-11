const getSec = () => (new Date).getSeconds()
const getMin = () => (new Date).getMinutes()
const getHr = () => (new Date).getHours()

function start(ctx, interval, getIndex){
	setInterval(() => {
		const idx = getIndex()
		ctx.timebox[idx] = 0
		ctx.currBox = idx
	}, interval)
}

function OverTime(type, cb, cbObj){
	this.timebox = []
	this.slowCount = 0
	this.currBox = 0
	this.cb = cb
	this.cbObj = cbObj

	let interval = 1000
	let len = 60
	let timeFunc = getSec

	switch(type){
	case 's':
		break
	default:
	case 'm':
		interval *= 60
		timeFunc = getMin
		break
	case 'h':
		interval *= (60 * 60)
		len = 24
		timeFunc = getHr
		break
	}

	this.timebox.length = len
	this.timebox.fill(0)
	start(this, interval, timeFunc)
}

OverTime.prototype = {
	incr(){
		this.timebox[this.currBox] += 1
	},
	decr(){
		this.timebox[this.currBox] -= 1
		if (!this.cb) return
		this.cb.call(this.cbObj)
	},
	listen(cb, cbObj){
		this.cb = cb
		this.cbObj = cbObj
	},
	total(){
		return this.timebox.reduce((acc, c) => (acc + c), 0)
	},
	series(){
		return this.timebox.slice()
	}
}

module.exports = OverTime
