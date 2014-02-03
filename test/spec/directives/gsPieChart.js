'use strict';

describe('Directive: gsPieChart', function () {
  beforeEach(module('gsUiInfra'));

  var element;

  it('should make hidden element visible', inject(function ($rootScope, $compile) {
    element = angular.element('<gs-pie-chart></gs-pie-chart>');
    element = $compile(element)($rootScope);
    expect(element.text()).toBe('this is the gsPieChart directive');
  }));
});
