const HEADERS= { 'Content-Type': 'application/octet-stream' }

var
http= require('http'),
https= require('https'),
fs= require('fs'),
path= require('path'),
args= require('../lib/args'),
bodyparser= require('../lib/bodyparser'),
multipart= require('../lib/multipart'),
Session= require('../lib/Session'),
Task= require('../lib/Task'),
picoObj=require('pico').export('pico/obj'),
sigslot,
dummyCB=function(){},
web={
    parse:function(session,order,next){
        var
        req=session.req,
        now=Date.now()

        if (-1 === req.headers['content-type'].toLowerCase().indexOf('multipart/form-data')){
            bodyparser.parse(req, function(err, queries){
                if (err) return next(err)
                for(var i=1,q; q=queries[i]; i++){
                    sigslot.signal(q.api, new Session(q.data,0,req,session.res,q))
                }
                next()
            })
        }else{
            multipart.parse(req, function(err, query){
                if (err || !query.api) return next(err || 'empty multipart api')
                sigslot.signal(query.api, new Session(query.data,0,req,session.res,query))
                next()
            })
        }
    },
    error:function(session, err, next){
        console.error(err)

        var res=session.res

        res.writeHead(400, HEADERS)
        res.write(bodyparser.error(session.query,err))
        res.end(bodyparser.sep)
        next()
    },
    render:function(session, order, next){
        var
        res=session.res,
        jobs=session.jobs

        res.writeHead(200, HEADERS)
        order.commit(session.jobs,function(err,product){
            res.write(bodyparser.render(session.query,product))
        })
        res.end(bodyparser.sep)
        next()
    }
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
    sigslot.signal(req.url, new Session(null,0,req,res))
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

        args.print('Web Options',picoObj.extend(config,libConfig))

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
