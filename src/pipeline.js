const path = require('path')
const pStr = require('pico-common').export('pico/str')
const pObj = require('pico-common').export('pico/obj')
const OverTime = require('./overtime')

const KEYWORDS = [
	'params',
	'next',
	'route',
	'data',
	'ptr'
]
const ERROR_ROUTE = 'ERR'

const SRC_SPEC = '@'
const SRC_CTX = '$'
const SRC_DATA = '_'

const TYPE_ARR = ':'
const SEP = '.'

/**
 * _host class
 *
 * @param {object} radix - radix tree for routing
 * @param {object} libs - loaded lib/module from spec
 * @param {object} routes - middleware routes
 * @param {number} [threshold=100] - max rpm
 *
 * @returns {object} - this
 */
function _host(radix, libs, routes, threshold){
	const overtime = new OverTime('s')
	const queue = []
	let RPM = threshold || 64

	/**
	 * Forward to next middelware
	 *
	 * @param {object} err - error object
	 * @param {string} named - if given it start the named pipeline instead of continuing the current pipeline
	 * @param {object} [data = this.data] - data use in current pipeline
	 * @returns {void} - no returns
	 */
	async function next(err, named, data = this.data || {}){
		if (err) {
			overtime.decr(1)
			throw err
		}
		if (null != named) {
			const params = {}
			const key = radix.match(named, params)
			let route = routes[key]
			if (!route) {
				route = key && routes[ERROR_ROUTE]
				if (!route) return console.error(`route[${named}] not found`)
			}
			overtime.incr()
			return next.call(Object.assign({}, libs, {params, next, route, data, ptr: 0}))
		}

		const middleware = this.route[this.ptr++]
		if (!middleware) {
			return overtime.decr(3)
		}

		const args = middleware.slice(1).map(key => {
			if (!Array.isArray(key)) return key

			let src
			switch(key[0]){
			case SRC_CTX:
				src = this
				break
			case SRC_DATA:
				src = data
				break
			default:
				return key
			}

			const path = key.slice(1)
			let arg = pObj.dot(src, path)
			if (arg) return arg
			if (SRC_DATA !== key[0] || key.length !== 2) return void 0

			switch(key[1].charAt(0)){
			case TYPE_ARR:
				src[path.join(SEP)] = arg = []
				break
			default:
				src[path.join(SEP)] = arg = {}
				break
			}
			return arg
		})
		const promise = middleware[0].apply(this, args)
		if (!promise) console.error(`${middleware[0].name} doesn't return a promise object`)
		await promise
	}

	/**
	 * Relief queue pressure
	 * this function execute next request in queue if there is any and current overtime is less than desired RPM
	 *
	 * @returns {void} - void if success and backoff time if no execution
	 */
	function relief(){
		if (!queue.length) return 1000
		let off = RPM - overtime.total()
		if (off < 0) return 1000
		while(off && queue.length){
			off--
			next(...queue.pop())
		}
		return queue.length ? 0 : 1000
	}

	/**
	 * Roll the pipeline
	 * implement backoff mechanism when no task in pipeline
	 *
	 * @returns {void} - no returns
	 */
	(function roll(){
		const ret = relief()
		if (ret) return setTimeout(roll, ret)
		process.nextTick(roll)
	}())

	return {
		go(url, data){
			queue.push([null, url, data])
			process.nextTick(relief)
		},
		// Listen to event such as route match, entering mw, leaving mw
		listen(mod, filter, instance){
		},
	}
}

module.exports = {
	async run(service, moddir, threshold){
		const radix = new pStr.Radix
		const mods = {}
		const libs = {}
		const routes = {}
		const paths = Object.keys(service.routes)
		const host = _host(radix, libs, routes, threshold)

		for (let i = 0, sm = service.mod, ids = Object.keys(sm), l = ids.length, cfg, id; i < l; i++){
			id = ids[i]
			cfg = sm[id]
			if (!id || KEYWORDS.includes(id)) throw `invalid id [${id}]`
			let mod
			switch(cfg.mod.charAt(0)){
			case '@':
				mod = require(path.join('..', 'mod', cfg.mod.substring(1)))
				break
			default:
				mod = require(path.resolve(moddir, cfg.mod))
				break
			}
			Object.assign(libs, {[id]: await mod.setup(host, cfg, service.rsc, paths)})
			mods[id] = mod
		}

		paths.forEach(key => {
			radix.add(key)
			const pipeline = service.routes[key]
			if (!Array.isArray(pipeline)) throw `invald routes ${key}`
			const mws = routes[key] = []
			pipeline.forEach((station, i) => {
				if (!Array.isArray(station) || !station.length) throw `invalid route ${key}.${station}`
				const method = station[0]
				let path = method
				let params = []
				if (Array.isArray(method)) {
					path = method[0]

					method.slice(1).forEach(param => {
						if (!param || !param.charAt){
							params.push(param)
							return
						}
						switch(param.charAt(0)){
						case SRC_SPEC:
							params.push(pObj.dot(service, (param.split(SEP)).slice(1)))
							break
						default:
							params.push(param)
							break
						}
					})
				}
				const arr = path.split(SEP)
				const mname = arr.pop()
				let obj
				switch(path.charAt(0)){
				case SRC_SPEC:
					obj = pObj.dot(service, arr.slice(1))
					break
				default:
					obj = pObj.dot(mods, arr)
					break
				}
				if (!obj || !obj[mname]) throw `undefined method key:${key} path:${path}`
				const func = obj[mname]
				const route = []
				if (Array.isArray(method)){
					route.push(func.apply(obj, params))
				}else{
					route.push(func)
				}
				station.slice(1).forEach(s => {
					if (null == s || !s.charAt) {
						route.push(s)
						return
					}
					switch(s.charAt(0)){
					case SRC_DATA:
					case SRC_CTX:
						route.push(s.split(SEP))
						break
					case SRC_SPEC:
						route.push(pObj.dot(service, (s.split(SEP)).slice(1)))
						break
					default:
						route.push(s)
						break
					}
				})
				mws.push(route)
			})
		})

		host.go('')
	}
}
