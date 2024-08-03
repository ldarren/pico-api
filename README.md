# pico-api (picos)
A lean and mean api server

[Test case](https://sequencediagram.org/index.html#initialData=C4S2BsFMAIFkGVoBVIGdioFCYA4EMAnUAYxHwDthoBVASV0JLL0ugGEEGiRSKqBFLkz7QA6gEYhPZq1EAmKbxZUkABSST83JazVIFdALQA+DvABcxApDzAY8APKYzJveMvXb9p2YA8ht3MAewBrTDp-M2CwiX9Ax2gAVxwAEy9Mfn8Jc2ACFlQAMyCCAFtoADJoApBwOwJnBBN+cxwg8HAG+H9mgHNIKmS0u06TKMGvaHRivD6MrLkWto7+E3lzPoHU9PlXdQW8Yhi5OL3ooA)

## Service
service folder contains service description in json or js format.

### rcs
resource description that can be use in REST API generator (common.json) and db migration.

### schema
main fields of the resource

### meta
meta fields of the resource, such as created\_at, created\_by


## TODO
- fix eslint (migrate to latest)
- explain it is middleware first architecture
- explain how to create a middleware
- explain module vs middleware
- explain how to create a modules
- explain create module to be use as middleware or in middleware
- explain how to branch
- explain how to detour (await next)
- how to handle error. define midduleware to handle route "ERR" and throw error by this.next(this.web.Error(status, message, headers))
