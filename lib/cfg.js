const path = require('path')
const args = require('pico-args')
const SigSlot = require('./SigSlot')
const pObj = require('pico-common').export('pico/obj')
const defaults = {
	path: ['', 'app config path'],
	p: '@path',
	config: [void 0, 'app config json object'],
	c: '@config',
	dir: ['', 'relative working directory to current dir'],
	d: '@dir',
	name: ['', 'app name'],
	n: '@name',
	id: ['', 'app id'],
	i: '@id',
	env: ['', 'app environment'],
	e: '@env',
	master: [false, 'run as master in cluster mode'],
	m: '@master',
	help: [false, 'show this help'],
	h: '@help'
}

function parseFname(fpath){
	const fname = path.basename(fpath)
	const [base,env,ext] = fname.split('.')
	if (!base) return []
	const [appName,count] = base.split('-')

	// TODO: count is ignored for now, always 1 fork
	return [appName,parseInt(count)||require('os').cpus().length,env,ext]
}

module.exports = {
	parse(rootPath, force){
		const options = args.parse(Object.assign(defaults, force))

		if (!options || options.help){
			args.usage(defaults)
			process.exit(0)
		}

		let configPath,config
		if (options.path){
			var [appName,count_,env,ext_]=parseFname(options.path)
			configPath=path.resolve(process.cwd(),options.path)
			config= require(configPath)
		}else{
			config= options.config
		}
		if (!config) return console.error('Error: missing config',options.path)

		configPath = path.dirname(configPath)
		const deps = config.deps
		if (deps && Array.isArray(deps)){
			deps.reduce((acc, p) => pObj.extend(acc, require(path.join(configPath, p))), config)
		}

		const app = config.app
		if (app.path && app.path !== rootPath) console.warn('Warn: app.path[%s] is replaced by %s', app.path, rootPath)

		Object.assign(app, {
			path: rootPath, // picos path
			workingPath: path.resolve(process.cwd(), options.dir), // instance path
			configPath, // config path
			sigslot: new SigSlot(app.signalTTL),

			id: options.id || app.id,
			master: app.master || options.master,
			name: options.name || appName || app.name,
			env: options.env || env || app.env
		})

		return config
	},
	parsePath:parseFname
}
