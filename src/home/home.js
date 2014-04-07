angular.module('angular-login.home', ['angular-login.grandfather'])
.config(function ($stateProvider) {
  $stateProvider
    .state('app.home', {
      url: '/',
      templateUrl: 'home/home.tpl.html',
      controller: 'HomeController'
    });
})
.controller('HomeController', function ($scope, $http, $state, AppAlert) {
	$scope.regUser = true;

	$scope.redirect = false;
	$scope.registerObj = {
	};

	$scope.submit = function (formInstance) {
		// xhr is departing
		$scope.xhr = true;

		$http.post('/users', $scope.registerObj)
		.success(function (data, status, headers, config) {
			console.info('post success - ', data);
			AppAlert.add('success', "Successfully registered new user", 8000);
			$scope.login.username = $scope.registerObj.username;
			$scope.login.password = $scope.registerObj.password;
			$scope.xhr = false;
			$scope.redirect = true;
			$scope.loginMe();
		})
		.error(function (data, status, headers, config) {
		  if(data.errors) {
		    data.errors.forEach(function (error, index, array) {
		    	formInstance[error.field].$error[error.name] = true;
		    });
			$scope.xhr = false;
		    formInstance.$setPristine();
		    console.info('post error - ', data);
		  } else {
		    $state.go('app.error', { error: data }, { location: false, inherit: false });
		  }
		});
	};
});
