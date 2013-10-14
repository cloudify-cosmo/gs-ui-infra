'use strict';

angular.module('gsUiInfra')
    .factory('Layout', ['Utils', function (Utils) {

        return {

            Topology: {

                Tensor: {

                    // TODO possibly allow to limit the axis bounds, e.g. X should only span up to 3, and the Y should be used to flow nodes.

                    // TODO mock for the order argument, should come from outside
                    order: {

                    },

                    layout: function (graph, order) {
                        this.graph = graph;
                        this._layoutPrepare();
                        this._layoutCalcBounds();
                    },

                    _layoutPrepare: function () {

                        // TODO
                        // * consider connection relationships in the tensor sorting (for X/Y)
                        // * pass configuration object to control which level (Z), or which node type, spans what axis (X/Y)
                        //   implementation details: consider that each node type might have different direction (horizontal/vertical)

                        // PSEUDO
                        // 1. build a tree from graph according to containment relationships
                        // 2. sort the tree
                        // 3. traverse the tree, determine X,Y,Z values for each node:
                        //      Z will determine the padding as well as the width and height for any level that's not the deepest
                        //      (deepest level has fixed dimensions)
                        //      X,Y will determine the X,Y position in the layout

                        var self = this,
                            tree = this._asTree(this.graph);

                        // traverse the tree, sort it, attach X,Y,Z values for each node
                        // to represent a tensor (3 dimensional matrix).
                        // update the graph for the renderer

                        var sorter = function (a, b) {
                                // sort the children according to connection relationships
                                if (a.dependencies && a.dependencies.indexOf(b.id) !== -1) {
                                    return -1;
                                }
                                if (b.dependencies && b.dependencies.indexOf(a.id) !== -1) {
                                    return 1;
                                }
                                return 0;
                            },
                            action = function (child, i, depth) {
                                // attach properties to the original graph
                                var n;
                                n = Utils.findBy(self.graph.nodes, 'id', child.id);
                                n.layoutPosX = i;
                                n.layoutPosY = 0;
                                n.layoutPosZ = depth;
                            };


                        Utils.walk(tree, sorter, action);

                    },

                    _layoutCalcBounds: function () {

                        var minx = Infinity,
                            maxx = -Infinity,
                            miny = Infinity,
                            maxy = -Infinity,
                            minz = Infinity,
                            maxz = -Infinity;

                        var nodes = this.graph.nodes;
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

                        this.layoutMinX = minx;
                        this.layoutMaxX = maxx;
                        this.layoutMinY = miny;
                        this.layoutMaxY = maxy;
                        this.layoutMinZ = minz;
                        this.layoutMaxZ = maxz;
                    },

                    _asTree: function () {

                        var self = this,
                            forest = getInitialForest(),
                            ei = this.graph.edges.length;

                        // TODO wrap in `while (tree not built)` if necessary. add tests to see what depth this loop can handle
                        while (ei--) {
                            var e = this.graph.edges[ei];
                            // sort tree hierarchy
                            var source = Utils.findBy(forest, 'id', e.source.id),
                                target = Utils.findBy(forest, 'id', e.target.id);
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

                        function getInitialForest() {
                            var forest = [],
                                i = self.graph.nodes.length;
                            while (i--) {
                                var n = self.graph.nodes[i];
                                forest.push({id: n.id, children: []});
                            }
                            return forest;
                        }

                        return tree;
                    }

                }
            }
        }
    }]);
