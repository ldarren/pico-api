const
path=require('path'),
args= require('pico-args'),
picoObj=require('pico-common').export('pico/obj'),
SigSlot= require('./SigSlot'),
mergeOpt = {mergeArr: true},
defaults= {
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
},
parseFname=function(fpath){
	const
	fname=path.basename(fpath),
	[base,env,ext]=fname.split('.')
	if (!base) return []
	const [appName,count]=base.split('-')

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
			configPath=path.resolve(process.cwd(),options.path)
			config= require(configPath)
		}else{
			config= options.config
		}
		if (!config) return console.error('Error: missing config',options.path)

		if (options.path){
			var [appName,count,env,ext]=parseFname(options.path)
			if (config.deps){
				const
				r = config.deps,
				p = path.dirname(options.path)
				for(let i=0,d; d=r[i]; i++){
					config = picoObj.extend(require(path.resolve(p,d)), config, mergeOpt) 
				}
			}
		}

		const app = config.app
		if (app.path) console.warn('Warn: app.path[%s] is replaced by %s', app.path, rootPath)

		Object.assign(app, {
			path: rootPath, // picos path
			workingPath: path.resolve(process.cwd(), options.dir), // instance path
			configPath: path.dirname(configPath), // config path
			sigslot: new SigSlot(app.signalTTL),

			id: options.id || app.id,
			master: options.master || app.master,
			name: options.name || appName || app.name,
			env: options.env || env || app.env
		})

		return config
    },
	parsePath:parseFname
}
