'use strict';

var appServices = angular.module('angular-login.services', []);

appServices.factory('AppAlert', 
  ['$rootScope', '$timeout', function($rootScope, $timeout) {
    var alertService; $rootScope.alerts = [];

    return alertService = {
      add: function(type, msg, timeout) {
          $rootScope.alerts.push({
              type: type,
              msg: msg,
              close: function() {
                  return alertService.closeAlert(this);
              }
          });

          if (timeout) { 
              $timeout(function(){ 
                  alertService.closeAlert(this); 
              }, timeout); 
          }
      },
      closeAlert: function(alert) {
        return this.closeAlertIdx($rootScope.alerts.indexOf(alert));
      },
      closeAlertIdx: function(index) {
        return $rootScope.alerts.splice(index, 1);
      }

    };
  }]
);

appServices
.factory('CookieFactory', function(){

    return {
        getCookie: function(name){
            return $.cookie(name);
        },

        getAllCookies: function(){
            return $.cookie();
        },

        setCookie: function(name, value, param){
            return $.cookie(name, value, param);
        },

        deleteCookie: function(name){
            return $.removeCookie(name, { path: '/' });
        }
    }
});
