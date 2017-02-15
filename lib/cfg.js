const
path=require('path'),
args= require('pico-args'),
picoObj=require('pico-common').export('pico/obj'),
SigSlot= require('./SigSlot'),
mergeOpt = {mergeArr: true},
defaults= {
    path: ['', 'app config path'],
    p: '@path',
    config: [{}, 'app config json object'],
    c: '@config',
    name: ['', 'app name'],
    n: '@name',
    id: ['', 'app id'],
    i: '@id',
    env: ['', 'app environment'],
    e: '@env',
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

		const config= options.path ? require(path.resolve(process.cwd(),options.path)) : options.config
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

		const app=config.app || {}
		if (app.path) console.warn('Warn: app.path[%s] is replaced by %s', app.path,rootPath)
		app.path= rootPath
		app.sigslot= new SigSlot()

		app.id=options.id
		app.name=options.name || appName
		app.env=options.env || env

		config.app=app

		return config
    },
	parsePath:parseFname
}
