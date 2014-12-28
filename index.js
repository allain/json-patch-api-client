var xhr = require('xhr');
var jiff = require('jiff');
var util = require('util');
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var xtend = require('xtend');

module.exports = JsonPatchApiClient;

var defaultOptions = {
  defaultDoc: {},
  defailtTimestamp: 0
};

function JsonPatchApiClient(io, name, options) {
  if (!io) throw new Error("io not given");

  var self = this;

  options = xtend({}, defaultOptions, options || {});

  EventEmitter2.call(this);

  var debug = require('debug')('local-store:' + name);
  var patches = io('/patches/' + name).connect();
  var state;

  var storedJSON = localStorage.getItem('store-' + name);
  if (storedJSON) {
    debug('store loaded from localStorage');
    state = JSON.parse(storedJSON);
    pullPatches(function(err) {
      if (err) {
        debug('error pulling initial patches', err);
        return;
      }

      self.emit('change', state.doc);

      listenToStream();
    });
  } else {
    debug('store not found in localStorage');
    state = {
      doc: options.defaultDoc,
      ts: options.defaultTimestamp
    };

    xhr({
      uri: '/api/' + name,
      headers: {
        "Accept": "application/json"
      }
    }, function (err, resp, body) {
      if (err) return console.error(err);
      if (resp.statusCode !== 200) return console.error(resp);

      debug('store fetched from api', '/api/' + name);

      state.doc = JSON.parse(body);
      state.ts = parseInt(resp.headers['x-last-patch'], 10);
      localStorage.setItem('store-' + name, JSON.stringify(state));
      self.emit('change', state.doc);
      listenToStream();
    });
  }

  function pullPatches(cb) {
    xhr({
      uri: '/api/' + name + '/patches?after=' + state.ts
    }, processPullResponse);

    function processPullResponse(err, resp, body) {
      if (err) {
        return cb(err);
      }

      if (resp.statusCode !== 200) {
        return cb(resp);
      }

      var patches = JSON.parse(body);
      debug('patches pulled', patches);
      applyPatches(patches);
      cb();
    }
  }

  function listenToStream() {
    debug('listening to patch stream');
    patches.on('patch', function(patch) {
      debug('patch received from stream', patch);
      applyPatches([patch]);
    });
  }

  function applyPatches(patches) {
    debug('applying patches', patches);

    if (!patches.length) return;

    var patched = state.doc;
    var ts = 0;
    patches.forEach(function(patch) {
      patched = jiff.patch(patch.diff, patched);
      ts = patch.ts;
    });

    state.doc = patched;
    state.ts = ts;

    self.emit('change', state.doc);

    localStorage.setItem('store-' + name, JSON.stringify(state));
  }
}

util.inherits(JsonPatchApiClient, EventEmitter2);
