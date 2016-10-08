var
cluster=require('cluster'),
picoStr=require('pico-common').export('pico/str')

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
		var 
		id=picoStr.rand(),
		args=['-i',id]

		if (input.charAt){
			args.push('-p',input)
		}else{
			args.push('-c',input.config)
			args.push('-n',input.appName)
			args.push('-e',this.env)
		}
		cluster.setupMaster({exec:this.script, args:args})
		this.workers[id]=cluster.fork()
		this.ids.push(id)
	},
	select(){
		var ids=this.ids
		if (!ids.length) return 0
		var idx=++this.currentWorker
		if (idx >=ids.length) idx=0
		this.currentWorker=idx
		return ids[idx]

	},
	remove(id){
		var
		worker=this.workers[id],
		idx=this.ids.indexOf(id)

		if (-1 !== idx) this.ids.splice(idx,1)

		if (!worker) return

		worker.kill()
		delete this.workers[id]
	},
	removeAll(){
		var workers=this.workers
		for(let id in workers){
			workers[id].kill()
		}
		this.workers={}
		this.ids=[]
	}
}

module.exports=WorkerGrp
