'use strict';

angular.module('gsUiInfra')
    .filter('i18n', function () {

        return function () {
            return t(arguments);
        };
    });
