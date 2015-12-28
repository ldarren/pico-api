// TODO
// 1) app health check
// 2) simple load balancing if more than one instance running
var
cluster=require('cluster'),
http=require('http'),
fs=require('fs'),
path=require('path'),
args=require('../lib/args'),
loader=function(){
},
appMgr={
    load:loader,
    redirect:function(req, res, next){
        var arr=this.api.split('/')
        if (2 > arr.length || !arr[1]) return next('invalid path for appMgr')

        req.pipe(http.request({
            socketPath:'/tmp/'+arr[1]+'.sock',
            method:req.method,
            path:req.url,
            headers:req.headers
        }, function(cres){
            res.writeHeader(cres.statusCode, cres.headers)
            cres.pipe(res)
            res.addListener('close', function(){
                cres.destroy()
            })
        }))
    }
}

module.exports= {
    create: function(appConfig, libConfig, next){
        if (cluster.isWorker) return next('run on master only')

        var
        config={
            path:'config/build'
        },
        appPath= appConfig.path,
        ext='.'+appConfig.env+'.json',
        fn

        args.print('AppMgr Options',Object.assign(config,libConfig))

        fs.readdir(path.resolve(appPath, config.path),function(err, fnames){
            if (err) return next(err)
            for(var i=0,fname; fname=fnames[i]; i++){
                fn=path.basename(fname,ext)
                if (-1!==fn.indexOf('.')) continue
                cluster.setupMaster({exec:path.resolve(appPath,'lib/app.js'), args:['-c',path.resolve(appPath,config.path,fname)]})
                cluster.fork()
            }
            next(null, appMgr)
        })
    }
}
