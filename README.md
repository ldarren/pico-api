# pico-api
A lean API server

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
