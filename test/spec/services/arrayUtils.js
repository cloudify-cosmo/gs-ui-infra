'use strict';

describe('Service: arrayUtils', function () {

    // load the service's module
    beforeEach(module('gsUiInfra'));

    // instantiate service
    var arrayUtils;
    beforeEach(inject(function (_arrayUtils_) {
        arrayUtils = _arrayUtils_;
    }));

    it('should dissolve an array into another', function () {
        // merge arrays of the same size
        expect(arrayUtils.dissolve(['white'], ['red'])).toEqual(['white']);
        // source is smaller than target
        expect(arrayUtils.dissolve(['white'], ['red', 'white'])).toEqual(['white', 'white']);
        // target is smaller than source
        expect(arrayUtils.dissolve(['white', 'red'], ['red'])).toEqual(['red']);
        // source is falsy
        expect(arrayUtils.dissolve(undefined, ['white', 'red'])).toEqual(['white', 'red']);
        expect(arrayUtils.dissolve(0, ['white', 'red'])).toEqual(['white', 'red']);
        expect(arrayUtils.dissolve('', ['white', 'red'])).toEqual(['white', 'red']);
        // source is larger than target
        expect(arrayUtils.dissolve(['blue', 'green', 'yellow'], ['white', 'red'])).toEqual(['white', 'red']);
    });

});
