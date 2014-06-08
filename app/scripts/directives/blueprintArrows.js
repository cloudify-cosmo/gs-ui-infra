'use strict';

/*********************
* SVG layer to implement the relations between the nodes
*/
angular.module('gsUiInfraApp')
    .directive('blueprintArrows', function(blueprintCoordinateService){
        return {
            restrict: 'A',
            scope: {
                'coordinates': '=blueprintArrows'
            },
            link: function($scope, $element, $attr)
            {
                var lineColor = $attr.color || '#ccc',
                    withArrow = Boolean($attr.arrow) || false,
                    storkeSize = $attr.storke || 3;

                var canvas = d3.select($element[0]).append('svg:svg')
                    .attr('width', '100%')
                    .attr('height', '100%')
                    .attr('fill', 'silver');

                var group = canvas.append("g")
                    .attr('transform', 'translate(0, 0)');

                var diagonal = d3.svg.diagonal();

                function applyDiagonals(data) {
                    return diagonal.apply(this, [{
                        source : {
                            x: data[0].x,
                            y: Math.floor(data[0].y)
                        },
                        target : {
                            x: data[1].x,
                            y: Math.floor(data[1].y)
                        }
                    }]);
                }

                if(withArrow == true) {
                    canvas.append('svg:defs').selectAll('marker')
                        .data(['Arrow'])
                        .enter()
                        .append('svg:marker')
                        .attr('id', 'arrowhead')
                        .attr("viewBox", "0 0 20 20")
                        .attr("refX", 16)
                        .attr("refY", 10)
                        .attr("markerUnits", "userSpaceOnUse")
                        .attr("markerWidth", 16)
                        .attr("markerHeight", 12)
                        .attr("orient", "auto")
                        .attr('fill', lineColor)
                        .append("path")
                        .attr("d", "M 0 0 L 20 10 L 0 20 z");
                }

                $scope.$watch('coordinates', function(data){
                    if(data) {
                        group.selectAll('path')
                            .remove();

                        group.selectAll('path')
                            .data(data)
                            .enter()
                            .append('path')
                            .attr('d', applyDiagonals)
                            .attr('marker-end', 'url(#arrowhead)')
                            .attr('fill', 'none')
                            .attr('stroke', lineColor)
                            .attr('stroke-width', storkeSize + 'px')
                            .attr('shape-rendering', 'geometricPrecision');
                    }
                }, true);

                $scope.$watch(function () {
                        return $element.is(':visible');
                    },
                    function () {
                        blueprintCoordinateService.draw();
                    });
            }
        };
    });

/***************
* Directive to define DOM element coordinate
* Must be as: Attribute="{id}"
*/
angular.module('gsUiInfraApp')
    .directive('blueprintCoordinate', function(blueprintCoordinateService){
        return {
            restrict: 'A',
            scope: true,
            link: function($scope, $element, $attr) {
                blueprintCoordinateService.addElement($attr.blueprintCoordinate, $element);
            }
        };
    });

/*****************
* This directive listen to the blueprint container for any resize
* and broadcast it into angular, which update the "data" of the
* coordinates
*/
angular.module('gsUiInfraApp')
    .directive('blueprintResize', function(blueprintCoordinateService){
        return {
            restrict: 'A',
            scope: false,
            link: function($scope, $element) {
                function broadcastResize() {
                    $element.scope().$apply(function(){
                        blueprintCoordinateService.draw();
                    });
                }
                document.addEventListener('DOMContentLoaded', broadcastResize, false);
                window.onresize = broadcastResize;
            }
        };
    });

/***************
* Service to store and calculate the coordinate data
*/
angular.module('gsUiInfraApp')
    .service('blueprintCoordinateService', function($timeout){

        var data = {},
            elements = {},
            coordinates = [],
            map = {};

        /*************
         * Api method to fire the update method
         */
        this.draw = function() {
            $timeout(function(){
                updateData();
            }, 1500);
        };

        /**************
         * Api method to connect the coordinates
         * @returns {Array}
         */
        this.getCoordinates = function() {
            return coordinates;
        };

        /**************
         * Api method to reset the coordinates
         */
        this.resetCoordinates = function() {
            coordinates = [];
        };

        /**************
         * Set the map of relations between the nodes
         * @param data
         */
        this.setMap = function( data ) {
            map = data;
        };

        /***************
         * Add node element
         * @param id
         * @param element
         */
        this.addElement = function(id, element) {
            elements[id] = element;
        };


        /**************
         * Using the element which inject into the server
         * and calculating the x,y coordinates of the element
         */
        function updateData() {
            angular.forEach(elements, function (element, id){
                if($(document).find(element).length) {
                    data[id] = {
                        "x": element.offset().left - element.parents('.bpContainer').offset().left,
                        "y": element.offset().top  - element.parents('.bpContainer').offset().top
                    }
                }
                else {
                    delete elements[id];
                }
            });
            setCoordinates();
        }

        /***************
         * Conveting Map relations to D3
         */
        function setCoordinates()
        {
            var Coords = [];
            angular.forEach(map, function (relation) {
                var from = relation.source,
                    to = relation.target;

                if(data[from] != undefined && data[to] != undefined) {
                    var thisCord = getNearestPoints(from, to);
                    if(thisCord !== null) {
                        Coords.push(thisCord);
                    }
                }
            });
            angular.extend(coordinates, Coords);
        }

        /**************
         * which point in the element to draw the arrow
         * @param from = id of element
         * @param to = id of element
         */
        function getNearestPoints(from, to) {
            var fromPoint = getAttachPointes(from),
                toPoint = getAttachPointes(to),
                nearest = false,
                collector,
                current;

            if(fromPoint !== null && toPoint !== null) {
                angular.forEach(fromPoint, function (f, fi) {
                    angular.forEach(toPoint, function (t, ti) {
                        current = Math.max(Math.abs(f.x - t.x), Math.abs(f.y - t.y)); // Calculate distance between points
                        if (!nearest || current < nearest) {
                            nearest = current;  // update the lower value of distance between points
                            collector = { // Set the index of the nearest point until now
                                "from": fi,
                                "to": ti
                            };
                        }
                    });
                });
                return [fromPoint[collector.from], toPoint[collector.to]];
            }
            else {
                return null;
            }
        }

        /****************
         * Calculate 4 possible points to attach
         * @param id = id of element
         * @returns {Array}
         */
        function getAttachPointes( id )
        {
            if(!elements.hasOwnProperty(id)) {
                return null;
            }

            var callback = [],
                width  = elements[id].outerWidth(),
                height = elements[id].outerHeight(),
                x = data[id].x,
                y = data[id].y;

            // [0] Left Middle Point
            callback.push({
                x: x,
                y: y + (height / 2)
            });

            // [1] Right Middle Point
            callback.push({
                x: x + width,
                y: y + (height / 2)
            });

            // [2] Top Middle Point
            callback.push({
                x: x + (width / 2),
                y: y
            });

            // [3] Bottom Middle Point
            callback.push({
                x: x + (width / 2),
                y: y + height
            });

            return callback;
        }

    });
