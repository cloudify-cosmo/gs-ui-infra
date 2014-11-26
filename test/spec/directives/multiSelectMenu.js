'use strict';

describe('Directive: multiSelectMenu', function () {

    var element, scope;

    beforeEach(module('gsUiInfraApp'));

    describe('Test setup', function() {
        beforeEach(inject(function($rootScope, $compile, $document){
            element = angular.element('' +
                '<div multi-select-menu ' +
                'data-multiple="true" ' +
                'data-options="options" ' +
                'data-ng-model="selected" ' +
                'data-init="TestValue" ' +
                'data-text="Choose Options" ' +
                'data-listener="true" ' +
                'name="blueprints"></div>');

            scope = $rootScope;

            scope.options = [
                {'label': 'TestLabel', 'value': 'TestValue'}
            ];

            $document.click = function() {};
            $document.keyup = function() {};

            $compile(element)(scope);
            scope.$digest();
        }));

        it ('should have initialize default value', function(){
            expect(scope.selected[0].value).toBe('TestValue');
        });

        it ('should deselect non-relevant selected options', function(){
            scope.options = [
                {'label': 'NewLabel', 'value': 'NewValue'}
            ];
            scope.$apply();

            waitsFor(function(){
                return scope.selected.length === 0;
            }, 'cleaning the non-relevant selected options options', 5000)

            runs(function(){
                expect(scope.selected.length).toBe(0);
            });
        });
    });
});
