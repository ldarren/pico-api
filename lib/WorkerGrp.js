var
cluster=require('cluster'),
picoStr=require('pico-common').export('pico/str')

function WorkerGrp(name, script){
	this.name=name
	this.script=script
	this.workers={}
	this.ids=[]
	this.currentWorker=0
}

WorkerGrp.prototype={
	add:function(path, json){
		if (!path || !json) return false
		var 
		id=picoStr.rand(),
		args=['-n',this.name,'-i',id]

		if (path){
			args.push('-c',path)
		}else{
			args.push('-j',json)
		}
		cluster.setupMaster({exec:this.script, args:args})
		this.workers[id]=cluster.fork()
		this.ids.push(id)
	},
	select:function(){
		var ids=this.ids
		if (!ids.length) return 0
		var idx=++this.currentWorker
		if (idx >=ids.length) idx=0
		this.currentWorker=idx
		return ids[idx]

	},
	remove:function(id){
		var
		worker=this.workers[id],
		idx=this.ids.indexOf(id)

		if (-1 !== idx) this.ids.splice(idx,1)

		if (!worker) return

		worker.kill()
		delete this.workers[id]
	},
	removeAll:function(){
		var workers=this.workers
		for(var id in workers){
			workers[id].kill()
		}
		this.workers={}
		this.ids=[]
	}
}

module.exports=WorkerGrp
