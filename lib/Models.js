var
JOB_MODEL_INFOS = 0,
JOB_FUNC = 1,
JOB_CONTEXT = 2,
Models=function(){
},
deref = function(self, modelInfos){
    if (!modelInfos || !modelInfos.length) return

    var models = []
    for(var i=0,modelInfo; modelInfo=modelInfos[i]; i++){
        models.push(self[modelInfo])
    }
    return models
},
dbExec = function(ctx, func, models, cb){
    if (!ctx || !func || !models || !models.length) return cb()
    models.push(cb)
    func.apply(ctx, models)
},
dbUpdate = function(self, jobs, index, cb){
    var job=jobs[index++]
    if (!job) return cb()

    dbExec(job[JOB_CONTEXT], job[JOB_FUNC], deref(self, job[JOB_MODEL_INFOS]), function(err){
        if (err) return cb(err)
        dbUpdate(self, jobs, index, cb)
    })
}

Models.prototype={
    get: function(key){
        return this[key] = this[key] || {}
    },
    set: function(key, val){
        this[key]=val
    },
    // modelInfos = [MID1,MID2,MID3]
    check: function(modelInfos){
        if (!modelInfos || !modelInfos.length) return false
        for(var i=0,mis; mis=modelInfos[i]; i++){
            if (!this[mis]) return false
        }
        return true
    },
    commit: function(jobs, cb){
        dbUpdate(this, jobs, 0, cb)
    }
}

module.exports=Models
