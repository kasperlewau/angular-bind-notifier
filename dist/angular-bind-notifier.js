(function() {
    "use strict";
    angular.module("angular-bind-notifier", []);
})();

(function() {
    "use strict";
    function bindNotifierDirective() {
        return {
            restrict: "A",
            scope: true,
            compile: function(element, attributes) {
                var expr = JSON.parse(attributes.bindNotifier.replace(/'/g, '"')), keys = Object.keys(expr), len = keys.length;
                return function link(scope) {
                    function handler(key, newVal, oldVal) {
                        if (newVal !== oldVal) {
                            scope.$broadcast("$$rebind::" + key, newVal, oldVal, scope);
                        }
                    }
                    keys.forEach(function(key) {
                        scope.$watch(expr[key], handler.bind(null, key), typeof scope[expr[key]] === "object");
                    });
                };
            }
        };
    }
    angular.module("angular-bind-notifier").directive("bindNotifier", bindNotifierDirective);
})();

(function() {
    "use strict";
    function dynamicWatcher(expr, notifiers) {
        function wrap(watchDelegate, scope, listener, objectEquality, parsedExpression) {
            var delegateCall = watchDelegate.bind(this, scope, listener, objectEquality, parsedExpression);
            notifiers.forEach(function(n) {
                scope.$on("$$rebind::" + n, delegateCall);
            });
            delegateCall();
        }
        return wrap.bind(this, expr.$$watchDelegate);
    }
    function $parseDecorator($delegate, bindNotifierRegex) {
        function wrap(parse, exp, interceptor) {
            var match, expression, rawExpression, notifiers;
            if (typeof exp === "string" && bindNotifierRegex.test(exp)) {
                match = exp.split(":").filter(function(v) {
                    return !!v;
                });
                notifiers = match.slice(0, -1);
                rawExpression = match[match.length - 1];
                expression = parse.call(this, "::" + rawExpression, interceptor);
                expression.$$watchDelegate = dynamicWatcher(expression, notifiers);
                return expression;
            } else {
                var args = [ exp, interceptor ];
                if (!interceptor) {
                    args.pop();
                }
                return parse.apply(this, args);
            }
        }
        return wrap.bind(null, $delegate);
    }
    $parseDecorator.$inject = [ "$delegate", "bindNotifierRegex" ];
    angular.module("angular-bind-notifier").constant("bindNotifierRegex", /^:([a-zA-Z0-9][\w-]*):(.+)$/).config(function($provide) {
        $provide.decorator("$parse", $parseDecorator);
    });
})();