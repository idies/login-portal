angular.module('angular-login.pages', 
  ['angular-login.grandfather',
  'confirmClick',
  'ui.bootstrap'
  ])
.config(function ($stateProvider) {
  $stateProvider
    .state('app.admin', {
      url: '/admin',
      templateUrl: 'pages/admin.tpl.html',
      controller: 'AdminController',
      accessLevel: accessLevels.admin
    })
    .state('app.user', {
      url: '/user',
      templateUrl: 'pages/user.tpl.html',
      controller: 'UserController',
      accessLevel: accessLevels.user
    });
}).controller('AdminController', function ($scope, $http, CookieFactory) {
  $scope.usersData = '';
  $scope.deleteButton = '<button type="button" class="btn btn-danger" confirm-click="deleteUser(row.entity.id+\'|\'+row.entity.tenantId)" confirm-message="Are you sure?">Delete</button>';

  $scope.gridOptions = { 
    data: 'usersData',
    enableRowSelection: false,
    showFilter: true,
    columnDefs: [
      {field: 'name', displayName: 'Username'},
      {field: 'email', displayName: 'Email'},
      {field:'id', displayName:'User ID'},
      {field:'tenantId', displayName:'Tenant ID'},
      {displayName:'', cellTemplate: $scope.deleteButton, width: "110px"}
    ]
  };

  $scope.reloadUsers = function() {
    $http({
      method: 'GET',
      url: '/users',
      headers: {
        'X-Auth-Token': CookieFactory.getCookie("token")
      }
    }).success(function(res) {
      $scope.usersData = res.users;
      if (!$scope.$$phase) {
        $scope.$apply();
      }  
    });
  }

  $scope.reloadUsers();

  $scope.deleteUser = function (userId) {
    $http({
      method: 'DELETE',
      url: '/users/'+userId,
      headers: {
        'X-Auth-Token': CookieFactory.getCookie("token")
      }
    }).success(function(res) {
      $scope.reloadUsers();
    });
  };

}).controller('UserController', function ($scope, $http, CookieFactory) {
  $http({
    url: '/keystone/v2.0/tokens/'+CookieFactory.getCookie("token"),
    method: "GET"
  }).success(function(res) {
    $scope.user = res;
  });

});