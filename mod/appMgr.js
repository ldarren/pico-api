// TODO
// 1) app health check
// 2) simple load balancing if more than one instance running
var
cluster=require('cluster'),
http=require('http'),
fs=require('fs'),
path=require('path'),
args=require('pico-args'),
cfg=require('../lib/cfg'),
WorkerGrp=require('../lib/WorkerGrp'),
workerGrps={},
appEnv,appjs,watchPath,
install=function(fpath){
    if (!fpath) return false
    var [appName,count,env,ext]=cfg.parsePath(fpath)
    if (appEnv !== env) return true
    uninstall(fpath)
	var grp=workerGrps[appName]=workerGrps[appName]=new WorkerGrp(appjs, appEnv)
	for(var i=0; i<count; i++){
		grp.add(path.resolve(watchPath,fpath))
	}
    console.log('installed',fpath)
    return true
},
uninstall=function(fpath){
    console.log('uninstalling',fpath)
    if (!fpath) return false
    var [appName,count,env,ext]=cfg.parsePath(fpath)
    if (appEnv !== env) return true
    var grp=workerGrps[appName]
    if (!grp) return true
	grp.removeAll()
    console.log('uninstalled',fpath)
    return true
},
watch=function(evt, fpath){
    switch(evt){
    case 'rename': uninstall(fpath); break
    case 'change': install(fpath); break
    }
},
appMgr={
    redirect:function(req, res, next){
        var appName=this.params.appName
        if (!appName) return next(`appMgr, invalid path:${this.api}`)

		var
		grp=workerGrps[appName],
		id=grp.select()

		console.info('redirecting to',appName,id)

		var proxy=http.request({
            socketPath:`/tmp/${appName}.${id}`,
            method:req.method,
            path:req.url,
            headers:req.headers
        }, (cres)=>{
            res.addListener('close', ()=>{ cres.destroy() })
            res.writeHeader(cres.statusCode, cres.headers)
            cres.pipe(res)
        })

		proxy.addListener('error', (err)=>{ this.error(404,err) })

        req.pipe(proxy)

		next()
    },
	install:function(input, next){
		var
		appName=input.appName,
		config=input.config,
		count=input.count||1
		if (!appName || !config) return next('missing appMgr.install params')
		var grp=workerGrps[appName]=workerGrps[appName]=new WorkerGrp(appjs, appEnv)
		for(var i=0,l=count||1; i<l; i++){
			grp.add(input)
		}
		console.log('installed',appName)
		next()
	},
	uninstall:function(input, next){
		var appName=input.appName
		console.log('uninstalling',appName)
		if (!appName) return next('missing appMgr.uninstall params')
		var grp=workerGrps[appName]
		if (!grp) return next() 
		grp.remove(grp.select())
		console.log('uninstalled',appName)
		next()
	}
}

module.exports= {
    create: function(appConfig, libConfig, next){
        if (cluster.isWorker) return next('run on master only')

        var
        config={
            path:'',			// config file location, appMgr can operate with config send over through http
            persistent:false	// watcher doens't keep program running
        },
        appPath= appConfig.path

        args.print('AppMgr Options',Object.assign(config,libConfig))

        appjs=path.resolve(appPath,'lib/app.js')

		if (config.path){
			appEnv=appConfig.env
			watchPath=path.resolve(appPath,config.path)

			fs.readdir(watchPath,(err, fpaths)=>{
				if (err) return next(err)
				for(var i=0; install(fpaths[i]); i++);
				fs.watch(watchPath, {persistent:config.persistent}, watch)
				next(null, appMgr)
			})
		}else{
			next(null, appMgr)
		}
    }
}
