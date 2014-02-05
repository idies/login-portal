var config = require('./config');

var http = require('http');
var static = require('node-static');
var Cookies = require( "cookies" );

// node-static imports
var events = require('events');
var path   = require('path');
var fs     = require('fs');

var url = require('url');

var fileServer = new static.Server('./build', {cache: false});

require('http').createServer(function (req, res) {

	var cookies = new Cookies( req, res);

	var token = cookies.get( "token" );

 	var url = require('url').parse(req.url, true);
	var pathfile = url.pathname;
	var query = url.query;
	var callbackUrl = query["callbackUrl"];

	if(typeof token == "undefined" || typeof callbackUrl == "undefined" || query["logout"] == 'true') {

        if(url.path.indexOf("/keystone/") == 0) {
            proxyReq(req, res);
        } else {
            fileServer.serve(req, res)
            .on("error", function(error) {
                // serve index, angular will do the rest
                fileServer.serveFile("/index.html", 200, {}, req, res);
            });
        }
	} else {
		res.writeHead(302, {
		  'Location': callbackUrl+((callbackUrl.indexOf("?") > 0)?"&":"?")+"token="+token,
		  'Cache-Control': 'no-cache, no-store, must-revalidate',
		  'Pragma': 'no-cache',
		  'Expires': '0'
		});
		res.end();
	}

}).listen(8080);

var proxyReq = function(req, res) {
    var url = require('url').parse(req.url);

    var reqPath = url.path.substring("/keystone".length);

    var options = {
        hostname: config.keystone.serverUrl,
        port: config.keystone.serverPort,
        path: reqPath,
        method: req.method,
        headers: req.headers,
        'content-type': req['content-type']
    };

    // set admin header for allowed paths
    config.keystone.allowAdmin.forEach(function(pathPrefix) {
        if(reqPath.indexOf(pathPrefix) == 0) {
            options.headers["X-Auth-Token"] = config.keystone.adminToken;                                                                                                                            
        }
    });

    var proxy_request = http.request(options, function(proxy_response) {
        proxy_response.on('data', function(chunk) {
          res.write(chunk, 'binary');
        });
        proxy_response.on('end', function() {
          res.end();
        });
        res.writeHead(proxy_response.statusCode, proxy_response.headers);
    });
    req.on('data', function(chunk) {
        proxy_request.write(chunk, 'binary');
    });
    req.on('end', function() {
        proxy_request.end();
    });
}

Server.prototype.serveDir = function (pathname, req, res, finish) {
    var htmlIndex = path.join(pathname, 'index.html'),
        that = this;

    fs.stat(htmlIndex, function (e, stat) {
        if (!e) {
            var status = 200;
            var headers = {};

		    var requrl = url.parse(req.url, true);
		    var query = requrl.query;

		    if(query['logout'] == 'true') {
				headers = {'Set-Cookie': 'token=; path=/; expires=01 Jan 1970 00:00:00 GMT'};
		    }

            var originalPathname = decodeURI(url.parse(req.url).pathname);
            if (originalPathname.length && originalPathname.charAt(originalPathname.length - 1) !== '/') {
                return finish(301, { 'Location': originalPathname + '/' });
            } else {
                that.respond(null, status, headers, [htmlIndex], stat, req, res, finish);
            }
        } else {
            // Stream a directory of files as a single file.
            fs.readFile(path.join(pathname, 'index.json'), function (e, contents) {
                if (e) { return finish(404, {}) }
                var index = JSON.parse(contents);
                streamFiles(index.files);
            });
        }
    });
    function streamFiles(files) {
        util.mstat(pathname, files, function (e, stat) {
            if (e) { return finish(404, {}) }
            that.respond(pathname, 200, {}, files, stat, req, res, finish);
        });
    }
};

