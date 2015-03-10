angular.module('angular-login.register', ['angular-login.grandfather'])
.config(function ($stateProvider) {
  $stateProvider
    .state('app.register', {
      url: '/login-portal/register',
      templateUrl: 'register/register.tpl.html',
      controller: 'RegisterController',
      accessLevel: accessLevels.anon
    });
})
.controller('RegisterController', function ($scope, $http, $state, $rootScope, AppAlert) {
  $scope.xhr = false;
  $scope.redirect = false;

  $scope.registerObj = {
  };

  $scope.submit = function (formInstance) {
    // xhr is departing
    $scope.xhr = true;

    $http.post('/login-portal/reguser', $scope.registerObj)
    .success(function (data, status, headers, config) {
      console.info('post success - ', data);
      AppAlert.add('success', "Successfully registered new user", 8000);
      $scope.xhr = false;
      $scope.redirect = true;
      $state.go('app.home');
    })
    .error(function (data, status, headers, config) {
      if(data.errors) {
        data.errors.forEach(function (error, index, array) {
          formInstance[error.field].$error[error.name] = true;
        });
        formInstance.$setPristine();
        console.info('post error - ', data);
        $scope.xhr = false;
      } else {
        $state.go('app.error', { error: data }, { location: false, inherit: false });

      }
    });
  };
});