'use strict';

// make new templates module backward compatible. add it is not defined.
try {
    angular.module('gsUiInfraAppTemplates');
} catch (err) {
    /* failed to require */
    angular.module('gsUiInfraAppTemplates',[]);
}

angular.module('gsUiInfraApp', ['gsUiInfraAppTemplates']);
