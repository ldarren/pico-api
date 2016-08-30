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
console.log(1,base,env,ext)
	if (!base) return []
	var [appName,count]=base.split('-')
console.log(2,appName,count)

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

		if (!config || !config.app) return console.error('Error: incomplete config, config file must contain an app section')

		if (config.deps && options.path){
			var
			r = config.deps,
			p = path.dirname(options.path),
			[appName,count,env,json]=parseFname(options.path)

			for(var i=0,d; d=r[i]; i++){
				config = picoObj.extend(require(path.resolve(p,d)), config, mergeOpt) 
			}
		}

		var app=config.app
		if (app.path) console.warn('Warn: app.path[%s] is replaced by %s', app.path,rootPath)
		app.path= rootPath
		app.sigslot= new SigSlot()

		app.id=options.id
		app.name=options.name || appName
		app.env=options.env || env

		return config
    },
	parsePath:parseFname
}
