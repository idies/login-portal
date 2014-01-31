angular.module('angular-login.grandfather', ['ui.router', 'templates-app'])
.config(function ($stateProvider) {
  $stateProvider
    .state('app', {
      abstract: true,
      template: '<ui-view></ui-view>',
      resolve: {
        'login': function (loginService, $q, $http) {
          var roleDefined = $q.defer();

          /**
           * In case there is a pendingStateChange means the user requested a $state,
           * but we don't know yet user's userRole.
           *
           * Calling resolvePendingState makes the loginService retrieve his userRole remotely.
           */
          if (loginService.pendingStateChange) {
            // console.debug("userToken");
            return loginService.resolvePendingState($http(
                {
                  url: 'http://zinc26.pha.jhu.edu:5005/zinc26.pha.jhu.edu:5000/v3/auth/tokens',
                  method: "GET",
                  headers: {"X-Subject-Token": localStorage.getItem('userToken')}
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
