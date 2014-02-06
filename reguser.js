var config = require('./config');
var http = require('http');

exports.regUser = function(username, password, email) {
    var tenantData = JSON.stringify({
	  "tenant": {
	    "name": username,
	    "description": "",
	    "enabled": true
	  }
	});

    var userData = JSON.stringify({
	  "user": {
	    "name": username,
	    "password": password,
	    "email": email,
	    "enabled": true
	  }
	});

    // create new tenant
    var tenant_create_request = http.request(generateReqOptions('tenants'), function(tenant_response) {
    	tenant_response.on('data', function(chunk) {
    		console.log(""+chunk);
	    	var tenant_id = JSON.parse(chunk).tenant.id;
	
		    // create new user
		    var user_create_request = http.request(generateReqOptions('users'), function(user_response) {
		    	user_response.on('data', function(chunk) {
			    	var user_id = JSON.parse(chunk).user.id;

				    // get admin role id
				    var get_role_request = http.request(generateReqOptions('get_roles'), function(get_role_response) {
				    	get_role_response.on('data', function(chunk) {
					    	var roles = JSON.parse(chunk);
					    	var adm_role_id;
					    	for(var role in roles.roles) {
					    		if(role.name == "admin")
					    			adm_role_id = role.id;
					    	}

					    	if("undefined" !== adm_role_id) {
							    // bind user to tenant using role admin
							    var bind_user_request = http.request(generateReqOptions('roles'), function(roles_response) {
									console.log("Successfully binded user "+username+" to tenant "+username);
									console.log(roles_response.statusCode);
								});		
								bind_user_request.end();
					    	}
						});//get_role_request.onData
					});//get_role_request
					get_role_request.end();
		    	});//user_create_request onData
			});//user_create_request
			user_create_request.write(userData);
			user_create_request.end();
    	}); //tenant_create_request onData
    }); //tenant_create_request
	tenant_create_request.write(tenantData);
	tenant_create_request.end();
}

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

// regUser("dimm000", "crystal", "dimm@sky-way.ru");