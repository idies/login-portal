var config = require('./config');

var vows = require('vows'),
    assert = require('assert'),
    APIeasy = require('api-easy');

var suite = APIeasy.describe('api/test');

var credentials = {"username": "username_for_testing16","email":"emailuser@email.com","password":"123456"};

suite
  .use('localhost', 8080)
  .setHeader('Content-Type', 'application/json')
  .followRedirect(false)

  .discuss('Keystone redirect ')
  .get('/keystone/v2.0/extensions')
    .expect(200)
  .undiscuss()

  .discuss('Users management ')
  .discuss('register user ')
  .post("/reguser", credentials)
    .expect('Should respond with user and tenant id', function(err, res, body) {
      var userToken = JSON.parse(body);
      assert.isNotNull(userToken.userid);
      assert.isNotNull(userToken.tenantid);
      suite.before('setUserTenantId', function(outgoing) {
          //use outgoing.body for post requests and outgoing.uri for get requests
          outgoing.uri = outgoing.uri.replace('_USER_TENANT_ID',userToken.userid+"|"+userToken.tenantid);
          return outgoing;
      });   

  })
  .undiscuss()

  .discuss('authenticate new user ')
  .next()
  .post('/keystone/v2.0/tokens', {
      "auth":{
        "tenantName": credentials.username,
        "passwordCredentials":{
          "username":credentials.username,
          "password": credentials.password
        }
      }
    })
    .expect('should response with the user token', function(_err, _res, _body) {
      assert.equal (_res.statusCode, 200);
      var userToken = JSON.parse(_body);
      assert.isNotNull(userToken.access);
      assert.isNotNull(userToken.access.token);
      assert.isNotNull(userToken.access.token.id);

      suite.before('setUserToken', function(outgoing) {
        outgoing.uri = outgoing.uri.replace('_USER_TOKEN',userToken.access.token.id);
        return outgoing;
      });   
    })
  .undiscuss()

  .discuss('check user\'s token ')
  .next()
  .setHeader("X-Auth-Token", config.keystone.adminToken)
  .get('/keystone/v2.0/tokens/_USER_TOKEN') 
    .expect('should respond TRUE', function (_err, _res, _body) {
      assert.equal (_res.statusCode, 200);
      suite.unbefore('setUserToken');
   }
  )
  .undiscuss()

  .discuss('delete user ')
  .next()
  .del('/users/_USER_TENANT_ID') 
    .expect('should respond TRUE', function (_err, _res, _body) {
      assert.equal (_res.statusCode, 204);
      suite.unbefore('setUserTenantId');
   }
  )
  .undiscuss()

  .removeHeader("X-Auth-Token")
  .undiscuss()
.export(module);
