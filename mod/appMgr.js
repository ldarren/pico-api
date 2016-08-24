// TODO
// 1) app health check
// 2) simple load balancing if more than one instance running
var
cluster=require('cluster'),
http=require('http'),
fs=require('fs'),
path=require('path'),
args=require('pico-args'),
workers={},
ext,appjs,watchPath,
install=function(fname){
    if (!fname) return false
    var base=path.basename(fname,ext)
    if (base===fname || -1!==base.indexOf('.')) return true
    uninstall(fname)
    cluster.setupMaster({exec:appjs, args:['-c',path.resolve(watchPath,fname)]})
    workers[base]=cluster.fork()
    console.log('installed',fname)
    return true
},
uninstall=function(fname){
    console.log('uninstalling',fname)
    if (!fname) return false
    var base=path.basename(fname,ext)
    if (base===fname || -1!==base.indexOf('.')) return true
    var worker=workers[base]
    if (!worker) return true
    worker.kill()
    delete workers[base]
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

		var proxy=http.request({
            socketPath:`/tmp/${appName}.sock`,
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
    }
}

module.exports= {
    create: function(appConfig, libConfig, next){
        if (cluster.isWorker) return next('run on master only')

        var
        config={
            path:'config/build',
            persistent:false
        },
        appPath= appConfig.path

        args.print('AppMgr Options',Object.assign(config,libConfig))

        ext=`.${appConfig.env}.json`
        appjs=path.resolve(appPath,'lib/app.js')
        watchPath=path.resolve(appPath,config.path)

        fs.readdir(watchPath,(err, fnames)=>{
            if (err) return next(err)
            for(var i=0; install(fnames[i]); i++);
            fs.watch(watchPath, {persistent:config.persistent}, watch)
            next(null, appMgr)
        })
    }
}
