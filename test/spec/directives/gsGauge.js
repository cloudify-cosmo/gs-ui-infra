'use strict';

describe('Directive: gsGauge', function () {
  beforeEach(module('gsUiKsApp'));

  var element;

  it('should make hidden element visible', inject(function ($rootScope, $compile) {
    element = angular.element('<gs-gauge></gs-gauge>');
    element = $compile(element)($rootScope);
    expect(element.text()).toBe('this is the gsGauge directive');
  }));
});
