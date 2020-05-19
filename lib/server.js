/*
 * server-related tasks
 */

require("dotenv").config();

//Dependency
var http = require("http");
var https = require("https");
var url = require("url");
var StringDecoder = require("string_decoder").StringDecoder;
var fs = require("fs");

//My lib
var config = require("./config");
var handlers = require("./handlers");
var helpers = require("./helpers");
var path = require("path");

//Instantiate the server module object
var server = {};

// //@TODO remoove this
// helpers.sendTwiloSms("9860152343", "Hello sonis", function (err) {
//   console.log("this was the error: ", err);
// });

// Instantiating http server
server.httpServer = http.createServer(function (req, res) {
  server.unifiedServer(req, res);
});

//Instatiating https server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, "../https/key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "../https/cert.pem")),
};

server.httpsServer = https.createServer(server.httpsServerOptions, function (
  req,
  res
) {
  server.unifiedServer(req, res);
});

//All the server  logic for both http and https server
server.unifiedServer = function (req, res) {
  //Get the URL and parse it
  //if true parse the query string
  var parsedUrl = url.parse(req.url, true);

  //Get the path //if url is http://localhost.com:3000/users -> path is users
  var path = parsedUrl.pathname;
  var trimmedPath = path.replace(/^\/+|\/+$/g, "");

  //Get the query string as an object
  var queryStringObject = parsedUrl.query;

  //Get the HTTP method
  var method = req.method.toLowerCase();

  //Get headers as an object
  var headers = req.headers;

  //Get payloads, if any
  var decoder = new StringDecoder("utf-8");
  var buffer = "";

  //call every time when the payload is received
  req.on("data", function (data) {
    //data is in binary form
    buffer += decoder.write(data);
  });

  req.on("end", function () {
    buffer += decoder.end();

    //Choose the handleer this request should got to , no handler send it to not found handler
    var chosenHandler =
      typeof server.router[trimmedPath] !== "undefined"
        ? server.router[trimmedPath]
        : handlers.notFound;

    //Construct the data object to send to the handler
    var data = {
      trimmedPath: trimmedPath,
      queryStringObject: queryStringObject,
      method: method,
      headers: headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    //Route the request to the handler specified in the router
    chosenHandler(data, function (statusCode, payload) {
      //Use the status code called back by the handler, or default  to 200
      statusCode = typeof statusCode == "number" ? statusCode : 200;

      //Use the payload called backed by the handler, or default to empty object
      payload = typeof payload == "object" ? payload : {};

      //Convert the payload to a string
      var payloadString = JSON.stringify(payload);
      // console.log("hello world");

      //Return the response
      res.setHeader("Content-Type", "application/json");
      res.writeHead(statusCode);
      res.end(payloadString);

      //log the response
      console.log("Returning this response:", statusCode, payloadString);
    });

    //Log the request path
    // console.log("Retrutn: ", buffer);
  });
};

// Define a request router
server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
};

//Init script
server.init = function () {
  //Start the http server, and have it listten on port 3000
  server.httpServer.listen(config.httpPort, function () {
    console.log(
      "The http server is listening on port " +
        config.httpPort +
        "in " +
        config.envName +
        " now."
    );
  });

  //Start https server
  //Start https server
  server.httpsServer.listen(config.httpsPort, function () {
    console.log(
      "The https server is listening on port " +
        config.httpsPort +
        "in " +
        config.envName +
        " now."
    );
  });
};

//Export the module
module.exports = server;