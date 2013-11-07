'use strict';

angular.module('gsUiInfra')
    .factory('Render', ['Utils', '$rootScope', function (Utils, $rootScope) {

        return {

            Topology: {

                D3: {

                    init: function (el, layouter, events) {

                        this.el = el;
                        this.layouter = layouter;
                        this.events = events;

                        this.vis = d3.select(this.el).append('svg:svg');

                        /** graph data structure */
                        this.graph = { nodes: [], edges: [] };

                        // handles for static selections
                        this.nodesGroup = this.vis.append('g').attr('class', 'nodes');
                        this.edgesGroup = this.vis.append('g').attr('class', 'edges').selectAll('g.edge');
                        this.defsGroup = this.vis.append('svg:defs');

                        this.lineFunction = d3.svg.line()
                            .x(function (d) {
                                return d.x;
                            })
                            .y(function (d) {
                                return d.y;
                            })
                            .interpolate('linear');

                        this.scaleX = d3.scale.linear();
                        this.scaleY = d3.scale.linear();
                        this.scaleW = d3.scale.linear();
                        this.scaleH = d3.scale.linear();

                        this.constants = {
                            headingHeight: 33,
                            circleRadius: 18,
                            actionIconWidth: 36,
                            actionIconHeight: 28
                        };

                        this.types = {
                            'cloudify.types.tier': { classname: 'tier', icon: 'k'},
                            'cloudify.types.host': { classname: 'host', icon: 'e'},
                            'cloudify.types.volume': { classname: 'volume', icon: 'j'},
                            'cloudify.types.object_container': { classname: 'object-container', icon: 'o'},
                            'cloudify.types.network': { classname: 'network', icon: 'g'},
                            'cloudify.types.load_balancer': { classname: 'load-balancer', icon: 'b'},
                            'cloudify.types.virtual_ip': { classname: 'virtual-ip', icon: 'd'},
                            'cloudify.types.security_group': { classname: 'security-group', icon: 'i'},
                            'cloudify.types.middleware_server': { classname: 'middleware-server', icon: 'h'},
                            'cloudify.types.db_server': { classname: 'db-server', icon: 'c'},
                            'cloudify.types.web_server': { classname: 'web-server', icon: 'l'},
                            'cloudify.types.app_server': { classname: 'app-server', icon: 'h'},
                            'cloudify.types.message_bus_server': { classname: 'message-bus-server', icon: 'f'},
                            'cloudify.types.app_module': { classname: 'app-module', icon: 'a'}
                        };

                        this.actions = [
                            'common' // default actions for all nodes (can't use 'default'...)
                        ];

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
                        this._layout();
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

                        if (!newData) {
                            console.log("render: nothing to paint");
                            return;
                        }
                        if (newData === this.graph) {
                            return;
                        }

                        this.graph = newData || this.graph;

                        // apply layout
                        this._layout();

                        // trigger rendering a tree-like dom structure by recursion traversal
                        var tree = this.layouter._asTree(this.graph, false, true);
//                        console.log(JSON.stringify(tree, null, 2))
                        this._update(tree);

                    },

                    clear: function () {
                        this.refresh({ nodes: [], edges: [] });
                    },

                    _layout: function () {
                        if (!this.graph.nodes.length || !this.graph.edges.length) {
                            return;
                        }
                        if (this.layouter) {
                            this._prepareLayout();
                        }
                    },

                    _prepareLayout: function () {

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

/*
                        this.scaleX
                            .domain([this.layouter.layoutMinX, this.layouter.layoutMaxX + 1])
                            .range([0, this.vis.attr('width')]);
                        this.scaleW
                            .domain([this.layouter.layoutMinX - 1, this.layouter.layoutMaxX])
                            .range([0, this.vis.attr('width')]);
*/


                        // TODO extract the following code to the new rendering function (_addNode)
                        // TODO abstract away data structure implementation (getRoot(), getChildren(node), etc.)

                        // use this data to paint
                        var strokeWidth = 2,
                            pad = [47, 30, 30, 30],
                            visParent = {
                                width: self.vis.attr('width'),
                                height: self.vis.attr('height')
                            };

                        pad.forEach(function (v, i) {
                            pad[i] = v + strokeWidth * 2;
                        });


                        // TODO replace with walking in the tree?

                        this.graph.nodes.forEach(function (v/*, i*/) {

                            // update the nodes position data according to the layouter data

                            var parent = Utils.findBy(self.graph.nodes, 'id', v.parent);
                            if (!parent) { // this must be the fake root node, set its parent to the canvas
                                parent = visParent;
                                parent.layoutSpanX = v.layoutSpanX;
                                parent.layoutSpanY = v.layoutSpanY;
                                parent.children = [v];
                            }


                            var padTop = self._shouldPadTop(v) && pad[0] + 14 || pad[0];
//                                segmentX = parent.width / parent.layoutSpanX,
//                                segmentY = parent.height / parent.layoutSpanY;
//                            v.x = segmentX * (v.layoutPosX - 1) + pad[1] + pad[3] + self.constants.circleRadius;
//                            v.y = segmentY * (v.layoutPosY - 1) + padTop;
//                            v.width = segmentX * v.layoutSpanX - pad[1] - pad[3];
//                            v.height = segmentY * v.layoutSpanY - padTop - pad[2];


                            // using scales to calculate absolute values
//                            self.scaleX.domain([1, parent.layoutSpanX + 1]).range([40, parent.width - 20]);
//                            self.scaleW.domain([0, parent.layoutSpanX]).range([40, parent.width - 40 * parent.children.length - 40]);

                            self.scaleX
                                .domain([1, parent.layoutSpanX + 1])
                                .range([pad[3], parent.width]);
                            self.scaleY
                                .domain([1, parent.layoutSpanY + 1])
                                .range([padTop, parent.height]);
                            self.scaleW
                                .domain([0, parent.layoutSpanX])
                                .range([0, parent.width - pad[1]]);
                            self.scaleH
                                .domain([0, parent.layoutSpanY])
                                .range([0, parent.height - pad[2]]);

                            var x = ~~self.scaleX(v.layoutPosX),
                                y = ~~self.scaleY(v.layoutPosY),
                                width = ~~self.scaleW(v.layoutSpanX) - pad[1],
                                height = ~~self.scaleH(v.layoutSpanY) - pad[2],
                                appModuleHeight = self.constants.circleRadius * 2 + 32;

                            // set node properties
                            v.x = x;
                            v.y = y;
                            v.width = width;
                            v.height = height;

                            // special node types
                            if (self._isAppModuleNode(v)) { // deepest level, the only node type with absolute dimensions
                                v.x = x + width / 2;
                                v.width = self.constants.circleRadius * 2;
                                v.height = appModuleHeight;
                            }
                            else if (self._isRootNode(v)) { // root level does not need any padding
                                v.width = parent.width;
                                v.height = parent.height;
                                v.x = 0;
                                v.y = 0;
                            } else if (!self._isNetworkNode(v)) {
                                var z = (self.layouter.layoutMaxZ - v.layoutPosZ),
                                    verticalMargin = z === 1 ? 68 : 85; // TODO make pretty code!
//                                v.height = v.layoutSpanY * (appHeight + padBottom)  * z + padTop;
                                v.height = appModuleHeight + verticalMargin * z;
                            }


                            // set nodes actions according to node types
                            v.actions = self._getNodeActions(v);
                        });

                    },

                    _getFirstKnownType: function (d) {
                        if (!d.type) {
                            return;
                        }
                        var type, i;
                        for (i = 0; i < d.type.length; i++) {
                            if ((type = this.types[d.type[i]]) !== undefined) {
                                return type;
                            }
                        }
                        return '';
                    },

                    _shouldPadTop: function (d) {
                        return d.layoutPosZ === this.layouter.layoutMaxZ - 1;
                    },

                    _isAppModuleNode: function (d) {
                        return this._isNodeOfType(d, 'cloudify.types.app_module');
                    },

                    _isNetworkNode: function (d) {
                        return this._isNodeOfType(d, 'cloudify.types.network');
                    },

                    _isNodeOfType: function (d, type) {
                        if (!d.type) {
                            return false;
                        }
                        return d.type.indexOf(type) !== -1;
                    },

                    _isRootNode: function (d) {
                        return d.id === 'root';
                    },

                    _getNodeActions: function (d) {
                        if (this._isRootNode(d)) {
                            return [];
                        }

                        var type = 'common', // always return the default actions, as it's the only set for now
                            actions = this._actionsByType(type, d);

                        return actions;
                    },

                    _actionsByType: function (type, d) {
                        switch (type) {
                            case 'common':
                                return [
                                    {
                                        type: 'details',
                                        glyph: 'n',
                                        datum: d
                                    },
                                    {
                                        type: 'edit',
                                        glyph: 'm',
                                        datum: d,
                                        last: true
                                    }
                                ];
                            default:
                                return [];
                        }
                    },

                    _getNodeActionTypes: function () {
                        return this.actions;
                    },

                    // pass a reference to self as this method will run under d3 context (function owner is not the D3 object)
                    _addNode: function (selection, depth, self) {

                        var nodeGroup = self._createNodeGroup(selection, self);
                        self._createOuterContainer(nodeGroup, self);
                        self._createHeadingBox(nodeGroup, self);
                        self._createHeadingText(nodeGroup, self);
                        self._createStatusGroup(nodeGroup, self);
                        self._createNodeEdges(nodeGroup, self);

                        var actionIconsGroup = self._createActionIcons(nodeGroup, self);

                        self._tieEventListeners(nodeGroup, actionIconsGroup, self);

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


                    _createNodeGroup: function (selection, self) {

                        var nodeGroup = selection.selectAll('g.node')
                            .data(function (d) {
                                return d.children;
                            })
                            .enter()
                            .append('svg:g');
                        // apply classname by type
                        nodeGroup.attr('class', function (d) {
                            var classname = 'node';
                            if (self._isRootNode(d)) {
                                classname += ' root';
                            }
                            if (self._getFirstKnownType(d)) {
                                classname += ' ' + self._getFirstKnownType(d).classname;
                            }
                            return classname;
                        });
                        // positioning
                        nodeGroup.attr('transform', function (d) {
                            return 'translate(' + (d.x) + ',' + d.y + ')';
                        });

                        return nodeGroup;
                    },

                    _createOuterContainer: function (nodeGroup, self) {
                        var container = nodeGroup.append('svg:rect')
                            .attr('class', 'container')
                            .attr('x', function (d) {
                                return 0;
                            })
                            .attr('y', 0)
                            .attr('width', function (d) {
                                if (self._isAppModuleNode(d)) {
                                    return 0;
                                }
                                return d.width;
                            })
                            .attr('height', function (d) {
                                if (self._isAppModuleNode(d)) {
                                    return 0;
                                }
                                return d.height;
                            })
                            .attr('rx', 6)
                            .attr('ry', 6);
                    },

                    _createHeadingBox: function (nodeGroup, self) {
                        nodeGroup.append('svg:rect')
                            .attr('class', 'heading')
                            .attr('x', 3)
                            .attr('y', 3)
                            .attr('width', function (d) {
                                if (self._isAppModuleNode(d) || self._isRootNode(d)) {
                                    return 0;
                                }
                                return d.width - 6;
                            })
                            .attr('height', function (d) {
                                if (self._isAppModuleNode(d) || self._isRootNode(d)) {
                                    return 0;
                                }
                                return self.constants.headingHeight;
                            });
                    },

                    _createHeadingText: function (nodeGroup, self) {
                        nodeGroup.append('svg:text')
                            .attr('class', 'node-label')
                            .text(function (d) {
                                return d.name || '';
                            })
                            .attr('x', function (d) {
                                if (self._isAppModuleNode(d)) {
                                    return d.width / 2 - self.constants.circleRadius;
                                }
                                return 28;
                            })
                            .attr('y', function (d) {
                                if (self._isAppModuleNode(d)) {
                                    return 60;
                                }
                                return 26;
                            })
                            .attr('text-anchor', function (d) {
                                if (self._isAppModuleNode(d)) {
                                    return 'middle';
                                }
                                return 'start';
                            });
                    },

                    _createStatusGroup: function (nodeGroup, self) {

                        var nodeStatusGroup = nodeGroup.append('svg:g')
                            .attr('class', 'status')
                            .attr('transform', 'translate(-' + self.constants.circleRadius + ',0)');
                        // status icon circle
                        nodeStatusGroup.append('svg:circle')
                            .attr('class', 'status-circle')
                            .attr('cx', function (d) {
                                if (self._isAppModuleNode(d)) {
                                    return d.width / 2;
                                }
                                return self.constants.circleRadius;
                            })
                            .attr('cy', self.constants.circleRadius + 1)
                            .attr('r', self.constants.circleRadius);
                        // glyph icon
                        nodeStatusGroup.append('svg:text')
                            .attr('class', 'status-glyph topology-glyph')
                            .text(function (d) {
                                return self._getFirstKnownType(d) ? self._getFirstKnownType(d).icon : '';
                            })
                            .attr('x', function (d) {
                                if (self._isAppModuleNode(d)) {
                                    return d.width / 2;
                                }
                                return self.constants.circleRadius;
                            })
                            .attr('y', 29)
                            .attr('text-anchor', 'middle');
                    },

                    _createActionIcons: function (nodeGroup, self) {

                        // clip paths used for group
                        this.defsGroup
                            .selectAll('#actionsClip')
                            .data(function () {
                                return self._getNodeActionTypes();
                            })
                            .enter()
                            .append('svg:clipPath')
                            .attr('id', 'actionsClip')
                            .append('svg:rect')
                            .datum(function (d) {
                                return self._actionsByType(d);
                            })
                            .attr('width', function (d) {
                                return d.length * self.constants.actionIconWidth + 2;
                            })
                            .attr('height', self.constants.actionIconHeight + 2)
                            .attr('rx', self.constants.actionIconHeight / 2 + 1)
                            .attr('ry', self.constants.actionIconHeight / 2 + 1);

                        // actions toolbox
                        var actionIconsGroup = nodeGroup
                            .append('svg:g')
                            .attr('class', 'actions')
                            .attr('clip-path', 'url(#actionsClip)')
                            .attr('transform', function (d) {
                                if (self._isAppModuleNode(d)) {
                                    return 'translate(' + (d.width - 32) + ',-12)';
                                }
                                return 'translate(' + (d.width - d.actions.length * self.constants.actionIconWidth - 2) + ',-8)';
                            })
                            .classed('hidden', 1);
                        actionIconsGroup
                            .append('svg:rect')
                            .attr('x', 1)
                            .attr('y', 1)
                            .attr('width', function (d) {
                                return d.actions.length * self.constants.actionIconWidth;
                            })
                            .attr('height', self.constants.actionIconHeight)
                            .attr('rx', self.constants.actionIconHeight / 2)
                            .attr('ry', self.constants.actionIconHeight / 2);
                        actionIconsGroup
                            .selectAll('rect.dummy')
                            .data(function (d) {
                                return d.actions;
                            })
                            .enter()
                            .append('svg:rect')
                            .attr('class', 'dummy translucent')
                            .attr('x', function (d, i) {
                                return i * self.constants.actionIconWidth;
                            })
                            .attr('y', 0)
                            .attr('width', self.constants.actionIconWidth)
                            .attr('height', self.constants.actionIconHeight);
                        actionIconsGroup
                            .selectAll('text')
                            .data(function (d) {
                                return d.actions;
                            })
                            .enter()
                            .append('svg:text')
                            .text(function (d) {
                                return d.glyph;
                            })
                            .attr('class', 'action-glyph topology-glyph')
                            .attr('x', function (d, i) {
                                return (i + 0.5) * self.constants.actionIconWidth;
                            })
                            .attr('y', 23)
                            .attr('text-anchor', 'middle');
                        actionIconsGroup
                            .selectAll('path')
                            .data(function (d) {
                                var arr = [],
                                    actionsIndex = d.actions.length,
                                    item;
                                while (actionsIndex--) {
                                    item = d.actions[actionsIndex];
                                    if (!item.last) {
                                        arr.unshift(item);
                                    }
                                }
                                return arr;
                            })
                            .enter()
                            .append('svg:path')
                            .attr('d', function (d, i) {
                                var x = (i + 1) * self.constants.actionIconWidth;
                                return 'M' + x + ' 0L' + x + ' ' + (self.constants.actionIconHeight);
                            })
                            .attr('class', 'separator');
                        return actionIconsGroup;
                    },

                    _createNodeEdges: function (nodeGroup, self) {
                        nodeGroup.each(function (datum) {

                            var edgeGroup = self.edgesGroup
                                .data(function () {
                                    if (!datum) {
                                        return [];
                                    }
                                    var arr = [], dep, j;
                                    if (dep = datum.dependencies) {
                                        j = dep.length;
                                        while (j--) {
                                            arr.push({
                                                source: datum,
                                                target: Utils.findBy(self.graph.nodes, 'id', dep[j])
                                            });
                                        }
                                    }
                                    return arr;
                                })
                                .enter()
                                .append('svg:g')
                                .attr('class', 'edge')


                            edgeGroup
                                .append('svg:path')
                                .attr('d', function (d) {
                                    return self._renderPath(d.source, d.target, self.lineFunction);
                                });

                        });
                    },

                    /**
                     * tie default event listeners to the node's elements
                     */
                    _tieEventListeners: function (nodeGroup, actionIconsGroup, self) {

                        self._tieDefaultEventListeners(nodeGroup, actionIconsGroup);
                        self._tieCustomEventListeners(nodeGroup, actionIconsGroup, self);
                    },

                    _tieDefaultEventListeners: function (nodeGroup, actionIconsGroup) {
                        // show actions toolbox on node hover
                        nodeGroup.selectAll('*').on('mouseover', function (d) {
                            actionIconsGroup.classed('hidden', function (datum) {
                                return d !== datum;
                            });
                        });
                        nodeGroup.selectAll('*').on('mouseout', function () {
                            actionIconsGroup.classed('hidden', 1);
                        });
                    },

                    _tieCustomEventListeners: function (nodeGroup, actionIconsGroup, self) {

                        var eventType, listener;
                        for (eventType in self.events) {
                            listener = self.events[eventType];
                            switch (eventType) {
                                case 'actionClick':
                                    // tie click listeners to action buttons
                                    actionIconsGroup.selectAll('text')
                                        .style('pointer-events', 'none'); // pass clicks through action glyph elements to the capturer below
                                    actionIconsGroup.selectAll('rect')
                                        .on('click', null) // clear any previously assigned listeners
                                        .on('click', function (d) {
                                            // TODO document self.events
                                            listener && listener({
                                                node: d.datum,
                                                type: d.type
                                            });
                                            $rootScope.$apply();
                                        });
                                    break;
                                default:
                                    break;
                            }
                        }
                    },

                    /**
                     * Get absolute position for a node, pass only the first argument for usage,
                     * second is used for recursion.
                     * The node object will be modified to hold new properties for the absolute position,
                     * namely <code>absX</code> and <code>absY</code>.
                     *
                     * @param n The node to set absolute position values for.
                     * @private
                     */
                    _nodeAbsolutePosition: function (n, parent) {
                        parent || (parent = n);
                        if (n.absPosSet || n.absX === undefined || n.absY === undefined) {
                            n.absX = 0;
                            n.absY = 0;
                            n.absPosSet = false;
                        }
                        n.absX += parent.x;
                        n.absY += parent.y;
                        parent.parent && this._nodeAbsolutePosition(n, Utils.findBy(this.graph.nodes, 'id', parent.parent));
                        n.absPosSet = true;
                    },

                    /**
                     * calculations of coordinates for edges in the graph.
                     * this code was ported from graffle and adapted to our needs
                     */
                    _calcBezierCoords: function (n1, n2) {

                        this._nodeAbsolutePosition(n1);
                        this._nodeAbsolutePosition(n2);
                        var n1AbsPos = {x: n1.absX, y: n1.absY},
                            n2AbsPos = {x: n2.absX, y: n2.absY},
                            cR = this.constants.circleRadius;

                        /* coordinates for potential connection coordinates from/to the objects */
                        var p = [
                            /* NORTH 1 */    {x: n1AbsPos.x + n1.width / 2, y: n1AbsPos.y},
                            /* SOUTH 1 */    {x: n1AbsPos.x + n1.width / 2, y: n1AbsPos.y + n1.height},
                            /* WEST  1 */    {x: n1AbsPos.x, y: n1AbsPos.y + n1.height / 2},
                            /* EAST  1 */    {x: n1AbsPos.x + n1.width, y: n1AbsPos.y + n1.height / 2},
                            /* NORTH 2 */    {x: n2AbsPos.x + n2.width / 2, y: n2AbsPos.y},
                            /* SOUTH 2 */    {x: n2AbsPos.x + n2.width / 2, y: n2AbsPos.y + n2.height},
                            /* WEST  2 */    {x: n2AbsPos.x - 2, y: n2AbsPos.y + n2.height / 2},
                            /* EAST  2 */    {x: n2AbsPos.x + n2.width, y: n2AbsPos.y + n2.height / 2}
                        ];

                        if (this._isAppModuleNode(n1)) {
                            p[0] = {x: n1AbsPos.x + n1.width / 2 - cR, y: n1AbsPos.y + 2};
                            p[1].x = n1AbsPos.x + n1.width / 2 - cR;
                            p[2] = {x: n1AbsPos.x - cR, y: n1AbsPos.y + cR};
                            p[3] = {x: n1AbsPos.x + n1.width - cR - 2, y: n1AbsPos.y + cR};
                        }
                        if (this._isAppModuleNode(n2)) {
                            p[4].x = n2AbsPos.x + n2.width / 2 - cR;
                            p[5].x = n2AbsPos.x + n2.width / 2 - cR;
                            p[6] = {x: n2AbsPos.x - cR - 2, y: n2AbsPos.y + cR};
                            p[7] = {x: n2AbsPos.x + n2.width - cR - 2, y: n2AbsPos.y + cR};
                        }

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
                                    d[dis[dis.length - 1].toFixed(3)] = [/*i, j*/ 3, 6];
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

                    _renderPath: function (n1, n2, lineRenderer) {

                        var coords = this._calcBezierCoords(n1, n2),
                            x1 = coords.x1,
                            y1 = coords.y1,
                            x2 = coords.x2.toFixed(3),
                            y2 = coords.y2.toFixed(3),
//                            x3 = coords.x3.toFixed(3),
//                            y3 = coords.y3.toFixed(3),
                            x3 = coords.x4 - 20,
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

                        return path;
                    }

                }
            }
        }
    }])
;
