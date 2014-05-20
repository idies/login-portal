var config = require('./config');

var http = require('http');
var static = require('node-static');
var Cookies = require("cookies");

// node-static imports
var events = require('events');
var path = require('path');
var fs = require('fs');

var reguser = require('./reguser');

var url = require('url');

var fileServer = new static.Server('./build', {
    cache: false,
    headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    }
});

require('http').createServer(function(req, res) {

    try {

        var cookies = new Cookies(req, res);

        var token = cookies.get("token");

        var url = require('url').parse(req.url, true);
        var pathfile = url.pathname;
        var query = url.query;
        var callbackUrl = query["callbackUrl"];

        if (typeof token == "undefined" || typeof callbackUrl == "undefined" || query["logout"] == 'true') {
            if (url.path.indexOf("/keystone/") == 0) { // pRoxy keystone request
                proxyReq(req, res);
            } else if (url.path.indexOf("/users") == 0) {
                if (req.method == "DELETE") {
                    var pathSegms = url.path.split('/');
                    var userId = decodeURIComponent(pathSegms[pathSegms.length - 1]);
                    var tenantId;
                    if (userId.indexOf('|') > 0) {
                        var ids = userId.split('|');
                        userId = ids[0];
                        tenantId = ids[1];
                    }
                    var delete_users_request = http.request({
                        hostname: config.keystone.serverUrl,
                        port: 35357,
                        method: "DELETE",
                        path: "/v2.0/users/" + userId,
                        headers: {
                            'X-Auth-Token': req.headers['x-auth-token']
                        }
                    }, function(delete_users_response) {
                        delete_users_response.on('data', function(resp) { /*consume data*/ });
                        if ("undefined" === typeof tenantId) {
                            res.writeHead(204);
                            res.end();
                        } else {
                            var delete_tenants_request = http.request({
                                hostname: config.keystone.serverUrl,
                                port: 35357,
                                method: "DELETE",
                                path: "/v2.0/tenants/" + tenantId,
                                headers: {
                                    'X-Auth-Token': req.headers['x-auth-token']
                                }
                            }, function(delete_tenants_response) {
                                delete_tenants_response.on('data', function(resp) { /*consume data*/ });
                                res.writeHead(204);
                                res.end();
                            });
                            delete_tenants_request.on('error', function(error) {
                                handleError(res, error);
                            });
                            delete_tenants_request.end();
                        }
                    });
                    delete_users_request.on('error', function(error) {
                        handleError(res, error);
                    });
                    delete_users_request.end();
                } else if (req.method == "POST") {
                    req.on('data', function(chunk) {
                        var reqData = JSON.parse(chunk);
                        var regUserRequest = reguser.reguser(reqData.username, reqData.password, reqData.email);
                        regUserRequest.on("registered", function(result) {
                            var body = JSON.stringify(result);
                            res.writeHead(200, {
                                'Content-Length': body.length,
                                'Content-Type': 'application/json'
                            });
                            res.write(body);
                            res.end();
                        });
                        regUserRequest.on("error", function(error) {
                            handleError(res, error);
                        });
                    });
                }
            } else if (url.pathname.indexOf("/groups") == 0) {
                if (req.method == "POST") { // create new group, make the user admin of this group
                    req.on('data', function(chunk) {
                        var create_group_request = http.request({
                            hostname: config.keystone.serverUrl,
                            port: 35357,
                            method: "POST",
                            path: "/v3/groups/",
                            headers: {
                                'X-Auth-Token': config.keystone.adminToken,
                                'Content-Type':'application/json'
                            }
                        }, function(create_group_response) {
                            create_group_response.on('data', function(resp) {
                                var respData = JSON.parse(resp);
                                var groupId = respData.group.id;

                                var roleJson = {
                                    "role": {
                                        "name": "group_admin:" + groupId
                                    }
                                };
                                var create_role_request = http.request({
                                    hostname: config.keystone.serverUrl,
                                    port: 35357,
                                    method: "POST",
                                    path: "/v3/roles/",
                                    headers: {
                                        'X-Auth-Token': config.keystone.adminToken,
                                        'Content-Type':'application/json'
                                    }
                                }, function(create_role_response) {
                                    create_role_response.on('data', function(resp) {
                                        var respData = JSON.parse(resp);
                                        var roleId = respData.role.id;
                                        var get_user_request = http.request({
                                            hostname: config.keystone.serverUrl,
                                            port: 35357,
                                            method: "GET",
                                            path: "/v3/auth/tokens/",
                                            headers: {
                                                'X-Auth-Token': config.keystone.adminToken,
                                                'X-Subject-Token': req.headers['x-auth-token']
                                            }
                                        }, function(get_user_response) {
                                            var response = "";
                                            get_user_response.on('data', function(resp) {
                                                response += resp;
                                            });
                                            get_user_response.on('end', function() {
                                                var respData = JSON.parse(response);
                                                var userId = respData.token.user.id;

                                                var assign_user_request = http.request({ // assign the group_admin role to user
                                                    hostname: config.keystone.serverUrl,
                                                    port: 35357,
                                                    method: "PUT",
                                                    path: "/v3/projects/" + respData.token.project.id + "/users/" + userId + "/roles/" + roleId,
                                                    headers: {
                                                        'X-Auth-Token': config.keystone.adminToken
                                                    }
                                                }, function(create_role_response) {
                                                    create_role_response.on('data', function() { /*consume, just in case*/ });
                                                    var add_user_to_group_request = http.request({
                                                        hostname: config.keystone.serverUrl,
                                                        port: 35357,
                                                        method: "PUT",
                                                        path: '/v3/groups/'+groupId+"/users/"+userId,
                                                        headers: {
                                                            'X-Auth-Token': config.keystone.adminToken
                                                        }
                                                    }, function(add_user_to_group_response) {
                                                        add_user_to_group_response.on('data', function() { /*consume*/ });
                                                        res.writeHead(204);
                                                        res.end();
                                                    });
                                                    add_user_to_group_request.on("error", function(error) {
                                                        handleError(res, error);
                                                    });
                                                    add_user_to_group_request.end();
                                                });
                                                assign_user_request.on("error", function(error) {
                                                    handleError(res, error);
                                                });
                                                assign_user_request.end();
                                            });
                                        });
                                        get_user_request.on("error", function(error) {
                                            handleError(res, error);
                                        });
                                        get_user_request.end();
                                    });
                                });
                                create_role_request.on("error", function(error) {
                                    handleError(res, error);
                                });
                                create_role_request.write(JSON.stringify(roleJson));
                                create_role_request.end();
                            });
                        });
                        create_group_request.on("error", function(error) {
                            handleError(res, error);
                        });
                        create_group_request.write(chunk);
                        create_group_request.end();
                    });
                } else if (req.method == "PUT" || req.method == "DELETE") { // add/remove user to group
                    var pathSplit = url.pathname.split("/");
                    var subjectUserId = pathSplit[4], groupId = pathSplit[2];
                    var get_user_request = http.request({
                        hostname: config.keystone.serverUrl,
                        port: 35357,
                        method: "GET",
                        path: "/v3/auth/tokens/",
                        headers: {
                            'X-Auth-Token': config.keystone.adminToken,
                            'X-Subject-Token': req.headers['x-auth-token']
                        }
                    }, function(get_user_response) {
                        var response = "";
                        get_user_response.on('data', function(resp) {
                            response += resp;
                            console.log(resp+"");
                        });
                        get_user_response.on('end', function() {
                            if(get_user_response.statusCode != 200) {
                                console.log("Error happened in 'end'");
                                handleError(res, "Error: "+response);
                            } else {
                                var respData = JSON.parse(response);
                                var userId = respData.token.user.id;
                                var roles = respData.token.roles;
                                var isAdmin = false;
                                for(i in roles) {
                                    if(roles[i].name == "group_admin:"+groupId) { // User is group admin
                                        isAdmin = true;
                                    }
                                }
                                if(!isAdmin) {
                                    res.writeHead(401);
                                    res.end();
                                } else {
                                    var add_user_to_group_request = http.request({
                                        hostname: config.keystone.serverUrl,
                                        port: 35357,
                                        method: req.method,
                                        path: '/v3/groups/'+groupId+"/users/"+subjectUserId,
                                        headers: {
                                            'X-Auth-Token': config.keystone.adminToken
                                        }
                                    }, function(add_user_to_group_response) {
                                        add_user_to_group_response.on('data', function() { /*consume*/ });
                                        console.log("Add usr to group");
                                        res.writeHead(204);
                                        res.end();
                                    });
                                    add_user_to_group_request.on("error", function(error) {
                                        handleError(res, error);
                                    });
                                    add_user_to_group_request.end();
                                }
                            }
                        });
                    });
                    get_user_request.on("error", function(error) {
                        handleError(error);
                    });
                    get_user_request.end();
                }
            } else {
                fileServer.serve(req, res)
                    .on("error", function(error) {
                        // serve index, angular will do the rest
                        fileServer.serveFile("/index.html", 200, {}, req, res);
                    });
            }
        } else {
            res.writeHead(302, {
                'Location': callbackUrl + ((callbackUrl.indexOf("?") > 0) ? "&" : "?") + "token=" + token,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.end();
        }
    } catch(e) {
        handleError(res, e);
    }

}).listen(8080);

var handleError = function(res, error) {
    console.error("Error occured: "+error);
    res.writeHead(500, {
        'Content-Length': error.length,
        'Content-Type': 'application/json'
    });
    res.write(JSON.stringify({
        "error": error
    }));
    res.end();
}

var proxyReq = function(req, res) {
    var url = require('url').parse(req.url);

    var reqPath = url.path.substring("/keystone".length);

    var options = {
        hostname: config.keystone.serverUrl,
        port: config.keystone.serverPort,
        path: reqPath,
        method: req.method,
        headers: req.headers
    };

    // set admin header for allowed paths
    config.keystone.allowAdmin.forEach(function(pathPrefix) {
        if (reqPath.indexOf(pathPrefix) == 0) {
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
    proxy_request.on("error", function(error) {
        handleError(error);
    });
    req.on('data', function(chunk) {
        proxy_request.write(chunk, 'binary');
    });
    req.on('end', function() {
        proxy_request.end();
    });
}

Server.prototype.serveDir = function(pathname, req, res, finish) {
    var htmlIndex = path.join(pathname, 'index.html'),
        that = this;

    fs.stat(htmlIndex, function(e, stat) {
        if (!e) {
            var status = 200;
            var headers = {};

            var requrl = url.parse(req.url, true);
            var query = requrl.query;

            if (query['logout'] == 'true') {
                headers = {
                    'Set-Cookie': 'token=; path=/; expires=01 Jan 1970 00:00:00 GMT'
                };
            }

            var originalPathname = decodeURI(url.parse(req.url).pathname);
            if (originalPathname.length && originalPathname.charAt(originalPathname.length - 1) !== '/') {
                return finish(301, {
                    'Location': originalPathname + '/'
                });
            } else {
                that.respond(null, status, headers, [htmlIndex], stat, req, res, finish);
            }
        } else {
            // Stream a directory of files as a single file.
            fs.readFile(path.join(pathname, 'index.json'), function(e, contents) {
                if (e) {
                    return finish(404, {})
                }
                var index = JSON.parse(contents);
                streamFiles(index.files);
            });
        }
    });

    function streamFiles(files) {
        util.mstat(pathname, files, function(e, stat) {
            if (e) {
                return finish(404, {})
            }
            that.respond(pathname, 200, {}, files, stat, req, res, finish);
        });
    }
};