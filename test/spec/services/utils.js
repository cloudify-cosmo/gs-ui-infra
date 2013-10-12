'use strict';

describe('Service: Utils', function () {

    // load the service's module
    beforeEach(module('gsUiInfra'));

    // instantiate service
    var Utils;
    beforeEach(inject(function (_Utils_) {
        Utils = _Utils_;
    }));

    it('should dissolve an array into another', function () {
        // merge arrays of the same size
        expect(Utils.dissolveArray(['white'], ['red'])).toEqual(['white']);
        // source is smaller than target
        expect(Utils.dissolveArray(['white'], ['red', 'white'])).toEqual(['white', 'white']);
        // target is smaller than source
        expect(Utils.dissolveArray(['white', 'red'], ['red'])).toEqual(['red']);
        // source is falsy
        expect(Utils.dissolveArray(undefined, ['white', 'red'])).toEqual(['white', 'red']);
        expect(Utils.dissolveArray(0, ['white', 'red'])).toEqual(['white', 'red']);
        expect(Utils.dissolveArray('', ['white', 'red'])).toEqual(['white', 'red']);
        // source is larger than target
        expect(Utils.dissolveArray(['blue', 'green', 'yellow'], ['white', 'red'])).toEqual(['white', 'red']);
    });

});
