const
	SESSION_TYPE='cmd',
	PROHIBITED=['process','Cmd','GLOBAL','global','root','require','module'],

	net = require('net'),
	repl = require('repl'),
	util = require('util'),
	pico= require('pico-common'),
	args= require('pico-args'),
	Session= require('../lib/Session'),
	inspectOpts={showHidden:false, depth:4, colors:true, customInspect:false},
	extendCtx=function(oldCtx, newCtx){
		for(let i=0,k; (k=PROHIBITED[i]); i++){
			delete oldCtx[k]
		}
		Object.assign(oldCtx, newCtx)
	},
	render=function(input, next){
		if (this.has('error')){
			console.error(this.get('error'), this.getOutput())
			return next()
		}
		this.commit((err)=>{
			if (err) {
				console.error(err)
				return next()
			}
			console.log(this.getOutput())
			next()
		})
	},
	// adding indents with ellipses when inside blocks doesnt work, whose bug?
	customEval_=function(statement, context, filename, cb){
		var script=`with(context){return ${statement}}`

		try{
			var func=new Function('context','__filename','next',script)
		} catch(exp){
			return
		}

		return cb(null, func(context, filename))
	},
	customWriter=function(out){
		return util.inspect(out, inspectOpts)
	},
	Cmd=function(config, input, output){
		var
			ctx={},
			svr=repl.start({
				input: input||process.stdin,
				output: output||process.stdout,
				prompt: config.prompt,
				terminal:config.terminal,
				useColors:config.useColors,
				useGlobal:false,
				ignoreUndefined:config.ignoreUndefined,
				//eval:customEval_, // custom eval not as good as default one
				writer: customWriter,
				replMode:repl.REPL_MODE_STRICT
			})

		ctx['pico']=pico
		ctx['sigslot']=sigslot
		ctx['Session']=Session
		extendCtx(svr.context, ctx)

		this.server=svr
		this.context=ctx
		svr.on('reset', (context)=>{
			extendCtx(context, ctx)
			sigslot.signal('cmd.reset', SESSION_TYPE, context, render)
		})
		svr.on('exit', ()=>{
			sigslot.signal('cmd.exit', SESSION_TYPE, 'sample data', render)
		})
	}

Cmd.prototype={
	updateContext(key, value){
		this.context[key]=value
		this.server.context[key]=value
	},
	// e.g. key:hello cmd:{help:'say hello', action:function(params){this.write(params); this.displayPrompt}}
	defineCommand(key,command){
		this.server.defineCommand(key, command)
	}
}

Session.addType(SESSION_TYPE, ['input','render'])

let sigslot

module.exports={
	create(appConfig, libConfig, next){
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
			cmd.on('exit',()=>{
				socket.end()
			})
			next(null, new Cmd(config, socket, socket))
		}).listen(config.socket)
	}
}
