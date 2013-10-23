'use strict';

angular.module('gsUiInfra')
    .factory('Render', ['Utils', '$window', function (Utils, $window) {

        return {

            Topology: {

                // TODO
                // add hover icons for nodes and attach click handler to send external events
                // add missing icons to types map
                // clean up code

                D3: {

                    init: function (el, layouter) {

                        this.el = el;
                        this.layouter = layouter;

                        var self = this;
                        this.vis = d3.select(this.el).append('svg:svg');

                        /** graph data structure */
                        this.graph = { nodes: [], edges: [] };

                        // handles for nodes/edges selections
                        this.nodesGroup = self.vis.append('g').attr('class', 'nodes');
                        this.edgesGroup = self.vis.append('g').attr('class', 'edges');

                        this.lineFunction = d3.svg.line()
                            .x(function (d) {
                                return d.x;
                            })
                            .y(function (d) {
                                return d.y;
                            })
                            .interpolate("linear");

                        this.constants = {
                            headingHeight: 33,
                            circleRadius: 18,
                            types: {
                                'cloudify.types.tier': { classname: 'tier', icon: 'k'},
                                'cloudify.types.host': { classname: 'host', icon: 'e'},
                                'cloudify.types.volume': { classname: 'volume', icon: ''},
                                'cloudify.types.object_container': { classname: 'object-container', icon: ''},
                                'cloudify.types.network': { classname: 'network', icon: 'g'},
                                'cloudify.types.load_balancer': { classname: 'load-balancer', icon: ''},
                                'cloudify.types.virtual_ip': { classname: 'virtual-ip', icon: ''},
                                'cloudify.types.security_group': { classname: 'security-group', icon: 'i'},
                                'cloudify.types.middleware_server': { classname: 'middleware-server', icon: ''},
                                'cloudify.types.db_server': { classname: 'db-server', icon: 'c'},
                                'cloudify.types.web_server': { classname: 'web-server', icon: 'l'},
                                'cloudify.types.app_server': { classname: 'app-server', icon: ''},
                                'cloudify.types.message_bus_server': { classname: 'message-bus-server', icon: ''},
                                'cloudify.types.app_module': { classname: 'app-module', icon: 'a'}
                            }

                        }

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
                        this.vis.attr({width: this.width, height: this.height});
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

                        if (newData === this.graph) {
                            return;
                        }

                        this.graph = newData || this.graph;

                        // apply layout
                        this.layout();

                        // trigger rendering a tree-like dom structure by recursion traversal
                        var tree = this.layouter._asTree(this.graph, false, true);
//                        console.log(JSON.stringify(tree, null, 2))
                        this._update(tree);

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

                        if (!this.layouter) {
                            return;
                        }

                        var self = this;
                        // replace id's in the edges sources/targets to object references
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
                            pad = [47, 30, 30, 30];
                        pad.forEach(function (v, i) {
                            pad[i] = v + strokeWidth * 2;
                        });


                        // TODO take this code to the new rendering function, figure out how to calculate x/y
                        // TODO separate rendering for the original and the new canvas
                        // TODO this will be done before or after the layout / paint? test both.
                        // TODO abstract away data structure implementation (getRoot(), getChildren(node), etc.)

                        // update the nodes position data according to the layouter data
                        this.graph.nodes.forEach(function (v, i) {
                            if (!v.dimensionsFinalized) {
                                v.width = (segmentH - v.layoutPosZ * (pad[1] + pad[3]) - strokeWidth * 2) * v.layoutSpanX;
                                v.height = (segmentV - v.layoutPosZ * (pad[0] + pad[2]) - strokeWidth * 2) * v.layoutSpanY;
                                v.dimensionsFinalized = true;
                            }
                            v.x = segmentH * (v.layoutPosX - 1) + pad[3] * v.layoutPosZ + strokeWidth;
                            v.y = segmentV * (v.layoutPosY - 1) + pad[0] * v.layoutPosZ + strokeWidth;


                            ////////////////////////////////////////////////////////////////////////////////////////


                            var parent = Utils.findBy(self.graph.nodes, 'id', v.parent);
                            if (!parent) {
                                parent = {
                                    width: self.vis.attr('width'),
                                    height: self.vis.attr('height'),
                                    layoutSpanX: 4,
                                    layoutSpanY: 1
                                }
                            }

                            v.width = parent.width / parent.layoutSpanX * v.layoutSpanX - pad[3];
                            v.height = parent.height / parent.layoutSpanY * v.layoutSpanY - pad[0] - pad[2];
                            // TODO determine height
                            v.x = parent.width / parent.layoutSpanX * (v.layoutPosX - 1) + pad[3];
                            v.y = parent.height / parent.layoutSpanY * (v.layoutPosY - 1) + pad[0];
                            if (v.last) {
                                v.width -= pad[1];
                            }
                            if (!v.first) {
                                v.width += self.constants.circleRadius;
                                v.x -= self.constants.circleRadius;
                            }

                        });

                    },

                    _getFirstKnownType: function (d) {
                        var type, i;
                        for (i = 0; i < d.type.length; i++) {
                            if ((type = this.constants.types[d.type[i]]) !== undefined) {
                                return type;
                            }
                        }
                        return '';
                    },

                    _isAppModule: function (d) {
                        return d.type.indexOf('cloudify.types.app_module') !== -1;
                    },

                    _addNode: function (selection, depth, self) {

                        var nodeGroup = selection.selectAll('g.node')
                            .data(function (d) {
                                console.log('d.children: ', d.children)
                                return d.children;
                            })
                            .enter()
                            .append('g');

                        nodeGroup.attr('class', function (d) {
                            return 'node ' + self._getFirstKnownType(d).classname;
                        });

                        // outer container
                        nodeGroup.append('svg:rect')
                            .attr('class', 'container')
                            .attr('x', self.constants.circleRadius)
                            .attr('y', 0)
                            .attr('width', function (d) {
                                if (self._isAppModule(d)) {
                                    return 0;
                                }
                                return d.width - self.constants.circleRadius;
                            })
                            .attr('height',function (d) {
                                if (self._isAppModule(d)) {
                                    return 0;
                                }
                                return d.height;
                            }).attr('rx', 6)
                            .attr('ry', 6);

                        // heading box
                        nodeGroup.append('svg:rect')
                            .attr('class', 'heading')
                            .attr('height', function (d) {
                                if (self._isAppModule(d)) {
                                    return 0;
                                }
                                return self.constants.headingHeight;
                            })
                            .attr('x', self.constants.circleRadius + 2)
                            .attr('y', 3)
                            .attr('width', function (d) {
                                if (self._isAppModule(d)) {
                                    return 0;
                                }
                                return d.width - 6 - self.constants.circleRadius;
                            });

                        // heading text
                        nodeGroup.append('svg:text')
                            .attr('class', 'node-label')
                            .text(function (d) {
                                return d.name;
                            })
                            .attr('x', function (d) {
                                if (self._isAppModule(d)) {
                                    return self.constants.circleRadius + 10;
                                }
                                return 28 + self.constants.circleRadius;
                            })
                            .attr('y', function (d) {
                                if (self._isAppModule(d)) {
                                    return 60;
                                }
                                return 26;
                            })
                            .attr('text-anchor', function (d) {
                                if (self._isAppModule(d)) {
                                    return 'middle';
                                }
                                return 'start';
                            });

                        // status icon
                        var nodeStatusGroup = nodeGroup.append('svg:g').attr('class', 'status')
                        nodeStatusGroup.append('svg:circle')
                            .attr('class', 'circle')
                            .attr('cx', function (d) {
                                if (self._isAppModule(d)) {
                                    return self.constants.circleRadius + 10;
                                }
                                return self.constants.circleRadius;
                            })
                            .attr('cy', self.constants.circleRadius + 1)
                            .attr('r', self.constants.circleRadius);

                        // circle icon
                        nodeStatusGroup.append('svg:text')
                            .attr('class', 'circle-text')
                            .text(function (d) {
                                return self._getFirstKnownType(d).icon;
                            })
                            .attr('x', function (d) {
                                if (self._isAppModule(d)) {
                                    return self.constants.circleRadius + 10;
                                }
                                return self.constants.circleRadius;
                            })
                            .attr('y', 29)
                            .attr('text-anchor', 'middle');


                        // prepare z-index for svg paint order
                        nodeGroup.sort(function (a, b) {
                            if (a.layoutPosZ > b.layoutPosZ) {
                                return 1;
                            }
                            if (a.layoutPosZ < b.layoutPosZ) {
                                return -1;
                            }
                            return 0;
                        });

                        // render positioning
                        nodeGroup.attr('transform', function (d) {
                            return 'translate(' + d.x + ',' + d.y + ')';
                        });

                        nodeGroup.each(function(datum) {

                            var edgeGroup = self.edgesGroup
                                .selectAll('g.edge')
                                .data(function () {
                                    console.log('each data: ', datum)
                                    if (!datum) {
                                        return [];
                                    }
                                    var arr = [],
                                        dep,
                                        j;
                                    if (dep = datum.dependencies) {
                                        console.log('data[i].id (looping dependencies): ', datum.id)
                                        j = dep.length;
                                        while (j--) {
                                            arr.push({
                                                source: datum,
                                                target: Utils.findBy(self.graph.nodes, 'id', dep[j]),
                                                directed: true
                                            });
                                        }
                                    }
                                    return arr;
                                })
                                .enter()
                                .append('g')
                                .attr('class', 'edge')


                            edgeGroup
                                .append('path')
                                .attr('d', function (d) {
                                    return self._renderPath(d.source, d.target, d.directed, self.lineFunction);
                                });

                        });

                        // recurse - there might be a way to ditch the conditional here
                        nodeGroup.each(function (d) {
                            d.children && nodeGroup.call(self._addNode, depth + 1, self);
                        });

                    },

                    _update: function (root) {
                        // kick off the recursive append
                        this.nodesGroup
                            .datum({ children: [root] })
                            .call(this._addNode, 0, this);
                    },

                    _nodeAbsolutePosition: function (n) {
//                        var pos = {x: 0, y: 0};
//                        pos.x = n.x + n.layoutPosZ * (33 + 1);
//                        pos.y = n.y + n.layoutPosZ * (47 + 4);
//                        return pos;
                        n.absX -= n.x;
                        n.absY -= n.y;
                        n.parent && this._nodeAbsolutePosition(n.parent);
                    },

                    /**
                     * calculations of coordinates for edges in the graph.
                     * this code was ported from graffle and adapted to our needs
                     */
                    _calcBezierCoords: function (n1, n2/*, directed*/) {

//                        var arrowMargin = directed ? 3 : 0;
                        this._nodeAbsolutePosition(n1);
                        this._nodeAbsolutePosition(n2);
                        var n1AbsPos = {x: n1.absX, y: n1.absY},
                            n2AbsPos = {x: n2.absX, y: n2.absY},

/*
                        var n1AbsPos = this._nodeAbsolutePosition(n1),
                            n2AbsPos = this._nodeAbsolutePosition(n2),
*/
                            cR = this.constants.circleRadius;
                        /* coordinates for potential connection coordinates from/to the objects */
                        var p = [
                            /* NORTH 1 */    {x: n1AbsPos.x + cR + (n1.width - cR) / 2, y: n1AbsPos.y},
                            /* SOUTH 1 */    {x: n1AbsPos.x + cR + (n1.width - cR) / 2, y: n1AbsPos.y + n1.height},
                            /* WEST  1 */    {x: n1AbsPos.x + 2, y: n1AbsPos.y + cR},
                            /* EAST  1 */    {x: n1AbsPos.x + n1.width, y: n1AbsPos.y + cR},
                            /* NORTH 2 */    {x: n2AbsPos.x + cR + (n2.width - cR) / 2, y: n2AbsPos.y},
                            /* SOUTH 2 */    {x: n2AbsPos.x + cR + (n2.width - cR) / 2, y: n2AbsPos.y + n2.height},
                            /* WEST  2 */    {x: n2AbsPos.x, y: n2AbsPos.y + cR},
                            /* EAST  2 */    {x: n2AbsPos.x + n2.width, y: n2AbsPos.y + cR}
                        ];

                        /* distances between objects and according coordinates connection */
                        var d = {}, dis = [];

                        /*
                         * find out the best connection coordinates by trying all possible ways
                         */
                        /* loop the first object's connection coordinates */
                        for (var i = 0; i < 4; i++) {
                            /* loop the second object's connection coordinates */
                            for (var j = 4; j < 8; j++) {
                                var dx = Math.abs(p[i].x - p[j].x),
                                    dy = Math.abs(p[i].y - p[j].y);
                                if (
                                    (i == j - 4) ||
                                        (
                                            ((i != 3 && j != 6) || p[i].x < p[j].x) &&
                                                ((i != 2 && j != 7) || p[i].x > p[j].x) &&
                                                ((i != 0 && j != 5) || p[i].y > p[j].y) &&
                                                ((i != 1 && j != 4) || p[i].y < p[j].y)
                                            )
                                    ) {
//                                    console.log('id1, id2, dx, dy: ', n1.id, '->', n2.id, ':', dx, '/', dy)
                                    dis.push(dx + dy);
                                    d[dis[dis.length - 1].toFixed(3)] = [i, /*j*/6];
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

                    _renderPath: function (n1, n2, directed, lineRenderer) {

                        var coords = this._calcBezierCoords(n1, n2, directed),
                            x1 = coords.x1,
                            y1 = coords.y1,
                            x2 = coords.x2.toFixed(3),
                            y2 = coords.y2.toFixed(3),
//                            x3 = coords.x3.toFixed(3),
//                            y3 = coords.y3.toFixed(3),
                            x3 = coords.x4 - 32,
                            y3 = coords.y4,
                            x4 = coords.x4,
                            y4 = coords.y4;

                        /* assemble path and arrow */
                        var path;
                        if (lineRenderer) {
                            path = lineRenderer([
                                {x: x1, y: y1},
//                                {x: x2, y: y2},
                                {x: x3, y: y3},
                                {x: x4, y: y4}
                            ]);
                        } else {
                            path = 'M' + x1.toFixed(3) + ',' + y1.toFixed(3) + 'C' + x2 + ',' + y2 + ',' + x3 + ',' + y3 + ',' + x4.toFixed(3) + ',' + y4.toFixed(3);
                        }

                        /* arrow */
                        if (directed) {
                            /* magnitude, length of the last path vector */
                            var mag = Math.sqrt((y4 - y3) * (y4 - y3) + (x4 - x3) * (x4 - x3));
                            /* vector normalisation to specified length  */
                            var norm = function (x, l) {
                                return (-x * (l || 15) / mag);
                            };
                            /* calculate array coordinates (two lines orthogonal to the path vector) */
                            var arr = [
                                {x: (norm(x4 - x3, 12) + norm(y4 - y3, 12) + x4).toFixed(3), y: (norm(y4 - y3, 12) + norm(x4 - x3, 12) + y4).toFixed(3)},
                                {x: (norm(x4 - x3, 12) - norm(y4 - y3, 12) + x4).toFixed(3), y: (norm(y4 - y3, 12) - norm(x4 - x3, 12) + y4).toFixed(3)}
                            ];
                            path = path + 'M' + arr[0].x + ',' + arr[0].y + 'L' + x4 + ',' + y4 + 'L' + arr[1].x + ',' + arr[1].y;
                        }

                        return path;
                    }

                }
            }
        }
    }])
;
