var
cluster=require('cluster'),
http=require('http'),
fs=require('fs'),
path=require('path'),
picoObj=require('pico').export('pico/obj'),
args=require('../lib/args'),
loader=function(){
},
appMgr={
    load:loader,
    redirect:function(session, models, next){
        var
        req=session.req,
        res=session.res

        req.pipe(http.request({
            socketPath:'/tmp'+req.url+'.sock',
            method:req.method,
            path:req.url,
            headers:req.headers
        }, function(cres){
            res.writeHeader(cres.statusCode, cres.headers)
            cres.pipe(res)
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

        args.print('AppMgr Options',picoObj.extend(config,libConfig))

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
