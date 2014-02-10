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
.controller('RegisterController', function ($scope, $http, $state) {
  $scope.xhr = false;
  $scope.redirect = false;

  $scope.registerObj = {
  };

  $scope.submit = function (formInstance) {
    // xhr is departing
    $scope.xhr = true;

    $http.post('/reguser', $scope.registerObj)
    .success(function (data, status, headers, config) {
      console.info('post success - ', data);
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