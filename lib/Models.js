var
JOB_MODEL_INFOS = 0,
JOB_FUNC = 1,
JOB_CONTEXT = 2,
Models=function(){
},
deref = function(self, modelInfos){
    var params = []
console.log(1, modelInfos)
    if (!modelInfos || !modelInfos.length) return params

    var info,value,model,j

    for(var i=0,modelInfo; modelInfo=modelInfos[i]; i++){
        value = []
console.log(i, modelInfo)
        for(j=0; info=modelInfo[j]; j++){
            model = self[info[0]]
console.log(i, j, info, model)
            if (!model) continue
            value.push(model[info[1]])
        }
        params.push(value)
console.log('value',params)
    }
    return params
},
dbExec = function(self, context, func, modelss, index, cb){
    if (!modelss || !modelss.length || modelss.length <= index) return cb()

    func(self, context, modelss[index++], function(err, newModels){
        if (err) {
            console.error(err)
            return cb(G_CERROR['500'])
        }
        modelss[index] = newModels // always insert into first model
        dbExec(self, context, func, modelss, index, cb)
    })
},
dbUpdate = function(self, jobs, index, cb){
    var job=jobs[index++]
    if (!job) return

    var
    func = job[JOB_FUNC],
    modelInfos = job[JOB_MODEL_INFOS],
    models = deref(self, modelInfos)

    if (!func) return dbUpdate(self, jobs, index, cb)

    dbExec(self, job[JOB_CONTEXT], func, models, 0, function(err){
        if (err) return cb(err)
        var product={},model,modelInfo
        for(var i=0,modelInfo; modelInfo=modelInfos[i]; i++){
            model = models[i][0]
            modelInfo = modelInfos[i][0]
            product[modelInfo[1]] = model // modelInfo = [modelId, key]
        }
        cb(null, product)
        dbUpdate(self, jobs, index, cb)
    })
}


Models.prototype={
    get: function(modelId){
        return this[modelId] = this[modelId] || {}
    },
    // main model must be set at modelInfos[0][0], modelInfos = [[[MID, key],[MID, key]],[[MID, key]]]
    check: function(modelInfos){
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
    commit: function(jobs, cb){
console.log('commit job',JSON.stringify(jobs))
        dbUpdate(this, jobs, 0, cb)
    }
}

module.exports=Models
