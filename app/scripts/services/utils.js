'use strict';

angular.module('gsUiInfraApp')
    .factory('Utils', function Utils($log) {

        var depth = -1;

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
            dissolveArray: function (source, target) {
                var _target = target;
                if (source && source.length && target && target.length && source.length <= target.length) {
                    var _source = source;
                    _target.splice(0, _source.length);
                    _target = _source.concat(_target);
                }
                return _target;
            },

            /**
             * Returns a new array with items matching the property name and value of
             * the passed array.
             *
             * @param arr The array to filter.
             * @param propName The property name to filter by.
             * @param propValue The property value to filter by.
             * @returns {Array} A new filtered array.
             */
            filter: function (arr, propName, propValue) {
                try {
                    var filtered = [];
                    var i = arr.length;
                    while (i--) {
                        var item = arr[i];
                        if (item.hasOwnProperty(propName) && this.equals(item[propName], propValue)) {
                            filtered.push(item);
                        }
                    }
                    return filtered;
                } catch (e) {
                    $log.info([arr, propName, propValue]);
                    throw e;
                }
            },

            /**
             * Used for comparisons, including array comparisons (only for sorted arrays).
             */
            equals: function (a, b) {
                if (a !== b) {
                    return false;
                }
                if (a === null || b === null) {
                    return false;
                }
                if (a.length !== b.length) {
                    return false;
                }
                // handles sorted arrays only
                for (var i = 0; i < a.length; ++i) {
                    if (a[i] !== b[i]) {
                        return false;
                    }
                }
                return true;
            },

            /**
             * Finds the first match of an item according the a property name
             * and value in the passed array.
             *
             * @param arr The array to search.
             * @param propName The property name to search by.
             * @param propValue The property value to search by.
             * @returns {*|boolean} The matched item, or false, if no such item
             * was found.
             */
            findBy: function (arr, propName, propValue) {
                var i = arr.length;
                while (i--) {
                    var item = arr[i];
                    if (item.hasOwnProperty(propName) && item[propName] === propValue) {
                        return item;
                    }
                }
                return false;
            },

            /**
             * Maps the property values of an object and returns an array.
             *
             * @param obj The object to map.
             * @returns {*} An array with the object's property values.
             */
            propValues: function (obj) {
                return Object.keys(obj).map(function (key) {
                    return obj[key];
                });
            },

            /**
             * Traverse a tree (breadth first) and act on each node.
             *
             * @param node A root node to traverse from.
             * @param sorter (Optional) A function for Array.sort to sort each node's children.
             * @param downHandler (Optional) A handler function to act on each node, when traversing down the tree.
             * @param upHandler (Optional) A handler function to act on each node, when traversing up the tree.
             * @returns {*}
             */
            walk: function (node, sorter, downHandler, upHandler) {
                depth++;
                // sort children
                sorter && node.children.sort(sorter);
                var i = node.children.length;
                while (i--) {
                    var child = node.children[i];
                    // act on each child node, traversing down
                    downHandler && downHandler(child, node, i, depth);
                    // continue with traversal
                    child.children && child.children.length && this.walk(child, sorter, downHandler, upHandler);
                    // act on each parent node, traversing up
                    upHandler && upHandler(child, node, i, depth);
                }
                depth--;
                return node;
            }

        };
    });
