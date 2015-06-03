angular.module('angular-login.error', ['angular-login.grandfather'])
.config(function ($stateProvider) {
  $stateProvider
    .state('app.error', {
      url: '/login-portal/error',
      templateUrl: 'error/error.tpl.html',
      controller: 'ErrorController'
    });
})
.controller('ErrorController', function ($scope) {
});
