'use strict';

angular.module('gsUiInfra')
    .factory('Layout', ['Utils', function (Utils) {

        return {

            Topology: {

                Tensor: {

                    // TODO
                    // * pass configuration object to control which level (Z), or which node type, spans what axis (X/Y)
                    //   implementation details: consider that each node type might have different direction (horizontal/vertical)
                    // TODO possibly allow to limit the axis bounds, e.g. X should only span up to 3, and the Y should be used to flow nodes.

                    init: function (config) {
                        this.config = config || {
                            xyPositioning: 'relative'
                        };
                        this.initialized = true;
                        return this;
                    },

                    layout: function (graph) {
                        this.initialized || init();
                        this.graph = graph;
                        this._layoutPrepare();
                        this._layoutCalcBounds();
                        return this;
                    },

                    _layoutPrepare: function () {


                        var self = this,
                        // build a tree from graph according to containment relationships
                            tree = this._asTree(this.graph);

                        // traverse the tree, sort it, attach X,Y,Z values for each node to represent a tensor (3 dimensional matrix).
                        var sorter = function (a, b) {
                                // sort the children according to connection relationships
                                if (a.dependencies && a.dependencies.indexOf(b.id) !== -1) {
                                    return -1;
                                }
                                if (b.dependencies && b.dependencies.indexOf(a.id) !== -1) {
                                    return 1;
                                }
                                return 1;
                            },
                            downHandler = function (node, parent, i, depth) {
                                node.spanX = 0;
                                node.spanY = 0;
                            },
                            upHandler = function (node, parent, i, depth) {
                                // this is a leaf node
                                if (!node.children || !node.children.length) {
                                    parent.spanX++;
                                } else { // it's a branch node
                                    // sum spans from child
                                    parent.spanX += node.spanX;
                                }

                                // attach properties to the original graph nodes
                                var n = Utils.findBy(self.graph.nodes, 'id', node.id);
                                if (self.config.xyPositioning === 'relative') {
                                    n.layoutPosX = i + 1;
                                    n.layoutPosY = 1; // TODO calculate according to bounds (get from config)
                                } else if (self.config.xyPositioning === 'absolute') {
                                    // TODO
                                }
                                n.layoutPosZ = depth;
                                // initialize span values, increment when traversing up
                                n.layoutSpanX = node.spanX === 0 ? 1 : node.spanX;
                                n.layoutSpanY = node.spanY === 0 ? 1 : node.spanY;
                            };

                        Utils.walk(tree, sorter, downHandler, upHandler);


/*
                        console.log(JSON.stringify(this.graph, function (k, v) {
                            if (k === 'layoutPosY' ||
                                k === 'layoutPosZ' ||
                                k === 'layoutSpanY' ||
//                                k === 'id' ||
                                k === 'type' ||
                                k === 'edges') {
                                return undefined;
                            }
                            return v;
                        }, 2))
*/
                    },

                    _layoutCalcBounds: function () {

                        var minx = Infinity,
                            maxx = -Infinity,
                            miny = Infinity,
                            maxy = -Infinity,
                            minz = Infinity,
                            maxz = -Infinity;

                        var nodes = this.graph.nodes,
                            i = nodes.length;
                        while (i--) {
                            var x = nodes[i].layoutPosX,
                                y = nodes[i].layoutPosY,
                                z = nodes[i].layoutPosZ;

                            if (x > maxx) {
                                maxx = x;
                            }
                            if (x < minx) {
                                minx = x;
                            }
                            if (y > maxy) {
                                maxy = y;
                            }
                            if (y < miny) {
                                miny = y;
                            }
                            if (z > maxz) {
                                maxz = z;
                            }
                            if (z < minz) {
                                minz = z;
                            }
                        }

                        this.layoutMinX = minx;
                        this.layoutMaxX = maxx;
                        this.layoutMinY = miny;
                        this.layoutMaxY = maxy;
                        this.layoutMinZ = minz;
                        this.layoutMaxZ = maxz;
                    },

                    _asTree: function (graph, copy) {

                        var getInitialForest = function () {
                                var forest = [],
                                    i = graph.nodes.length;
                                while (i--) {
                                    var n = graph.nodes[i];
                                    if (copy) {
                                        n.children = [];
                                        n.parent = null;
                                        forest.push(n);
                                    } else {
                                        forest.push({id: n.id, children: [], parent: null});
                                    }
                                }
                                return forest;
                            },
                            forest = getInitialForest(),
                            ei = graph.edges.length;

                        // TODO wrap in `while (tree not built)` if necessary. add tests to see what depth this loop can handle
                        while (ei--) {
                            var e = graph.edges[ei],
                                source = Utils.findBy(forest, 'id', e.source.id),
                                target = Utils.findBy(forest, 'id', e.target.id);

                            // sort tree hierarchy
                            if (e.type === 'contained_in') {
                                /*target.children &&*/
                                var ch = forest.splice(forest.indexOf(source), 1)[0];
                                target.children.push(ch);
                                ch.parent = target.id;
                            }
                            // attach dependency references
                            else if (e.type === 'connected_to') {
                                e.directed = true;
                                source.dependencies && source.dependencies.push(target.id) || (source.dependencies = [target.id]);
                            }
                        }

                        return {id: 'root', children: forest};
                    }

                }
            }
        };
    }]);
