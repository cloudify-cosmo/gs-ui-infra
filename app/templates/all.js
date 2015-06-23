angular.module('gsUiInfraApp', ['/gs-ui-infra-templates/multiSelectMenu']);

angular.module("/gs-ui-infra-templates/multiSelectMenu", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("/gs-ui-infra-templates/multiSelectMenu",
    "<div class=\"multiSelectMenu\" data-ng-class=\"isOpen()\" data-ng-click=\"open()\">\n" +
    "    <div class=\"button\">\n" +
    "        <label>\n" +
    "            <t>{{ selectedLabel() }}</t>\n" +
    "            <input type=\"text\" data-ng-model=\"filter\">\n" +
    "            <input value=\"{{ reflection() }}\" class=\"reflection\">\n" +
    "        </label>\n" +
    "    </div>\n" +
    "    <ul>\n" +
    "        <li data-ng-repeat=\"option in options | filter: filter | as: 'filteredItems'\"\n" +
    "            data-ng-click=\"select(option)\"\n" +
    "            data-ng-class=\"navigator(option)\"\n" +
    "            data-ng-mouseover=\"hoverOption(option)\"\n" +
    "            title=\"{{ option.label }}\">\n" +
    "            <input type=\"checkbox\" data-ng-show=\"multiple\" data-ng-checked=\"optionChecked(option)\">\n" +
    "            {{ option.label }}</li>\n" +
    "    </ul>\n" +
    "    <div class=\"msArrow\"></div>\n" +
    "</div>\n" +
    "\n" +
    "");
}]);
