var
sep = function(session, order, next){console.log('###'); return next()},
bootstrap=function(session, order, next){
},
all = {
    setup: function(context, next){
        var sigslot = context.sigslot

        sigslot.slot('bootstrap/load', [bootstrap])
        next()
    }
}

module.exports = [
    all
]
