const
CORS='Access-Control-Allow-Origin',
HEAD_JSON= { 'Content-Type': 'application/octet-stream' },
HEAD_HTML= { 'Content-Type': 'text/html' }
HEAD_SSE= {
    'Content-Type': 'text/event-stream',
    'Access-Control-Allow-Credentials': 'true',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
}

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
sigslot,
dummyCB=()=>{},
error=function(err, res, query, next){
    if (!Array.isArray(err)) err=[500,err]
    res.writeHead(err[0], HEAD_JSON)
    res.end(bodyparser.error(query,err[1]))
    next()
},
render=function(ack, query, res, req, input, next){
    if (this.has('error')) return error(this.get('error'), res, query, next)
    this.commit((err)=>{
        if (err) return error(err, res, query, next)
        if (query.api){
            res.writeHead(200, HEAD_JSON)
            res.end(bodyparser.render(query, this.getOutput()))
        }else{
            var output=this.getOutput()
            if ('string'===typeof output){
                res.writeHead(200, HEAD_HTML)
                res.end(output)
            } else {
                res.writeHead(200, HEAD_JSON)
                res.end(JSON.stringify(this.getOutput()))
            }
        }
        next()
    })
},
web={
    parse:function(req,res,next){
        if (-1 === req.headers['content-type'].toLowerCase().indexOf('multipart/form-data')){
            bodyparser.parse(req, (err, queries)=>{
                if (err) return next(err)
                for(var i=0,q; q=queries[i]; i++){
                    sigslot.signal(q.api, Session.TYPE.WEB,q.data,req,res,q,null,render)
                }
                next()
            })
        }else{
            multipart.parse(req, (err, query)=>{
                if (err || !query.api) return next(err || 'empty multipart api')
                sigslot.signal(query.api, Session.TYPE.WEB,query.data,req,res,query,null,render)
                next()
            })
        }
    },
    SSEStart:function(req, res, next){
        res.addListener('close',disconnect)

        req.socket.setKeepAlive(true)  
        req.socket.setTimeout(0)

        res.writeHead(200, HEAD_SSE)
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
    }
},
resetPort=function(port, cb){
    if ('string' === typeof port) return fs.unlink(port, cb)
    cb()
},
disconnect= function(){
    sigslot.signal('web.dc', Session.TYPE.WEB, null,null,this,null,null,render)
},
request= function(req, res){
console.log(req.url,req.method)
    var o=url.parse(req.url,true)
    sigslot.signal(o.pathname, Session.TYPE.WEB, o.query,req,res,null,null,render)
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

        args.print('Web Options',Object.assign(config,libConfig))
        pfxPath= config.pfxPath
        sigslot= appConfig.sigslot

        if (pfxPath){
            pfxPath= path.isAbsolute(pfxPath) ? pfxPath : path.resolve(appConfig.path, pfxPath)
            server= https.createServer({pfx:fs.readFileSync(pfxPath)}, request)
        }else{
            server= http.createServer(request)
        }

        if (config.allowOrigin) HEAD_HTML[CORS]=HEAD_JSON[CORS]=HEAD_SSE[CORS]=config.allowOrigin

        multipart.setup(config.uploadWL)
        var sep=config.delimiter
        bodyparser.setup(config.cullAge, config.secretKey, 'string'===typeof sep?sep:JSON.stringify(sep))

        //TODO: security check b4 unlink
        resetPort(config.port, ()=>{
            server.listen(config.port, ()=>{
                next(null, web)
            })
        })
    }
}
