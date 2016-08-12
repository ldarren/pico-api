const
CORS='Access-Control-Allow-Origin',
HEAD_JSON= { 'Content-Type': 'application/octet-stream' },
HEAD_HTML= { 'Content-Type': 'text/html; charset=utf-8' }
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
PJSON= require('pico').export('pico/json'),
args= require('pico-args'),
bodyparser= require('../lib/bodyparser'),
multipart= require('../lib/multipart'),
Session= require('../lib/Session'),
config,
sigslot,
error=function(err, sess, res, query, cb){
    var err=err||sess.get('error')
    if (!Array.isArray(err)) err=sess.error(404,err)
    if (!res.headersSent) res.writeHead(err[0], HEAD_JSON)
    res.write(bodyparser.error(query,err[1]))
    sess.set('error',undefined)
    cb()
},
render=function(sess, ack, query, res, req, input, cb){
    sess.commit((err)=>{
        if (err) return error(err, sess, res, query, cb)
        if (query.api){
            res.write(bodyparser.render(query, sess.getOutput()))
        }else{
            var output=sess.getOutput()
            if (output.charAt){
                res.write(output)
            } else {
                res.write(JSON.stringify(output))
            }
        }
        cb()
    })
},
renderStart=function(ack, query, res, req, input, next){
    if (this.has('error')) return error(null, this, res, query, next)
    res.writeHead(200, HEAD_JSON)
    render(this, ack, query, res, req, input, next)
},
renderStream=function(ack, query, res, req, input, next){
    if (this.has('error')) return error(null, this, res, query, next)
    render(this, ack, query, res, req, input, next)
},
renderStop=function(ack, query, res, req, input, next){
    var cb=()=>{res.end(); next()}
    if (this.has('error')) return error(null, this, res, query, cb)
    render(this, ack, query, res, req, input, cb)
},
// TODO: better way to delay error message
renderAll=function(ack, query, res, req, input, next){
    var cb=()=>{res.end(); next()}
    if (this.has('error')) return setTimeout(error, config.errorDelay, null, this, res, query, cb) // only protocol error need delay
    res.writeHead(200, HEAD_JSON)
    render(this, ack, query, res, req, input, cb)
},
web={
	parsePOST:function(req,res,next){
		bodyparser.parsePOST(req, (err, queries)=>{
			if (err) return next(err)
            sigslot.signal(this.api, Session.TYPE.WEB,queries,req,res,null,null,renderAll)
		})
	},
    parse:function(req,res,next){
        if (-1 === req.headers['content-type'].toLowerCase().indexOf('multipart/form-data')){
            bodyparser.parse(req, (err, queries)=>{
                if (err) return next(err)
                var q
                switch(queries.length){
                case 0: break
                case 1:
                    q=queries[0]
                    sigslot.signal(q.api, Session.TYPE.WEB,q.data,req,res,q,null,renderAll)
                    break
                default:
                    q=queries[0]
                    sigslot.signal(q.api, Session.TYPE.WEB,q.data,req,res,q,null,renderStart)
                    for(var i=1,l=queries.length-1; i<l; i++){
                        q=queries[i]
                        sigslot.signal(q.api, Session.TYPE.WEB,q.data,req,res,q,null,renderStream)
                    }
                    q=queries[queries.length-1]
                    sigslot.signal(q.api, Session.TYPE.WEB,q.data,req,res,q,null,renderStop)
                    break
                }

                next()
            })
        }else{
            multipart.parse(req, (err, query)=>{
                if (err || !query.api) return next(err || 'empty multipart api')
                sigslot.signal(query.api, Session.TYPE.WEB,query.data,req,res,query,null,renderAll)
                next()
            })
        }
    },
    SSEStart:function(req, res, next){
        res.addListener('close',disconnect)
        res.addListener('error',disconnect)

        req.socket.setKeepAlive(true)  
        req.socket.setTimeout(0)

        res.writeHead(200, HEAD_SSE)
        next()
    },
    SSE:function(res, msg, evt, retry){
        res.write("retry: "+(retry||1000)+"\n");
        if (evt) res.write("event: "+evt+"\n");
        res.write("data: " + PJSON.stringify(msg).join(config.sep) + "\n\n");
    },
    SSEStop:function(res, next){
        res.end()
        next()
    },
    SSEAbort:function(err, res, next){
        setTimeout(error, config.errorDelay, err, this, res, null, ()=>{
            res.end()
            next()
        })
    }
},
resetPort=function(port, cb){
    if ('string' === typeof port) return fs.unlink(port, cb)
    cb()
},
disconnect= function(){
    sigslot.signal('web.dc', Session.TYPE.WEB, null,null,this,null,null,renderAll)
},
request= function(req, res){
console.log(req.url,req.method)
    var o=url.parse(req.url,true)
    sigslot.signal(o.pathname, Session.TYPE.WEB, o.query,req,res,null,null,renderAll)
}

module.exports= {
    create: function(appConfig, libConfig, next){
        config={
            pfxPath:null,
            port:'80',
            allowOrigin:'localhost',
            sep:['&'],
            secretKey:null,
            cullAge:0,
            uploadWL:[],
            errorDelay:3000
        }
        var pfxPath, server

        args.print('Web Options',Object.assign(config,libConfig))
        config.sep=config.sep.charAt?config.sep:JSON.stringify(config.sep)
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
        bodyparser.setup(config.cullAge, config.secretKey, config.sep)

        resetPort(config.port, ()=>{
            server.listen(config.port, ()=>{

				// WS TEST START
				// BUG: ws.send not working and unable forward ws connection to workers
				/*var
				WebSocketServer= require('ws').Server,
				wss=new WebSocketServer({server:server})
				wss.on('connection', (ws)=>{
					ws.on('message', (message)=>{
						console.log('ws received: %s %d', message, require('cluster').isWorker)
						ws.send(`${message} too!`, (err)=>{if (err) return console.error(err)})
					})
				})*/
				// WS TEST END

                next(null, web)
            })
        })
    }
}
