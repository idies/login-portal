var config = {}

config.keystone = {};

config.keystone.adminToken = 'admin_token';

config.keystone.serverUrl = 'zinc26.pha.jhu.edu';
config.keystone.serverPort = 5000;

config.keystone.allowAdmin = [
	'/v2.0/tokens',
	'/v2.0/users'
];

module.exports = config;