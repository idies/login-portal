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
  $scope.groupSelection = [], $scope.groupUserSelection = [], $scope.userSelection = [];
  $scope.groupsData = '', groupUsersData = '', usersData = '', usersData2 = '' /*for adding to groups*/;

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
      url: '/keystone/v3/users',
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
        $scope.reloadMembers();
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
    data: 'usersData2',
    enableRowSelection: true,
    columnDefs: [
      {field: 'name', displayName: 'Name'},
      {field:'id', displayName:'ID'}
    ],
    selectedItems: $scope.userSelection,
    multiSelect: false
  }

  $scope.reloadGroups = function() {
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
  };

  $scope.reloadGroups();
  
  $scope.reloadMembers = function() {
    var groupId = $scope.groupSelection[0].id;
    $http({
      method: 'GET',
      url: '/keystone/v3/groups/'+groupId+"/users",
      headers: {
        'X-Auth-Token': CookieFactory.getCookie("token")
      }
    }).success(function(res) {
      $scope.groupUsersData = res.users;

      $http({method: 'GET', url: '/keystone/v3/users',
        headers: {
          'X-Auth-Token': CookieFactory.getCookie("token")
        }
      }).success(function(res) {
        $scope.usersData2 = res.users.filter(function(user) {
          for(var i=0; i<$scope.groupUsersData.length; i++) {
            if($scope.groupUsersData[i].id == user.id) {
              return false;
            }
          }
          return true;
        });
        if (!$scope.$$phase) {
          $scope.$apply();
        }  
      });
    });

  }

  $scope.addUserToGroup = function() {
    $http({method: 'PUT', url: '/keystone/v3/groups/'+$scope.groupSelection[0].id+"/users/"+$scope.userSelection[0].id,
      headers: {
        'X-Auth-Token': CookieFactory.getCookie("token")
      }
    }).success(function(res) {
      $scope.reloadMembers();
    });
  }

  $scope.removeUserFromGroup = function() {
    $http({method: 'DELETE', url: '/keystone/v3/groups/'+$scope.groupSelection[0].id+"/users/"+$scope.groupUserSelection[0].id,
      headers: {
        'X-Auth-Token': CookieFactory.getCookie("token")
      }
    }).success(function(res) {
      $scope.reloadMembers();
    });
  }

  $scope.addGroup = function(groupName) {
    var newGroupData = {
          "group": {
              "name": groupName
          }
      };

    $http({method: 'POST', url: '/keystone/v3/groups/',
      headers: {
        'X-Auth-Token': CookieFactory.getCookie("token")
      },
      data: JSON.stringify(newGroupData)
    }).success(function(res) {
      $scope.reloadGroups();
    });
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