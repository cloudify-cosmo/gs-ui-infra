'use strict';

angular.module('gsUiInfra')
    .directive('pieProgress', function () {
        return {
            restrict: 'A',
            scope: {
                'data': '=pieProgress'
            },
            link: function postLink($scope, $element, $attrs) {

                var defaultSize = 200,
                    ratio = 3.5,
                    width = $attrs.size || defaultSize,
                    height = $attrs.size || defaultSize,
                    innerSize = width - (width / ratio),
                    pi = Math.PI,
                    towPi = pi * 2;

                // Collection of colors
                var color = d3.scale.category20();

                // listener
                $scope.$watch('data', function (data, previous) {
                    data = d3.entries(data);
                    previous = d3.entries(previous);
                    layout(data, previous);
                    render(data);
                }, true);

                // define angles of arcs
                function layout(data, previous) {
                    var startAngle = 0;
                    for (var i = 0; i < data.length; i++) {
                        var arc = data[i];
                        if (previous.hasOwnProperty(i)) {
                            var oldArc = previous[i];
                            arc.previous = startAngle + convertToRadian(oldArc.value);
                        }
                        else {
                            arc.previous = startAngle;
                        }
                        arc.startAngle = startAngle;
                        arc.endAngle = startAngle = startAngle + convertToRadian(arc.value);
                    }
                }

                function convertToRadian(data) {
                    return data / 100 * towPi;
                }

                function render(data) {

                    // Select groups and bind data
                    var g = vis.selectAll('g')
                        .data(data);

                    // arc configuration
                    function configArc( group ) {
                        return group.attr('fill', function (d, i) { return color(i); })
                            .attr('class', function(d){ return d.key; })
                            .transition()
                            .ease('bounce')
                            .duration(750)
                            .attrTween('d', arcTween);
                    }

                    // update existing data
                    configArc(g.select('path'));

                    // enter for new data
                    configArc(g.enter()
                        .append('g')
                        .append('svg:path')
                    );

                    // remove old data
                    configArc(g.exit()).remove();
                }

                // interpolate transition
                function arcTween(d) {
                    var interpolate = d3.interpolate(d.previous, d.endAngle);
                    return function (t) {
                        d.endAngle = interpolate(t);
                        return arc(d);
                    };
                }

                // Create SVG layer
                var vis = d3.select($element[0]).append('svg')
                    .attr('width', width)
                    .attr('height', height)
                    .append('g')
                    .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

                // Define Arc
                var arc = d3.svg.arc()
                    .innerRadius(innerSize / 2)
                    .outerRadius(width / 2);
            }
        };
    });