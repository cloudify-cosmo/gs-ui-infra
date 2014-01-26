'use strict';

angular.module('gsUiInfra')
    .filter('i18n', function ($window, I18next) {

        var fn = null;

        var realFilter = function () {
            return fn(arguments);
        };

        return function () { // filter wrapper to cope with service asynchronicity
            if (fn === null) {
                // call the async service (this is a promise)
                I18next.then(function(result) {
                    fn = result;
                });
                return ''; // placeholder while loading
            } else {
                return realFilter.apply(this, arguments);
            }
        };
    });
