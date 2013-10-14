'use strict';

angular.module('gsUiInfra')
    .factory('Render', ['Utils', '$window', function (Utils, $window) {

        return {

            D3: {

                init: function (el, layouter) {

                    this.el = el;
                    this.layouter = layouter;

                    var self = this;
                    this.svg = d3.select(this.el).append('svg:svg');

                    /** graph data structure */
                    this.graph = { nodes: [], edges: [] };

                    // handles to node and edge groups
                    this.nodesSelection = this.svg.append('svg:g').selectAll('g.node');
                    this.edgesSelection = this.svg.append('svg:g').selectAll('g.edge');

                    // tie resize behavior
                    $window.addEventListener('resize', function () {
                        self.resize();
                    });
                    // call it once to set initial dimensions
                    this.resize();

                },

                /**
                 * Resize the SVG canvas and update the layout size.
                 */
                resize: function () {
                    this.width = this.el.clientWidth || 1000;
                    this.height = this.el.clientHeight || 600;
                    this.svg.attr('width', this.width).attr('height', this.height);
                    this.layout();
                },

                /**
                 * Re-render the graph, or update the graph with new data.
                 *
                 * @param newData the new data in the format { nodes: [ {} ], edges: [ {} ] }. if no data is
                 * provided, the refresh is made based on the current data.
                 * note that the graph manipulations (e.g. add node, remove edge) may be logical operations,
                 * and in such cases refresh must be called to update the graph.
                 */
                refresh: function (newData) {
                    if (newData === this.graph) return;

                    this.graph = newData || this.graph;

                    // tie data to edge handles
                    this._bindEdges.call(this);

                    // update existing edges
                    this._updateEdges.call(this);

                    // add new edges
                    this._enterEdges.call(this);

                    // remove old edges
                    this.edgesSelection.exit().remove();

                    // tie data to node handles
                    this._bindNodes.call(this);

                    // update existing nodes
                    this._updateNodes.call(this);

                    // add new nodes
                    this._enterNodes.call(this);

                    // remove old nodes
                    this._exitNodes.call(this);

                    // apply layout
                    this.layout();
                },

                clear: function () {
                    this.refresh({ nodes: [], edges: [] });
                },

                layout: function () {
                    if (!this.graph.nodes.length || !this.graph.edges.length) {
                        return;
                    }
                    if (this.layouter) {
                        this.renderLayout();
                    }
                },

                renderLayout: function () {

                    var self = this;

                    if (!this.layouter) {
                        return;
                    }

                    // turn all IDs in the edges sources/targets to object references
                    var ei = this.graph.edges.length;
                    while (ei--) {
                        var edge = this.graph.edges[ei],
                            sourceId = edge.source,
                            targetId = edge.target,
                            source = Utils.findBy(this.graph.nodes, 'id', sourceId),
                            target = Utils.findBy(this.graph.nodes, 'id', targetId);

                        edge.source = source;
                        edge.target = target;
                    }

                    // call the layouter to attach positioning data to nodes
                    this.layouter.layout(this.graph);

                    // use this data to paint
                    var rangeX = this.layouter.layoutMaxX - this.layouter.layoutMinX + 1,
                        rangeY = this.layouter.layoutMaxY - this.layouter.layoutMinY + 1,
                        segmentH = this.width / rangeX,
                        segmentV = this.height / rangeY,
                        strokeWidth = 2,
                        pad = [47, 30, 30, 30]
                    pad.forEach(function (v, i) {
                        pad[i] = v + strokeWidth * 2;
                    })

                    // update the nodes position data according to the layouter data
                    this.graph.nodes.forEach(function (v, i) {
                        v.fixed = true;
                        if (!v.dimensionsFinalized) {
                            v.width = segmentH - v.layoutPosZ * (pad[1] + pad[3]) - strokeWidth * 2;
                            v.height = segmentV - v.layoutPosZ * (pad[0] + pad[2]) - strokeWidth * 2;
                            v.dimensionsFinalized = true;
                        }
//                        v.x = segmentH * v.layoutPosX + (segmentH - v.width) / 2;
//                        v.y = segmentV * v.layoutPosY + (segmentV - v.height) / 2;
                        v.x = segmentH * v.layoutPosX + pad[3] * v.layoutPosZ + strokeWidth;
                        v.y = segmentV * v.layoutPosY + pad[0] * v.layoutPosZ + strokeWidth;
                    });

                    // update dom selections
                    this.nodesSelection.attr('transform', function (d) {
                        return 'translate(' + d.x + ',' + d.y + ')';
                    });
                    this.nodesSelection.selectAll('rect.container')
                        .attr('width', function (d) {
                            return d.width;
                        })
                        .attr('height', function (d) {
                            return d.height;
                        })
                    this.nodesSelection.selectAll('rect.heading')
                        .attr('width', function (d) {
                            return d.width - 6;
                        })
                        .attr('height', function (d) {
                            return 33;
                        })
                    this.nodesSelection.selectAll('text')
                        .attr('x', function (d) {
                            return d.width / 2;
                        })
                    this.edgesSelection.selectAll('path').attr('d', function (d) {
                        return self._bezierPath(d.source, d.target, d.directed);
                    });

                },

                _bindNodes: function () {

                    var self = this,
                        nodesDataKey = function (d) {
                            // return all property values as the data key
                            return Utils.propValues(d)
                        }

                    // pu nodes group
                    this.nodesSelection = this.nodesSelection.data(function () {
                        return self.graph.nodes;
                    }, nodesDataKey);
                },

                _updateNodes: function () {

                },

                _enterNodes: function () {

                    var self = this,
                        node = this.nodesSelection.enter().append('svg:g').attr('class', 'node');

                    // outer container
                    node.append('svg:rect')
                        .attr('class', 'container')
                        .attr('width', function (d) {
                            return d.width;
                        })
                        .attr('height', function (d) {
                            return d.height;
                        })
                        .attr('rx', 6)
                        .attr('ry', 6)

                    // heading box
                    node
/*
                        .data(function () {
                            var arr = Utils.filter(self.graph.nodes, 'type', ["cloudify.tosca.types.app_module"]);
                            return arr;
                        })
*/
                        .append('svg:rect')
                        .attr('class', 'heading')
                        .attr('width', function (d) {
                            return d.width - 6;
                        })
                        .attr('height', function (d) {
                            return 33;
                        })
                        .attr('x', 3)
                        .attr('y', 3)
                        .attr('rx', 1)
                        .attr('ry', 1)
                        .style('fill', '#136e9d')
                        .style('stroke', 'white')
                        .style('stroke-width', 2)

                    // add name label
                    node.append('svg:text')
                        .text(function (d) {
                            return d.name;
                        })
                        .attr('x', function (d) {
                            return d.width / 2;
                        })
                        .attr('y', 18)
                        .attr('text-anchor', 'middle')
                        .style('fill', '#0d7acc')
                        .style('fill-opacity', 0.6)
                        .style('font-size', '15px')
                        .style('font-family', 'Arial')
                        .style('font-weight', 'bold')

                    // add type label
                    node.append('svg:text')
                        .text(function (d) {
                            var typeStr = '' + d.type;
                            return '(' + typeStr.substring(typeStr.lastIndexOf('.') + 1) + ')';
                        })
                        .attr('x', function (d) {
                            return d.width / 2;
                        })
                        .attr('y', 32)
                        .attr('text-anchor', 'middle')
                        .style('fill', '#0d7acc')
                        .style('fill-opacity', 0.6)
                        .style('font-size', '12px')
                        .style('font-family', 'Arial')
                        .style('font-weight', 'bold')

                },

                _exitNodes: function () {
                    this.nodesSelection.exit().remove();
                },

                _bindEdges: function () {
                    var self = this;
                    this.edgesSelection = this.edgesSelection.data(function () {
                        return Utils.filter(self.graph.edges, 'type', 'connected_to');
                    });
                },

                _updateEdges: function () {

                },

                _enterEdges: function () {
                    var self = this;
                    var edge = self.edgesSelection.enter().append('svg:g').attr('class', 'edge');

                    edge.append('svg:path')
                        .style('fill', 'none')
                        .style('stroke', function (d) {
                            return d.source.color || self.graph.nodes[d.source.id || d.source].color || '#ddd';
                        })
                        .style('stroke-width', 4)
                        .style('opacity', 0.6)
                },


                /* helpers */

                /*
                 * calculations of coordinates for edges in the graph.
                 * this code was ported from graffle and adapted to our needs
                 */

                _calcBezierCoords: function (bb1, bb2, directed) {

                    /* get bounding boxes of target and source */
                    var off1 = 0;
                    var off2 = directed ? 3 : 0;
                    /* coordinates for potential connection coordinates from/to the objects */
                    var p = [
                        {x: bb1.x + bb1.width / 2, y: bb1.y - off1},                // NORTH 1
                        {x: bb1.x + bb1.width / 2, y: bb1.y + bb1.height + off1},   // SOUTH 1
                        {x: bb1.x - off1, y: bb1.y + bb1.height / 2},               // WEST  1
                        {x: bb1.x + bb1.width + off1, y: bb1.y + bb1.height / 2},   // EAST  1
                        {x: bb2.x + bb2.width / 2, y: bb2.y - off2},                // NORTH 2
                        {x: bb2.x + bb2.width / 2, y: bb2.y + bb2.height + off2},   // SOUTH 2
                        {x: bb2.x - off2, y: bb2.y + bb2.height / 2},               // WEST  2
                        {x: bb2.x + bb2.width + off2, y: bb2.y + bb2.height / 2}    // EAST  2
                    ];

                    /* distances between objects and according coordinates connection */
                    var d = {}, dis = [];

                    /*
                     * find out the best connection coordinates by trying all possible ways
                     */
                    /* loop the first object's connection coordinates */
                    for (var i = 0; i < 4; i++) {
                        /* loop the seond object's connection coordinates */
                        for (var j = 4; j < 8; j++) {
                            var dx = Math.abs(p[i].x - p[j].x),
                                dy = Math.abs(p[i].y - p[j].y);
                            if ((i == j - 4) || (((i != 3 && j != 6) || p[i].x < p[j].x) && ((i != 2 && j != 7) || p[i].x > p[j].x) && ((i != 0 && j != 5) || p[i].y > p[j].y) && ((i != 1 && j != 4) || p[i].y < p[j].y))) {
                                dis.push(dx + dy);
                                d[dis[dis.length - 1].toFixed(3)] = [i, j];
                            }
                        }
                    }
                    var res = dis.length == 0 ? [0, 4] : d[Math.min.apply(Math, dis).toFixed(3)];
                    /* bezier path */
                    var x1 = p[res[0]].x,
                        y1 = p[res[0]].y,
                        x4 = p[res[1]].x,
                        y4 = p[res[1]].y,
                        dx = Math.max(Math.abs(x1 - x4) / 2, 10),
                        dy = Math.max(Math.abs(y1 - y4) / 2, 10),
                        x2 = [x1, x1, x1 - dx, x1 + dx][res[0]],
                        y2 = [y1 - dy, y1 + dy, y1, y1][res[0]],
                        x3 = [0, 0, 0, 0, x4, x4, x4 - dx, x4 + dx][res[1]],
                        y3 = [0, 0, 0, 0, y1 + dy, y1 - dy, y4, y4][res[1]];

                    return { x1: x1, y1: y1, x2: x2, y2: y2, x3: x3, y3: y3, x4: x4, y4: y4 };
                },

                _bezierPath: function (bb1, bb2, directed) {

                    var coords = this._calcBezierCoords(bb1, bb2, directed),
                        x1 = coords.x1,
                        y1 = coords.y1,
                        x2 = coords.x2.toFixed(3),
                        y2 = coords.y2.toFixed(3),
                        x3 = coords.x3.toFixed(3),
                        y3 = coords.y3.toFixed(3),
                        x4 = coords.x4,
                        y4 = coords.y4;

                    /* assemble path and arrow */
                    var path = 'M' + x1.toFixed(3) + ',' + y1.toFixed(3) + 'C' + x2 + ',' + y2 + ',' + x3 + ',' + y3 + ',' + x4.toFixed(3) + ',' + y4.toFixed(3);

                    /* arrow */
                    if (directed) {
                        /* magnitude, length of the last path vector */
                        var mag = Math.sqrt((y4 - y3) * (y4 - y3) + (x4 - x3) * (x4 - x3));
                        /* vector normalisation to specified length  */
                        var norm = function (x, l) {
                            return (-x * (l || 5) / mag);
                        };
                        /* calculate array coordinates (two lines orthogonal to the path vector) */
                        var arr = [
                            {x: (norm(x4 - x3, 5) + norm(y4 - y3, 2) + x4).toFixed(3), y: (norm(y4 - y3, 5) + norm(x4 - x3, 2) + y4).toFixed(3)},
                            {x: (norm(x4 - x3, 5) - norm(y4 - y3, 2) + x4).toFixed(3), y: (norm(y4 - y3, 5) - norm(x4 - x3, 2) + y4).toFixed(3)}
                        ];
                        path = path + 'M' + arr[0].x + ',' + arr[0].y + 'L' + x4 + ',' + y4 + 'L' + arr[1].x + ',' + arr[1].y + 'Z';
                    }

                    return path;
                }

                /*
                 return function (el, layouter) {
                 return $injector.instantiate(D3Renderer, { el: el, layouter: layouter })
                 };
                 */

            }
        }
    }]);
