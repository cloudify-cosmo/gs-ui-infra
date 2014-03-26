'use strict';

angular.module('gsUiInfraApp')
    .directive('multiSelectMenu', function ($document) {
        return {
            restrict: 'A',
            require: '?ngModel',
            template:
                '<div ' +
                'class="multiSelectMenu"' +
                'data-ng-class="isOpen()">' +
                '<div class="button" data-ng-click="open()">' +
                '<label>' +
                '<t>{{ selectedLabel() }}</t>' +
                '<input type="text" data-ng-model="filter">' +
                '<input value="{{ reflection() }}" class="reflection">' +
                '</label>' +
                '</div>' +
                '<ul>' +
                '<li data-ng-repeat="option in options | filter: filter | as: \'filteredItems\'"' +
                'data-ng-click="select(option)" ' +
                'data-ng-class="navigator(option)" ' +
                'data-ng-mouseover="hoverOption(option)" ' +
                'title="{{ option.label }}">' +
                '<input type="checkbox" data-ng-show="multiple" data-ng-checked="optionChecked(option)">' +
                '{{ option.label }}</li> ' +
                '</ul>' +
                '</div>',
            replace: true,
            scope: {
                options: '=',
                onchange: '&'
            },
            link: function postLink($scope, $element, $attrs, ngModel) {

                $scope.selected = false;
                $scope.multiple = false;
                $scope.isInit = false;
                var optionMark = false,
                    isOpen = false;

                /**
                 * Bind data to ng-model
                 */
                $scope.$watch('selected', function (newValue) {
                    if (newValue) {
                        ngModel.$setViewValue(newValue);
                        if(angular.isFunction($scope.onchange)) {
                            $scope.onchange({filter: newValue});
                        }
                    }
                });

                /**
                 * Define Multiple Mode
                 */
                if($attrs.hasOwnProperty('multiple') && $attrs.multiple === 'true') {
                    $scope.multiple = true;
                    $scope.selected = [];
                }

                /**
                 * Set Init Value
                 */
                function setInit() {
                    if(!$scope.isInit && $attrs.init !== undefined) {
                        for(var i in $scope.options) {
                            if($attrs.init.indexOf($scope.options[i].value) !== -1) {
                                _select($scope.options[i]);
                                if(!$scope.multiple) {
                                    break;
                                }
                            }
                        }
                        $scope.isInit = false;
                    }
                }

                /**
                 * Open DropDown
                 * @private
                 */
                function _open() {
                    $scope.filter = '';
                    if ($scope.selected) {
                        optionMark = $scope.selected;
                    }
                    isOpen = true;
                }

                /**
                 * Close DropDown
                 * @private
                 */
                function _close() {
                    isOpen = false
                }

                /**
                 * Select Option
                 * @param option
                 * @private
                 */
                function _select(option) {
                    if($scope.multiple === true) {
                        if($scope.selected.indexOf(option) > -1) {
                            $scope.selected.splice($scope.selected.indexOf(option), 1);
                        }
                        else {
                            $scope.selected.push(option);
                        }
                    }
                    else {
                        $scope.selected = option;
                        _close();
                    }
                }

                /**
                 * Define the option which will start the navigation
                 * @private
                 */
                function _navigateStart() {
                    if ($scope.filteredItems && $scope.filteredItems.length) {
                        if (optionMark) {
                            if ($scope.filteredItems.indexOf(optionMark) === -1) {
                                optionMark = $scope.filteredItems[0];
                            }
                        }
                        else optionMark = $scope.filteredItems[0];
                    }
                }

                /**
                 * Navigate to next/prev option by keyboard
                 * @param to - event keycode
                 * @private
                 */
                function _navigate(to) {
                    switch (to) {
                        case 38:
                            if ($scope.options.indexOf(optionMark) > 0) {
                                $scope.$apply(function () {
                                    optionMark = $scope.options[$scope.options.indexOf(optionMark) - 1];
                                });
                            }
                            break;
                        case 40:
                            if ($scope.options.indexOf(optionMark) < $scope.options.length - 1) {
                                $scope.$apply(function () {
                                    optionMark = $scope.options[$scope.options.indexOf(optionMark) + 1];
                                });
                            }
                            break;
                    }
                }

                /**
                 * Public Methods Pointers
                 */
                $scope.close = _close;
                $scope.open = _open;
                $scope.select = _select;

                /**
                 * Bind the style of open mode
                 * @returns {string}
                 */
                $scope.isOpen = function () {
                    return isOpen ? 'open' : '';
                };

                /**
                 * Default label when nothing is selected
                 * @returns {*}
                 */
                $scope.selectedLabel = function () {
                    if (!$scope.selected || $scope.selected.length == 0) {
                        return $attrs.text || 'Select';
                    }
                    else {
                        if($scope.multiple === true) {
                            if($scope.selected.length == 1) {
                                return $scope.selected[0].label;
                            }
                            if($attrs.hasOwnProperty('selection')) {
                                return $attrs.selection.replace('$count', $scope.selected.length);
                            }
                            return $scope.selected.length + ' Selections';
                        }
                        return $scope.selected.label;
                    }
                };

                /**
                 * Checked the checkbox on multiple selection
                 * @param option
                 * @returns {boolean}
                 */
                $scope.optionChecked = function(option) {
                    if($scope.multiple === true) {
                        return $scope.selected.indexOf(option) > -1 ? true : false;
                    }
                    return false;
                };

                /**
                 * Set the current option as the Marked option on Hover
                 * @param option
                 */
                $scope.hoverOption = function (option) {
                    optionMark = option;
                };

                /**
                 * Reflect the current option will be selected by press on 'Enter'
                 * @returns {string}
                 */
                $scope.reflection = function () {
                    if (optionMark && optionMark.hasOwnProperty('label')) {
                        var label = optionMark.label;
                        if ($scope.filter !== undefined) {
                            var chars = label.substr(0, $scope.filter.length);
                            if ($scope.filter.toLowerCase() === chars.toLowerCase()) {
                                label = label.substr($scope.filter.length);
                                return $scope.filter + label;
                            }
                        }
                    }
                };

                /**
                 * Bind style for currnet Marked option
                 * @param option
                 * @returns {string}
                 */
                $scope.navigator = function (option) {
                    if (option === optionMark) {
                        return 'markNav';
                    }
                };

                /**
                 * Update Marked option when filtering the options
                 */
                $scope.$watch('filteredItems', function () {
                    _navigateStart();
                }, true);

                /**
                 * Clean non relevant selected options
                 */
                $scope.$watch('options', function (options) {
                    setInit();
                    if ($scope.selected.length > 0) {
                        angular.forEach($scope.selected, function (option, i) {
                            if (options.indexOf(option) === -1) {
                                $scope.selected.splice(i, 1);
                            }
                        });
                    }
                }, true);

                /**
                 * Close on Click Out
                 */
                $document.click(function (e) {
                    if ($element.has(e.target).length === 0) {
                        $scope.$apply(_close);
                    }
                });

                /**
                 * Keywords Shourcuts
                 */
                $document.keyup(function (e) {
                    if (!isOpen) {
                        return;
                    }
                    if (e.keyCode === 27) {
                        $scope.$apply(_close);
                    }
                    switch (e.keyCode) {
                        case 27: // Esc
                            $scope.$apply(_close);
                            break;
                        case 13: // Enter
                            $scope.$apply(_select(optionMark));
                            break;
                        case 38: // navigate up
                        case 40: // navigate down
                            _navigate(e.keyCode);
                            break;
                    }
                });
            }
        };
    });