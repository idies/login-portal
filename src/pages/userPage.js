angular.module('angular-login.userPage', ['angular-login.grandfather',
	'ui.bootstrap'
]).config(function($stateProvider) {
	$stateProvider
		.state('app.user', {
			url: '/user',
			templateUrl: 'pages/user.tpl.html',
			controller: 'UserController',
			accessLevel: accessLevels.user
		});
}).controller('UserController', function ($scope, $http, CookieFactory) {
  $scope.groupSelection = [], $scope.groupUserSelection = [], $scope.userSelection = [], $scope.userSelection2 = [];
  $scope.groupsData = '', groupUsersData = '', usersData = '', usersData2 = '' /*for adding to groups*/;
  $scope.isGroupAdmin = false;

  $http({
    url: '/keystone/v2.0/tokens/'+CookieFactory.getCookie("token"),
    method: "GET"
  }).success(function(res) {
    $scope.user = res;
  });


  $scope.groupsGrid = { 
    data: 'groupsData',
    enableRowSelection: true,
    showFilter: true,
    columnDefs: [
      {field: 'name', displayName: 'Group name'}
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
    showFilter: true,
    columnDefs: [
      {field: 'name', displayName: 'Group member name'}
    ],
    selectedItems: $scope.groupUserSelection,
    multiSelect: false
  }

  $scope.usersGrid = {
    data: 'usersData2',
    enableRowSelection: true,
    showFilter: true,
    columnDefs: [
      {field: 'name', displayName: 'Other users name'}
    ],
    selectedItems: $scope.userSelection2,
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

  $scope.addGroup = function(groupName) {
    if(groupName == "" || "undefined" === typeof groupName)
      return;

    var newGroupData = {
          "group": {
              "name": groupName
          }
      };

    $http({method: 'POST', url: '/groups/',
      headers: {
        'X-Auth-Token': CookieFactory.getCookie("token")
      },
      data: JSON.stringify(newGroupData)
    }).success(function(res) {
      $scope.reloadGroups();
    });
  }

}).filter('token', function(CookieFactory){
  return function(text) {
    return text.replace(/\{token\}/g, CookieFactory.getCookie("token"));
  }
});
