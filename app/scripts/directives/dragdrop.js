'use strict';

angular.module('gsUiInfra')
    .directive("draggable", function () {
        return {
            restrict: "A",
            scope: true,
            link: function ($scope, $element, $attr) {
                $element[0].addEventListener(
                    "dragstart",
                    function (event) {
                        var style = window.getComputedStyle(this, null),
                            clientX = parseInt(style.getPropertyValue("left"), 10) - event.clientX,
                            clientY = parseInt(style.getPropertyValue("top"), 10) - event.clientY;

                        this.classList.add("dragged");
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", clientX + ',' + clientY);
                        return false;
                    },
                    false
                );
                $element[0].addEventListener(
                    'dragend',
                    function (e) {
                        this.classList.remove("dragged");
                        return false;
                    },
                    false
                );
            }
        }
    });

angular.module('gsUiInfra')
    .directive("droppable", function () {
        return {
            restrict: "A",
            scope: true,
            link: function ($scope, $element, $attr) {
                $element[0].addEventListener(
                    "dragover",
                    function () {
                        // On drop Over
                        if (angular.isFunction($scope.$eval($attr.dropover))) {
                            $scope.$eval($attr.dropover);
                        }
                        event.preventDefault();
                        return false;
                    },
                    false
                );
                $element[0].addEventListener(
                    "drop",
                    function (event) {
                        var offset = event.dataTransfer.getData("text/plain").split(','),
                            item = document.getElementsByClassName("dragged")[0];

                        item.style.left = (event.clientX + parseInt(offset[0], 10)) + 'px';
                        item.style.top = (event.clientY + parseInt(offset[1], 10)) + 'px';

                        // On drop Complete
                        if (angular.isFunction($scope.$eval($attr.dropcomplete))) {
                            $scope.$eval($attr.dropcomplete);
                        }
                        event.preventDefault();
                        return false;
                    },
                    false
                );
            }
        }
    });