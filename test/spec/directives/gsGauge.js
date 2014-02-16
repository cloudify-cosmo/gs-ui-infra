'use strict';

describe('Directive: gsGauge', function () {

    var el, scope;

    function getTransformationMatrix(selector) {
        var result =  el[0].querySelector(selector).getAttribute('transform');
        console.log(["result is " , result]);
        return result;
    }

    function exists(selector) {
        return !!el[0].querySelector(selector);
    }


    beforeEach(module('gsUiInfraApp'));

    beforeEach(inject(function ($rootScope, $compile) {
        scope = $rootScope;
        el = angular.element(
            '<gs-gauge ' +
                'val="val" ' +
                'sensitivity="sensitivity" ' +
                'colors="colors" ' +
                '></gs-gauge>');
        $compile(el)(scope);
        jasmineUtils.attachComponent(el[0]);
        scope.$digest();
    }));

    afterEach(function() {
        jasmineUtils.detachComponent(el[0]);
    });

    it('should verify DOM elements has been injected', function () {
        expect(exists('svg')).toBe(true);
        expect(exists('.pointer')).toBe(true);
    });

    it('should change the pointer position', function () {

        var changed = false;
        var oldTransformationMatrix = getTransformationMatrix('.pointer');

        // activate pointer change
        jasmineUtils.set(scope, 'val', 90);

        waitsFor(function() {
            return changed = oldTransformationMatrix != getTransformationMatrix('.pointer');
        }, 'pointer transformation matrix to change', 500);

        runs(function() {
            expect(changed).toBeTruthy();
        });
    });


    // TODO double-check, optimize running time

    it('should catch the animated state of the pointer', function () {

        var beforeAnimation,
            duringAnimation,
            afterAnimation;

        // reset pointer position
        jasmineUtils.set(scope, 'val', 0);
        // configure optimal animation time for the test run
        jasmineUtils.set(scope, 'sensitivity', 5);

        runs(function() {
            // wait for the pointer to settle in idle state
            setTimeout(function() {
                beforeAnimation = exists('.pointer:not(.animated)')
            }, 100);
        });

        waitsFor(function() {
            return beforeAnimation;
        }, 'pointer element to not have the animated class for start', 1000);

        runs(function() {
            // activate pointer change
            jasmineUtils.set(scope, 'val', 100);
            // wait for the animated state after activation
            setTimeout(function() {
                duringAnimation = exists('.pointer.animated');
            }, 50);
        });

        waitsFor(function() {
            return duringAnimation;
        }, 'animated class to appear on the pointer element', 1000);

        runs(function() {
            // wait for the animation-finished state
            setTimeout(function() {
                afterAnimation = exists('.pointer:not(.animated)');
            }, 800);
        });

        waitsFor(function() {
            return afterAnimation;
        }, 'animated class to disappear from the pointer element', 1000);

        runs(function() {
            expect(beforeAnimation).toBeTruthy();
            expect(duringAnimation).toBeTruthy();
            expect(afterAnimation).toBeTruthy();
        });
    });

/*
    it('detects sensitivity changes', function () {
        var active;

        // maximum sensitivity (fastest)
        setSensitivity(10);
        // activate pointer change
        setVal(30);

        runs(function() {
            setVal(10);
            setTimeout(function() {
                active = $(el).find('.pointer.animated');
            }, 1000);
        });

        waitsFor(function() {
            console.log(typeof active);
            return active;
        }, 'pointer to be active', 1000);

        runs(function() {
            expect(active).toBeTruthy();
        });
    });
*/


    /*
     it('should bind the attribute values into the scope', function () {

     expect(scope.val).not.toBeDefined();
     expect(scope.sensitivity).not.toBeDefined();
     expect(scope.colors).not.toBeDefined();
     */
    /*
     // using $apply to activate $digest, making sure scope was updated
     scope.$apply(function () {
     scope.val = 50;
     scope.sensitivity = 8;
     scope.colors = {
     background: ['lightyellow', 'yellow'],
     basis: ['orange', 'red'],
     tick: 'red',
     dial: ['', '', '', '', ''],
     pointer: ['red', 'orange', 'lightyellow'],
     border: 'orange'
     };
     });
     *//*

     scope.$apply(function() {
     //            scope.val = 50;
     el.attr('val', '50');
     });

     expect(scope.val).toEqual(50);
     });
     */

});
