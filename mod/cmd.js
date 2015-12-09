var
net = require('net'),
repl = require('repl'),
util = require('util'),
args= require('../lib/args'),
Session= require('../lib/Session'),
inspectOpts={showHidden:false, depth:4, colors:true, customInspect:false},
sigslot,
// TODO: translate variables
parse=function(args){
    try{ return JSON.parse(`[${args.split(' ').join(',')}]`) }
    catch(exp){this.write(exp.message)}
    return null
},
render=function(cb, filename, context, next){
    if (this.has('error')){
        cb(this.get('error'))
        return next()
    }
    this.commit((err)=>{
        if (err) {
            cb(err)
            return next()
        }
        cb(null, this.getOutput())
        next()
    })
},
// TODO: use Function object? signal become one of the context variable
customEval=function(args, context, filename, cb){
    var params=this.parseArgs(args)
    console.log('###',params)
    return cb(null, {hello:'world',foo:['bar',1,2,3]})
    sigslot.signal(params[0], Session.TYPE.CMD, params[1], context, filename, cb, render)
},
customWriter=function(out){
    return util.inspect(out, inspectOpts)
}
Cmd=function(config, input, output){
    var context={}
    var svr=repl.start({
        input: input||process.stdin,
        output: output||process.stdout,
        prompt: config.prompt,
        terminal:config.terminal,
        useColors:config.useColors,
        useGlobal:false,
        ignoreUndefined:config.ignoreUndefined,
        eval:customEval,
        writer: customWriter,
        replMode:repl.REPL_MODE_STRICT
    })

    svr.parseArgs=parse
    this.server=svr
    this.context=context
    svr.on('reset', (context)=>{
        Object.assign(context, context)
        sigslot.signal('cmd/reset', Session.TYPE.CMD, context)
    })
    svr.on('exit', ()=>{
        sigslot.signal('cmd/exit', Session.TYPE.CMD)
    })
}

Cmd.prototype={
    updateContext:function(key, value){
        this.context[key]=value
        this.server.context[key]=value
    },
    // e.g. key:hello cmd:{help:'say hello', action:function(params){this.write(params); this.displayPrompt}}
    defineCommand:function(key,command){
        this.server.defineCommand(key, command)
    }
}

module.exports={
    create: function(appConfig, libConfig, next){
        var config={
            socket:null,
            prompt: '> ',
            terminal:true,
            useColors:true,
            //useGlobal:false,
            ignoreUndefined:true
        }

        args.print('CMD Options',Object.assign(config,libConfig))
        sigslot= appConfig.sigslot
        inspectOpts.colors=config.useColors

        if (!config.socket) return next(null, new Cmd(config))
        net.createServer((socket)=>{
            var cmd=new Cmd(config, socket, socket)
            cmd.on('exit',()=>{socket.end()})
            next(null, new Cmd(config, socket, socket))
        }).listen(config.socket)
    }
}
