'use strict';

angular.module('gsUiInfraApp') // todo: remove this directive
    .directive('topology2', function ($log) {
        return {
            template: '<div class="topology-directive-inner-div"></div>',
            restrict: 'EAC',
            scope: {
                data: '=',
                layouter: '=',
                renderer: '=',
                events: '='
            },

            link: function (scope, element/*, attrs*/) {
                if (!scope.renderer) {
                    $log.info('missing a renderer');
                }
                if (!scope.layouter) {
                    $log.info('missing a layouter');
                }

                scope.renderer.init(element[0].childNodes[0], scope.layouter, scope.events);

                scope.$watch('data', function (/*oldValue, newValue*/) {
                    scope.renderer.refresh(scope.data);
                });

            }
        };
    });
