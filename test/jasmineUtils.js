/**
 * Created with IntelliJ IDEA.
 * User: eliranm
 * Date: 7/25/13
 * Time: 4:39 PM
 */

(function (conf) {

    _assert(conf, "configuration is missing, please make sure to include jasmineConf.js in karma.conf.js");

    window.jasmineUtils = {

        /**
         * Attach the DOM element to the current runner's document.
         * Used for viewing the rendered test execution while debugging.
         * @param el The component's element - must be a DOM element (i.e. angular.element will not do).
         */
        attachComponent: function (el) {
            conf.render && document.body.appendChild(el);
        },

        detachComponent: function (el) {
            conf.render && document.body.removeChild(el);
        },

        /**
         * Wraps an action on the scope with $apply.
         * @param scope The relevant scope.
         * @param fn The action callback.
         */
        apply: function (scope, fn) {
            _assert(scope, 'scope must be defined to call apply');
            _assert(typeof fn === 'function', 'fn must be of type "function" to call apply');
            scope.$apply(fn);
        },

        /**
         * Sets a property on the passed scope, wrapped in $apply.
         * Use with care and pass the appropriate type, types are assigned as is.
         * @param scope The relevant scope.
         * @param key The property name.
         * @param val The property value.
         */
        set: function (scope, key, val) {
            _assert(scope, 'scope must be defined to call set');
            jasmineUtils.apply(scope, function () {
                scope[key] = val;
            });
        },

        /**
         * Gets a property from the passed scope.
         * @param scope The relevant scope.
         * @param key The property name.
         * @returns {*} The property value.
         */
        get: function (scope, key) {
            _assert(scope, 'scope must be defined to call get');
            return scope[key];
        }

    };

    function _assert(condition, message) {
        if (!condition) {
            throw message || 'Assertion failed';
        }
    }

})(window.jasmineConf);
