//'use strict';
//
//angular.module('gsUiInfraApp')
//    .factory('Layout', ['Utils', function (Utils, $log) {
//
//        return {
//
//            Topology: {
//
//                Tensor: {
//
//                    // TODO
//                    // * pass configuration object to control which level (Z), or which node type, spans what axis (X/Y)
//                    //   implementation details: consider that each node type might have different direction (horizontal/vertical)
//                    // TODO possibly allow to limit the axis bounds, e.g. X should only span up to 3, and the Y should be used to flow nodes.
//
//                    init: function (config) {
//                        this.config = config || {
//                            /**
//                             * describes how many nodes should be laid out horizontally before
//                             * flowing them to the next row. can be a number, or an array
//                             * correlating to the Z index of each level in ascending order.
//                             */
//                            flowBounds: 2
//                        };
//                        this.constants = {
//                            relationshipTypes: {
//                                connectedTo: 'cloudify.relationships.connected_to',
//                                containedIn: 'cloudify.relationships.contained_in'
//                            }
//                        }
//                        this.initialized = true;
//                        return this;
//                    },
//
//                    layout: function (graph) {
//                        this.initialized || init();
//                        this.graph = graph;
//                        this._layoutPrepare();
//                        this._layoutCalcBounds();
//                        return this;
//                    },
//
//                    _layoutPrepare: function () {
//
//
//                        var self = this,
//                        // build a tree from graph according to containment relationships
//                            tree = this._asTree(this.graph, true, true);
//
//                        // traverse the tree, sort it, attach X,Y,Z values for each node to represent a tensor (3 dimensional matrix).
//                        var sorter = function (a, b) {
//                                // sort the children according to connection relationships
//                                if (a.dependencies && a.dependencies.indexOf(b.id) !== -1) {
//                                    return -1;
//                                }
//                                if (b.dependencies && b.dependencies.indexOf(a.id) !== -1) {
//                                    return 1;
//                                }
//                                return 1;
//                            },
//                            downHandler = function (node, parent, i, depth) {
//                                // initialize span values, increment when traversing up
//                                node.layoutSpanX = 0;
//                                node.layoutSpanY = 0;
//                            },
//                            upHandler = function (node, parent, i, depth) {
//                                // this is a leaf node
//                                if (!node.children || !node.children.length) {
//                                    parent.layoutSpanX++;
//                                } else { // it's a branch node
//                                    // sum spans from child
//                                    parent.layoutSpanX += node.layoutSpanX;
//                                }
//
//                                var n = Utils.findBy(self.graph.nodes, 'id', node.id);
//
//                                // populate span values
//                                n.layoutSpanX = node.layoutSpanX === 0 ? 1 : node.layoutSpanX;
//                                n.layoutSpanY = node.layoutSpanY === 0 ? 1 : node.layoutSpanY;
//
//                                // populate position values (X/Y positioning is relative to each level's parent dimensions)
//                                n.layoutPosX = i + 1;
//                                n.layoutPosY = 1; // TODO calculate according to bounds (get from config)
//                                n.layoutPosZ = depth;
//                            };
//
//                        Utils.walk(tree, sorter, downHandler, upHandler);
//
//                        // TODO how to avoid a second traversal?
//                        // increment x/y position values according to span values
//                        Utils.walk(tree, null, null, function (node, parent, i, depth) {
//                            var temp = 0;
//                            for (var j = 0; j < parent.children.length; j++) {
//                                var n = Utils.findBy(self.graph.nodes, 'id', parent.children[j].id);
//                                if (!n.layoutPosXIncremented) {
//                                    n.layoutPosX += temp;
//                                    n.layoutPosXIncremented = true;
//                                    temp = parent.children[j].layoutSpanX - 1;
//                                }
//                                if (j === parent.children.length - 1) {
//                                    n.last = true;
//                                }
//                                if (j === 0) {
//                                    n.first = true;
//                                }
//                            }
//                        });
//
//
///*
// $log.info(JSON.stringify(this.graph, function (k, v) {
//                            if (k === 'layoutPosY' ||
//                                k === 'layoutPosZ' ||
//                                k === 'layoutPosX' ||
//                                k === 'layoutSpanX' ||
//                                k === 'layoutSpanY' ||
//                                k === 'dependencies' ||
//                                k === 'children' ||
//                                k === 'first' ||
//                                k === 'last' ||
//                                k === 'layoutPosXIncremented' ||
//                                k === 'parent' ||
//                                k === 'spanX' ||
//                                k === 'spanY' ||
//                                k === 'type' ||
//                                k === 'edges') {
//                                return undefined;
//                            }
//                            return v;
//                        }, 2))
//*/
//                    },
//
//                    _layoutCalcBounds: function () {
//
//                        var minx = Infinity,
//                            maxx = -Infinity,
//                            miny = Infinity,
//                            maxy = -Infinity,
//                            minz = Infinity,
//                            maxz = -Infinity;
//
//                        var nodes = this.graph.nodes,
//                            i = nodes.length;
//                        while (i--) {
//                            var x = nodes[i].layoutPosX,
//                                y = nodes[i].layoutPosY,
//                                z = nodes[i].layoutPosZ;
//
//                            if (x > maxx) {
//                                maxx = x;
//                            }
//                            if (x < minx) {
//                                minx = x;
//                            }
//                            if (y > maxy) {
//                                maxy = y;
//                            }
//                            if (y < miny) {
//                                miny = y;
//                            }
//                            if (z > maxz) {
//                                maxz = z;
//                            }
//                            if (z < minz) {
//                                minz = z;
//                            }
//                        }
//
//                        this.layoutMinX = minx;
//                        this.layoutMaxX = maxx;
//                        this.layoutMinY = miny;
//                        this.layoutMaxY = maxy;
//                        this.layoutMinZ = minz;
//                        this.layoutMaxZ = maxz;
//                    },
//
//                    _asTree: function (graph, addRoot, copy) {
//
//                        if ( graph.nodes.length == 0){
//                            $log.info("no nodes, nothing to paint");
//                            return {};
//                        }
//
//                        // TODO find a solution not involving model mutation
//                        if (!Utils.findBy(graph.nodes, 'id', 'root')) {
//                            var roots = this._getRoots(graph),
//                                rIndex = roots.length,
//                                root,
//                                top = {id: 'root', children: roots, parent: null};
//                            // BUG why is order important?
//                            graph.nodes.splice(0, 0, top);
//
//                            while (rIndex--) {
//                                root = roots[rIndex];
//                                graph.edges.push({type: this.constants.relationshipTypes.containedIn, source: root, target: top});
//                            }
//                        }
//
//                        var forest = this._getInitialForest(graph, copy),
//                            ei = graph.edges.length;
//
//                        while (ei--) {
//                            var e = graph.edges[ei],
//                                source = Utils.findBy(graph.nodes, 'id', e.source.id),
//                                target = Utils.findBy(graph.nodes, 'id', e.target.id);
//
//                            // sort tree hierarchy
//                            if (e.type === this.constants.relationshipTypes.containedIn) {
//                                var ch = forest.splice(forest.indexOf(source), 1)[0];
//                                target.children && target.children.push(ch);
//                                ch.parent = target.id;
//                            }
//                            // attach dependency references
//                            else if (e.type === this.constants.relationshipTypes.connectedTo) {
//                                source.dependencies && source.dependencies.indexOf(target.id) === -1 && source.dependencies.push(target.id) || (source.dependencies = [target.id]);
//                            }
//                        }
//
//                        if (addRoot) {
///*
//                            var fi = forest.length,
//                                f;
//                            while (fi--) {
//                                f = forest[fi];
//                                f.parent = 'root';
//                            }
//*/
//                            return {id: 'root', children: forest, parent: null};
//                        }
//                        return forest[0];
//                    },
//
//                    _getInitialForest: function (graph, copy) {
//                        var forest = [],
//                            i = graph.nodes.length;
//                        while (i--) {
//                            var n = graph.nodes[i];
//                            if (copy) {
//                                n.children = [];
//                                n.parent = null;
//                                forest.push(n);
//                            } else {
//                                forest.push({id: n.id, children: [], parent: null});
//                            }
//                        }
//                        return forest;
//                    },
//
//                    _getRoots: function (graph) {
//                        var eIndex,
//                            nIndex = graph.nodes.length,
//                            node,
//                            edge,
//                            isRoot,
//                            roots = [];
//                        while (nIndex--) {
//                            node = graph.nodes[nIndex];
//                            eIndex = graph.edges.length;
//                            isRoot = true;
//                            while (eIndex--) {
//                                edge = graph.edges[eIndex];
//                                if (edge.type === this.constants.relationshipTypes.containedIn &&
//                                    (edge.source === node.id || edge.source === node)) {
//                                    isRoot = false;
//                                    break;
//                                }
//                            }
//                            isRoot && roots.push(node);
//                        }
//                        return roots;
//                    }
//
//                }
//            }
//        };
//    }]);
