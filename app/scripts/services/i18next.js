'use strict';

angular.module('gsUiInfra')
    .service('I18next', function I18next($window, $q) {

        var deferred = $q.defer();

        var defaultOptions = {
            lng: 'en',
            resGetPath: 'i18n/__ns_____lng__.json',
            ns: {
                namespaces: ['constants', 'messages'],
                defaultNs: 'constants'
            }
        };

        // this is the only global reference we'll need, and it's there after loading the i18next
        // script. the filter using this service will rely on the resolved promise to get an instance.
        var i18nGlobal = $window.i18n;

        var init = function (options) {
            var _options = angular.extend(defaultOptions, options || {});
            i18nGlobal.init(_options, function (t) {
                console.log('i18next initialization done, resolving i18next promise...');
                deferred.notify('i18next initialization callback');
                if (t) {
                    deferred.resolve(t);
                } else {
                    deferred.reject('couldn\'t initialize i18next');
                }
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
