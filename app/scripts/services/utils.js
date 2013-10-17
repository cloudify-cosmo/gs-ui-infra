'use strict';

angular.module('gsUiInfra')
    .factory('Utils', function Utils() {

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
                    console.log([arr, propName, propValue]);
                    throw e;
                }
            },

            /**
             * Used for comparisons, including array comparisons (only for sorted arrays).
             */
            equals: function (a, b) {
                if (a === b) {
                    return true;
                }
                if (a === null || b === null) {
                    return false;
                }
                if (a.length !== b.length) {
                    return false;
                }

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
             * @param tree A root node to traverse from.
             * @param sorter (Optional) A function for Array.sort to sort each node's children.
             * @param action (Optional) A handler function to act on each node.
             * @returns {*}
             */
            walk: function (tree, sorter, action) {
                depth++;
                // sort children
                sorter && tree.children.sort(sorter);
                var i = tree.children.length;
                while (i--) {
                    var child = tree.children[i];
                    // TODO move this outside 'while'?
                    // act on each child node
                    action && action(child, i, depth);
                    // continue with traversal
                    child.children && child.children.length && this.walk(child, sorter, action);
                }
                depth--;
                return tree;
            }

        };
    });
