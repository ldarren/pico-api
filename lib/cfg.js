var
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
	var
	fname=path.basename(fpath),
	[base,env,ext]=fname.split('.')
	if (!base) return []
	var [appName,count]=base.split('-')

	return [appName,parseInt(count)||1,env,ext]
}

module.exports = {
    parse: function(rootPath){
		var
		options = args.parse(defaults),
		config

		if (!options || options.help){
			args.usage(defaults)
			process.exit(0)
		}

		if (options.path){
			config = require(path.resolve(rootPath,options.path))
		}else{
			config=options.config
		}

		if (!config) return console.error('Error: incomplete config')

		if (options.path){
			var [appName,count,env,ext]=parseFname(options.path)
			if (config.deps){
				let	
				r = config.deps,
				p = path.dirname(options.path)
				for(let i=0,d; d=r[i]; i++){
					config = picoObj.extend(require(path.resolve(p,d)), config, mergeOpt) 
				}
			}
		}

		var app=config.app || {}
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
