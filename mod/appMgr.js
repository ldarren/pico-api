// TODO
// 1) app health check
// 2) simple load balancing if more than one instance running
const http=require('http')
const fs=require('fs')
const path=require('path')
const args=require('pico-args')
const util=require('picos-util')
const cfg=require('../lib/cfg')
const WorkerGrp=require('../lib/WorkerGrp')
const workerGrps={}

let appEnv, appjs, watchPath, config

function install(fpath){
	if (!fpath) return false
	const [appName,count,env,ext_]=cfg.parsePath(fpath)
	if (appEnv !== env) return true
	uninstall(fpath)
	const grp=workerGrps[appName]=workerGrps[appName]=new WorkerGrp(appjs, appEnv)
	for(let i=0; i<count; i++){
		grp.add(path.resolve(watchPath,fpath))
	}
	console.info('installed',fpath)
	return true
}
function uninstall(fpath){
	console.info('uninstalling',fpath)
	if (!fpath) return false
	const [appName,count_,env,ext_]=cfg.parsePath(fpath)
	if (appEnv !== env) return true
	const grp=workerGrps[appName]
	if (!grp) return true
	grp.removeAll()
	console.info('uninstalled',fpath)
	return true
}
function watch(evt, fpath){
	switch(evt){
	case 'rename': uninstall(fpath); break
	case 'change': install(fpath); break
	}
}
function removeAll(){
	for (let name in workerGrps){
		workerGrps[name].removeAll()
	}
	// process.exit is done in lib/mods
}

process.on('exit', removeAll)

const appMgr = {
	redirect(req, res, next){
		const appName=this.params.appName
		const grp=workerGrps[appName]
		if (!appName || !grp) return next(this.error(400, `appMgr, invalid path:${this.api}`))

		const id=grp.select()

		console.info('redirecting to',appName,id)

		const proxy=http.request({
			socketPath:`/tmp/${appName}.${id}`,
			method:req.method,
			path: config.stripUri ? '/' + this.params.appPath : req.url,
			headers:req.headers
		}, cres => {
			res.addListener('close', () => cres.destroy() )
			res.writeHeader(cres.statusCode, cres.headers)
			cres.pipe(res)
		})

		proxy.addListener('error', err => next(this.error(404,err)) )

		req.pipe(proxy)

		next()
	},
	ajax(appName, method, href, params, opt, cb){
		const grp=workerGrps[appName]
		if (!appName || !grp) return cb(this.error(400, `appMgr: invalid path:${this.api}`))

		opt = opt || {}
		opt.socketPath=`/tmp/${appName}.${grp.select()}`,
		util.ajax(method, href, params, opt, cb)
	},
	install(input, next){
		const
			appName=input.appName,
			config1=input.config,
			count=input.count||1
		console.info('install', input)
		if (!appName || !config1) return next('missing appMgr.install params')
		const grp=workerGrps[appName]=workerGrps[appName]=new WorkerGrp(appjs, appEnv)
		for(let i=0,l=count||1; i<l; i++){
			grp.add(input)
		}
		console.info('installed',appName)
		next()
	},
	uninstall(input, next){
		const appName=input.appName
		console.info('uninstalling',appName)
		if (!appName) return next('missing appMgr.uninstall params')
		const grp=workerGrps[appName]
		if (!grp) return next()
		grp.remove(grp.select())
		console.info('uninstalled',appName)
		next()
	}
}

module.exports = {
	create(appConfig, libConfig, next){
		config = {
			path:'',			// config file location, appMgr can operate with config send over through http
			stripUri:true,		// It may be desirable to specify a URI prefix to match an API, but not include it in the upstream request
			persistent:false	// watcher doens't keep program running
		}

		args.print('AppMgr Options',Object.assign(config,libConfig))

		appjs=path.resolve(appConfig.path,'lib/app.js')

		if (config.path){
			appEnv=appConfig.env
			watchPath=path.resolve(appConfig.configPath,config.path)

			fs.readdir(watchPath,(err, fpaths)=>{
				if (err) return next(err)
				for(let i=0; install(fpaths[i]); i++);
				fs.watch(watchPath, {persistent:config.persistent}, watch)
				next(null, appMgr)
			})
		}else{
			next(null, appMgr)
		}
	}
}
