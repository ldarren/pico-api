function Plant(){
    this.processes= {}
}

Plant.prototype= {
    route: function(api, funcs){
        if (this.processes[api]) return console.error('route[',api,'] is already taken')
        this.processes[api] = funcs
    },
    job: function(){
    },
    process: function(){
    }
}

module.exports= Plant
