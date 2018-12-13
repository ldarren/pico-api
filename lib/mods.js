// BUG in NODE_PATH as describe here https://github.com/s-a/iron-node/issues/98
// has to manually set in module.paths
module.paths.push(process.env.NODE_PATH)

const path = require('path')
function loadMods(keys, context, cb){
	if (!keys || !keys.length) {
		return cb(null, context)
	}

	const config = context.config, app = config.app, mods = config.mods
	const key = keys.shift()
	const value = mods[key]
	const mod=value.mod

	if (!mod) return loadMods(keys, context, cb) //ignore empty mod
	let m
	try {
		m = require(path.resolve(app.path, 'mod', mod))
	} catch(e) {
		m = require(mod)
	}

	m.create(app, value, (err, m)=>{
		if (err) console.error('failed to load module', mod, err)
		context[key] = m
		loadMods(keys, context, cb)
	})
}
function loadDeps(cwd, keys, deps, context, cb){
	if (!keys.length) return cb()

	const k=keys.shift()
	const v=deps[k]

	if (Array.isArray(v)){
		deps[k]=context[v[1]]
		return loadDeps(cwd, keys, deps, context, cb)
	}
	const m=require(path.resolve(cwd, v))
	deps[k]=m
	m.setup(context, (err)=>{
		if (err) return cb(err)
		loadDeps(cwd, keys, deps, context, cb)
	})
}
function loadApi(cwd, api, context, cb){
	loadDeps(cwd, Object.keys(api.deps), api.deps, context, (err)=>{
		if (err) return cb(err)
		context.sigslot.load(api.deps, api.routes, cb)
	})
}
function loadApis(cwd, apiPaths, context, cb){
	if (!apiPaths || !apiPaths.length) return cb()

	const apiPath = apiPaths.shift()
	const p=path.resolve(cwd,apiPath)

	let api

	try{
		api = require(p)
	}catch(ex){
		console.error('failed to load apis %s, exception: %s',apiPath,ex.message)
		return loadApis(cwd, apiPaths, context, cb)
	}

	loadApi(path.dirname(p), api, context, err => {
		if (err) return console.error(err)
		return loadApis(cwd, apiPaths, context, cb)
	})
}
function loadModel(models, context, cb){
	if (!models.length) return cb()
	const m = models.pop()
	m.setup(context, err => {
		if (err) return cb(err)
		loadModel(models, context, cb)
	})
}
function loadModels(cwd, modelPaths, context, cb){
	if (!modelPaths || !modelPaths.length) return cb()

	const models = []
	for (let i = 0, m; (m = modelPaths[i]); i++){
		models.push(...require(path.resolve(cwd, m)))
	}
	loadModel(models, context, cb)
}

module.exports = {
	load(config, cb){
		if (!config) return
		const app=config.app
		console.log('load modules', app.name, app.master ? 'master' : app.id)

		loadMods(config.mods ? Object.keys(config.mods) : void 0, {config: config, sigslot:app.sigslot}, (err, context) => {
			function exit(){
				for (let name in context){
					if (context[name].onexit) context[name].onexit()
				}
				process.exit(0)
			}
			process.on('SIGTERM', exit)
			// catches ctrl+c event
			process.on('SIGINT', exit)
			// catches "kill pid" (for example: nodemon restart)
			process.on('SIGUSR1', exit)
			process.on('SIGUSR2', exit)

			// let app load its apis and models
			if (!app.master || err) return cb(err, context, app)
			const cwd = process.cwd()
			loadApis(cwd, app.apis, context, err => {
				if (err) return cb(err, context, app)
				loadModels(cwd, app.models, context, err => {
					cb(err, context, app)
				})
			})
		})
	}
}
