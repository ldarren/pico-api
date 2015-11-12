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
SessionMgr= require('../lib/SessionMgr'),
picoObj=require('pico').export('pico/obj'),
sigslot,
dummyCB=function(){},
web={
    parse:function(req,res,next){
        if (-1 === req.headers['content-type'].toLowerCase().indexOf('multipart/form-data')){
            bodyparser.parse(req, function(err, queries){
                if (err) return next(err)
                for(var i=0,q; q=queries[i]; i++){
                    sigslot.signal(q.api, SessionMgr.TYPE.WEB,q.data,req,res,q)
                }
                next()
            })
        }else{
            multipart.parse(req, function(err, query){
                if (err || !query.api) return next(err || 'empty multipart api')
                sigslot.signal(query.api, SessionMgr.TYPE.WEB,query.data,req,res,query)
                next()
            })
        }
    },
    SSEStart:function(req, res, next){
        res.addListener('close',disconnect)

        req.socket.setKeepAlive(true)  
        req.socket.setTimeout(0)

        res.setHeader('Access-Control-Allow-Origin', HEADERS['Access-Control-Allow-Origin'])
        res.setHeader('Access-Control-Allow-Credentials', 'true')
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.writeHead(200)
        next()
    },
    SSE:function(res, msg, evt, retry){
        res.write("retry: "+(retry||1000)+"\n");
        if (evt) res.write("event: "+evt+"\n");
        res.write("data: " + msg + "\n\n");
    },
    SSEStop:function(res, next){
        res.end()
        next()
    },
    error:function(query, res, err, next){
        if (!Array.isArray(err)) err=[500,err]
        res.writeHead(err[0], HEADERS)
        res.end(bodyparser.error(query,err[1]))
        next()
    },
    render:function(query, res, next){
        res.writeHead(200, HEADERS)
        this.commit((err)=>{
            if (err) this.error(err)
            if (query.api){
                res.end(bodyparser.render(query, this.getOutput()))
            }else{
                res.end(JSON.stringify(this.getOutput()))
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
    sigslot.signal('web.dc', SessionMgr.TYPE.WEB, null,null,this)
},
request= function(req, res){
console.log(req.url,req.method)
    var o=url.parse(req.url,true)
    sigslot.signal(o.pathname, SessionMgr.TYPE.WEB, o.query,req,res)
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
