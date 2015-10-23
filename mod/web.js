const HEADERS= { 'Content-Type': 'application/octet-stream' }

var
http= require('http'),
https= require('https'),
fs= require('fs'),
path= require('path'),
url= require('url'),
args= require('../lib/args'),
bodyparser= require('../lib/bodyparser'),
multipart= require('../lib/multipart'),
Session= require('../lib/Session'),
picoObj=require('pico').export('pico/obj'),
sigslot,
dummyCB=function(){},
web={
    parse:function(session,models,next){
        var req=session.req

        if (-1 === req.headers['content-type'].toLowerCase().indexOf('multipart/form-data')){
            bodyparser.parse(req, function(err, queries){
                if (err) return next(err)
                for(var i=0,q; q=queries[i]; i++){
                    sigslot.signal(q.api, new Session(Session.TYPE.WEB,q.data,session.time,req,session.res,q))
                }
                next()
            })
        }else{
            multipart.parse(req, function(err, query){
                if (err || !query.api) return next(err || 'empty multipart api')
                sigslot.signal(query.api, new Session(Session.TYPE.WEB,query.data,session.time,req,session.res,query))
                next()
            })
        }
    },
    SSEStart:function(session, models, next){
        var
        req=session.req,
        res=session.res

        res.on('close',disconnect)

        req.socket.setKeepAlive(true)  
        req.socket.setTimeout(0)

        res.setHeader('Access-Control-Allow-Origin', HEADERS['Access-Control-Allow-Origin'])
        res.setHeader('Access-Control-Allow-Credentials', 'true')
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.writeHead(200)
console.log('start SSE')
        next()
    },
    SSE:function(res, msg, evt, retry){
        res.write("retry: "+(retry||1000)+"\n");
        if (evt) res.write("event: "+evt+"\n");
        res.write("data: " + msg + "\n\n");
    },
    SSEStop:function(session, err, next){
        var res=session.res
       // res.writeHead(500, err)
console.log('stop SSE')
        res.end()
        next()
    },
    error:function(session, err, next){
        var res=session.res
        if (!Array.isArray(err)) err=[500,err]
        res.writeHead(err[0], HEADERS)
        res.end(bodyparser.error(session.query,err[1]))
        next()
    },
    render:function(session, models, next){
        var res=session.res

        res.writeHead(200, HEADERS)
        models.commit(session.getJobs(),function(err){
            if (err) session.error(err)
            var q=session.query
            if (q){
                res.end(bodyparser.render(q, session.getOutput()))
            }else{
                res.end(JSON.stringify(session.getOutput()))
            }
            next()
        })
    }
},
resetPort=function(port, cb){
    if ('string' === typeof port) return fs.unlink(port, cb)
    cb()
},
disconnect= function(){
    sigslot.signal('web.dc', new Session(Session.TYPE.WEB, null,Date.now(),null,this))
},
request= function(req, res){
console.log(req.url,req.method)
    var o=url.parse(req.url,true)
    sigslot.signal(o.pathname, new Session(Session.TYPE.WEB, o.query,Date.now(),req,res))
}

module.exports= {
    create: function(appConfig, libConfig, next){
        var
        config={
            pfxPath:null,
            port:'80',
            allowOrigin:'localhost',
            delimiter:['&'],
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
