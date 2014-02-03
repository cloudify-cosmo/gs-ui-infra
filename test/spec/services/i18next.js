'use strict';

describe('Service: i18next', function () {

  // load the service's module
  beforeEach(module('gsUiInfra'));

  // instantiate service
  var i18next;
  beforeEach(inject(function (_i18next_) {
    i18next = _i18next_;
  }));

  it('should do something', function () {
    expect(!!i18next).toBe(true);
  });

});
