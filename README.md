# pico-api
A lean API server

##Setup
* installation
```
npm i picos -g
```
* create app.json config file at your working folder
```json
{
    "app":{
        "actions": [
            "action.json"
        ]
    },
    "mods":{
        "webServer":{
            "mod":"web",
            "port":8000
        }
    }
}
```
* create action.json action config file at your working folder
```json
{
    "deps":{
        "app":"./app"
    },
    "routes":{
        "/":[
            ["app","hello","res"],
            []
		]
    }
}
```
* create app.js action file at your working folder
```javascript
module.exports={
    setup(context, cb){
        cb()
    },
    hello(res, next){
		res.setHeader('connection','close')
        this.setOutput('Hello World!')
		next()
    }
}
```

##Features
* Web is not the only first class citizen in this platform, all other modules has similar status
* Routing for web, fs events, redis pubsub, sse and node cluster messagging
* Distributed source files and lazily download files from file server
* use JSON as relational database design tool
* reloading an app without reloading all other apps

##TODO
* translate from config/src to config/build
* compile config/src db section to database
* compile config/src db section to models
* handling config/src db section update and changes
* add domain protection to master and slaves
* move mod and theirs dependencies out of picos
