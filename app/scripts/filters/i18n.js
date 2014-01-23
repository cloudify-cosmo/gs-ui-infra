'use strict';

angular.module('gsUiInfraApp')
  .filter('i18n', function () {
    return function (input) {
      return 'i18n filter: ' + input;
    };
  });
