'use strict';

describe('Directive: multiSelectMenu', function () {
  beforeEach(module('gsUiInfraApp'));

  var element;

  it('should make hidden element visible', inject(function ($rootScope, $compile) {
    element = angular.element('<multi-select-menu></multi-select-menu>');
    element = $compile(element)($rootScope);
    expect(element.text()).toBe('this is the multiSelectMenu directive');
  }));
});
