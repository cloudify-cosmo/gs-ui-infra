'use strict';

angular.module('gsUiInfra')
    .service('arrayUtils', function arrayUtils() {

        return {
            /**
             * Performs merging of an array into another, provided that the target array
             * is larger or equal in size. Items in the target array will be replaced with items from the
             * source array, starting index 0 (on both), and retaining the original order.
             *
             * @param source The array from which to fuse.
             * @param target The array to fuse into.
             * @returns {Array} The result of the fuse, or the target array if source is falsy,
             *          or if the source is larger than the target.
             */
            dissolve: function(source, target) {
                var _target = target;
                if (source && source.length && target && target.length && source.length <= target.length) {
                    var _source = source;
                    _target.splice(0, _source.length);
                    _target = _source.concat(_target);
                }
                return _target;
            }
        };
    });
