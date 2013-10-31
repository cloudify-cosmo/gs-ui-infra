'use strict';

angular.module('gsUiInfra')
    .directive('topology', function () {
        return {
            template: '<div></div>',
            restrict: 'EAC',
            scope: {
                data: '=',
                layouter: '=',
                renderer: '=',
                events: '='
            },

            link: function (scope, element/*, attrs*/) {
                if (!scope.renderer) {
                    console.log('missing a renderer');
                }
                if (!scope.layouter) {
                    console.log('missing a layouter');
                }

                scope.renderer.init(element[0].childNodes[0], scope.layouter, scope.events);

                scope.$watch('data', function (/*oldValue, newValue*/) {
                    scope.renderer.refresh(scope.data);
                });

            }
        };
    });
