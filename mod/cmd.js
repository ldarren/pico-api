var
net = require('net'),
repl = require('repl'),
args= require('../lib/args'),
Session= require('../lib/Session'),
sigslot,
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
    })
},
customEval=function(cmd, context, filename, cb){
    sigslot.signal(cmd, Session.TYPE.CMD, context, filename, cb, render)
},
customWriter=function(){
    return util.inspect(...arguments)
}
Cmd=function(config, input, output){
    this.config=config
    this.server=repl.start({
        input: input||process.stdin,
        output: output||process.stdout,
        prompt: config.prompt,
        terminal:config.terminal,
        useColors:config.useColors,
        useGlobal:config.useGlobal,
        ignoreUndefined:config.ignoreUndefined,
        eval:customEval,
        writer: customWriter,
        replMode:repl.REPL_MODE_STRICT
    })
}

Cmd.prototype={
    defineCommand:function(key,action){
        this.server.defineCommand(key, action)
    },
    displayPrompt:function(preserveCursor){
        this.server.displayPrompt(preserveCursor)
    }
}

module.exports={
    create: function(appConfig, libConfig, next){
        var config={
            socket:null,
            prompt: '> ',
            terminal:true,
            useColors:false,
            useGlobal:false,
            ignoreUndefined:true
        }

        args.print('CMD Options',Object.assign(config,libConfig))
        sigslot= appConfig.sigslot

        if (!config.socket) return next(null, new Cmd(config))
        net.createServer((socket)=>{
            var cmd=new Cmd(config, socket, socket)
            cmd.on('exit',()=>{socket.end()})
            next(null, new Cmd(config, socket, socket))
        }).listen(config.socket)
    }
}
