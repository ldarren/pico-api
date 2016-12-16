// TODO
// 1) app health check
// 2) simple load balancing if more than one instance running
const
cluster=require('cluster'),
http=require('http'),
fs=require('fs'),
path=require('path'),
args=require('pico-args'),
cfg=require('../lib/cfg'),
WorkerGrp=require('../lib/WorkerGrp'),
workerGrps={},
install=function(fpath){
    if (!fpath) return false
    const [appName,count,env,ext]=cfg.parsePath(fpath)
    if (appEnv !== env) return true
    uninstall(fpath)
	const grp=workerGrps[appName]=workerGrps[appName]=new WorkerGrp(appjs, appEnv)
	for(let i=0; i<count; i++){
		grp.add(path.resolve(watchPath,fpath))
	}
    console.log('installed',fpath)
    return true
},
uninstall=function(fpath){
    console.log('uninstalling',fpath)
    if (!fpath) return false
    const [appName,count,env,ext]=cfg.parsePath(fpath)
    if (appEnv !== env) return true
    const grp=workerGrps[appName]
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
    redirect(req, res, next){
        const appName=this.params.appName
        if (!appName) return next(`appMgr, invalid path:${this.api}`)

		const grp=workerGrps[appName]
        if (!grp) return next(`appMgr, invalid path:${this.api}`)
		const id=grp.select()

		console.info('redirecting to',appName,id)

		const proxy=http.request({
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
	install(input, next){
		const
		appName=input.appName,
		config=input.config,
		count=input.count||1
		if (!appName || !config) return next('missing appMgr.install params')
		const grp=workerGrps[appName]=workerGrps[appName]=new WorkerGrp(appjs, appEnv)
		for(let i=0,l=count||1; i<l; i++){
			grp.add(input)
		}
		console.log('installed',appName)
		next()
	},
	uninstall(input, next){
		const appName=input.appName
		console.log('uninstalling',appName)
		if (!appName) return next('missing appMgr.uninstall params')
		const grp=workerGrps[appName]
		if (!grp) return next() 
		grp.remove(grp.select())
		console.log('uninstalled',appName)
		next()
	}
}

let appEnv,appjs,watchPath

module.exports= {
    create(appConfig, libConfig, next){
        if (cluster.isWorker) return next('run on master only')

        const
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
				for(let i=0; install(fpaths[i]); i++);
				fs.watch(watchPath, {persistent:config.persistent}, watch)
				next(null, appMgr)
			})
		}else{
			next(null, appMgr)
		}
    }
}
