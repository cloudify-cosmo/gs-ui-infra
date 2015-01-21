'use strict';

angular.module('gsUiInfraApp')
    .filter('i18n', function ($window, I18next, $log, $sce) {

        var fn = null;

        I18next.getPromise().then(function (result) {
                fn = result;
            },
            angular.noop,
            function (message) {
                $log.info('notification: ', message);
            });

        var realFilter = function () {
            return $sce.trustAsHtml(fn(arguments));
        };

        return function () { // filter wrapper to cope with service asynchronicity
            if (fn === null) {
                // call the async service (this is a promise)
                return ''; // hate it, but that's what we got
            } else {
                return realFilter.apply(this, arguments);
            }
        };


    });
