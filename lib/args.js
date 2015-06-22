// parse arguments to json 
//
var
path = require('path'),
beginner = 45

module.exports= {
    parse: function(defaults, b){
        defaults= defaults || ret
        b= b || beginner

        var ret= {},val,j,c,t

        for(var key in defaults) ret[key]= defaults[key][0];

        error: {
            for(var i=2,args=process.argv,a; a=args[i]; i++){
                if (a.length < 2) break error
                if (b !== a.charCodeAt(0)) break error
                if (b === a.charCodeAt(1)){
                    a=a.substr(2)
                    t=a.charCodeAt(0)<96
                    val=ret[a.toLowerCase()]
                    if (undefined===val) break error
                    switch(typeof val){
                    case 'boolean': ret[a]= t; break
                    case 'string': ret[a]= args[++i]; break
                    case 'number': ret[a]= parseFloat(args[++i]); break
                    default: break error
                    }
                }else{
                    for(j=1,c; c=a.charAt(j); j++){
                        t=c.charCodeAt(0)<96
                        val=ret[c.toLowerCase()]
                        if (undefined===val) break error
                        switch(typeof val){
                        case 'boolean': ret[c]= t; break
                        case 'string': ret[c]= args[++j]; break
                        case 'number': ret[c]= parseFloat(args[++j]); break
                        default: break error
                        }
                    }
                }
            }
            return ret
        }
        return console.error('Invalid argument',a)
    },
    usage: function(defaults){
        console.log('Usage',path.basename(process.argv[0]),process.argv[1], '[arguments]')
        console.log('Arguments:')
        var val
        for(var key in defaults){
            val = defaults[key]
            console.log(key.length > 1 ? '--'+key : '-'+key, '\t\t',val[1],'['+val[0]+']')
        }
    }
}
