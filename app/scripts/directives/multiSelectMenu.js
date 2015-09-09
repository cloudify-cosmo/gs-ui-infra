'use strict';

angular.module('gsUiInfraApp')
    .directive('multiSelectMenu', function ($document) {
        return {
            restrict: 'A',
            require: '?ngModel',
            templateUrl : '/gs-ui-infra-templates/multiSelectMenu',
            replace: true,
            scope: {
                options: '=',
                onchange: '&'
            },
            link: function postLink($scope, $element, $attrs, ngModel) {


                $scope.multiple = false;
                $scope.isInit = false;
                var optionMark = false,
                    isOpen = false;


                function setValue(value){
                    ngModel.$setViewValue(value);
                }

                /**
                 * Update Marked option when filtering the options
                 */
                function _filterItems() {
                    $scope.$watch('filteredItems', function () {
                        _navigateStart();
                    }, true);
                }

                /**
                 * Clean non relevant selected options
                 */
                function _listener() {
                    $scope.$watch('options', function (options) {
                        setInit();
                        if (ngModel.$modelValue && ngModel.$modelValue.length > 0) {
                            var selected = ngModel.$modelValue;
                            for(var i in selected) {
                                var option = selected[i];
                                if (options.indexOf(option) === -1) {
                                    selected.splice(i, 1);
                                }
                            }
                            setValue(selected);
                        }
                    }, true);
                }

                if($attrs.listener === 'true') {
                    _filterItems();
                    _listener();
                }

                /**
                 * Bind data to ng-model
                 */
                $scope.$watch('selected', function (newValue) {
                    if (newValue) {

                        setValue(newValue);
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
                    setValue([]);
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
                function _open( $event ) {
                    if ($event.stopPropagation){ $event.stopPropagation(); }
                    if ($event.preventDefault){ $event.preventDefault(); }
                    $event.cancelBubble = true;
                    $event.returnValue = false;

                    if ( $event && $event.target ){
                        if ( $($event.target).is('.no-click')  ){
                            return;
                        }

                        if ( $($event.target).is('t') ){
                            $('[data-ng-model="filter"]').focus();
                            $('[data-ng-model="filter"]')[0].setSelectionRange(0,0);
                        }

                    }



                    if ( !isOpen ){
                        $scope.filter = '';
                        if (ngModel.$modelValue) {
                            optionMark = ngModel.$modelValue;
                        }
                        isOpen = true;
                    }else{
                        _close();
                    }

                }

                /**
                 * Close DropDown
                 * @private
                 */
                function _close() {
                    isOpen = false;
                }

                /**
                 * Select Option
                 * @param option
                 * @private
                 */
                function _select(option) {

                    if($scope.multiple === true ) {
                        if ( !ngModel.$modelValue ){
                            ngModel.$modelValue = []; // init
                        }
                        if(ngModel.$modelValue.indexOf(option) > -1) {
                            var values = ngModel.$modelValue;
                            values.splice(ngModel.$modelValue.indexOf(option), 1);
                            setValue(values);
                        }
                        else {
                            setValue(ngModel.$modelValue.concat(option));
                        }
                    }
                    else {
                        setValue(option);
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
                        else {
                            optionMark = $scope.filteredItems[0];
                        }
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
                    return isOpen ? 'open' : 'closed';
                };

                /**
                 * Default label when nothing is selected
                 * @returns {*}
                 */
                $scope.selectedLabel = function () {

                    if (!ngModel.$modelValue || ngModel.$modelValue.length === 0) {
                        return $attrs.text || 'Select';
                    }
                    else {
                        if($scope.multiple === true) {
                            if(ngModel.$modelValue.length === 1) {
                                return ngModel.$modelValue[0].label;
                            }
                            if($attrs.hasOwnProperty('selection')) {
                                return $attrs.selection.replace('$count', ngModel.$modelValue.length);
                            }
                            return ngModel.$modelValue.length + ' Selections';
                        }
                        return ngModel.$modelValue.label;
                    }
                };

                /**
                 * Checked the checkbox on multiple selection
                 * @param option
                 * @returns {boolean}
                 */
                $scope.optionChecked = function(option) {
                    if($scope.multiple === true && ngModel.$modelValue ) {
                        return ngModel.$modelValue.indexOf(option) > -1 ? true : false;
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
