'use strict';

angular.module('gsUiInfra')
    .directive('topology', ['$window', 'Layout', function ($window, Layout) {
        return {
            template: '<div id="graph"></div>',
            restrict: 'E',
            scope: true,

            link: function (scope, element, attrs) {

                /* utilities */

                (function () {

                    var Utils = function () {
                    };

                    Utils.prototype = {

                        filter: function (arr, propName, propValue) {
                            var filtered = [];
                            var i = arr.length;
                            while (i--) {
                                var item = arr[i];
                                if (item.hasOwnProperty(propName) && item[propName] === propValue) {
                                    filtered.push(item);
                                }
                            }
                            return filtered;
                        },

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

                        propValues: function (obj) {
                            return Object.keys(obj).map(function (key) {
                                return obj[key];
                            });
                        }

                    };

                    $window.GsUtils = new Utils();

                })();


                (function () {

                    function GsD3Graph(el, layouter) {

                        this.el = el;
                        this.layouter = layouter;

                        var self = this;
                        this.svg = d3.select(this.el).append('svg:svg');

                        /** graph data structure */
                        this.graph = { nodes: [], edges: [] };
                        /** flag switched on during layout animation */
                        this.animated = false;

                        // handles to node and edge groups
                        this.edgesSelection = this.svg.append('svg:g').selectAll('g.edge');
                        this.nodesSelection = this.svg.append('svg:g').selectAll('g.node');

                        var start = function () {
                            self.animated = true;
                            // TODO pass tree to the layouter
                            self.layouter && self.layouter.layout(null, self.graph);
                        };

                        var end = function () {
                            self.animated = false;
                        };

                        var tick = function () {

                            if (self.layouter) {
                                var layouter = self.layouter,
                                    rangeX = layouter.layoutMaxX - layouter.layoutMinX + 1,
                                    rangeY = layouter.layoutMaxY - layouter.layoutMinY + 1,
                                    segmentH = self.width / rangeX,
                                    segmentV = self.height / rangeY;
                                // update the nodes position data according to the layouter data
                                var pad = 38;
                                self.graph.nodes.forEach(function (d, i) {
                                    // TODO WTF? how to set width and height?
                                    if (!d.dimensionsFinalized) {
                                        d.width = d.width - d.layoutPosZ * pad * 2;
                                        d.height = d.height - d.layoutPosZ * pad * 2;
                                        d.dimensionsFinalized = true;
                                    }
                                    d.fixed = true;
                                    // TODO implement differently according to the plan design
                                    d.x = segmentH * d.layoutPosX + (segmentH - d.width) / 2;
                                    d.y = segmentV * d.layoutPosY + (segmentV - d.height) / 2;
                                });

                                self.nodesSelection.selectAll('rect')
                                    .attr('width', function (d) {
                                        return d.width;
                                    })
                                    .attr('height', function (d) {
                                        return d.height;
                                    });
                                self.nodesSelection.selectAll('text')
                                    .attr('x', function (d) {
                                        return d.width / 2;
                                    })
                            }

                            // update dom selections
                            self.edgesSelection.selectAll('path').attr('d',function (d) {
                                return _bezierPath(d.source, d.target, d.directed);
                            }).attr('data-source',function (d) {
                                    return d.source.id;
                                }).attr('data-target', function (d) {
                                    return d.target.id;
                                });
                            self.edgesSelection.selectAll('image').attr('x', function (d) {
                                return _pathCenter(d.source, d.target, d.directed).x - 10;
                            });
                            self.edgesSelection.selectAll('image').attr('y', function (d) {
                                return _pathCenter(d.source, d.target, d.directed).y - 10;
                            });
                            self.nodesSelection.attr('transform', function (d) {
                                return 'translate(' + d.x + ',' + d.y + ')';
                            });

                        };

                        this.force = d3.layout.force()
                            .nodes(this.graph.nodes)
                            .links(this.graph.edges)
                            .charge(-1000)
                            .linkDistance(180)
                            .on('tick', tick)
                            .on('start', start)
                            .on('end', end);

                        // tie resize behavior
                        $window.addEventListener('resize', function () {
                            self.resize();
                        });
                        // call it once to set initial dimensions
                        this.resize();

                    };

                    GsD3Graph.prototype = {

                        /**
                         * Resize the SVG canvas and update the layout size.
                         */
                        resize: function () {
                            this.width = this.el.clientWidth || 1000;
                            this.height = this.el.clientHeight || 600;
                            this.svg.attr('width', this.width).attr('height', this.height);
                            this.layouter || this.force.size([this.width, this.height]);
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

                            this.force
                                .nodes(this.graph.nodes)
                                .links(this.graph.edges);

                            // tie data to edge handles
                            _bindEdges.call(this);

                            // update existing edges
                            _updateEdges.call(this);

                            // add new edges
                            _enterEdges.call(this);

                            // remove old edges
                            this.edgesSelection.exit().remove();

                            // tie data to node handles
                            _bindNodes.call(this);

                            // update existing nodes
                            _updateNodes.call(this);

                            // add new nodes
                            _enterNodes.call(this);

                            // remove old nodes
                            _exitNodes.call(this);

                            // apply layout
                            this.layout();
                        },

                        clear: function () {
                            this.refresh({ nodes: [], edges: [] });
                        },

                        layout: function () {
                            if (!this.graph.nodes.length) return;
                            this.force.start();
                            if (this.layouter) {
                                this.force.tick();
                                this.force.stop();
                            }
                        }

                    };


                    /* common shared functions (privileged to the bounding scope) */

                    function _bindNodes() {

                        var self = this,
                            nodesDataKey = function (d) {
                                // return all property values as the data key
                                return GsUtils.propValues(d)
                            }

                        // pu nodes group
                        this.nodesSelection = this.nodesSelection.data(function () {
                            return self.graph.nodes;
                        }, nodesDataKey);
                    }

                    function _updateNodes() {

                    }

                    function _enterNodes() {

                        var node = this.nodesSelection.enter().append('svg:g').attr('class', 'node');

                        node.append('svg:rect')
                            // populate width/height properties for the first time. from now on we can reference d.width/d.height
                            .attr('width', function (d) {
                                return d.width || (d.width = 280);
                            })
                            .attr('height', function (d) {
                                return d.height || (d.height = 280);
                            })
                            .attr('rx', 8)
                            .attr('ry', 8)
                            .style('fill', '#f6f6f6')
                            .style('stroke', '#0d7acc')
                            .style('stroke-width', 1)

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

                    }

                    function _exitNodes() {
                        this.nodesSelection.exit().remove();
                    }

                    function _bindEdges() {
                        var self = this;
                        this.edgesSelection = this.edgesSelection.data(function () {
                            return $window.GsUtils.filter(self.graph.edges, 'type', 'connected_to');
                        });
                    }

                    function _updateEdges() {

                    }

                    function _enterEdges() {
                        var self = this;
                        var edge = self.edgesSelection.enter().append('svg:g').attr('class', 'edge');

                        edge.append('svg:path')
                            .style('fill', 'none')
                            .style('stroke', function (d) {
                                return d.source.color || self.graph.nodes[d.source.id || d.source].color || '#ddd';
                            })
                            .style('stroke-width', 4)
                            .style('opacity', 0.6)
                    }


                    /* helpers */

                    /*
                     * calculations of coordinates for edges in the graph.
                     * this code was ported from graffle and adapted to our needs
                     */

                    function _calcBezierCoords(bb1, bb2, directed) {

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
                    }

                    function _bezierPath(bb1, bb2, directed) {

                        var coords = _calcBezierCoords(bb1, bb2, directed),
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

                    function _pathCenter(bb1, bb2, directed) {
                        var coords = _calcBezierCoords(bb1, bb2, directed);
                        return {x: (coords.x1 + coords.x4) / 2, y: (coords.y1 + coords.y4) / 2};
                    }


                    /**
                     * Used to capture custom events and forward them to API calls. Eliminates the need
                     * in using the component's API and allows to decouple the component from the host.
                     *
                     * @param d3Graph The component's instance.
                     * @constructor
                     */
                    (function D3GraphEventProxy() {

                        // key: graph selector, value: graph instance reference
                        var graphs = {};

                        /*
                         * Listens to incoming custom events, and delegates them to the
                         * appropriate method on the corresponding graph instance. If no such instance exists,
                         * it will be created and added to a map.
                         *
                         * Graph instances will be mapped via the event target id (thus the event target must
                         * have an id in order to create them).
                         *
                         * Custom events have a 'details' property, which holds an object used to pass information.
                         * This object may have an 'args' property for passing arguments into the delegated method
                         * on the D3 graph instance, and may have a 'callback' property to handle the returned value
                         * from the delegated method.
                         */


                        document.addEventListener('graphInvocation', function (e) {

                            var id, target, detail, fnName, graph;

                            // we rely on event delegation, event target will be the graph container
                            if (!(target = e.target) || !(id = target.id) || !(detail = e.detail) || !(fnName = detail.fnName) || !(graph = graphs[id])) return;

                            // delegate the call to the appropriate function on the graph instance
                            var returnedValue = graph[fnName].apply(graph, detail.args);

                            // invoke the callback with the returned value
                            detail.callback && typeof detail.callback === 'function' && detail.callback.call(detail, returnedValue)
                        });

                        document.addEventListener('graphInitialization', function (e) {

                            var id,
                                target, // we rely on event delegation, event target will be the graph container
                                detail;
                            if (!(target = e.target) || !(id = target.id) || !(detail = e.detail)) return;

                            var graph = graphs[id];
                            if (!graph) {
//                                graphs[id] = new GsD3Graph(target, GsD3Graph.Factory.layout(detail.layoutConfig));
                                graphs[id] = new GsD3Graph(target, Layout.Tensor);
                            }
                        });

                    })();

                    /* export to global scope */
                    $window.GsD3Graph = GsD3Graph;

                })();


                /////////////////////////////////////////////////////////////////////////////////////////////


                var graphEl = element[0].childNodes[0],
                    graphInstance,
                    InvocationMethod = {
                        instance: 0,
                        eventDispatcher: 1
                    },
                    currInvocationMethod = InvocationMethod.eventDispatcher;


                function callInvocation(fnName, args, callback) {
                    if (InvocationMethod.eventDispatcher === currInvocationMethod) {
                        graphEl.dispatchEvent(new CustomEvent('graphInvocation', {
                            bubbles: true,
                            detail: { fnName: fnName, args: args, callback: callback }
                        }));
                    } else if (InvocationMethod.instance === currInvocationMethod) {
                        graphInstance[fnName].apply(graphInstance, args);
                    }
                }

                function callInitialization(layoutConfig) {
                    if (InvocationMethod.eventDispatcher === currInvocationMethod) {
                        graphEl.dispatchEvent(new CustomEvent('graphInitialization', {
                            bubbles: true,
                            detail: { layoutConfig: layoutConfig }
                        }));
                    } else if (InvocationMethod.instance === currInvocationMethod) {
                        graphInstance = new $window.GsD3Graph(graphEl, new $window.GsD3Graph.Layout.Matrix(layoutConfig.args[0], layoutConfig.args[1]));
                    }
                }

                // build initial graph
                callInitialization({
                    type: 'tensor',
                    args: []
                })
                callInvocation('refresh', [ getMockData('graph') ]); // TODO describe the flow from here - what happens? decouple the layouter from the renderer

                function getMockData(struct) {

                    if (struct === 'tree') {
                        return {
                            "id": "root",
                            "children": [
                                {
                                    "id": 0,
                                    "type": [
                                        "cloudify.tosca.types.network"
                                    ],
                                    "dependencies": [
                                        3
                                    ],
                                    "children": [
                                        {
                                            "id": 2,
                                            "type": [
                                                "cloudify.tosca.types.tier"
                                            ],
                                            "children": [
                                                {
                                                    "id": 3,
                                                    "type": [
                                                        "cloudify.tosca.types.host"
                                                    ],
                                                    "children": [
                                                        {
                                                            "id": 4,
                                                            "type": [
                                                                "cloudify.tosca.types.web_server",
                                                                "cloudify.tosca.types.middleware_server"
                                                            ],
                                                            "children": [
                                                                {
                                                                    "id": 5,
                                                                    "type": [
                                                                        "cloudify.tosca.types.app_module"
                                                                    ]
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        },
                                        {
                                            "id": 1,
                                            "type": [
                                                "cloudify.tosca.types.tier"
                                            ],
                                            "dependencies": [
                                                4,
                                                5
                                            ]
                                        }
                                    ]
                                }
                            ]
                        };
                    }
                    if (struct === 'graph') {
                        return {
                            "nodes": [
                                {
                                    "id": 0,
                                    "name": "vagrant_host",
                                    "type": ["cloudify.tosca.types.host"]
                                },
                                {
                                    "id": 1,
                                    "name": "pickle_db",
                                    "type": ["cloudify.tosca.types.db_server", "cloudify.tosca.types.middleware_server"]
                                },
                                {
                                    "id": 2,
                                    "name": "flask",
                                    "type": ["cloudify.tosca.types.web_server", "cloudify.tosca.types.middleware_server"]
                                },
                                {
                                    "id": 3,
                                    "name": "flask_app",
                                    "type": ["cloudify.tosca.types.app_module"]
                                }
                            ],
                            "edges": [
                                {
                                    "type": "contained_in",
                                    "source": 1,
                                    "target": 0
                                },
                                {
                                    "type": "contained_in",
                                    "source": 2,
                                    "target": 0
                                },
                                {
                                    "type": "contained_in",
                                    "source": 3,
                                    "target": 2
                                },
                                {
                                    "type": "connected_to",
                                    "source": 3,
                                    "target": 1
                                }
                            ]
                        };
                    }

                }


            }
        };
    }]);
