'use strict';

angular.module('gsUiInfra')
    .service('I18next', function I18next($window, $q) {

        var deferred = $q.defer();

        function getOptions() {
            return false;
        }

        var options = getOptions() || {
            lng: 'en',
            resGetPath: 'i18n/__ns_____lng__.json',
            ns: {
                namespaces: ['constants', 'messages'],
                defaultNs: 'constants'
            }
        };

        // this is the only global reference we'll need, and it's there after loading the i18next
        // script. the filter using this service will rely on the resolved promise to get an instance.
        $window.i18n.init(options, function (t) {
            if (t) {
                deferred.resolve(t);
            } else {
                deferred.reject('couldn\'t initialize i18next');
            }
        });

        return deferred.promise;
    });
