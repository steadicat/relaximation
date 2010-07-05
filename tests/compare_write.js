var testModule = require('./test_writes')

var sys = require("sys"),
    fs = require("fs"),
    http2 = require("../common/httplib2"),
    path = require("path"),
    client = require("../common/client"),
    optionparser = require("../common/optionparser"),
    events = require('events');

var opts = new optionparser.OptionParser();
opts.addOption('-c', '--clients', "number", "clients", 100, "Number of concurrent clients per process.");
opts.addOption('-u', '--url1', "string", "url1", "http://localhost:5984", "CouchDB url to run tests against.");
opts.addOption('-v', '--url2', "string", "url2", "http://localhost:5985", "CouchDB url to run tests against.");
opts.addOption('-1', '--name1', "string", "name1", null, "Name of first comparative.");
opts.addOption('-2', '--name2', "string", "name2", null, "Name of first comparative.");
opts.addOption('-d', '--doc', "string", "doc", "medium", "small, medium or large doc. Default is medium.");
opts.addOption('-t', '--duration', "number", "duration", 60, "Duration of the run in seconds.")
opts.addOption('-i', '--poll', "number", "poll", 1, "Polling interval in seconds.")
opts.addOption('-p', '--graph', "string", "graph", "http://mikeal.couchone.com/graphs", "CouchDB to persist results in.")
opts.addOption('-r', '--recurrence', "number", "recurrence", 5, "How many times to run the tests.")

var port = 8000;
var ports = [];
var connections = [];
var c = 0;

var sum = function (values) {
  var rv = 0;
  for (var i in values) {
    rv += values[i];
  }
  return rv;
};

opts.ifScript(__filename, function(options) {
  if (!options.name1 || !options.name2) {
    throw "YOU MUST GIVE ME NAMES, --name1 and --name2"
  }
  
  var results1 = []
  var results2 = []

  var i = 1;
  
  function runTest () {
    testModule.testWrites(options.url1, options.clients, options.doc, options.duration, options.poll, function (error, results) {
      var r = {results:results, time:new Date(), clients:options.clients, 
               doctype:options.doc, duration:options.duration}
      results1.push(r)
      testModule.testWrites(options.url2, options.clients, options.doc, options.duration, options.poll, function(error, results) {
        r = {results:results, time:new Date(), clients:options.clients, 
             doctype:options.doc, duration:options.duration}
        results2.push(r)

        if (i !== options.recurrence) {
          i += 1;
          runTest();
        } else {
          body = {'results':[{name:options.name1, results:results1}, {name:options.name2, results:results2}], 
                  time:new Date(), clients:options.clients, doctype:options.doc, duration:options.duration,
                  recurrence:options.recurrence}
          client.request(options.graph, 'POST', JSON.stringify(body), undefined, undefined, 'utf8',  
            function (error, response, body) {
              if (response.statusCode != 201) {sys.puts('bad!')}
              else {sys.puts(options.graph+'/'+'_design/app/_show/compareWriteTest/'+JSON.parse(body)['id'])}
              process.exit();
          })
        }
      })
    })
  }
  runTest()
})


