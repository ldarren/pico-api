const HEADERS= { 'Content-Type': 'application/octet-stream' }

var
http= require('http'),
https= require('https'),
fs= require('fs'),
path= require('path'),
args= require('../lib/args'),
bodyparser= require('../lib/bodyparser'),
multipart= require('../lib/multipart'),
picoObj=require('pico').export('pico/obj'),
sigslot,
web={
    parse:function(session,order,next){
        var
        req=session.req,
        now=Date.now()

        if (-1 === req.headers['content-type'].toLowerCase().indexOf('multipart/form-data')){
            bodyparser.parse(req, function(err, query){
                if (err) return next(err)
                order=picoObj.extend(order, query)
            })
        }else{
            multipart.parse(req, function(err, query){
                if (err || !order.api) return next(err || 'empty multipart api')
                order=picoObj.extend(order, query)
            })
        }
    },
    error:function(evt, order){
        var res=evt.res

        console.error(err)
        res.end('ko')
    },
    render:function(evt, order, next){
        var res=evt.res

        res.end('ok')
    }
},
resetPort=function(port, cb){
    if ('string' === typeof port) return fs.unlink(port, cb)
    cb()
},
request= function(req, res){
    res.writeHead(200, HEADERS)
    switch(req.method){
    case 'POST': break
    case 'GET': return res.end(''+Date.now())
    default: return res.end()
    }
    sigslot.signal(req.url,{req:req,res:res})
}

module.exports= {
    create: function(appConfig, libConfig, next){
        var
        config={
            pfxPath:null,
            port:'80',
            allowOrigin:'localhost',
            delimiter:JSON.stringify(['^']),
            secretKey:null,
            cullAge:0,
            uploadWL:[]
        },
        pfxPath, server

        picoObj.extend(config,libConfig)

        args.print('Web Options',config)

        pfxPath= config.pfxPath
        sigslot= appConfig.sigslot

        if (pfxPath){
            pfxPath= path.isAbsolute(pfxPath) ? pfxPath : path.resolve(appConfig.path, pfxPath)
            server= https.createServer({pfx:fs.readFileSync(pfxPath)}, request)
        }else{
            server= http.createServer(request)
        }

        //TODO: security check b4 unlink
        resetPort(config.port, function(){
            server.listen(config.port, function(){
                if (config.allowOrigin) HEADERS['Access-Control-Allow-Origin']= config.allowOrigin

                multipart.setup(config.uploadWL)
                bodyparser.setup(config.cullAge, config.secretKey, config.delimiter)

                next(null, web)
            })
        })
    }
}
