'use strict';

angular.module('gsUiInfraApp')
  .directive('gsPieChart', function () {
        // return our directive description object
        // that will create the directive
    return {
      template: '<div></div>',
      restrict: 'EA',
        require: 'ngModel',
        scope:{
            'ngModel':'=',
            'onClick':'&'
        },
      link: function postLink(scope, element, attrs/*, ctrl*/) {
          // get any cistomization on the attributes
          // that we're interested in
          var w = attrs.width || 250,
              h= attrs.height || 250,
              r = attrs.radius || 120,
              ir = attrs.innerRadius || 90;

          // define our d3 components
          var color = d3.scale.category20();
          var arc = d3.svg.arc().outerRadius(r).innerRadius(ir);
          var pie = d3.layout.pie().sort(null);
          var svg = d3.select(element[0])
                  .append('svg')
                  .attr('width',w)
                  .attr('height',h)
                  .append('g')
                  .attr('transform','translate(' + w/2 +','+h/2 +')');

          svg.on('mousedown',function(d){ scope.$apply(function(){
              (scope.onClick || angular.noop )(scope.ngModel, d);
            });
          });

          var _current;
          function arcTween( a ){
              var i = d3.interpolate(_current,a);
              _current =i(0);
              return function(t){
                  return arc(i(t));
              };
          }


          scope.$watch( 'ngModel',function(d){



              if ( !d) { return; }


              var paths = svg.selectAll('path').data(pie(d));


              paths
                  .enter().append('path')
                  .attr('d', arc)
                  .attr('fill', function (d, i) {
                      return color(i);
                  })
                  .style('stroke', 'white')
                  .each(function (d) {
                      _current = d;
                  });

              paths.exit().remove();


              // tween the old path and the new path
              paths.transition().attrTween('d', arcTween);
          });
      }
    };
  });
