'use strict';

angular.module('gsUiInfraApp')
    .service('I18next', function I18next($window, $q, $log, $rootScope ) {

        var deferred = $q.defer();

        var defaultOptions = {
            lng: 'en',
            fallbackLng: 'en',
            resGetPath: 'i18n/__ns_____lng__.json',
            ns: {
                namespaces: ['translations'],
                defaultNs: 'translations'
            }
        };

        // this is the only global reference we'll need, and it's available after loading the i18next
        // script. the filter using this service will rely on the resolved promise to get an instance.
        var i18nGlobal = $window.i18n;

        var init = function (options) {
            var _options = angular.extend(angular.copy(defaultOptions), options || {});
            i18nGlobal.init(_options, function (t) {
                $log.info('i18next initialization done, resolving i18next promise...');
                deferred.notify('i18next initialization callback');
                if (t) {
                    deferred.resolve(t);
                } else {
                    deferred.reject('couldn\'t initialize i18next');
                }
                $rootScope.$apply();
            });
        };

        init();

        return {
            getPromise: function () {
                return deferred.promise;
            },
            setOptions: function (options) {
                init(options);
            }
        };
    });
