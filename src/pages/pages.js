angular.module('angular-login.pages', 
  ['angular-login.grandfather',
  'ui.bootstrap'
  ])
.config(function ($stateProvider) {
  $stateProvider
    .state('app.admin', {
      url: '/admin',
      templateUrl: 'pages/admin.tpl.html',
      controller: 'AdminController',
      accessLevel: accessLevels.admin
    });
}).controller('AdminController', function ($scope, $http, CookieFactory) {
  $scope.groupSelection = [], $scope.groupUserSelection = [], $scope.userSelection = [], $scope.userSelection2 = [];
  $scope.groupsData = '', groupUsersData = '', usersData = '', usersData2 = '' /*for adding to groups*/;

  $scope.gridOptions = { 
    data: 'usersData',
    enableRowSelection: true,
    selectedItems: $scope.userSelection,
    multiSelect: false,
    showFilter: true,
    columnDefs: [
      {field: 'name', displayName: 'Username'},
      {field: 'email', displayName: 'Email'},
      {field:'id', displayName:'User ID'},
      {field:'default_project_id', displayName:'Tenant ID'}
    ],
    sortInfo: { fields: ['name'], directions: ['asc']}
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
    })
    .error(function(data, status, headers, config) {
      if(status == 401) {
        $scope.logoutMe();
      } else {
        console.error(data);
      }
    });
  }

  $scope.reloadUsers();

  $scope.deleteUser = function () {
    if("undefined" === typeof $scope.userSelection[0])
      return;
    
    var userId = $scope.userSelection[0].id+'|'+$scope.userSelection[0].default_project_id;
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
      {field: 'name', displayName: 'Group name'},
      {field:'id', displayName:'ID'}
    ],
    multiSelect: false,
    selectedItems: $scope.groupSelection,
    afterSelectionChange: function(data) {
      if("undefined" !== typeof $scope.groupSelection[0]) { // fires twice: for select and for unselect, need to catch only select
        $scope.reloadMembers();
      }
    },
    sortInfo: { fields: ['name'], directions: ['asc']}
  };

  $scope.groupUsersGrid = {
    data: 'groupUsersData',
    enableRowSelection: true,
    columnDefs: [
      {field: 'name', displayName: 'Group member name'},
      {field:'id', displayName:'ID'}
    ],
    selectedItems: $scope.groupUserSelection,
    multiSelect: false,
    sortInfo: { fields: ['name'], directions: ['asc']}
  }

  $scope.usersGrid = {
    data: 'usersData2',
    enableRowSelection: true,
    columnDefs: [
      {field: 'name', displayName: 'Other users name'},
      {field:'id', displayName:'ID'}
    ],
    selectedItems: $scope.userSelection2,
    multiSelect: false,
    sortInfo: { fields: ['name'], directions: ['asc']}
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
    }).error(function(data, status, headers, config) {
      if(status == 401) {
        $scope.logoutMe();
      } else {
        console.error(data);
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
    }).error(function(data, status, headers, config) {
      if(status == 401) {
        $scope.logoutMe();
      } else {
        console.error(data);
      }
    });

  }

  $scope.addUserToGroup = function() {
    $http({method: 'PUT', url: '/keystone/v3/groups/'+$scope.groupSelection[0].id+"/users/"+$scope.userSelection2[0].id,
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
    if(groupName == "" || "undefined" === typeof groupName)
      return;

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

  $scope.removeGroup = function() {
    if("undefined" !== typeof $scope.groupSelection[0]) {
      var groupId = $scope.groupSelection[0].id;
      $http({method: 'DELETE', url: '/keystone/v3/groups/'+groupId,
        headers: {
          'X-Auth-Token': CookieFactory.getCookie("token")
        }
      }).success(function(res) {
        $scope.reloadGroups();
      });
    }
  }
});