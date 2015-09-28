var
cluster=require('cluster'),
fs=require('fs'),
path=require('path'),
picoObj=require('pico').export('pico/obj'),
args=require('../lib/args'),
loader=function(){
},
appMgr={
    load:loader
}

module.exports= {
    create: function(appConfig, libConfig, next){
        if (cluster.isWorker) return next('run on master only')

        var
        config={
            path:'config/profile'
        }

        picoObj.extend(config,libConfig)

        args.print('AppMgr Options',config)

        var
        ext='.'+appConfig.env+'.json',
        fn
        fs.readdir(path.resolve(appConfig.path, config.path),function(err, fnames){
            if (err) return next(err)
            for(var i=0,fname; fname=fnames[i]; i++){
                fn=path.basename(fname,ext)
                if (-1!==fn.indexOf('.')) continue
                console.log('load %s',fname)
            }
            next(null, appMgr)
        })
    }
}
