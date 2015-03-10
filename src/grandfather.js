angular.module('angular-login.grandfather', ['ui.router', 'templates-app'])
.config(function ($stateProvider) {
  $stateProvider
    .state('app', {
      abstract: true,
      template: '<ui-view></ui-view>',
      resolve: {
        'login': function (loginService, $q, $http, CookieFactory) {
          var roleDefined = $q.defer();

          /**
           * In case there is a pendingStateChange means the user requested a $state,
           * but we don't know yet user's userRole.
           *
           * Calling resolvePendingState makes the loginService retrieve his userRole remotely.
           */
          if (loginService.pendingStateChange) {
            return loginService.resolvePendingState($http(
                {
                  url: '/login-portal/keystone/v2.0/tokens/'+CookieFactory.getCookie("token"),
                  method: "GET"
                }
              ));
          } else {
            roleDefined.resolve();
          }
          return roleDefined.promise;
        }
      }
    });
});
