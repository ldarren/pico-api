const
cluster=require('cluster'),
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
		cluster.setupMaster({exec:this.script, args:args})
		this.workers[id]=cluster.fork({NODE_PATH:process.env.NODE_PATH})
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
	remove(id){
		const
		worker=this.workers[id],
		idx=this.ids.indexOf(id)

		if (-1 !== idx) this.ids.splice(idx,1)

		if (!worker) return

		worker.kill()
		delete this.workers[id]
	},
	removeAll(){
		const workers=this.workers
		for(let id in workers){
			workers[id].kill()
		}
		this.workers={}
		this.ids=[]
	}
}

module.exports=WorkerGrp
