const os = require('os')
const pLib = require('pico-common')
const pObj = pLib.export('pico/obj')
const randex = require('randexp').randexp

/**
 * Group object's array to array objects
 *
 * @param {object} input - parsed querystring
 * @param {Array} grouping - keys to be group
 * @param {Array} output - output array
 * @returns {Array} - output array
 */
function groupQuery(input, grouping, output = []){
	for (let i = 0, keys, val0; (keys = grouping[i]); i++){
		val0 = input[keys[0]]
		if (!val0) continue
		if (Array.isArray(val0)){
			for (let j = 0, l = val0.length; j < l; j++){
				output.push(keys.reduce((acc, key) => {
					acc[key] = input[key][j]
					return acc
				}, {}))
			}
		}else{
			output.push(keys.reduce((acc, key) => {
				acc[key] = input[key]
				return acc
			}, {}))
		}
	}
	return output
}

module.exports = {
	setup(cfg, rsc, paths){
		return module.exports
	},

	async wait(sec){
		await new Promise((resolve, reject) => {
			setTimeout(resolve, sec)
		})
		return this.next()
	},

	log(...args) {
		// eslint-disable-next-line no-console
		console.log(...args)
		return this.next()
	},

	/*
	 * Example route "/1.0/snode/key/:id"
	 * [["util.router", "id", "/snode", "/key"], "_.req.method", "_.params"]
	 */
	router: (key, rsc, postfix) => async function (method, params){
		const id = params[key] ? postfix : ''
		const name = `${method}/${rsc}${id}`
		await this.next(null, name)
		return this.next()
	},

	routerByRSC: (rsc, prefix = '/i') => async function(method, params) {
		const rs = rsc[params.rsc]
		if (!rs) return this.next(`unsupprted resource: ${params.rsc}`)
		const idx = params.i ? prefix : ''
		const name = `${method}/${params.rsc}${idx}`
		await this.next(null, name, Object.assign({
			params,
			rs
		}, this.data))
		return this.next()
	},

	input: spec => function(input, output, ext) {
		const err = pObj.validate(spec, input, output, ext)
		if (err) return this.next(`invalid params [${err}]`)
		return this.next()
	},

	inputNoCurry(input, spec, output, ext) {
		const err = pObj.validate(spec, input, output, ext)
		if (err) return this.next(`invalid params [${err}]`)
		return this.next()
	},

	group(input, grouping, output){
		if (Array.isArray(grouping) && grouping.length){
			Object.assign(output, {group: groupQuery(input, grouping)}, input)
		} else {
			Object.assign(output, input)
		}
		return this.next()
	},

	extend(...args){
		const output = args.pop()
		pObj.extends(output, args)
		return this.next()
	},

	dot(input, path, output, def){
		if (Array.isArray(output)){
			output.push(...pObj.dot(input, path, def))
		}else{
			Object.assign(output, pObj.dot(input, path, def))
		}
		return this.next()
	},

	lib: (id, funcName) => {
		const lib = pLib.export(id)
		const func = lib[funcName]
		if (!func) throw `${funcName} not found in ${id}`

		return function(...args){
			func.apply(lib, args)
			return this.next()
		}
	},

	pop(array, out){
		if (Array.isArray(array) && array.length) Object.assign(out, array.pop())
		return this.next()
	},

	push(array, ...item){
		array.push(...item)
		return this.next()
	},

	spawn(schema, ext, count, output){
		const opt = Object.assign({randex}, ext)
		for(let i = 0; i < count; i++){
			output.push(pObj.create(schema, opt))
		}
		return this.next()
	},

	add(value, key, output){
		output[key] = value
		return this.next()
	},

	async detour(url, data){
		await this.next(null, url, data)
		return this.next()
	},

	branch(url, data){
		return this.next(null, url, data)
	},

	deadend(err){
		return this.next(err)
	},

	async silence(res, errors){
		try {
			await this.next()
		}catch(ex){
			if (!errors.includes(ex)) console.error(ex)
			if (!res) return
			res.writeHead(400)
			res.end()
		}
	},

	networkInterface(name, cond = {}){
		const filter = addr => Object.keys(cond).every(key => cond[key] === addr[key])
		const ni = os.networkInterfaces()
		const addrs = Object.keys(ni).reduce((acc, key) => {
			if (name && name !== key) return acc
			const list = ni[key]
			acc.push(...list.filter(filter))
			return acc
		}, [])

		return function(key, output){
			if (key) addrs.reduce((acc, net) => {
				acc.push(net[key]); return acc
			}, output)
			else output.push(...addrs)
			return this.next()
		}
	},

	match(a, b){
		return Object.keys(a).every(k => a[k] === b[k])
	}
}
