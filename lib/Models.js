var
JOB_MODEL_KEYS = 0,
JOB_FUNC = 1,
JOB_CONTEXT = 2,
Models=function(){
},
deref = function(self, keys){
console.log('deref 1',JSON.stringify(keys))
    if (!keys || !keys.length) return

    var models = []
    for(var i=0,key; key=keys[i]; i++){
        models.push(self[key])
    }
    return models
},
dbExec = function(ctx, func, models, cb){
console.log('dbexec 1',typeof ctx,typeof func,typeof models,models.length)
    if (!ctx || !func || !models || !models.length) return cb()
    models.push(cb)
    func.apply(ctx, models)
},
dbUpdate = function(self, jobs, index, cb){
console.log('dbupdate 1',index,jobs.length)
    var job=jobs[index++]
    if (!job) return cb()

    dbExec(job[JOB_CONTEXT], job[JOB_FUNC], deref(self, job[JOB_MODEL_KEYS]), function(err){
console.log('dbupdate 2',err)
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
    // keys = [MID1,MID2,MID3]
    check: function(keys){
        if (!keys || !keys.length) return false
        for(var i=0,key; key=keys[i]; i++){
            if (!this[key]) return false
        }
        return true
    },
    commit: function(jobs, cb){
        dbUpdate(this, jobs, 0, cb)
    }
}

module.exports=Models
