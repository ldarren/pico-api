const HEADERS = {
	'Content-Type': 'text/event-stream',
	'Connection': 'keep-alive',
	'Cache-Control': 'no-cache'
}

const clients = {}

function pack(evt, data){
	return `event: ${evt}\ndata: ${JSON.stringify(data)}\n\n`
}

function connect(req, res, id){
	res.writeHead(200, HEADERS)

	res.write(pack('connected', id))

	clients[id] = res

	req.on('close', () => {
		delete clients[id]
	})
}

module.exports = {

	setup(host, cfg, rsc, paths){
	},

	connect(req, res, id){
		connect(req, res, id)
		return this.next()
	},

	find(id){
		const c = clients[id]
		if (!c) return this.next('not found')
		return this.next()
	},

	send(evt, id, data){
		const c = clients[id]
		if (!c) return this.next()
		c.write(pack(evt, data))
		return this.next()
	},

	sendAll(evt, data){
		Object.keys(clients).forEach(id => clients[id].write(pack(evt, data)))
		return this.next()
	},
}
