// TODO
// 1) app health check
// 2) simple load balancing if more than one instance running
var
cluster=require('cluster'),
http=require('http'),
fs=require('fs'),
path=require('path'),
args=require('pico-args'),
WorkerGrp=require('../lib/WorkerGrp'),
workerGrps={},
ext,appjs,watchPath,
install=function(fname){
    if (!fname) return false
    var base=path.basename(fname,ext)
    if (base===fname || -1!==base.indexOf('.')) return true
	var [appName,count]=base.split('-')
    uninstall(fname)
	var grp=workerGrp[appName]=workerGrp[appName]=new WorkerGrp(appName,appjs)
	for(var i=0,l=parseInt(count)||1; i<l; i++){
		grp.add(path.resolve(watchPath,fname))
	}
    console.log('installed',fname)
    return true
},
uninstall=function(fname){
    console.log('uninstalling',fname)
    if (!fname) return false
    var base=path.basename(fname,ext)
    if (base===fname || -1!==base.indexOf('.')) return true
	var [appName,count]=base.split('-')
    var grp=workerGrp[appName]
    if (!grp) return true
	grp.removeAll()
    console.log('uninstalled',fname)
    return true
},
watch=function(evt, fname){
    switch(evt){
    case 'rename': uninstall(fname); break
    case 'change': install(fname); break
    }
},
appMgr={
    redirect:function(req, res, next){
        var appName=this.params.appName
        if (!appName) return next(`appMgr, invalid path:${this.api}`)
		console.info('redirecting to',appName)
		var
		grp=this.workerGrp[appName],
		id=grp.select()

		var proxy=http.request({
            socketPath:`/tmp/${appName}-${id}.sock`,
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
		if (!fname || !config) return next('missing appMgr.install params')
		var grp=workerGrp[appName]=workerGrp[appName]=new WorkerGrp(appName,appjs)
		for(var i=0,l=count||1; i<l; i++){
			grp.add(null,config)
		}
		console.log('installed',fname)
		next()
	},
	uninstall:function(input, next){
		var appName=input.appName
		console.log('uninstalling',appName)
		if (!appName) return next('missing appMgr.uninstall params')
		var grp=workerGrp[appName]
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
			ext=`.${appConfig.env}.json`
			watchPath=path.resolve(appPath,config.path)

			fs.readdir(watchPath,(err, fnames)=>{
				if (err) return next(err)
				for(var i=0; install(fnames[i]); i++);
				fs.watch(watchPath, {persistent:config.persistent}, watch)
				next(null, appMgr)
			})
		}else{
			next(null, appMgr)
		}
    }
}
