'use strict';

angular.module('gsUiInfra')
    .directive('topology', function () {
        return {
            template: '<div></div>',
            restrict: 'E',
            scope: {
                data: '=',
                layouter: '=',
                renderer: '='
            },

            link: function (scope, element/*, attrs*/) {

                scope.renderer.init(element[0].childNodes[0], scope.layouter);

                scope.$watch('data', function(/*oldValue, newValue*/) {
                    scope.renderer.refresh(scope.data);
                });

            }
        };
    });
