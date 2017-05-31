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

	return [appName,parseInt(count)||require('os').cpus().length,env,ext]
}

module.exports = {
    parse(rootPath){
		const options = args.parse(defaults)

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

		if (config.app.path) console.warn('Warn: app.path[%s] is replaced by %s', config.app.path,rootPath)
		const app=Object.assign(config.app,{
			path: rootPath,
			configPath:path.dirname(configPath),
			sigslot: new SigSlot(),

			id:options.id,
			master:options.master,
			name:options.name || appName,
			env:options.env || env
		})

		config.app=app

		return config
    },
	parsePath:parseFname
}
