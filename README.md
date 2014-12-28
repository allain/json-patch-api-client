#JSON-PATCH API client

## Basic Usage
Assuming you have installed json-patch-api middleware on th server, you use the client at follows:

``` js
var JsonPatchApiClient = require('json-patch-api-client');

// Assumes /socket.io/socket.io.js has been included to provide
// the global io definition
var store1 = new JsonPatchApiClient(io, 'store1');

// change event emitted on every change and it contains the entire store state
store1.on('change', function(doc) {
  console.log(doc);
});
```
