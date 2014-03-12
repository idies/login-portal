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
  $scope.deleteButton = '<button type="button" class="btn btn-danger btn-xs" confirm-click="deleteUser(row.entity.id+\'|\'+row.entity.tenantId)" confirm-message="Are you sure?">Delete</button>';

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

  $scope.groupSelection = [], $scope.groupUserSelection = [], $scope.userSelection = [];
  $scope.groupsData = '', groupUsersData = '', usersData = '';
  $scope.groupsGrid = { 
    data: 'groupsData',
    enableRowSelection: true,
    showFilter: false,
    columnDefs: [
      {field: 'name', displayName: 'Name'},
      {field:'id', displayName:'ID'}
    ],
    multiSelect: false,
    selectedItems: $scope.groupSelection,
    afterSelectionChange: function(data) {
      if("undefined" !== typeof $scope.groupSelection[0]) { // fires twice: for select and for unselect, need to catch only select
        var groupId = $scope.groupSelection[0].id;
        $http({
          method: 'GET',
          url: '/keystone/v3/groups/'+groupId+"/users",
          headers: {
            'X-Auth-Token': CookieFactory.getCookie("token")
          }
        }).success(function(res) {
          $scope.groupUsersData = res.users;
          if (!$scope.$$phase) {
            $scope.$apply();
          }  
        });
      }
    }
  };

  $scope.groupUsersGrid = {
    data: 'groupUsersData',
    enableRowSelection: true,
    columnDefs: [
      {field: 'name', displayName: 'Name'},
      {field:'id', displayName:'ID'}
    ],
    selectedItems: $scope.groupUserSelection,
    multiSelect: false
  }

  $scope.usersGrid = {
    data: 'usersData',
    enableRowSelection: true,
    columnDefs: [
      {field: 'name', displayName: 'Name'},
      {field:'id', displayName:'ID'}
    ],
    selectedItems: $scope.userSelection,
    multiSelect: false
  }

  $http({method: 'GET', url: '/keystone/v3/groups',
    headers: {
      'X-Auth-Token': CookieFactory.getCookie("token")
    }
  }).success(function(res) {
    $scope.groupsData = res.groups;
    if (!$scope.$$phase) {
      $scope.$apply();
    }  
  });

  $http({method: 'GET', url: '/keystone/v3/users',
    headers: {
      'X-Auth-Token': CookieFactory.getCookie("token")
    }
  }).success(function(res) {
    $scope.usersData = res.users;
    if (!$scope.$$phase) {
      $scope.$apply();
    }  
  });

  $scope.addUserToGroup = function() {
    console.debug($scope.userSelection[0]);
  }

  $scope.removeUserFromGroup = function() {
    console.debug($scope.groupUserSelection[0]);
  }

}).controller('UserController', function ($scope, $http, CookieFactory) {
  $http({
    url: '/keystone/v2.0/tokens/'+CookieFactory.getCookie("token"),
    method: "GET"
  }).success(function(res) {
    $scope.user = res;
  });
}).filter('token', function(CookieFactory){
  return function(text) {
    return text.replace(/\{token\}/g, CookieFactory.getCookie("token"));
  }
});