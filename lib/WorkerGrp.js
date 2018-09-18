const
cprocess=require('child_process'),
pStr=require('pico-common').export('pico/str')

function WorkerGrp(script,env){
	this.script=script
	this.env=env
	this.workers={}
	this.ids=[]
	this.currentWorker=0
}

WorkerGrp.prototype={
	add(input){
		if (!input) return false
		const
		id=pStr.rand(),
		args=['-i',id]

		if (input.charAt){
			args.push('-p',input)
		}else{
			args.push('-c',input.config)
			args.push('-n',input.appName)
			args.push('-e',this.env)
		}
		this.workers[id]=cprocess.fork(
			this.script,
			args, //['--max-old-space', 10000],
			{
				env: {NODE_PATH:process.env.NODE_PATH}
			}
		)
		this.ids.push(id)
	},
	select(){
		const ids=this.ids
		if (!ids.length) return 0
		let idx=++this.currentWorker
		if (idx >=ids.length) idx=0
		this.currentWorker=idx
		return ids[idx]

	},
	remove(id, signal){
		const
		worker=this.workers[id],
		idx=this.ids.indexOf(id)

		if (-1 !== idx) this.ids.splice(idx,1)

		if (!worker) return

		worker.kill(signal)
		delete this.workers[id]
	},
	removeAll(signal){
		const workers=this.workers
		for(let id in workers){
			workers[id].kill(signal)
		}
		this.workers={}
		this.ids=[]
	}
}

module.exports=WorkerGrp
