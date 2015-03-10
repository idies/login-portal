var config = require('./config');

var http = require('http');
var static = require('node-static');
var Cookies = require( "cookies" );

// node-static imports
var events = require('events');
var path   = require('path');
var fs     = require('fs');

var reguser = require('./reguser');

var url = require('url');

var fileServer = new static.Server('./build', {cache: false, headers: {'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0'}});

require('http').createServer(function (req, res) {

	var cookies = new Cookies( req, res);

	var token = cookies.get( "token" );

 	var url = require('url').parse(req.url, true);
	var pathfile = url.pathname;
	var query = url.query;
	var callbackUrl = query["callbackUrl"];

	if(typeof token == "undefined" || typeof callbackUrl == "undefined" || query["logout"] == 'true') {

        if(url.path.indexOf("/keystone") >= 0) {
            proxyReq(req, res);
        } else if(url.path.indexOf("/reguser") >= 0) {
            req.on('data', function(chunk) {
                var reqData = JSON.parse(chunk);
                var regUserRequest = reguser.reguser(reqData.username, reqData.password, reqData.email);
                regUserRequest.on("registered", function(result) {
                    var body = JSON.stringify(result);
                    res.writeHead(200, {
                        'Content-Length': body.length,
                        'Content-Type': 'application/json' });
                    res.write(body);
                    res.end();
                });
                regUserRequest.on("error", function(error) {
                    res.writeHead(500, {
                        'Content-Length': error.length,
                        'Content-Type': 'application/json' });
                    res.write(error);
                    res.end();
                });
            });
        } else if(url.path.indexOf("/users") >= 0) {
            switch(req.method) {
                case "GET":
                    // return users list for admin interface; requires admin token in request
                    var get_users_request = http.request({
                            hostname: config.keystone.serverUrl,
                            port: 35357,
                            method: "GET",
                            path: "/v2.0/users",
                            headers: {
                                'X-Auth-Token':req.headers['x-auth-token'],
                                'Content-Type':'application/json'
                            }
                        }, function(get_users_response) {
                            get_users_response.on('data', function(chunk) {
                                res.write(chunk);
                            });

                            get_users_response.on('end', function(chunk) {
                                res.end();
                            });
                        }
                    );
                    get_users_request.on('error', function(error) {
                        res.writeHead(500, {
                            'Content-Length': error.message.length,
                            'Content-Type': 'application/json' });
                        res.write(error.message);
                        res.end();
                    });
                    get_users_request.end();
                    break;
                case "DELETE":
                    var pathSegms = url.path.split('/');
                    var userId = decodeURIComponent(pathSegms[pathSegms.length-1]);
                    var tenantId;
                    if(userId.indexOf('|') > 0) {
                        var ids = userId.split('|');
                        userId = ids[0];
                        tenantId = ids[1];
                    }
                    var delete_users_request = http.request({
                            hostname: config.keystone.serverUrl,
                            port: 35357,
                            method: "DELETE",
                            path: "/v2.0/users/"+userId,
                            headers: {
                                'X-Auth-Token':req.headers['x-auth-token']
                            }
                        }, function(delete_users_response) {
                            delete_users_response.on('data', function(resp) {/*consume data*/});
                            if("undefined" === typeof tenantId) {
                                res.writeHead(204);
                                res.end();
                            } else {
                                var delete_tenants_request = http.request({
                                        hostname: config.keystone.serverUrl,
                                        port: 35357,
                                        method: "DELETE",
                                        path: "/v2.0/tenants/"+tenantId,
                                        headers: {
                                            'X-Auth-Token':req.headers['x-auth-token']
                                        }
                                    }, function(delete_tenants_response) {
                                        delete_tenants_response.on('data', function(resp) {/*consume data*/});
                                        res.writeHead(204);
                                        res.end();
                                    }
                                );
                                delete_tenants_request.on('error', function(error) {
                                    res.writeHead(500, {
                                        'Content-Length': error.message.length,
                                        'Content-Type': 'application/json' });
                                    res.write(error.message);
                                    res.end();
                                });
                                delete_tenants_request.end();
                            }
                        }
                    );
                    delete_users_request.on('error', function(error) {
                        res.writeHead(500, {
                            'Content-Length': error.message.length,
                            'Content-Type': 'application/json' });
                        res.write(error.message);
                        res.end();
                    });
                    delete_users_request.end();
                    break;
            }
        } else {
            fileServer.serve(req, res)
            .on("error", function(error) {
                // serve index, angular will do the rest
                fileServer.serveFile("/login-portal/index.html", 200, {}, req, res);
            });
        }
	} else {
		var html = '<html><body><script>window.location.href="'+callbackUrl+((callbackUrl.indexOf("?")>0)?"&":"?")+"token="+token+'"</script></body></html>';
		res.writeHead(200, {
		  'Content-Length':html.length,
		  'Content-Type':'text/html' });		
		res.write(html);
    /*
		res.writeHead(302, {
		  'Location': callbackUrl+((callbackUrl.indexOf("?") > 0)?"&":"?")+"token="+token,
		  'Cache-Control': 'no-cache, no-store, must-revalidate',
		  'Pragma': 'no-cache',
		  'Expires': '0'
		});
    */
		res.end();
	}

}).listen(8082);

var proxyReq = function(req, res) {
    var url = require('url').parse(req.url);

    //console.log(url.path);
    var reqPath = url.path.substring("/login-portal//keystone".length);
    //console.log(reqPath);
    var options = {
        hostname: config.keystone.serverUrl,
        port: config.keystone.serverPort,
        path: reqPath,
        method: req.method,
        headers: req.headers
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

