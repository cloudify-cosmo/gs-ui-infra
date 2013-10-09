'use strict';

angular.module('gsUiInfra')
    .directive('topology', ['$window', function ($window) {
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
                        this.data = { nodes: [], edges: [] };
                        /** edges added to the graph when source or target nodes don't exist yet */
                        this.ghostEdges = [];
                        /** flag switched on during layout animation */
                        this.animated = false;

                        // handles to node and edge groups
                        this.edgesSelection = this.svg.append('svg:g').selectAll('g.edge');
                        this.nodesSelection = this.svg.append('svg:g').selectAll('g.node');

                        var start = function () {
                            self.animated = true;
                            self.layouter && self.layouter.layout(self.data);
                        };

                        var end = function () {
                            self.animated = false;
                        };

                        var tick = function () {

                            if (self.layouter) {
                                var layouter = self.layouter;
                                // update the nodes position data according to the layouter data
                                if (layouter instanceof GsD3Graph.Layout.Matrix) {
                                    var rangeX = layouter.layoutMaxX - layouter.layoutMinX + 1,
                                        rangeY = layouter.layoutMaxY - layouter.layoutMinY + 1,
                                        segmentH = self.width / rangeX,
                                        segmentV = self.height / rangeY;
                                    self.data.nodes.forEach(function (d, i) {
                                        d.fixed = true;
                                        d.x = segmentH * d.layoutPosX + (segmentH - d.width) / 2;
                                        d.y = segmentV * d.layoutPosY + (segmentV - d.height) / 2;
                                    });
                                } else if (layouter instanceof GsD3Graph.Layout.Tensor) {
                                    var rangeX = layouter.layoutMaxX - layouter.layoutMinX + 1,
                                        rangeY = layouter.layoutMaxY - layouter.layoutMinY + 1,
                                        rangeZ = layouter.layoutMaxZ - layouter.layoutMinZ + 1,
                                        segmentH = self.width / rangeX,
                                        segmentV = self.height / rangeY,
                                        pad = 30;
                                    self.data.nodes.forEach(function (d, i) {
//                                        d.width = d.width - d.layoutPosZ * 2;
//                                        d.height = d.height - d.layoutPosZ * 2;
                                        d.fixed = true;
                                        d.x = segmentH * d.layoutPosX + (segmentH - d.width) / 2 + pad * d.layoutPosZ;
                                        d.y = segmentV * d.layoutPosY + (segmentV - d.height) / 2 + pad * d.layoutPosZ;
                                    });
                                }
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

                            self.nodesSelection.attr('width', function (d) {
                                console.log(d.width - d.layoutPosZ * 30 * 2)
                                return d.width = d.width - d.layoutPosZ * 30 * 2;
                            });
                            self.nodesSelection.attr('height', function (d) {
                                return d.height = d.height - d.layoutPosZ * 2;
                            });
                        };

                        this.force = d3.layout.force()
                            .nodes(this.data.nodes)
                            .links(this.data.edges)
                            .charge(-1000)
                            .linkDistance(180) // TODO determine distance by function to account for horizontal / vertical links (is that possible?)
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
                         * Adds a node to the data, and optionally refreshing the graph.
                         *
                         * @param node A node object to add, must have an id property.
                         * @param refresh Optional, whether to refresh the graph.
                         */
                        addNode: function (node, refresh) {
                            // sanitize
                            if (!node || typeof node.id === 'undefined' || GsUtils.findBy(this.data.nodes, 'id', node.id)) {
                                return;
                            }

                            // add to graph
                            this.data.nodes.push(node);
                            // look for related edges in logical edges array, collect them for addition,
                            // and remove them from the logical edges array
                            var i = this.ghostEdges.length,
                                nodeEdges = [];

                            while (i--) {
                                var edge = this.ghostEdges[i];
                                if (edge.source === node.id && GsUtils.findBy(this.data.nodes, 'id', edge.target) ||
                                    edge.target === node.id && GsUtils.findBy(this.data.nodes, 'id', edge.source)) {
                                    nodeEdges.push(edge);
                                    this.ghostEdges.splice(i, 1);
                                }
                            }
                            // add all edges found for that node
                            i = nodeEdges.length;
                            while (i--) {
                                this.addEdge(nodeEdges[i]);
                            }
                            // refresh as necessary
                            refresh && this.refresh();
                        },

                        /**
                         * Removes a node from the data, and optionally refreshing the graph.
                         *
                         * @param node A node object or the id of the node to remove.
                         * @param refresh Optional, whether to refresh the graph.
                         */
                        removeNode: function (node, refresh) {
                            // sanitize
                            if (!this.data.nodes.length || typeof node === 'undefined') return;

                            var n, removed;
                            // find node in the data
                            if (typeof node === 'object') {
                                n = node;
                            } else {
                                n = GsUtils.findBy(this.data.nodes, 'id', node);
                            }
                            // remove node from the model
                            n && (removed = this.data.nodes.splice(this.data.nodes.indexOf(n), 1)[0]);
                            // remove all connected edges
                            if (removed) {
                                var edge,
                                    i = this.data.edges.length;
                                // clear live edges
                                while (i--) {
                                    edge = this.data.edges[i];
                                    if (edge.source.id == removed.id || edge.target.id == removed.id) {
                                        this.data.edges.splice(i, 1);
                                    }
                                }
                                // clear logical edges
                                i = this.ghostEdges.length;
                                while (i--) {
                                    edge = this.ghostEdges[i];
                                    if (edge.source == removed.id || edge.target == removed.id) {
                                        this.ghostEdges.splice(i, 1);
                                    }
                                }
                            }

                            // refresh as necessary
                            refresh && this.refresh();
                        },

                        /**
                         * Adds an edge to the graph.
                         *
                         * @param edge An edge object in the form:
                         * <pre><code>
                         *     { source: 'nodeId', target: 'nodeId' [, directed: boolean] [, status: 'status'] }
                         * </code></pre>
                         * if the <code>directed</code> property is omitted, <code>directed:true</code> is assumed.
                         * @param refresh Whether to refresh the graph.
                         */
                        addEdge: function (edge, refresh) {
                            // check for undefined args, source and target may have falsey values (e.g. 0), so we need to check for undefined
                            if (typeof edge === 'undefined' || typeof edge.source === 'undefined' || typeof edge.target === 'undefined') {
                                return;
                            }

                            var source, target;
                            // if source or target nodes don't exist in the graph, save for future addition, and bail
                            if (!(source = GsUtils.findBy(this.data.nodes, 'id', edge.source)) || !(target = GsUtils.findBy(this.data.nodes, 'id', edge.target))) {
                                this.ghostEdges.push(edge);
                                return;
                            }

                            // construct the real edge object
                            var e = {
                                source: source,
                                target: target,
                                status: 'status' in edge ? edge.status : null,
                                directed: 'directed' in edge ? edge.directed : true
                            };
                            // add to graph
                            this.data.edges.push(e);
                            // refresh as necessary
                            refresh && this.refresh();
                        },

                        /**
                         * Removes an edge from the graph.
                         *
                         * @param edge An edge object to remove, in the form:
                         * <pre><code>
                         *     { source: nodeObject, target: nodeObject [, directed: boolean] [, status: 'status'] }
                         * </code></pre>
                         * These objects only need to have mock node objects with only the id property mandatory.
                         * @param refresh Whether to refresh the graph.
                         */
                        removeEdge: function (edge, refresh) {
                            if (typeof edge === 'undefined') return;

                            var i = _edgeLookup.call(this, 'id', edge.source.id, 'id', edge.target.id, true),
                                removed = this.data.edges.splice(i, 1)[0];

                            refresh && this.refresh();

                            return removed;
                        },

                        /**
                         * Updates an existing node.
                         *
                         * @param node A node object containing the properties to update in the node (may be partial).
                         * @param refresh Whether to refresh the graph.
                         */
                        updateNode: function (node, refresh) {
                            var oldNode = GsUtils.findBy(this.data.nodes, 'id', node.id);
                            if (!oldNode || !node ||
                                typeof oldNode.id === 'undefined' || typeof node.id === 'undefined' ||
                                oldNode === node) {
                                return;
                            }

                            var index = this.data.nodes.indexOf(oldNode),
                                newNode = jQuery.extend(true, /*{}, */oldNode, node); // BEWARE of extending into a new object! this breaks functionality for some reason

                            this.data.nodes.splice(index, 1, newNode)[0];

                            refresh && this.refresh();
                        },

                        /**
                         * Updates a single edge or multiple edges in the graph. The match is made either by full lookup
                         * (source and target are both specified) or be partial lookup (only source or only target
                         * is specified).
                         *
                         * @param edge An object in the form:
                         * <pre><code>
                         *     { source: nodeObject, target: nodeObject [, directed: boolean] [, status: 'status'] }
                         * </code></pre>
                         * These objects need to have mock node objects with only one property (mostly 'id'). The
                         * behavior is unspecified for edge objects passed with multiple properties.
                         * @param refresh Whether to refresh the graph.
                         * @param greedy <code>true</code> to update every match according to the source/target ids,
                         * <code>false</code> to only match the first occurrence.
                         *
                         * As noted, an edge passed to this method may have any property name for the source and target
                         * objects, e.g. 'type'. This means that when using the greedy mode, this method can be used to
                         * update all loose matches of edges, e.g. to update any edge between nodes with type of
                         * 'PROCESSING_UNIT' and nodes with type of 'DATABASE', pass the following edge object:
                         * <pre><code>
                         *     { source: { type: 'PROCESSING_UNIT' }, target: { type: 'DATABASE' }, status: 'ok' }
                         * </code></pre>
                         */
                        updateEdge: function (edge, refresh, greedy) {
                            if (typeof edge === 'undefined') return;

                            var source = edge.source,
                                target = edge.target,
                                sourceKey = source && Object.keys(source)[0],
                                sourceValue = sourceKey && source[sourceKey],
                                targetKey = target && Object.keys(target)[0],
                                targetValue = targetKey && target[targetKey];

                            var edgeMatch = _edgeLookup.call(this, sourceKey, sourceValue, targetKey, targetValue, false, greedy);
                            if (!edgeMatch || edgeMatch === edge || edgeMatch instanceof Array && !edgeMatch.length) {
                                return;
                            }

                            // when only messing with a single edge object, put it in an array to handle it further
                            greedy || (edgeMatch = [edgeMatch]);

                            // replace edges in the model with the updated edges
                            var i = edgeMatch.length;
                            while (i--) {
                                var e = edgeMatch[i]
                                this.data.edges.splice(
                                    this.data.edges.indexOf(e), 1, jQuery.extend(true, e, edge));
                            }

                            // refresh as necessary
                            refresh && this.refresh();
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
                            if (newData === this.data) return;

                            this.data = newData || this.data;

                            this.force
                                .nodes(this.data.nodes)
                                .links(this.data.edges);

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
                            if (!this.data.nodes.length) return;
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
                            return self.data.nodes;
                        }, nodesDataKey);
                    }

                    function _updateNodes() {

                        var self = this,
                            node = this.nodesSelection;

                        node.select('rect')
                            // populate width/height properties for the first time. from now on we can reference d.width/d.height
                            .attr('width', function (d) {
//                                console.log(' - - - - - ')
                                return d.width = d.width - d.layoutPosZ * 30 * 2;
                            })
                            .attr('height', function (d) {
                                return d.height = 200 - d.layoutPosZ * 2;
                            })
                    }

                    function _enterNodes() {

                        var self = this,
                            node = this.nodesSelection.enter().append('svg:g').attr('class', 'node');

                        node.append('svg:rect')
                            // populate width/height properties for the first time. from now on we can reference d.width/d.height
                            .attr('width', function (d) {
                                return d.width || (d.width = 300);
                            })
                            .attr('height', function (d) {
                                return d.height || (d.height = 200);
                            })
                            .attr('rx', 8)
                            .attr('ry', 8)
                            .style('fill', '#f2f2f2')
                            .style('stroke', _nodeStrokeColorSetter(self))
                            .style('stroke-width', _nodeStrokeWidthSetter(self))

                        // add name label
                        node.append('svg:text')
                            .text(function (d) {
                                var typeStr = '' + d.type;
                                return d.name + ' (' + typeStr.substring(typeStr.lastIndexOf('.') + 1) + ')';
                            })
                            .attr('x', function (d) {
                                return d.width / 2 - 12;
                            })
                            .attr('y', 15)
                            .attr('text-anchor', 'middle')
                            .style('fill', '#406b80')
                            .style('fill-opacity', 0.6)
                            .style('font-size', '14px')
                            .style('font-family', 'Arial')
                            .style('font-weight', 'bold')

                    }

                    function _exitNodes() {
                        this.nodesSelection.exit().remove();
                    }

                    function _bindEdges() {
                        this.edgesSelection = this.edgesSelection.data(this.data.edges);
                    }

                    function _updateEdges() {

                    }

                    function _enterEdges() {
                        var self = this;
                        var edge = self.edgesSelection.enter().append('svg:g').attr('class', 'edge');

                        edge.append('svg:path')
                            .style('fill', 'none')
                            .style('stroke', function (d) {
                                return d.source.color || self.data.nodes[d.source.id || d.source].color || '#ddd';
                            })
                            .style('stroke-width', 4)
                            .style('opacity', 0.6)
                    }


                    /* helpers */

                    function _edgeLookup(sourceKey, sourceValue, targetKey, targetValue, asIndex, greedy) {

                        // value can be falsey, e.g. id: 0, so we need to check for type
                        var sourceDefined = typeof sourceValue !== 'undefined';
                        var targetDefined = typeof targetValue !== 'undefined';
                        if (!sourceDefined && !targetDefined) return;

                        var i = this.data.edges.length,
                        // allow for lookup only by one of sourceId or targetId
                            lenient = sourceDefined && !targetDefined || !sourceDefined && targetDefined,
                            edges = [];
                        // iterate over the data edges and add relevant edges or their indexes to the returned array
                        while (i--) {
                            var found,
                                e = this.data.edges[i];
                            found = lenient ?
                                (sourceDefined && e.source[sourceKey] == sourceValue || targetDefined && e.target[targetKey] == targetValue) :
                                (e.source[sourceKey] == sourceValue && e.target[targetKey] == targetValue);
                            if (found) {
                                var val = asIndex ? i : e;
                                // do we need all matching edges, or just the first?
                                if (greedy) {
                                    // add to array bottom, as we're iterating backwards
                                    edges.unshift(val);
                                } else {
                                    return val;
                                }
                            }
                        }
                        // return the collected edges for greedy lookup, or none as first is not found
                        return greedy ? edges : false;
                    }

                    function _nodeStrokeColorSetter() {
                        return function () {
                            return '#0d7acc';
                        }
                    }

                    function _nodeStrokeWidthSetter() {
                        return function () {
                            return 3;
                        }
                    }

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
                                graphs[id] = new GsD3Graph(target, GsD3Graph.Factory.layout(detail.layoutConfig));
                            }
                        });

                    })();


                    /* factories */

                    GsD3Graph.Factory = (function () {

                        return {

                            layout: function (layoutConfig) {
                                var type = layoutConfig.type && layoutConfig.type.toString().toLowerCase();
                                switch (type) {
                                    case 'matrix':
                                        var newMatrix = Object.create(GsD3Graph.Layout.Matrix.prototype);
                                        newMatrix = (GsD3Graph.Layout.Matrix.apply(newMatrix, layoutConfig.args) || newMatrix);
                                        return (newMatrix);
                                    case 'layered':
                                        var newLayered = Object.create(GsD3Graph.Layout.Tensor.prototype);
                                        newLayered = (GsD3Graph.Layout.Tensor.apply(newLayered, layoutConfig.args) || newLayered);
                                        return (newLayered);
                                    default:
                                        return null;
                                }
                            }
                        }
                    })();


                    /* layouters */

                    // base class for all layouters
                    // note: all layouter implementation must have a 'layout()' method.
                    GsD3Graph.Layout = function () {
                    };

                    GsD3Graph.Layout.prototype = {
                    };

                    /* matrix layouter */

                    GsD3Graph.Layout.Matrix = function (criteria, distributionMatrix) {
                        GsD3Graph.Layout.call(this);

                        this.data = [];
                        this.criteria = criteria;
                        this.distributionMatrix = distributionMatrix || [];
                        this.matrix = []; // a two dimensional array
                    };

                    GsD3Graph.Layout.Matrix.prototype = new GsD3Graph.Layout();

                    GsD3Graph.Layout.Matrix.prototype.layout = function (data) {
                        this.data = data;
                        this.layoutPrepare();
                        this.layoutCalcBounds();
                    };

                    GsD3Graph.Layout.Matrix.prototype.layoutPrepare = function () {

                        var self = this;

                        function findInDistributionMatrix(val) {
                            var dist = self.distributionMatrix;
                            for (var i in dist) {
                                if (dist[i].indexOf(val) !== -1) {
                                    return i;
                                }
                            }
                            return false;
                        }

                        this.matrix = [];

                        for (var i in this.data.nodes) {

                            var node = this.data.nodes[i];
                            node.layoutPosX = 0;
                            node.layoutPosY = 0;

                            var criteria = node[this.criteria];
                            var index = criteria ? findInDistributionMatrix(criteria) : this.distributionMatrix.length - 1;
                            if (typeof this.matrix[index] === 'undefined') {
                                this.matrix[index] = [];
                            }
                            this.matrix[index][i] = node;
                        }

                        var counterX = 0;
                        for (var x in this.distributionMatrix) {
                            var counterY = 0;
                            for (var y in this.matrix[x]) {
                                var node = this.matrix[x][y];
                                node.layoutPosX = counterX;
                                node.layoutPosY = counterY;
                                counterY++;
                            }
                            counterX++;
                        }
                    };

                    GsD3Graph.Layout.Matrix.prototype.layoutCalcBounds = function () {
                        var minx = 0,
                            maxx = this.distributionMatrix.length - 1,
                            miny = Infinity,
                            maxy = -Infinity;

                        var nodes = this.data.nodes;
                        for (var i in nodes) {
                            var y = nodes[i].layoutPosY;

                            if (y > maxy) maxy = y;
                            if (y < miny) miny = y;
                        }

                        if (miny == maxy) maxy++;

                        this.layoutMinX = minx;
                        this.layoutMaxX = maxx;
                        this.layoutMinY = miny;
                        this.layoutMaxY = maxy;
                    };

                    GsD3Graph.Layout.Matrix.prototype.constructor = GsD3Graph.Layout.Matrix;


                    /* layered layouter */

                    /**
                     * Use the layered layouter to represent a graph with containment relationships with
                     * a tensor (3 dimensional matrix).
                     *
                     * @constructor
                     */
                    GsD3Graph.Layout.Tensor = function () {
                        GsD3Graph.Layout.call(this);

                        this.data = [];
                        this.tensor;
                    };

                    GsD3Graph.Layout.Tensor.prototype = new GsD3Graph.Layout();

                    GsD3Graph.Layout.Tensor.prototype.layout = function (data) {
                        this.data = data;
                        this.layoutPrepare();
                        this.layoutCalcBounds();
                    };

                    GsD3Graph.Layout.Tensor.prototype.layoutPrepare = function () {

                        // TODO
                        // * consider connection relationships in the tensor sorting (for X/Y)
                        // * extract functions to utilities
                        // * pass configuration object to control which level (Z) spans what axis (X/Y)
                        //   implementation details: consider that only 'tier's are laid out vertically, all other levels - horizontally
                        // * implement layoutCalcBounds() and populate a class member

                        // PSEUDO
                        // 1. build a tree from graph according to containment relationships
                        // 2. sort the tree
                        // 3. traverse the tree, determine X,Y,Z values for each node:
                        //      Z will determine the padding as well as the width and height for any level that's not the deepest
                        //      (deepest level has fixed dimensions)
                        //      X,Y will determine the X,Y position in the layout


                        // build a tree from graph according to containment relationships

                        var self = this,
                            forest = getInitialForest(),
                            ei = this.data.edges.length;
//                        console.log('- - - before tree built - - -');
//                        console.log(JSON.stringify(forest, null, 4));

                        // TODO wrap in `while (tree not built)` if necessary. add tests to see what depth this loop can handle
                        while (ei--) {
                            var e = this.data.edges[ei];
                            // sort tree hierarchy
                            var source = $window.GsUtils.findBy(forest, 'id', e.source.id),
                                target = $window.GsUtils.findBy(forest, 'id', e.target.id);
                            if (e.type === 'contained_in') {
                                var removedChild = forest.splice(forest.indexOf(source), 1)[0];
                                target.children.push(removedChild);
                            }
                            // attach dependency references
                            else if (e.type === 'connected_to') {
                                e.directed = true;
                                source.dependencies && source.dependencies.push(target.id) || (source.dependencies = [target.id]);
                            }
                        }

                        var tree = {id: "root", children: forest};
//                        console.log('- - - after tree built - - -')
//                        console.log(JSON.stringify(tree, null, 4));

                        function getInitialForest() {
                            var forest = [],
                                i = self.data.nodes.length;
                            while (i--) {
                                var n = self.data.nodes[i];
                                forest.push({id: n.id, children: []});
                            }
                            return forest;
                        }


                        // traverse the tree to sort it and attach X,Y,Z values for each node
                        // to represent a tensor (3 dimensional matrix)

                        var depth = -1;
                        function walk(node) { // using BFT
                            depth++;
                            // sort the children according to connection relationships
                            node.children.sort(function (a, b) {
                                if (a.id < b.id) return -1;
                                if (a.id > b.id) return 1;
                                return 0;
                            });
                            var i = node.children.length;
                            while (i--) {
                                var child = node.children[i];
                                // attach properties to the original data
                                var d = $window.GsUtils.findBy(self.data.nodes, 'id', child.id);
                                d.layoutPosX = i;
                                d.layoutPosY = 0;
                                d.layoutPosZ = depth;
                                // continue with traversal
                                child.children && child.children.length && walk(child);
                            }
                            depth--;
                            return node;
                        }

                        this.tensor = walk(tree);

//                        console.log('- - - after walking down the tree - - -')
//                        console.log('> tensor:')
//                        console.log(JSON.stringify(this.tensor, null, 4));
//                        console.log('> data.nodes:')
//                        console.log(JSON.stringify(this.data.nodes, null, 4));

                    };

                    GsD3Graph.Layout.Tensor.prototype.layoutCalcBounds = function () {
                        var minx = Infinity,
                            maxx = -Infinity,
                            miny = Infinity,
                            maxy = -Infinity,
                            minz = Infinity,
                            maxz = -Infinity;

                        var nodes = this.data.nodes;
                        for (var i in nodes) {
                            var x = nodes[i].layoutPosX,
                                y = nodes[i].layoutPosY,
                                z = nodes[i].layoutPosZ;

                            if (x > maxx) maxx = x;
                            if (x < minx) minx = x;
                            if (y > maxy) maxy = y;
                            if (y < miny) miny = y;
                            if (z > maxz) maxz = z;
                            if (z < minz) minz = z;
                        }

                        if (miny == maxy) maxy++;

                        this.layoutMinX = minx;
                        this.layoutMaxX = maxx;
                        this.layoutMinY = miny;
                        this.layoutMaxY = maxy;
                        this.layoutMinZ = minz;
                        this.layoutMaxZ = maxz;
                    };

                    GsD3Graph.Layout.Tensor.prototype.constructor = GsD3Graph.Layout.Tensor;


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
                    type: 'layered',
                    args: []
                })
                callInvocation('refresh', [ getMockData() ]);

                function getMockData() {
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
        };
    }]);
