var config = require('./config');
var http = require('http');
var events = require('events');
var util = require('util');

exports.reguser = function(username, password, email) {

	var promise = new(events.EventEmitter);
    
    // create new tenant
    var tenant_create_request = http.request(generateReqOptions('tenants'), function(tenant_response) {
    	tenant_response.on('data', function(chunk) {
	    	var tenant_id = JSON.parse(chunk).tenant.id;
	
		    // create new user
		    var user_create_request = http.request(generateReqOptions('users'), function(user_response) {
		    	user_response.on('data', function(chunk) {
			    	var user_id = JSON.parse(chunk).user.id;

				    // get admin role id
				    var get_role_request = http.request(generateReqOptions('get_roles'), function(get_role_response) {
				    	get_role_response.on('data', function(chunk) {
					    	var roles = JSON.parse(chunk).roles;
					    	var adm_role = roles.filter(function(role) {
					    		return role.name == "admin";
					    	})[0];

					    	if("undefined" !== typeof adm_role) {
							    // bind user to tenant using role admin
							    var bind_user_request = http.request(generateReqOptions('roles', tenant_id, user_id, adm_role.id), function(roles_response) {
							    	if(roles_response.statusCode == 200) {
							    		console.log("Ok!");
										promise.emit("registered", {
											'userid': user_id,
											'tenantid':tenant_id
										});
							    	} else {
							    	    roles_response.on('data', function(chunk) {
										    promise.emit("error", roles_response.statusCode+" "+chunk);
							    	    });
							    	}
								});		
								bind_user_request.end();
					    	} else {
							    promise.emit("error", "");
					    	}
						});//get_role_request.onData
					});//get_role_request
					get_role_request.end();
		    	});//user_create_request onData
			});//user_create_request
			user_create_request.write(generateUserData(username, password, email, tenant_id));
			user_create_request.end();
    	}); //tenant_create_request onData
    }); //tenant_create_request
	tenant_create_request.write(generateTenantData(username));
	tenant_create_request.end();
	return promise;
};

util.inherits(exports.reguser, events.EventEmitter);

var generateUserData = function(username, password, email, tenantId) {
    var userData = {
	  user: {
	    name: username,
	    password: password,
	    email: email,
	    enabled: true
	  }
	};
	if("undefined" !== typeof tenantId)
		userData.user.tenantId = tenantId;
	return JSON.stringify(userData);
};

var generateTenantData = function(username) {
    var tenantData = {
	  tenant: {
	    name: username,
	    description: "",
	    enabled: true
	  }
	};
    return JSON.stringify(tenantData);
};

var generateReqOptions = function(resource, tenantId, userId, roleId) {
	var returnOptions = {
        hostname: config.keystone.serverUrl,
        port: 35357,
        method: "POST",
        headers: {
        	'X-Auth-Token':config.keystone.adminToken,
        	'Content-Type':'application/json'
        }

	};
	switch(resource) {
		case "users":
			returnOptions.path = "/v2.0/users";
			break;
		case "tenants":
			returnOptions.path = "/v2.0/tenants";
			break;
		case "roles":
			returnOptions.path = "/v2.0/tenants/"+tenantId+"/users/"+userId+"/roles/OS-KSADM/"+roleId;
			returnOptions.method = "PUT";
			break;
		case "get_roles":
			returnOptions.path = "/v2.0/OS-KSADM/roles";
			returnOptions.method = "GET";
			break;
	}

	return returnOptions;
}