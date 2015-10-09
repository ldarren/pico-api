var
JOB_MODEL_INFOS = 0,
JOB_FUNC = 1,
JOB_CONTEXT = 2,
Task=function(){
},
deref = function(modelInfos){
    var params = []

    if (!modelInfos || !modelInfos.length) return params

    var info,value,model,j

    for(var i=0,modelInfo; modelInfo=modelInfos[i]; i++){
        value = []
        for(j=0; info=modelInfo[j]; j++){
            model = this[info[0]]
            if (!model) continue
            value.push(model[info[1]])
        }
        params.push(value)
    }
    return params
},
dbExec = function(context, func, modelss, index, cb){
    if (!modelss || !modelss.length || modelss.length =< index) return cb()

    func.call(context, modelss[index++], function(err, newModels){
        if (err) {
            console.error(err)
            return cb(G_CERROR['500'])
        }
        modelss[index] = newModels // always insert into first model
        dbExec(context, func, modelss, index, cb)
    })
},
dbUpdate = function(jobs, index, cb){
    var job=jobs[index++]
    if (!job) return

    var func = job[JOB_FUNC]

    if (!func) return dbUpdate(jobs, index, cb)

    var
    modelInfos = job[JOB_MODEL_INFOS],
    models = deref.call(this, modelInfos)

    dbExec.call(this, job[JOB_CONTEXT], func, models, 0, function(err){
        if (err) return cb(err)
        var product={},model,modelInfo
        for(var i=0,modelInfo; modelInfo=modelInfos[i]; i++){
            model = models[i][0]
            modelInfo = modelInfos[i][0]
            product[modelInfo[1]] = model // modelInfo = [modelId, key]
        }
        cb(null, product)
        dbUpdate(jobs, index, cb)
    })
}


Task.protoytpe={
    getModel: function(modelId){
        return this[modelId] = this[modelId] || {}
    },
    // main model must be set at modelInfos[0][0], modelInfos = [[[MID, key],[MID, key]],[[MID, key]]]
    addJob: function(modelInfos){
        if (modelInfos){
            var j,mi,mid,key
            for(var i=0,mis; mis=modelInfos[i]; i++){
                for(j=0; mi=mis[j]; j++){
                    if (mi.length < 2) return false
                    mid = mi[0]
                    key = mi[1]
                    if (!this[mid] || !this[mid][key]) return false
                }
            }
        }
        return true
    },
    subJob: function(){
        var subJob = []
        for(var i=0,l=arguments.length; i<l;){
            subJob.push([arguments[i++],arguments[i++]])
        }
        return subJob
    },
    commit: function(job, cb){
        dbUpdate.call(this, jobs, 0, cb)
    }
}

module.exports=Task
