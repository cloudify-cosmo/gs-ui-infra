'use strict';

angular.module('gsUiInfra')
    .directive('gsGauge', function () {
        return {
            template: '<div></div>',
            restrict: 'E',
            scope:{
                val:'=',
                sensitivity:'=',
                colors:'='
            },

            link: function(scope, element/*, attrs*/) {

                var validateArray = function(arr, minLength) {
                    return (arr && arr.length >= +minLength) && arr;
                };

                var getPointerRotation = function(angle) {
                    return 'R' + angle + ',41.986123,120';
                };

                var getPathOuterWidth = function(path) {
                    return path.getBBox().width + (path.attr('stroke-width') * 2);
                };

                var getPathOuterHeight = function(path) {
                    return path.getBBox().height + (path.attr('stroke-width') * 2);
                };

                var getAnimationDuration = function() {
                    // TODO
                    // make this a logarithmic increment rather linear
                    // (humans perceive changes logarithmically)

                    // derive a number between 0 and the maximum desired duration, based on the sensitivity value
                    return 1800 * (Math.abs(scope.sensitivity - 20) / 10);
                };

                var _basis,
                    _pointer,
                    _minAngle = -17.4,
                    _maxAngle = 17.1,
                    _pathArr = [],
                    _r = new window.Raphael(element[0], '100%', '100%'),
                    _dialSet = _r.set(),
                    _borderColor = scope.colors && scope.colors.border || '#6098bf',
                    _tickColor = scope.colors && scope.colors.tick || '#467fa6',
                    _bgColors = scope.colors && validateArray(scope.colors.background, 2) || ['#e0f3ff', '#ffffff'],
                    _dialColors = scope.colors && validateArray(scope.colors.dial, 5) || ['#4fc71c', '#dbd100', '#ff9400', '#f0691a', '#f2004d'],
                    _basisColors = scope.colors && validateArray(scope.colors.basis, 2) || ['#588fb3', '#bfe0f5'],
                    _pointerColors = scope.colors && validateArray(scope.colors.pointer, 3) || ['#555555', '#ebebeb', '#aeb0b0'];

                var frameBox =
                    _r.path('M89,11.842c0-1.176-0.691-2.342-2.254-2.342H11.304 C9.738,9.5,8,9.666,8,10.842v38.382c0,1.178,1.738,2.275,3.304,2.275h76.442c1.563,0,1.254-1.098,1.254-2.275V11.842z')
                        .attr({ fill: '90-' + _bgColors[0] + ':44-' + _bgColors[1] + ':100', stroke: _borderColor })
                        .transform('t-7,-9');

                var _tickAttr      = {'fill':'none','stroke':_tickColor,'stroke-width':2,'stroke-linecap':'round','stroke-linejoin':'miter','stroke-miterlimit':10,'stroke-opacity':1,'stroke-dasharray':'none'};
                var _opacityAttr02 = {'opacity':0.2};
                var _opacityAttr04 = {'opacity':0.4};
                var _opacityAttr06 = {'opacity':0.6};
                var _opacityAttr08 = {'opacity':0.8};

                var _tickPath1 = _r.path('M 540.176,545.936 543.453,538.178');
                _pathArr.push(_tickPath1);
                _tickPath1.attr(_opacityAttr02);
                _dialSet.push(_tickPath1);

                var _tickPath2 = _r.path('M 533.174,543.594 535.324,535.451');
                _pathArr.push(_tickPath2);
                _tickPath2.attr(_opacityAttr04);
                _dialSet.push(_tickPath2);

                var _tickPath3 = _r.path('M 525.182,541.938 526.494,533.617');
                _pathArr.push(_tickPath3);
                _tickPath3.attr(_opacityAttr06);
                _dialSet.push(_tickPath3);

                var _tickPath4 = _r.path('M 516.773,540.968 517.404,532.569');
                _pathArr.push(_tickPath4);
                _tickPath4.attr(_opacityAttr08);
                _dialSet.push(_tickPath4);

                var _tickPath5 = _r.path('M 508.8,541 508.8,532');
                _pathArr.push(_tickPath5);
                _dialSet.push(_tickPath5);

                var _tickPath6 = _r.path('M 500.82,540.918 500.252,532.515');
                _pathArr.push(_tickPath6);
                _tickPath6.attr(_opacityAttr08);
                _dialSet.push(_tickPath6);

                var _tickPath7 = _r.path('M 492.541,541.802 491.305,533.471');
                _pathArr.push(_tickPath7);
                _tickPath7.attr(_opacityAttr06);
                _dialSet.push(_tickPath7);

                var _tickPath8 = _r.path('M 484.33,543.441 482.225,535.286');
                _pathArr.push(_tickPath8);
                _tickPath8.attr(_opacityAttr04);
                _dialSet.push(_tickPath8);

                var _tickPath9 = _r.path('M 476.857,545.931 473.557,538.182');
                _pathArr.push(_tickPath9);
                _tickPath9.attr(_opacityAttr02);
                _dialSet.push(_tickPath9);

                _dialSet.attr(_tickAttr);
                _dialSet.transform('t-467,-528');

                var dialPath = _r.path('M8.5,70.846v15.285c24.927-13.563,55.026-13.62,80-0.174  V70.701C63.052,59.34,33.915,59.389,8.5,70.846z');
                dialPath.attr({'fill':'0-' + _dialColors[0] + ':0-' + _dialColors[1] + ':30-' + _dialColors[2] + ':50-' + _dialColors[3] + ':72-' + _dialColors[4] + ':100', 'opacity':0.8,'stroke':'none'});
                dialPath.transform('t-7,-61');

                _basis = _r.path(
                    'm 8,140.713 c 0,0 14.99,-6.041 40.5,-6.041 24.467,0 40.5,6.041 40.5,6.041 v 2.844 c 0,1.178 -1.751,2.156 -3.324,2.156 H 10.758 C 9.186,145.713 8,144.734 8,143.557 v -2.844 z');
                _basis.attr({'fill':'90-' + _basisColors[0] + ':0-' + _basisColors[1] + ':100','stroke':'none'});
                _basis.transform('t-7,-103');

                var complexBg = _r.set();
                complexBg.push(dialPath);
                for (var i in _pathArr) {
                    complexBg.push(_pathArr[i].toFront());
                }
                complexBg.push(frameBox);

                _pointer = _r.path(
                    'm 41.986123,35.362189 c -0.58765,10e-5 -2.486867,-0.48015 -2.486123,-1.06731 l 1.43057,-14.213701 c 7.85e-4,-0.58943 0.479394,-1.06652 1.068828,-1.06576 0.588548,-0.002 1.066514,0.47716 1.064862,1.06615 l 1.410156,14.217361 c 0.001,0.58811 -1.89886,1.06403 -2.488293,1.06326 z');
                _pointer.attr({'fill':'0-' + _pointerColors[1] + ':0-' + _pointerColors[2] + ':95','stroke': _pointerColors[0] ,'stroke-width':0.6,'stroke-linecap':'butt','stroke-linejoin':'miter','stroke-miterlimit':10,'stroke-opacity':1,'stroke-dasharray':'none'});

                // set initial position for the needle
                _pointer.transform(getPointerRotation(_minAngle));

                // adjust for container size
                _r.setViewBox(0, 0, getPathOuterWidth(frameBox), getPathOuterHeight(frameBox), true);
                _r.setSize('100%', _r.canvas.clientWidth / (getPathOuterWidth(frameBox) / getPathOuterHeight(frameBox)));

                // tie animation on value change
                scope.$watch('val', function(percent){
                    if (percent > 100 || percent < 0) {
                        return;
                    }
                    var angle = (percent * (_maxAngle - _minAngle) / 100) + _minAngle;
                    _pointer.animate({'transform': getPointerRotation(angle)}, getAnimationDuration());
                });

            }
        };


    });
