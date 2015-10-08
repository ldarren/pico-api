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
dummyCB=function(){},
web={
    parse:function(session,order,next){
        var
        req=session.req,
        now=Date.now()

        if (-1 === req.headers['content-type'].toLowerCase().indexOf('multipart/form-data')){
            bodyparser.parse(req, function(err, query){
                if (err) return next(err)
                for(var i=1,q; q=query[i]; i++){
                    sigslot.signal(q.api, picoObj.extend(q.data,session))
                }
                next()
            })
        }else{
            multipart.parse(req, function(err, order){
                if (err || !order.api) return next(err || 'empty multipart api')
                sigslot.signal(order.api, picoObj.extend(order.data,session))
                next()
            })
        }
    },
    error:function(evt, order, next){
        console.error(order)

        var res=evt.res

        res.writeHead(400, HEADERS)
        res.end(JSON.stringify(order))
        next()
    },
    render:function(evt, order, next){
        var res=evt.res

        res.writeHead(200, HEADERS)
        res.end(JSON.stringify(order))
        next()
    }
},
triggerQuery=function(){
},
resetPort=function(port, cb){
    if ('string' === typeof port) return fs.unlink(port, cb)
    cb()
},
request= function(req, res){
console.log(req.url,req.method)
    switch(req.method){
    case 'POST': break
    case 'GET': return web.render({req:req,res:res},Date.now(),dummyCB)
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
            delimiter:JSON.stringify(['&']),
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

        if (config.allowOrigin) HEADERS['Access-Control-Allow-Origin']= config.allowOrigin

        multipart.setup(config.uploadWL)
        var sep=config.delimiter
        bodyparser.setup(config.cullAge, config.secretKey, 'string'===typeof sep?sep:JSON.stringify(sep))

        //TODO: security check b4 unlink
        resetPort(config.port, function(){
            server.listen(config.port, function(){
                next(null, web)
            })
        })
    }
}
