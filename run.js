var http = require('http');
var static = require('node-static');
var Cookies = require( "cookies" );

var url = require('url');

var fileServer = new static.Server('./build', {cache: false, headers: {'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0'}});

require('http').createServer(function (req, res) {

	var cookies = new Cookies( req, res);

	var token = cookies.get( "token" );

 	var url = require('url').parse(req.url, true);
	var pathfile = url.pathname;
	var query = url.query;
	console.log(req.url);
	var callbackUrl = query["callbackUrl"];
	console.log("token: "+token);
	console.log("callback: "+callbackUrl);

	if(typeof token == "undefined" || typeof callbackUrl == "undefined") {
		console.log("Serving file");
		fileServer.serve(req, res).
		on("error", function(error) {
			//console.log(req);
			console.log(error);
		});
		//cookies.set("token", "fcac0be911504361b0d9090af2267587");
		//res.writeHead(302, {
		//  'Location': redirectUrl+"?token_set="+token
		//});
		//res.end();
	} else {
		console.log("Redirecting ");
		res.writeHead(302, {
		  'Location': callbackUrl+"?token="+token,
		  'Cache-Control': 'no-cache, no-store, must-revalidate',
		  'Pragma': 'no-cache',
		  'Expires': '0'
		});
		res.end();
	}

}).listen(8080);
