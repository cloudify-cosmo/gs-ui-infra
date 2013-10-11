'use strict';

angular.module('gsUiInfra')
    .service('Layout', ['$window', function Layout($window) {
        // AngularJS will instantiate a singleton by calling "new" on this function
        return {

            Tensor: {

                layout: function (model, rendererData) {
                    this.tree = model;
                    this.graph = rendererData;
                    this.layoutPrepare();
                    this.layoutCalcBounds();
                },

                layoutPrepare: function () {

                    // TODO
                    // * consider connection relationships in the tensor sorting (for X/Y)
                    // * extract functions to utilities (services)
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
                        tree;
                    // struct is a tree
                    if (this.graph.children) {
                        tree = this.graph;
                    }
                    // it's a graph
                    else {
                        // build a tree from graph according to containment relationships
                        tree = this._toTree(this.graph);
                    }

                    // traverse the tree, sort it, attach X,Y,Z values for each node
                    // to represent a tensor (3 dimensional matrix).
                    // build a graph for the renderer

                    var depth = -1;

                    function walk(node) {
                        depth++;
                        // sort the children according to connection relationships
                        node.children.sort(function (a, b) {
                            if (a.dependencies && a.dependencies.indexOf(b.id) !== -1) {
                                return -1;
                            }
                            if (b.dependencies && b.dependencies.indexOf(a.id) !== -1) {
                                return 1;
                            }
                            return 0;
                        });
                        var i = node.children.length;
                        while (i--) {
                            var child = node.children[i];
                            // attach properties to the original graph

                            var n;
                            if (self.graph.children) {
                                n = child;
                            } else {
                                n = $window.GsUtils.findBy(self.graph.nodes, 'id', child.id);
                            }
                            n.layoutPosX = i;
                            n.layoutPosY = 0;
                            n.layoutPosZ = depth;

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
//                        console.log('> graph.nodes:')
//                        console.log(JSON.stringify(this.graph.nodes, null, 4));

                },

                layoutCalcBounds: function () {

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

                    if (miny == maxy) maxy++;

                    this.layoutMinX = minx;
                    this.layoutMaxX = maxx;
                    this.layoutMinY = miny;
                    this.layoutMaxY = maxy;
                    this.layoutMinZ = minz;
                    this.layoutMaxZ = maxz;
                },

                _toTree: function () {

                    var self = this,
                        forest = getInitialForest(),
                        ei = this.graph.edges.length;
//                        console.log('- - - before tree built - - -');
//                        console.log(JSON.stringify(forest, null, 4));

                    // TODO wrap in `while (tree not built)` if necessary. add tests to see what depth this loop can handle
                    while (ei--) {
                        var e = this.graph.edges[ei];
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
    }]);
