const path = require('path')
const pico = require('pico-common')
const pUtil = require('picos-util')
const mods = require('./mods')
const cfg = require('./cfg')

function run(options, cb){
	mods.load(options, (err, context, appCfg)=>{
		if (err) return cb(err)
		function callback(err){
			cb(err, context, appCfg)
		}
		Object.assign(appCfg,{
			ajax:pUtil.ajax,
			paths: {
				'.': appCfg.workingPath + path.sep,
			},
			env:{
				env: appCfg.env,
				context,
				callback
			}
		})

		pico.run(appCfg, ()=>{
			const ctx = pico.env('context')
			const appCfg = ctx.config.app
			const apis = appCfg.apis || []
			appCfg.models = appCfg.models || []
			const models = [...appCfg.models.reduce((acc, url) => {
				Object.getPrototypeOf(require(url)).forEach(acc.add)
				return acc
			}, new Set)]

			return function(){
				function load(keys, deps, cb){
					if (!keys.length) return cb()
					const k=keys.shift()
					const v=deps[k]
					if (Array.isArray(v)){
						deps[k]=ctx[v[1]]
						return load(keys,deps,cb)
					}
					require(v, (err, mod)=>{
						if (err) return cb(err)
						mod.setup(ctx, err => {
							if (err) return cb(err)
							deps[k]=mod
							load(keys,deps,cb)
						})
					})
				}
				function loadAll(list, allDeps, allRoutes, cb){
					if (!list.length) return cb(null, allDeps, allRoutes)
					require(list.shift(), (err, api) => {
						if (err) return cb(err)
						const deps = api.deps

						load(Object.keys(deps), deps, err => {
							if (err) return cb(err)
							Object.assign(allDeps, deps)
							Object.assign(allRoutes, api.routes)
							loadAll(list, allDeps, allRoutes, cb)
						})
					})
				}
				// nodejs counterpart is in lib/mods
				function setup(list,cb){
					if (!list.length) return cb()
					const model=list.shift()
					model.setup(ctx, err => {
						if (err) return cb(err)
						setup(list,cb)
					})
				}

				const callback = pico.env('callback')

				let timerId=setTimeout(callback,5000,`failed to load ${appCfg.name} model`)

				setup(models, err => {
					if (err) return callback(err)
					clearTimeout(timerId)
					timerId=setTimeout(callback,5000,`failed to load ${appCfg.name} api`)
					loadAll(apis, {}, {}, (err, deps, routes) => {
						if (err) return callback(err)
						clearTimeout(timerId)
						ctx.sigslot.load(deps, routes)
						callback()
					})
				})
			}
		})
	})
}

require.main === module && run(cfg.parse(path.resolve(__dirname,'..')), err => {
	if (err) console.error(err)
})

module.exports = run
