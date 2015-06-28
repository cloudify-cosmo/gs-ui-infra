angular.module('gsUiInfraAppTemplates', ['/gs-ui-infra-templates/multiSelectMenu']);

angular.module("/gs-ui-infra-templates/multiSelectMenu", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("/gs-ui-infra-templates/multiSelectMenu",
    "<div class=\"multiSelectMenu\" data-ng-class=\"isOpen()\" >\n" +
    "    <span data-ng-click=\"open($event)\">\n" +
    "        <div class=\"button\">\n" +
    "            <label>\n" +
    "                <t>{{ selectedLabel() }}</t>\n" +
    "                <input type=\"text\" class=\"no-click\" data-ng-model=\"filter\" placeholder=\"{{ reflection() }}\">\n" +
    "                <!--<input value=\"{{ reflection() }}\"  class=\"no-click reflection\">-->\n" +
    "            </label>\n" +
    "        </div>\n" +
    "        <div class=\"msArrow\"></div>\n" +
    "    </span>\n" +
    "\n" +
    "\n" +
    "    <ul>\n" +
    "        <li data-ng-repeat=\"option in options | filter: filter | as: 'filteredItems'\"\n" +
    "            data-ng-click=\"select(option)\"\n" +
    "            data-ng-class=\"navigator(option)\"\n" +
    "            data-ng-mouseover=\"hoverOption(option)\"\n" +
    "            title=\"{{ option.label }}\">\n" +
    "            <input type=\"checkbox\" data-ng-show=\"multiple\" data-ng-checked=\"optionChecked(option)\">\n" +
    "            {{ option.label }}\n" +
    "        </li>\n" +
    "    </ul>\n" +
    "</div>\n" +
    "\n" +
    "");
}]);
