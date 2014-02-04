angular.module('angular-login.register', ['angular-login.grandfather'])
.config(function ($stateProvider) {
  $stateProvider
    .state('app.register', {
      url: '/register',
      templateUrl: 'register/register.tpl.html',
      controller: 'RegisterController',
      accessLevel: accessLevels.anon
    });
})
.controller('RegisterController', function ($scope, $http, $timeout, $state) {
  $scope.xhr = false;
  $scope.redirect = false;

  $scope.registerObj = {
    user: {"enabled": false}
  };

  $scope.submit = function (formInstance) {
    // xhr is departing
    $scope.xhr = true;

    delete $scope.registerObj.user.password2;
    
    $http.post('http://zinc26.pha.jhu.edu:5005/zinc26.pha.jhu.edu:35357/v2.0/users', $scope.registerObj)
    .success(function (data, status, headers, config) {
      console.info('post success - ', data);
      $scope.xhr = false;
      $scope.redirect = true;
      $timeout(function () {
        $state.go('app.home');
      }, 2000);
    })
    .error(function (data, status, headers, config) {
      data.errors.forEach(function (error, index, array) {
        formInstance[error.field].$error[error.name] = true;
      });
      formInstance.$setPristine();
      console.info('post error - ', data);
      $scope.xhr = false;
    });
  };
});