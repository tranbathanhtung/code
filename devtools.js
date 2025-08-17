(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.DevTools = {}));
})(this, (function (exports) { 'use strict';

  var backend = {exports: {}};

  var react = {exports: {}};

  var react_production = {};

  /**
   * @license React
   * react.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */

  var hasRequiredReact_production;

  function requireReact_production () {
  	if (hasRequiredReact_production) return react_production;
  	hasRequiredReact_production = 1;
  	var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
  	  REACT_PORTAL_TYPE = Symbol.for("react.portal"),
  	  REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"),
  	  REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"),
  	  REACT_PROFILER_TYPE = Symbol.for("react.profiler"),
  	  REACT_CONSUMER_TYPE = Symbol.for("react.consumer"),
  	  REACT_CONTEXT_TYPE = Symbol.for("react.context"),
  	  REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"),
  	  REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"),
  	  REACT_MEMO_TYPE = Symbol.for("react.memo"),
  	  REACT_LAZY_TYPE = Symbol.for("react.lazy"),
  	  MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
  	function getIteratorFn(maybeIterable) {
  	  if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
  	  maybeIterable =
  	    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
  	    maybeIterable["@@iterator"];
  	  return "function" === typeof maybeIterable ? maybeIterable : null;
  	}
  	var ReactNoopUpdateQueue = {
  	    isMounted: function () {
  	      return false;
  	    },
  	    enqueueForceUpdate: function () {},
  	    enqueueReplaceState: function () {},
  	    enqueueSetState: function () {}
  	  },
  	  assign = Object.assign,
  	  emptyObject = {};
  	function Component(props, context, updater) {
  	  this.props = props;
  	  this.context = context;
  	  this.refs = emptyObject;
  	  this.updater = updater || ReactNoopUpdateQueue;
  	}
  	Component.prototype.isReactComponent = {};
  	Component.prototype.setState = function (partialState, callback) {
  	  if (
  	    "object" !== typeof partialState &&
  	    "function" !== typeof partialState &&
  	    null != partialState
  	  )
  	    throw Error(
  	      "takes an object of state variables to update or a function which returns an object of state variables."
  	    );
  	  this.updater.enqueueSetState(this, partialState, callback, "setState");
  	};
  	Component.prototype.forceUpdate = function (callback) {
  	  this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
  	};
  	function ComponentDummy() {}
  	ComponentDummy.prototype = Component.prototype;
  	function PureComponent(props, context, updater) {
  	  this.props = props;
  	  this.context = context;
  	  this.refs = emptyObject;
  	  this.updater = updater || ReactNoopUpdateQueue;
  	}
  	var pureComponentPrototype = (PureComponent.prototype = new ComponentDummy());
  	pureComponentPrototype.constructor = PureComponent;
  	assign(pureComponentPrototype, Component.prototype);
  	pureComponentPrototype.isPureReactComponent = true;
  	var isArrayImpl = Array.isArray,
  	  ReactSharedInternals = { H: null, A: null, T: null, S: null },
  	  hasOwnProperty = Object.prototype.hasOwnProperty;
  	function ReactElement(type, key, self, source, owner, props) {
  	  self = props.ref;
  	  return {
  	    $$typeof: REACT_ELEMENT_TYPE,
  	    type: type,
  	    key: key,
  	    ref: void 0 !== self ? self : null,
  	    props: props
  	  };
  	}
  	function cloneAndReplaceKey(oldElement, newKey) {
  	  return ReactElement(
  	    oldElement.type,
  	    newKey,
  	    void 0,
  	    void 0,
  	    void 0,
  	    oldElement.props
  	  );
  	}
  	function isValidElement(object) {
  	  return (
  	    "object" === typeof object &&
  	    null !== object &&
  	    object.$$typeof === REACT_ELEMENT_TYPE
  	  );
  	}
  	function escape(key) {
  	  var escaperLookup = { "=": "=0", ":": "=2" };
  	  return (
  	    "$" +
  	    key.replace(/[=:]/g, function (match) {
  	      return escaperLookup[match];
  	    })
  	  );
  	}
  	var userProvidedKeyEscapeRegex = /\/+/g;
  	function getElementKey(element, index) {
  	  return "object" === typeof element && null !== element && null != element.key
  	    ? escape("" + element.key)
  	    : index.toString(36);
  	}
  	function noop$1() {}
  	function resolveThenable(thenable) {
  	  switch (thenable.status) {
  	    case "fulfilled":
  	      return thenable.value;
  	    case "rejected":
  	      throw thenable.reason;
  	    default:
  	      switch (
  	        ("string" === typeof thenable.status
  	          ? thenable.then(noop$1, noop$1)
  	          : ((thenable.status = "pending"),
  	            thenable.then(
  	              function (fulfilledValue) {
  	                "pending" === thenable.status &&
  	                  ((thenable.status = "fulfilled"),
  	                  (thenable.value = fulfilledValue));
  	              },
  	              function (error) {
  	                "pending" === thenable.status &&
  	                  ((thenable.status = "rejected"), (thenable.reason = error));
  	              }
  	            )),
  	        thenable.status)
  	      ) {
  	        case "fulfilled":
  	          return thenable.value;
  	        case "rejected":
  	          throw thenable.reason;
  	      }
  	  }
  	  throw thenable;
  	}
  	function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
  	  var type = typeof children;
  	  if ("undefined" === type || "boolean" === type) children = null;
  	  var invokeCallback = false;
  	  if (null === children) invokeCallback = true;
  	  else
  	    switch (type) {
  	      case "bigint":
  	      case "string":
  	      case "number":
  	        invokeCallback = true;
  	        break;
  	      case "object":
  	        switch (children.$$typeof) {
  	          case REACT_ELEMENT_TYPE:
  	          case REACT_PORTAL_TYPE:
  	            invokeCallback = true;
  	            break;
  	          case REACT_LAZY_TYPE:
  	            return (
  	              (invokeCallback = children._init),
  	              mapIntoArray(
  	                invokeCallback(children._payload),
  	                array,
  	                escapedPrefix,
  	                nameSoFar,
  	                callback
  	              )
  	            );
  	        }
  	    }
  	  if (invokeCallback)
  	    return (
  	      (callback = callback(children)),
  	      (invokeCallback =
  	        "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar),
  	      isArrayImpl(callback)
  	        ? ((escapedPrefix = ""),
  	          null != invokeCallback &&
  	            (escapedPrefix =
  	              invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"),
  	          mapIntoArray(callback, array, escapedPrefix, "", function (c) {
  	            return c;
  	          }))
  	        : null != callback &&
  	          (isValidElement(callback) &&
  	            (callback = cloneAndReplaceKey(
  	              callback,
  	              escapedPrefix +
  	                (null == callback.key ||
  	                (children && children.key === callback.key)
  	                  ? ""
  	                  : ("" + callback.key).replace(
  	                      userProvidedKeyEscapeRegex,
  	                      "$&/"
  	                    ) + "/") +
  	                invokeCallback
  	            )),
  	          array.push(callback)),
  	      1
  	    );
  	  invokeCallback = 0;
  	  var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
  	  if (isArrayImpl(children))
  	    for (var i = 0; i < children.length; i++)
  	      (nameSoFar = children[i]),
  	        (type = nextNamePrefix + getElementKey(nameSoFar, i)),
  	        (invokeCallback += mapIntoArray(
  	          nameSoFar,
  	          array,
  	          escapedPrefix,
  	          type,
  	          callback
  	        ));
  	  else if (((i = getIteratorFn(children)), "function" === typeof i))
  	    for (
  	      children = i.call(children), i = 0;
  	      !(nameSoFar = children.next()).done;

  	    )
  	      (nameSoFar = nameSoFar.value),
  	        (type = nextNamePrefix + getElementKey(nameSoFar, i++)),
  	        (invokeCallback += mapIntoArray(
  	          nameSoFar,
  	          array,
  	          escapedPrefix,
  	          type,
  	          callback
  	        ));
  	  else if ("object" === type) {
  	    if ("function" === typeof children.then)
  	      return mapIntoArray(
  	        resolveThenable(children),
  	        array,
  	        escapedPrefix,
  	        nameSoFar,
  	        callback
  	      );
  	    array = String(children);
  	    throw Error(
  	      "Objects are not valid as a React child (found: " +
  	        ("[object Object]" === array
  	          ? "object with keys {" + Object.keys(children).join(", ") + "}"
  	          : array) +
  	        "). If you meant to render a collection of children, use an array instead."
  	    );
  	  }
  	  return invokeCallback;
  	}
  	function mapChildren(children, func, context) {
  	  if (null == children) return children;
  	  var result = [],
  	    count = 0;
  	  mapIntoArray(children, result, "", "", function (child) {
  	    return func.call(context, child, count++);
  	  });
  	  return result;
  	}
  	function lazyInitializer(payload) {
  	  if (-1 === payload._status) {
  	    var ctor = payload._result;
  	    ctor = ctor();
  	    ctor.then(
  	      function (moduleObject) {
  	        if (0 === payload._status || -1 === payload._status)
  	          (payload._status = 1), (payload._result = moduleObject);
  	      },
  	      function (error) {
  	        if (0 === payload._status || -1 === payload._status)
  	          (payload._status = 2), (payload._result = error);
  	      }
  	    );
  	    -1 === payload._status && ((payload._status = 0), (payload._result = ctor));
  	  }
  	  if (1 === payload._status) return payload._result.default;
  	  throw payload._result;
  	}
  	var reportGlobalError =
  	  "function" === typeof reportError
  	    ? reportError
  	    : function (error) {
  	        if (
  	          "object" === typeof window &&
  	          "function" === typeof window.ErrorEvent
  	        ) {
  	          var event = new window.ErrorEvent("error", {
  	            bubbles: true,
  	            cancelable: true,
  	            message:
  	              "object" === typeof error &&
  	              null !== error &&
  	              "string" === typeof error.message
  	                ? String(error.message)
  	                : String(error),
  	            error: error
  	          });
  	          if (!window.dispatchEvent(event)) return;
  	        } else if (
  	          "object" === typeof process &&
  	          "function" === typeof process.emit
  	        ) {
  	          process.emit("uncaughtException", error);
  	          return;
  	        }
  	        console.error(error);
  	      };
  	function noop() {}
  	react_production.Children = {
  	  map: mapChildren,
  	  forEach: function (children, forEachFunc, forEachContext) {
  	    mapChildren(
  	      children,
  	      function () {
  	        forEachFunc.apply(this, arguments);
  	      },
  	      forEachContext
  	    );
  	  },
  	  count: function (children) {
  	    var n = 0;
  	    mapChildren(children, function () {
  	      n++;
  	    });
  	    return n;
  	  },
  	  toArray: function (children) {
  	    return (
  	      mapChildren(children, function (child) {
  	        return child;
  	      }) || []
  	    );
  	  },
  	  only: function (children) {
  	    if (!isValidElement(children))
  	      throw Error(
  	        "React.Children.only expected to receive a single React element child."
  	      );
  	    return children;
  	  }
  	};
  	react_production.Component = Component;
  	react_production.Fragment = REACT_FRAGMENT_TYPE;
  	react_production.Profiler = REACT_PROFILER_TYPE;
  	react_production.PureComponent = PureComponent;
  	react_production.StrictMode = REACT_STRICT_MODE_TYPE;
  	react_production.Suspense = REACT_SUSPENSE_TYPE;
  	react_production.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE =
  	  ReactSharedInternals;
  	react_production.act = function () {
  	  throw Error("act(...) is not supported in production builds of React.");
  	};
  	react_production.cache = function (fn) {
  	  return function () {
  	    return fn.apply(null, arguments);
  	  };
  	};
  	react_production.cloneElement = function (element, config, children) {
  	  if (null === element || void 0 === element)
  	    throw Error(
  	      "The argument must be a React element, but you passed " + element + "."
  	    );
  	  var props = assign({}, element.props),
  	    key = element.key,
  	    owner = void 0;
  	  if (null != config)
  	    for (propName in (void 0 !== config.ref && (owner = void 0),
  	    void 0 !== config.key && (key = "" + config.key),
  	    config))
  	      !hasOwnProperty.call(config, propName) ||
  	        "key" === propName ||
  	        "__self" === propName ||
  	        "__source" === propName ||
  	        ("ref" === propName && void 0 === config.ref) ||
  	        (props[propName] = config[propName]);
  	  var propName = arguments.length - 2;
  	  if (1 === propName) props.children = children;
  	  else if (1 < propName) {
  	    for (var childArray = Array(propName), i = 0; i < propName; i++)
  	      childArray[i] = arguments[i + 2];
  	    props.children = childArray;
  	  }
  	  return ReactElement(element.type, key, void 0, void 0, owner, props);
  	};
  	react_production.createContext = function (defaultValue) {
  	  defaultValue = {
  	    $$typeof: REACT_CONTEXT_TYPE,
  	    _currentValue: defaultValue,
  	    _currentValue2: defaultValue,
  	    _threadCount: 0,
  	    Provider: null,
  	    Consumer: null
  	  };
  	  defaultValue.Provider = defaultValue;
  	  defaultValue.Consumer = {
  	    $$typeof: REACT_CONSUMER_TYPE,
  	    _context: defaultValue
  	  };
  	  return defaultValue;
  	};
  	react_production.createElement = function (type, config, children) {
  	  var propName,
  	    props = {},
  	    key = null;
  	  if (null != config)
  	    for (propName in (void 0 !== config.key && (key = "" + config.key), config))
  	      hasOwnProperty.call(config, propName) &&
  	        "key" !== propName &&
  	        "__self" !== propName &&
  	        "__source" !== propName &&
  	        (props[propName] = config[propName]);
  	  var childrenLength = arguments.length - 2;
  	  if (1 === childrenLength) props.children = children;
  	  else if (1 < childrenLength) {
  	    for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++)
  	      childArray[i] = arguments[i + 2];
  	    props.children = childArray;
  	  }
  	  if (type && type.defaultProps)
  	    for (propName in ((childrenLength = type.defaultProps), childrenLength))
  	      void 0 === props[propName] &&
  	        (props[propName] = childrenLength[propName]);
  	  return ReactElement(type, key, void 0, void 0, null, props);
  	};
  	react_production.createRef = function () {
  	  return { current: null };
  	};
  	react_production.forwardRef = function (render) {
  	  return { $$typeof: REACT_FORWARD_REF_TYPE, render: render };
  	};
  	react_production.isValidElement = isValidElement;
  	react_production.lazy = function (ctor) {
  	  return {
  	    $$typeof: REACT_LAZY_TYPE,
  	    _payload: { _status: -1, _result: ctor },
  	    _init: lazyInitializer
  	  };
  	};
  	react_production.memo = function (type, compare) {
  	  return {
  	    $$typeof: REACT_MEMO_TYPE,
  	    type: type,
  	    compare: void 0 === compare ? null : compare
  	  };
  	};
  	react_production.startTransition = function (scope) {
  	  var prevTransition = ReactSharedInternals.T,
  	    currentTransition = {};
  	  ReactSharedInternals.T = currentTransition;
  	  try {
  	    var returnValue = scope(),
  	      onStartTransitionFinish = ReactSharedInternals.S;
  	    null !== onStartTransitionFinish &&
  	      onStartTransitionFinish(currentTransition, returnValue);
  	    "object" === typeof returnValue &&
  	      null !== returnValue &&
  	      "function" === typeof returnValue.then &&
  	      returnValue.then(noop, reportGlobalError);
  	  } catch (error) {
  	    reportGlobalError(error);
  	  } finally {
  	    ReactSharedInternals.T = prevTransition;
  	  }
  	};
  	react_production.unstable_useCacheRefresh = function () {
  	  return ReactSharedInternals.H.useCacheRefresh();
  	};
  	react_production.use = function (usable) {
  	  return ReactSharedInternals.H.use(usable);
  	};
  	react_production.useActionState = function (action, initialState, permalink) {
  	  return ReactSharedInternals.H.useActionState(action, initialState, permalink);
  	};
  	react_production.useCallback = function (callback, deps) {
  	  return ReactSharedInternals.H.useCallback(callback, deps);
  	};
  	react_production.useContext = function (Context) {
  	  return ReactSharedInternals.H.useContext(Context);
  	};
  	react_production.useDebugValue = function () {};
  	react_production.useDeferredValue = function (value, initialValue) {
  	  return ReactSharedInternals.H.useDeferredValue(value, initialValue);
  	};
  	react_production.useEffect = function (create, deps) {
  	  return ReactSharedInternals.H.useEffect(create, deps);
  	};
  	react_production.useId = function () {
  	  return ReactSharedInternals.H.useId();
  	};
  	react_production.useImperativeHandle = function (ref, create, deps) {
  	  return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
  	};
  	react_production.useInsertionEffect = function (create, deps) {
  	  return ReactSharedInternals.H.useInsertionEffect(create, deps);
  	};
  	react_production.useLayoutEffect = function (create, deps) {
  	  return ReactSharedInternals.H.useLayoutEffect(create, deps);
  	};
  	react_production.useMemo = function (create, deps) {
  	  return ReactSharedInternals.H.useMemo(create, deps);
  	};
  	react_production.useOptimistic = function (passthrough, reducer) {
  	  return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
  	};
  	react_production.useReducer = function (reducer, initialArg, init) {
  	  return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
  	};
  	react_production.useRef = function (initialValue) {
  	  return ReactSharedInternals.H.useRef(initialValue);
  	};
  	react_production.useState = function (initialState) {
  	  return ReactSharedInternals.H.useState(initialState);
  	};
  	react_production.useSyncExternalStore = function (
  	  subscribe,
  	  getSnapshot,
  	  getServerSnapshot
  	) {
  	  return ReactSharedInternals.H.useSyncExternalStore(
  	    subscribe,
  	    getSnapshot,
  	    getServerSnapshot
  	  );
  	};
  	react_production.useTransition = function () {
  	  return ReactSharedInternals.H.useTransition();
  	};
  	react_production.version = "19.0.0";
  	return react_production;
  }

  var react_development = {exports: {}};

  /**
   * @license React
   * react.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */
  react_development.exports;

  var hasRequiredReact_development;

  function requireReact_development () {
  	if (hasRequiredReact_development) return react_development.exports;
  	hasRequiredReact_development = 1;
  	(function (module, exports) {
  		"production" !== process.env.NODE_ENV &&
  		  (function () {
  		    function defineDeprecationWarning(methodName, info) {
  		      Object.defineProperty(Component.prototype, methodName, {
  		        get: function () {
  		          console.warn(
  		            "%s(...) is deprecated in plain JavaScript React classes. %s",
  		            info[0],
  		            info[1]
  		          );
  		        }
  		      });
  		    }
  		    function getIteratorFn(maybeIterable) {
  		      if (null === maybeIterable || "object" !== typeof maybeIterable)
  		        return null;
  		      maybeIterable =
  		        (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
  		        maybeIterable["@@iterator"];
  		      return "function" === typeof maybeIterable ? maybeIterable : null;
  		    }
  		    function warnNoop(publicInstance, callerName) {
  		      publicInstance =
  		        ((publicInstance = publicInstance.constructor) &&
  		          (publicInstance.displayName || publicInstance.name)) ||
  		        "ReactClass";
  		      var warningKey = publicInstance + "." + callerName;
  		      didWarnStateUpdateForUnmountedComponent[warningKey] ||
  		        (console.error(
  		          "Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.",
  		          callerName,
  		          publicInstance
  		        ),
  		        (didWarnStateUpdateForUnmountedComponent[warningKey] = true));
  		    }
  		    function Component(props, context, updater) {
  		      this.props = props;
  		      this.context = context;
  		      this.refs = emptyObject;
  		      this.updater = updater || ReactNoopUpdateQueue;
  		    }
  		    function ComponentDummy() {}
  		    function PureComponent(props, context, updater) {
  		      this.props = props;
  		      this.context = context;
  		      this.refs = emptyObject;
  		      this.updater = updater || ReactNoopUpdateQueue;
  		    }
  		    function testStringCoercion(value) {
  		      return "" + value;
  		    }
  		    function checkKeyStringCoercion(value) {
  		      try {
  		        testStringCoercion(value);
  		        var JSCompiler_inline_result = !1;
  		      } catch (e) {
  		        JSCompiler_inline_result = true;
  		      }
  		      if (JSCompiler_inline_result) {
  		        JSCompiler_inline_result = console;
  		        var JSCompiler_temp_const = JSCompiler_inline_result.error;
  		        var JSCompiler_inline_result$jscomp$0 =
  		          ("function" === typeof Symbol &&
  		            Symbol.toStringTag &&
  		            value[Symbol.toStringTag]) ||
  		          value.constructor.name ||
  		          "Object";
  		        JSCompiler_temp_const.call(
  		          JSCompiler_inline_result,
  		          "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
  		          JSCompiler_inline_result$jscomp$0
  		        );
  		        return testStringCoercion(value);
  		      }
  		    }
  		    function getComponentNameFromType(type) {
  		      if (null == type) return null;
  		      if ("function" === typeof type)
  		        return type.$$typeof === REACT_CLIENT_REFERENCE$2
  		          ? null
  		          : type.displayName || type.name || null;
  		      if ("string" === typeof type) return type;
  		      switch (type) {
  		        case REACT_FRAGMENT_TYPE:
  		          return "Fragment";
  		        case REACT_PORTAL_TYPE:
  		          return "Portal";
  		        case REACT_PROFILER_TYPE:
  		          return "Profiler";
  		        case REACT_STRICT_MODE_TYPE:
  		          return "StrictMode";
  		        case REACT_SUSPENSE_TYPE:
  		          return "Suspense";
  		        case REACT_SUSPENSE_LIST_TYPE:
  		          return "SuspenseList";
  		      }
  		      if ("object" === typeof type)
  		        switch (
  		          ("number" === typeof type.tag &&
  		            console.error(
  		              "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
  		            ),
  		          type.$$typeof)
  		        ) {
  		          case REACT_CONTEXT_TYPE:
  		            return (type.displayName || "Context") + ".Provider";
  		          case REACT_CONSUMER_TYPE:
  		            return (type._context.displayName || "Context") + ".Consumer";
  		          case REACT_FORWARD_REF_TYPE:
  		            var innerType = type.render;
  		            type = type.displayName;
  		            type ||
  		              ((type = innerType.displayName || innerType.name || ""),
  		              (type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef"));
  		            return type;
  		          case REACT_MEMO_TYPE:
  		            return (
  		              (innerType = type.displayName || null),
  		              null !== innerType
  		                ? innerType
  		                : getComponentNameFromType(type.type) || "Memo"
  		            );
  		          case REACT_LAZY_TYPE:
  		            innerType = type._payload;
  		            type = type._init;
  		            try {
  		              return getComponentNameFromType(type(innerType));
  		            } catch (x) {}
  		        }
  		      return null;
  		    }
  		    function isValidElementType(type) {
  		      return "string" === typeof type ||
  		        "function" === typeof type ||
  		        type === REACT_FRAGMENT_TYPE ||
  		        type === REACT_PROFILER_TYPE ||
  		        type === REACT_STRICT_MODE_TYPE ||
  		        type === REACT_SUSPENSE_TYPE ||
  		        type === REACT_SUSPENSE_LIST_TYPE ||
  		        type === REACT_OFFSCREEN_TYPE ||
  		        ("object" === typeof type &&
  		          null !== type &&
  		          (type.$$typeof === REACT_LAZY_TYPE ||
  		            type.$$typeof === REACT_MEMO_TYPE ||
  		            type.$$typeof === REACT_CONTEXT_TYPE ||
  		            type.$$typeof === REACT_CONSUMER_TYPE ||
  		            type.$$typeof === REACT_FORWARD_REF_TYPE ||
  		            type.$$typeof === REACT_CLIENT_REFERENCE$1 ||
  		            void 0 !== type.getModuleId))
  		        ? true
  		        : false;
  		    }
  		    function disabledLog() {}
  		    function disableLogs() {
  		      if (0 === disabledDepth) {
  		        prevLog = console.log;
  		        prevInfo = console.info;
  		        prevWarn = console.warn;
  		        prevError = console.error;
  		        prevGroup = console.group;
  		        prevGroupCollapsed = console.groupCollapsed;
  		        prevGroupEnd = console.groupEnd;
  		        var props = {
  		          configurable: true,
  		          enumerable: true,
  		          value: disabledLog,
  		          writable: true
  		        };
  		        Object.defineProperties(console, {
  		          info: props,
  		          log: props,
  		          warn: props,
  		          error: props,
  		          group: props,
  		          groupCollapsed: props,
  		          groupEnd: props
  		        });
  		      }
  		      disabledDepth++;
  		    }
  		    function reenableLogs() {
  		      disabledDepth--;
  		      if (0 === disabledDepth) {
  		        var props = { configurable: true, enumerable: true, writable: true };
  		        Object.defineProperties(console, {
  		          log: assign({}, props, { value: prevLog }),
  		          info: assign({}, props, { value: prevInfo }),
  		          warn: assign({}, props, { value: prevWarn }),
  		          error: assign({}, props, { value: prevError }),
  		          group: assign({}, props, { value: prevGroup }),
  		          groupCollapsed: assign({}, props, { value: prevGroupCollapsed }),
  		          groupEnd: assign({}, props, { value: prevGroupEnd })
  		        });
  		      }
  		      0 > disabledDepth &&
  		        console.error(
  		          "disabledDepth fell below zero. This is a bug in React. Please file an issue."
  		        );
  		    }
  		    function describeBuiltInComponentFrame(name) {
  		      if (void 0 === prefix)
  		        try {
  		          throw Error();
  		        } catch (x) {
  		          var match = x.stack.trim().match(/\n( *(at )?)/);
  		          prefix = (match && match[1]) || "";
  		          suffix =
  		            -1 < x.stack.indexOf("\n    at")
  		              ? " (<anonymous>)"
  		              : -1 < x.stack.indexOf("@")
  		                ? "@unknown:0:0"
  		                : "";
  		        }
  		      return "\n" + prefix + name + suffix;
  		    }
  		    function describeNativeComponentFrame(fn, construct) {
  		      if (!fn || reentry) return "";
  		      var frame = componentFrameCache.get(fn);
  		      if (void 0 !== frame) return frame;
  		      reentry = true;
  		      frame = Error.prepareStackTrace;
  		      Error.prepareStackTrace = void 0;
  		      var previousDispatcher = null;
  		      previousDispatcher = ReactSharedInternals.H;
  		      ReactSharedInternals.H = null;
  		      disableLogs();
  		      try {
  		        var RunInRootFrame = {
  		          DetermineComponentFrameRoot: function () {
  		            try {
  		              if (construct) {
  		                var Fake = function () {
  		                  throw Error();
  		                };
  		                Object.defineProperty(Fake.prototype, "props", {
  		                  set: function () {
  		                    throw Error();
  		                  }
  		                });
  		                if ("object" === typeof Reflect && Reflect.construct) {
  		                  try {
  		                    Reflect.construct(Fake, []);
  		                  } catch (x) {
  		                    var control = x;
  		                  }
  		                  Reflect.construct(fn, [], Fake);
  		                } else {
  		                  try {
  		                    Fake.call();
  		                  } catch (x$0) {
  		                    control = x$0;
  		                  }
  		                  fn.call(Fake.prototype);
  		                }
  		              } else {
  		                try {
  		                  throw Error();
  		                } catch (x$1) {
  		                  control = x$1;
  		                }
  		                (Fake = fn()) &&
  		                  "function" === typeof Fake.catch &&
  		                  Fake.catch(function () {});
  		              }
  		            } catch (sample) {
  		              if (sample && control && "string" === typeof sample.stack)
  		                return [sample.stack, control.stack];
  		            }
  		            return [null, null];
  		          }
  		        };
  		        RunInRootFrame.DetermineComponentFrameRoot.displayName =
  		          "DetermineComponentFrameRoot";
  		        var namePropDescriptor = Object.getOwnPropertyDescriptor(
  		          RunInRootFrame.DetermineComponentFrameRoot,
  		          "name"
  		        );
  		        namePropDescriptor &&
  		          namePropDescriptor.configurable &&
  		          Object.defineProperty(
  		            RunInRootFrame.DetermineComponentFrameRoot,
  		            "name",
  		            { value: "DetermineComponentFrameRoot" }
  		          );
  		        var _RunInRootFrame$Deter =
  		            RunInRootFrame.DetermineComponentFrameRoot(),
  		          sampleStack = _RunInRootFrame$Deter[0],
  		          controlStack = _RunInRootFrame$Deter[1];
  		        if (sampleStack && controlStack) {
  		          var sampleLines = sampleStack.split("\n"),
  		            controlLines = controlStack.split("\n");
  		          for (
  		            _RunInRootFrame$Deter = namePropDescriptor = 0;
  		            namePropDescriptor < sampleLines.length &&
  		            !sampleLines[namePropDescriptor].includes(
  		              "DetermineComponentFrameRoot"
  		            );

  		          )
  		            namePropDescriptor++;
  		          for (
  		            ;
  		            _RunInRootFrame$Deter < controlLines.length &&
  		            !controlLines[_RunInRootFrame$Deter].includes(
  		              "DetermineComponentFrameRoot"
  		            );

  		          )
  		            _RunInRootFrame$Deter++;
  		          if (
  		            namePropDescriptor === sampleLines.length ||
  		            _RunInRootFrame$Deter === controlLines.length
  		          )
  		            for (
  		              namePropDescriptor = sampleLines.length - 1,
  		                _RunInRootFrame$Deter = controlLines.length - 1;
  		              1 <= namePropDescriptor &&
  		              0 <= _RunInRootFrame$Deter &&
  		              sampleLines[namePropDescriptor] !==
  		                controlLines[_RunInRootFrame$Deter];

  		            )
  		              _RunInRootFrame$Deter--;
  		          for (
  		            ;
  		            1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter;
  		            namePropDescriptor--, _RunInRootFrame$Deter--
  		          )
  		            if (
  		              sampleLines[namePropDescriptor] !==
  		              controlLines[_RunInRootFrame$Deter]
  		            ) {
  		              if (1 !== namePropDescriptor || 1 !== _RunInRootFrame$Deter) {
  		                do
  		                  if (
  		                    (namePropDescriptor--,
  		                    _RunInRootFrame$Deter--,
  		                    0 > _RunInRootFrame$Deter ||
  		                      sampleLines[namePropDescriptor] !==
  		                        controlLines[_RunInRootFrame$Deter])
  		                  ) {
  		                    var _frame =
  		                      "\n" +
  		                      sampleLines[namePropDescriptor].replace(
  		                        " at new ",
  		                        " at "
  		                      );
  		                    fn.displayName &&
  		                      _frame.includes("<anonymous>") &&
  		                      (_frame = _frame.replace("<anonymous>", fn.displayName));
  		                    "function" === typeof fn &&
  		                      componentFrameCache.set(fn, _frame);
  		                    return _frame;
  		                  }
  		                while (1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter);
  		              }
  		              break;
  		            }
  		        }
  		      } finally {
  		        (reentry = false),
  		          (ReactSharedInternals.H = previousDispatcher),
  		          reenableLogs(),
  		          (Error.prepareStackTrace = frame);
  		      }
  		      sampleLines = (sampleLines = fn ? fn.displayName || fn.name : "")
  		        ? describeBuiltInComponentFrame(sampleLines)
  		        : "";
  		      "function" === typeof fn && componentFrameCache.set(fn, sampleLines);
  		      return sampleLines;
  		    }
  		    function describeUnknownElementTypeFrameInDEV(type) {
  		      if (null == type) return "";
  		      if ("function" === typeof type) {
  		        var prototype = type.prototype;
  		        return describeNativeComponentFrame(
  		          type,
  		          !(!prototype || !prototype.isReactComponent)
  		        );
  		      }
  		      if ("string" === typeof type) return describeBuiltInComponentFrame(type);
  		      switch (type) {
  		        case REACT_SUSPENSE_TYPE:
  		          return describeBuiltInComponentFrame("Suspense");
  		        case REACT_SUSPENSE_LIST_TYPE:
  		          return describeBuiltInComponentFrame("SuspenseList");
  		      }
  		      if ("object" === typeof type)
  		        switch (type.$$typeof) {
  		          case REACT_FORWARD_REF_TYPE:
  		            return (type = describeNativeComponentFrame(type.render, false)), type;
  		          case REACT_MEMO_TYPE:
  		            return describeUnknownElementTypeFrameInDEV(type.type);
  		          case REACT_LAZY_TYPE:
  		            prototype = type._payload;
  		            type = type._init;
  		            try {
  		              return describeUnknownElementTypeFrameInDEV(type(prototype));
  		            } catch (x) {}
  		        }
  		      return "";
  		    }
  		    function getOwner() {
  		      var dispatcher = ReactSharedInternals.A;
  		      return null === dispatcher ? null : dispatcher.getOwner();
  		    }
  		    function hasValidKey(config) {
  		      if (hasOwnProperty.call(config, "key")) {
  		        var getter = Object.getOwnPropertyDescriptor(config, "key").get;
  		        if (getter && getter.isReactWarning) return false;
  		      }
  		      return void 0 !== config.key;
  		    }
  		    function defineKeyPropWarningGetter(props, displayName) {
  		      function warnAboutAccessingKey() {
  		        specialPropKeyWarningShown ||
  		          ((specialPropKeyWarningShown = true),
  		          console.error(
  		            "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
  		            displayName
  		          ));
  		      }
  		      warnAboutAccessingKey.isReactWarning = true;
  		      Object.defineProperty(props, "key", {
  		        get: warnAboutAccessingKey,
  		        configurable: true
  		      });
  		    }
  		    function elementRefGetterWithDeprecationWarning() {
  		      var componentName = getComponentNameFromType(this.type);
  		      didWarnAboutElementRef[componentName] ||
  		        ((didWarnAboutElementRef[componentName] = true),
  		        console.error(
  		          "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
  		        ));
  		      componentName = this.props.ref;
  		      return void 0 !== componentName ? componentName : null;
  		    }
  		    function ReactElement(type, key, self, source, owner, props) {
  		      self = props.ref;
  		      type = {
  		        $$typeof: REACT_ELEMENT_TYPE,
  		        type: type,
  		        key: key,
  		        props: props,
  		        _owner: owner
  		      };
  		      null !== (void 0 !== self ? self : null)
  		        ? Object.defineProperty(type, "ref", {
  		            enumerable: false,
  		            get: elementRefGetterWithDeprecationWarning
  		          })
  		        : Object.defineProperty(type, "ref", { enumerable: false, value: null });
  		      type._store = {};
  		      Object.defineProperty(type._store, "validated", {
  		        configurable: false,
  		        enumerable: false,
  		        writable: true,
  		        value: 0
  		      });
  		      Object.defineProperty(type, "_debugInfo", {
  		        configurable: false,
  		        enumerable: false,
  		        writable: true,
  		        value: null
  		      });
  		      Object.freeze && (Object.freeze(type.props), Object.freeze(type));
  		      return type;
  		    }
  		    function cloneAndReplaceKey(oldElement, newKey) {
  		      newKey = ReactElement(
  		        oldElement.type,
  		        newKey,
  		        void 0,
  		        void 0,
  		        oldElement._owner,
  		        oldElement.props
  		      );
  		      newKey._store.validated = oldElement._store.validated;
  		      return newKey;
  		    }
  		    function validateChildKeys(node, parentType) {
  		      if (
  		        "object" === typeof node &&
  		        node &&
  		        node.$$typeof !== REACT_CLIENT_REFERENCE
  		      )
  		        if (isArrayImpl(node))
  		          for (var i = 0; i < node.length; i++) {
  		            var child = node[i];
  		            isValidElement(child) && validateExplicitKey(child, parentType);
  		          }
  		        else if (isValidElement(node))
  		          node._store && (node._store.validated = 1);
  		        else if (
  		          ((i = getIteratorFn(node)),
  		          "function" === typeof i &&
  		            i !== node.entries &&
  		            ((i = i.call(node)), i !== node))
  		        )
  		          for (; !(node = i.next()).done; )
  		            isValidElement(node.value) &&
  		              validateExplicitKey(node.value, parentType);
  		    }
  		    function isValidElement(object) {
  		      return (
  		        "object" === typeof object &&
  		        null !== object &&
  		        object.$$typeof === REACT_ELEMENT_TYPE
  		      );
  		    }
  		    function validateExplicitKey(element, parentType) {
  		      if (
  		        element._store &&
  		        !element._store.validated &&
  		        null == element.key &&
  		        ((element._store.validated = 1),
  		        (parentType = getCurrentComponentErrorInfo(parentType)),
  		        !ownerHasKeyUseWarning[parentType])
  		      ) {
  		        ownerHasKeyUseWarning[parentType] = true;
  		        var childOwner = "";
  		        element &&
  		          null != element._owner &&
  		          element._owner !== getOwner() &&
  		          ((childOwner = null),
  		          "number" === typeof element._owner.tag
  		            ? (childOwner = getComponentNameFromType(element._owner.type))
  		            : "string" === typeof element._owner.name &&
  		              (childOwner = element._owner.name),
  		          (childOwner = " It was passed a child from " + childOwner + "."));
  		        var prevGetCurrentStack = ReactSharedInternals.getCurrentStack;
  		        ReactSharedInternals.getCurrentStack = function () {
  		          var stack = describeUnknownElementTypeFrameInDEV(element.type);
  		          prevGetCurrentStack && (stack += prevGetCurrentStack() || "");
  		          return stack;
  		        };
  		        console.error(
  		          'Each child in a list should have a unique "key" prop.%s%s See https://react.dev/link/warning-keys for more information.',
  		          parentType,
  		          childOwner
  		        );
  		        ReactSharedInternals.getCurrentStack = prevGetCurrentStack;
  		      }
  		    }
  		    function getCurrentComponentErrorInfo(parentType) {
  		      var info = "",
  		        owner = getOwner();
  		      owner &&
  		        (owner = getComponentNameFromType(owner.type)) &&
  		        (info = "\n\nCheck the render method of `" + owner + "`.");
  		      info ||
  		        ((parentType = getComponentNameFromType(parentType)) &&
  		          (info =
  		            "\n\nCheck the top-level render call using <" + parentType + ">."));
  		      return info;
  		    }
  		    function escape(key) {
  		      var escaperLookup = { "=": "=0", ":": "=2" };
  		      return (
  		        "$" +
  		        key.replace(/[=:]/g, function (match) {
  		          return escaperLookup[match];
  		        })
  		      );
  		    }
  		    function getElementKey(element, index) {
  		      return "object" === typeof element &&
  		        null !== element &&
  		        null != element.key
  		        ? (checkKeyStringCoercion(element.key), escape("" + element.key))
  		        : index.toString(36);
  		    }
  		    function noop$1() {}
  		    function resolveThenable(thenable) {
  		      switch (thenable.status) {
  		        case "fulfilled":
  		          return thenable.value;
  		        case "rejected":
  		          throw thenable.reason;
  		        default:
  		          switch (
  		            ("string" === typeof thenable.status
  		              ? thenable.then(noop$1, noop$1)
  		              : ((thenable.status = "pending"),
  		                thenable.then(
  		                  function (fulfilledValue) {
  		                    "pending" === thenable.status &&
  		                      ((thenable.status = "fulfilled"),
  		                      (thenable.value = fulfilledValue));
  		                  },
  		                  function (error) {
  		                    "pending" === thenable.status &&
  		                      ((thenable.status = "rejected"),
  		                      (thenable.reason = error));
  		                  }
  		                )),
  		            thenable.status)
  		          ) {
  		            case "fulfilled":
  		              return thenable.value;
  		            case "rejected":
  		              throw thenable.reason;
  		          }
  		      }
  		      throw thenable;
  		    }
  		    function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
  		      var type = typeof children;
  		      if ("undefined" === type || "boolean" === type) children = null;
  		      var invokeCallback = false;
  		      if (null === children) invokeCallback = true;
  		      else
  		        switch (type) {
  		          case "bigint":
  		          case "string":
  		          case "number":
  		            invokeCallback = true;
  		            break;
  		          case "object":
  		            switch (children.$$typeof) {
  		              case REACT_ELEMENT_TYPE:
  		              case REACT_PORTAL_TYPE:
  		                invokeCallback = true;
  		                break;
  		              case REACT_LAZY_TYPE:
  		                return (
  		                  (invokeCallback = children._init),
  		                  mapIntoArray(
  		                    invokeCallback(children._payload),
  		                    array,
  		                    escapedPrefix,
  		                    nameSoFar,
  		                    callback
  		                  )
  		                );
  		            }
  		        }
  		      if (invokeCallback) {
  		        invokeCallback = children;
  		        callback = callback(invokeCallback);
  		        var childKey =
  		          "" === nameSoFar ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
  		        isArrayImpl(callback)
  		          ? ((escapedPrefix = ""),
  		            null != childKey &&
  		              (escapedPrefix =
  		                childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"),
  		            mapIntoArray(callback, array, escapedPrefix, "", function (c) {
  		              return c;
  		            }))
  		          : null != callback &&
  		            (isValidElement(callback) &&
  		              (null != callback.key &&
  		                ((invokeCallback && invokeCallback.key === callback.key) ||
  		                  checkKeyStringCoercion(callback.key)),
  		              (escapedPrefix = cloneAndReplaceKey(
  		                callback,
  		                escapedPrefix +
  		                  (null == callback.key ||
  		                  (invokeCallback && invokeCallback.key === callback.key)
  		                    ? ""
  		                    : ("" + callback.key).replace(
  		                        userProvidedKeyEscapeRegex,
  		                        "$&/"
  		                      ) + "/") +
  		                  childKey
  		              )),
  		              "" !== nameSoFar &&
  		                null != invokeCallback &&
  		                isValidElement(invokeCallback) &&
  		                null == invokeCallback.key &&
  		                invokeCallback._store &&
  		                !invokeCallback._store.validated &&
  		                (escapedPrefix._store.validated = 2),
  		              (callback = escapedPrefix)),
  		            array.push(callback));
  		        return 1;
  		      }
  		      invokeCallback = 0;
  		      childKey = "" === nameSoFar ? "." : nameSoFar + ":";
  		      if (isArrayImpl(children))
  		        for (var i = 0; i < children.length; i++)
  		          (nameSoFar = children[i]),
  		            (type = childKey + getElementKey(nameSoFar, i)),
  		            (invokeCallback += mapIntoArray(
  		              nameSoFar,
  		              array,
  		              escapedPrefix,
  		              type,
  		              callback
  		            ));
  		      else if (((i = getIteratorFn(children)), "function" === typeof i))
  		        for (
  		          i === children.entries &&
  		            (didWarnAboutMaps ||
  		              console.warn(
  		                "Using Maps as children is not supported. Use an array of keyed ReactElements instead."
  		              ),
  		            (didWarnAboutMaps = true)),
  		            children = i.call(children),
  		            i = 0;
  		          !(nameSoFar = children.next()).done;

  		        )
  		          (nameSoFar = nameSoFar.value),
  		            (type = childKey + getElementKey(nameSoFar, i++)),
  		            (invokeCallback += mapIntoArray(
  		              nameSoFar,
  		              array,
  		              escapedPrefix,
  		              type,
  		              callback
  		            ));
  		      else if ("object" === type) {
  		        if ("function" === typeof children.then)
  		          return mapIntoArray(
  		            resolveThenable(children),
  		            array,
  		            escapedPrefix,
  		            nameSoFar,
  		            callback
  		          );
  		        array = String(children);
  		        throw Error(
  		          "Objects are not valid as a React child (found: " +
  		            ("[object Object]" === array
  		              ? "object with keys {" + Object.keys(children).join(", ") + "}"
  		              : array) +
  		            "). If you meant to render a collection of children, use an array instead."
  		        );
  		      }
  		      return invokeCallback;
  		    }
  		    function mapChildren(children, func, context) {
  		      if (null == children) return children;
  		      var result = [],
  		        count = 0;
  		      mapIntoArray(children, result, "", "", function (child) {
  		        return func.call(context, child, count++);
  		      });
  		      return result;
  		    }
  		    function lazyInitializer(payload) {
  		      if (-1 === payload._status) {
  		        var ctor = payload._result;
  		        ctor = ctor();
  		        ctor.then(
  		          function (moduleObject) {
  		            if (0 === payload._status || -1 === payload._status)
  		              (payload._status = 1), (payload._result = moduleObject);
  		          },
  		          function (error) {
  		            if (0 === payload._status || -1 === payload._status)
  		              (payload._status = 2), (payload._result = error);
  		          }
  		        );
  		        -1 === payload._status &&
  		          ((payload._status = 0), (payload._result = ctor));
  		      }
  		      if (1 === payload._status)
  		        return (
  		          (ctor = payload._result),
  		          void 0 === ctor &&
  		            console.error(
  		              "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?",
  		              ctor
  		            ),
  		          "default" in ctor ||
  		            console.error(
  		              "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))",
  		              ctor
  		            ),
  		          ctor.default
  		        );
  		      throw payload._result;
  		    }
  		    function resolveDispatcher() {
  		      var dispatcher = ReactSharedInternals.H;
  		      null === dispatcher &&
  		        console.error(
  		          "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
  		        );
  		      return dispatcher;
  		    }
  		    function noop() {}
  		    function enqueueTask(task) {
  		      if (null === enqueueTaskImpl)
  		        try {
  		          var requireString = ("require" + Math.random()).slice(0, 7);
  		          enqueueTaskImpl = (module && module[requireString]).call(
  		            module,
  		            "timers"
  		          ).setImmediate;
  		        } catch (_err) {
  		          enqueueTaskImpl = function (callback) {
  		            false === didWarnAboutMessageChannel &&
  		              ((didWarnAboutMessageChannel = true),
  		              "undefined" === typeof MessageChannel &&
  		                console.error(
  		                  "This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."
  		                ));
  		            var channel = new MessageChannel();
  		            channel.port1.onmessage = callback;
  		            channel.port2.postMessage(void 0);
  		          };
  		        }
  		      return enqueueTaskImpl(task);
  		    }
  		    function aggregateErrors(errors) {
  		      return 1 < errors.length && "function" === typeof AggregateError
  		        ? new AggregateError(errors)
  		        : errors[0];
  		    }
  		    function popActScope(prevActQueue, prevActScopeDepth) {
  		      prevActScopeDepth !== actScopeDepth - 1 &&
  		        console.error(
  		          "You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. "
  		        );
  		      actScopeDepth = prevActScopeDepth;
  		    }
  		    function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
  		      var queue = ReactSharedInternals.actQueue;
  		      if (null !== queue)
  		        if (0 !== queue.length)
  		          try {
  		            flushActQueue(queue);
  		            enqueueTask(function () {
  		              return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
  		            });
  		            return;
  		          } catch (error) {
  		            ReactSharedInternals.thrownErrors.push(error);
  		          }
  		        else ReactSharedInternals.actQueue = null;
  		      0 < ReactSharedInternals.thrownErrors.length
  		        ? ((queue = aggregateErrors(ReactSharedInternals.thrownErrors)),
  		          (ReactSharedInternals.thrownErrors.length = 0),
  		          reject(queue))
  		        : resolve(returnValue);
  		    }
  		    function flushActQueue(queue) {
  		      if (!isFlushing) {
  		        isFlushing = true;
  		        var i = 0;
  		        try {
  		          for (; i < queue.length; i++) {
  		            var callback = queue[i];
  		            do {
  		              ReactSharedInternals.didUsePromise = !1;
  		              var continuation = callback(!1);
  		              if (null !== continuation) {
  		                if (ReactSharedInternals.didUsePromise) {
  		                  queue[i] = callback;
  		                  queue.splice(0, i);
  		                  return;
  		                }
  		                callback = continuation;
  		              } else break;
  		            } while (1);
  		          }
  		          queue.length = 0;
  		        } catch (error) {
  		          queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error);
  		        } finally {
  		          isFlushing = false;
  		        }
  		      }
  		    }
  		    "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ &&
  		      "function" ===
  		        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart &&
  		      __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
  		    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
  		      REACT_PORTAL_TYPE = Symbol.for("react.portal"),
  		      REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"),
  		      REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"),
  		      REACT_PROFILER_TYPE = Symbol.for("react.profiler");
  		    var REACT_CONSUMER_TYPE = Symbol.for("react.consumer"),
  		      REACT_CONTEXT_TYPE = Symbol.for("react.context"),
  		      REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"),
  		      REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"),
  		      REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"),
  		      REACT_MEMO_TYPE = Symbol.for("react.memo"),
  		      REACT_LAZY_TYPE = Symbol.for("react.lazy"),
  		      REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen"),
  		      MAYBE_ITERATOR_SYMBOL = Symbol.iterator,
  		      didWarnStateUpdateForUnmountedComponent = {},
  		      ReactNoopUpdateQueue = {
  		        isMounted: function () {
  		          return false;
  		        },
  		        enqueueForceUpdate: function (publicInstance) {
  		          warnNoop(publicInstance, "forceUpdate");
  		        },
  		        enqueueReplaceState: function (publicInstance) {
  		          warnNoop(publicInstance, "replaceState");
  		        },
  		        enqueueSetState: function (publicInstance) {
  		          warnNoop(publicInstance, "setState");
  		        }
  		      },
  		      assign = Object.assign,
  		      emptyObject = {};
  		    Object.freeze(emptyObject);
  		    Component.prototype.isReactComponent = {};
  		    Component.prototype.setState = function (partialState, callback) {
  		      if (
  		        "object" !== typeof partialState &&
  		        "function" !== typeof partialState &&
  		        null != partialState
  		      )
  		        throw Error(
  		          "takes an object of state variables to update or a function which returns an object of state variables."
  		        );
  		      this.updater.enqueueSetState(this, partialState, callback, "setState");
  		    };
  		    Component.prototype.forceUpdate = function (callback) {
  		      this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
  		    };
  		    var deprecatedAPIs = {
  		        isMounted: [
  		          "isMounted",
  		          "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."
  		        ],
  		        replaceState: [
  		          "replaceState",
  		          "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."
  		        ]
  		      },
  		      fnName;
  		    for (fnName in deprecatedAPIs)
  		      deprecatedAPIs.hasOwnProperty(fnName) &&
  		        defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
  		    ComponentDummy.prototype = Component.prototype;
  		    deprecatedAPIs = PureComponent.prototype = new ComponentDummy();
  		    deprecatedAPIs.constructor = PureComponent;
  		    assign(deprecatedAPIs, Component.prototype);
  		    deprecatedAPIs.isPureReactComponent = true;
  		    var isArrayImpl = Array.isArray,
  		      REACT_CLIENT_REFERENCE$2 = Symbol.for("react.client.reference"),
  		      ReactSharedInternals = {
  		        H: null,
  		        A: null,
  		        T: null,
  		        S: null,
  		        actQueue: null,
  		        isBatchingLegacy: false,
  		        didScheduleLegacyUpdate: false,
  		        didUsePromise: false,
  		        thrownErrors: [],
  		        getCurrentStack: null
  		      },
  		      hasOwnProperty = Object.prototype.hasOwnProperty,
  		      REACT_CLIENT_REFERENCE$1 = Symbol.for("react.client.reference"),
  		      disabledDepth = 0,
  		      prevLog,
  		      prevInfo,
  		      prevWarn,
  		      prevError,
  		      prevGroup,
  		      prevGroupCollapsed,
  		      prevGroupEnd;
  		    disabledLog.__reactDisabledLog = true;
  		    var prefix,
  		      suffix,
  		      reentry = false;
  		    var componentFrameCache = new (
  		      "function" === typeof WeakMap ? WeakMap : Map
  		    )();
  		    var REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"),
  		      specialPropKeyWarningShown,
  		      didWarnAboutOldJSXRuntime;
  		    var didWarnAboutElementRef = {};
  		    var ownerHasKeyUseWarning = {},
  		      didWarnAboutMaps = false,
  		      userProvidedKeyEscapeRegex = /\/+/g,
  		      reportGlobalError =
  		        "function" === typeof reportError
  		          ? reportError
  		          : function (error) {
  		              if (
  		                "object" === typeof window &&
  		                "function" === typeof window.ErrorEvent
  		              ) {
  		                var event = new window.ErrorEvent("error", {
  		                  bubbles: true,
  		                  cancelable: true,
  		                  message:
  		                    "object" === typeof error &&
  		                    null !== error &&
  		                    "string" === typeof error.message
  		                      ? String(error.message)
  		                      : String(error),
  		                  error: error
  		                });
  		                if (!window.dispatchEvent(event)) return;
  		              } else if (
  		                "object" === typeof process &&
  		                "function" === typeof process.emit
  		              ) {
  		                process.emit("uncaughtException", error);
  		                return;
  		              }
  		              console.error(error);
  		            },
  		      didWarnAboutMessageChannel = false,
  		      enqueueTaskImpl = null,
  		      actScopeDepth = 0,
  		      didWarnNoAwaitAct = false,
  		      isFlushing = false,
  		      queueSeveralMicrotasks =
  		        "function" === typeof queueMicrotask
  		          ? function (callback) {
  		              queueMicrotask(function () {
  		                return queueMicrotask(callback);
  		              });
  		            }
  		          : enqueueTask;
  		    exports.Children = {
  		      map: mapChildren,
  		      forEach: function (children, forEachFunc, forEachContext) {
  		        mapChildren(
  		          children,
  		          function () {
  		            forEachFunc.apply(this, arguments);
  		          },
  		          forEachContext
  		        );
  		      },
  		      count: function (children) {
  		        var n = 0;
  		        mapChildren(children, function () {
  		          n++;
  		        });
  		        return n;
  		      },
  		      toArray: function (children) {
  		        return (
  		          mapChildren(children, function (child) {
  		            return child;
  		          }) || []
  		        );
  		      },
  		      only: function (children) {
  		        if (!isValidElement(children))
  		          throw Error(
  		            "React.Children.only expected to receive a single React element child."
  		          );
  		        return children;
  		      }
  		    };
  		    exports.Component = Component;
  		    exports.Fragment = REACT_FRAGMENT_TYPE;
  		    exports.Profiler = REACT_PROFILER_TYPE;
  		    exports.PureComponent = PureComponent;
  		    exports.StrictMode = REACT_STRICT_MODE_TYPE;
  		    exports.Suspense = REACT_SUSPENSE_TYPE;
  		    exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE =
  		      ReactSharedInternals;
  		    exports.act = function (callback) {
  		      var prevActQueue = ReactSharedInternals.actQueue,
  		        prevActScopeDepth = actScopeDepth;
  		      actScopeDepth++;
  		      var queue = (ReactSharedInternals.actQueue =
  		          null !== prevActQueue ? prevActQueue : []),
  		        didAwaitActCall = false;
  		      try {
  		        var result = callback();
  		      } catch (error) {
  		        ReactSharedInternals.thrownErrors.push(error);
  		      }
  		      if (0 < ReactSharedInternals.thrownErrors.length)
  		        throw (
  		          (popActScope(prevActQueue, prevActScopeDepth),
  		          (callback = aggregateErrors(ReactSharedInternals.thrownErrors)),
  		          (ReactSharedInternals.thrownErrors.length = 0),
  		          callback)
  		        );
  		      if (
  		        null !== result &&
  		        "object" === typeof result &&
  		        "function" === typeof result.then
  		      ) {
  		        var thenable = result;
  		        queueSeveralMicrotasks(function () {
  		          didAwaitActCall ||
  		            didWarnNoAwaitAct ||
  		            ((didWarnNoAwaitAct = true),
  		            console.error(
  		              "You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"
  		            ));
  		        });
  		        return {
  		          then: function (resolve, reject) {
  		            didAwaitActCall = true;
  		            thenable.then(
  		              function (returnValue) {
  		                popActScope(prevActQueue, prevActScopeDepth);
  		                if (0 === prevActScopeDepth) {
  		                  try {
  		                    flushActQueue(queue),
  		                      enqueueTask(function () {
  		                        return recursivelyFlushAsyncActWork(
  		                          returnValue,
  		                          resolve,
  		                          reject
  		                        );
  		                      });
  		                  } catch (error$2) {
  		                    ReactSharedInternals.thrownErrors.push(error$2);
  		                  }
  		                  if (0 < ReactSharedInternals.thrownErrors.length) {
  		                    var _thrownError = aggregateErrors(
  		                      ReactSharedInternals.thrownErrors
  		                    );
  		                    ReactSharedInternals.thrownErrors.length = 0;
  		                    reject(_thrownError);
  		                  }
  		                } else resolve(returnValue);
  		              },
  		              function (error) {
  		                popActScope(prevActQueue, prevActScopeDepth);
  		                0 < ReactSharedInternals.thrownErrors.length
  		                  ? ((error = aggregateErrors(
  		                      ReactSharedInternals.thrownErrors
  		                    )),
  		                    (ReactSharedInternals.thrownErrors.length = 0),
  		                    reject(error))
  		                  : reject(error);
  		              }
  		            );
  		          }
  		        };
  		      }
  		      var returnValue$jscomp$0 = result;
  		      popActScope(prevActQueue, prevActScopeDepth);
  		      0 === prevActScopeDepth &&
  		        (flushActQueue(queue),
  		        0 !== queue.length &&
  		          queueSeveralMicrotasks(function () {
  		            didAwaitActCall ||
  		              didWarnNoAwaitAct ||
  		              ((didWarnNoAwaitAct = true),
  		              console.error(
  		                "A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"
  		              ));
  		          }),
  		        (ReactSharedInternals.actQueue = null));
  		      if (0 < ReactSharedInternals.thrownErrors.length)
  		        throw (
  		          ((callback = aggregateErrors(ReactSharedInternals.thrownErrors)),
  		          (ReactSharedInternals.thrownErrors.length = 0),
  		          callback)
  		        );
  		      return {
  		        then: function (resolve, reject) {
  		          didAwaitActCall = true;
  		          0 === prevActScopeDepth
  		            ? ((ReactSharedInternals.actQueue = queue),
  		              enqueueTask(function () {
  		                return recursivelyFlushAsyncActWork(
  		                  returnValue$jscomp$0,
  		                  resolve,
  		                  reject
  		                );
  		              }))
  		            : resolve(returnValue$jscomp$0);
  		        }
  		      };
  		    };
  		    exports.cache = function (fn) {
  		      return function () {
  		        return fn.apply(null, arguments);
  		      };
  		    };
  		    exports.cloneElement = function (element, config, children) {
  		      if (null === element || void 0 === element)
  		        throw Error(
  		          "The argument must be a React element, but you passed " +
  		            element +
  		            "."
  		        );
  		      var props = assign({}, element.props),
  		        key = element.key,
  		        owner = element._owner;
  		      if (null != config) {
  		        var JSCompiler_inline_result;
  		        a: {
  		          if (
  		            hasOwnProperty.call(config, "ref") &&
  		            (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(
  		              config,
  		              "ref"
  		            ).get) &&
  		            JSCompiler_inline_result.isReactWarning
  		          ) {
  		            JSCompiler_inline_result = false;
  		            break a;
  		          }
  		          JSCompiler_inline_result = void 0 !== config.ref;
  		        }
  		        JSCompiler_inline_result && (owner = getOwner());
  		        hasValidKey(config) &&
  		          (checkKeyStringCoercion(config.key), (key = "" + config.key));
  		        for (propName in config)
  		          !hasOwnProperty.call(config, propName) ||
  		            "key" === propName ||
  		            "__self" === propName ||
  		            "__source" === propName ||
  		            ("ref" === propName && void 0 === config.ref) ||
  		            (props[propName] = config[propName]);
  		      }
  		      var propName = arguments.length - 2;
  		      if (1 === propName) props.children = children;
  		      else if (1 < propName) {
  		        JSCompiler_inline_result = Array(propName);
  		        for (var i = 0; i < propName; i++)
  		          JSCompiler_inline_result[i] = arguments[i + 2];
  		        props.children = JSCompiler_inline_result;
  		      }
  		      props = ReactElement(element.type, key, void 0, void 0, owner, props);
  		      for (key = 2; key < arguments.length; key++)
  		        validateChildKeys(arguments[key], props.type);
  		      return props;
  		    };
  		    exports.createContext = function (defaultValue) {
  		      defaultValue = {
  		        $$typeof: REACT_CONTEXT_TYPE,
  		        _currentValue: defaultValue,
  		        _currentValue2: defaultValue,
  		        _threadCount: 0,
  		        Provider: null,
  		        Consumer: null
  		      };
  		      defaultValue.Provider = defaultValue;
  		      defaultValue.Consumer = {
  		        $$typeof: REACT_CONSUMER_TYPE,
  		        _context: defaultValue
  		      };
  		      defaultValue._currentRenderer = null;
  		      defaultValue._currentRenderer2 = null;
  		      return defaultValue;
  		    };
  		    exports.createElement = function (type, config, children) {
  		      if (isValidElementType(type))
  		        for (var i = 2; i < arguments.length; i++)
  		          validateChildKeys(arguments[i], type);
  		      else {
  		        i = "";
  		        if (
  		          void 0 === type ||
  		          ("object" === typeof type &&
  		            null !== type &&
  		            0 === Object.keys(type).length)
  		        )
  		          i +=
  		            " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
  		        if (null === type) var typeString = "null";
  		        else
  		          isArrayImpl(type)
  		            ? (typeString = "array")
  		            : void 0 !== type && type.$$typeof === REACT_ELEMENT_TYPE
  		              ? ((typeString =
  		                  "<" +
  		                  (getComponentNameFromType(type.type) || "Unknown") +
  		                  " />"),
  		                (i =
  		                  " Did you accidentally export a JSX literal instead of a component?"))
  		              : (typeString = typeof type);
  		        console.error(
  		          "React.createElement: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s",
  		          typeString,
  		          i
  		        );
  		      }
  		      var propName;
  		      i = {};
  		      typeString = null;
  		      if (null != config)
  		        for (propName in (didWarnAboutOldJSXRuntime ||
  		          !("__self" in config) ||
  		          "key" in config ||
  		          ((didWarnAboutOldJSXRuntime = true),
  		          console.warn(
  		            "Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform"
  		          )),
  		        hasValidKey(config) &&
  		          (checkKeyStringCoercion(config.key), (typeString = "" + config.key)),
  		        config))
  		          hasOwnProperty.call(config, propName) &&
  		            "key" !== propName &&
  		            "__self" !== propName &&
  		            "__source" !== propName &&
  		            (i[propName] = config[propName]);
  		      var childrenLength = arguments.length - 2;
  		      if (1 === childrenLength) i.children = children;
  		      else if (1 < childrenLength) {
  		        for (
  		          var childArray = Array(childrenLength), _i = 0;
  		          _i < childrenLength;
  		          _i++
  		        )
  		          childArray[_i] = arguments[_i + 2];
  		        Object.freeze && Object.freeze(childArray);
  		        i.children = childArray;
  		      }
  		      if (type && type.defaultProps)
  		        for (propName in ((childrenLength = type.defaultProps), childrenLength))
  		          void 0 === i[propName] && (i[propName] = childrenLength[propName]);
  		      typeString &&
  		        defineKeyPropWarningGetter(
  		          i,
  		          "function" === typeof type
  		            ? type.displayName || type.name || "Unknown"
  		            : type
  		        );
  		      return ReactElement(type, typeString, void 0, void 0, getOwner(), i);
  		    };
  		    exports.createRef = function () {
  		      var refObject = { current: null };
  		      Object.seal(refObject);
  		      return refObject;
  		    };
  		    exports.forwardRef = function (render) {
  		      null != render && render.$$typeof === REACT_MEMO_TYPE
  		        ? console.error(
  		            "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))."
  		          )
  		        : "function" !== typeof render
  		          ? console.error(
  		              "forwardRef requires a render function but was given %s.",
  		              null === render ? "null" : typeof render
  		            )
  		          : 0 !== render.length &&
  		            2 !== render.length &&
  		            console.error(
  		              "forwardRef render functions accept exactly two parameters: props and ref. %s",
  		              1 === render.length
  		                ? "Did you forget to use the ref parameter?"
  		                : "Any additional parameter will be undefined."
  		            );
  		      null != render &&
  		        null != render.defaultProps &&
  		        console.error(
  		          "forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?"
  		        );
  		      var elementType = { $$typeof: REACT_FORWARD_REF_TYPE, render: render },
  		        ownName;
  		      Object.defineProperty(elementType, "displayName", {
  		        enumerable: false,
  		        configurable: true,
  		        get: function () {
  		          return ownName;
  		        },
  		        set: function (name) {
  		          ownName = name;
  		          render.name ||
  		            render.displayName ||
  		            (Object.defineProperty(render, "name", { value: name }),
  		            (render.displayName = name));
  		        }
  		      });
  		      return elementType;
  		    };
  		    exports.isValidElement = isValidElement;
  		    exports.lazy = function (ctor) {
  		      return {
  		        $$typeof: REACT_LAZY_TYPE,
  		        _payload: { _status: -1, _result: ctor },
  		        _init: lazyInitializer
  		      };
  		    };
  		    exports.memo = function (type, compare) {
  		      isValidElementType(type) ||
  		        console.error(
  		          "memo: The first argument must be a component. Instead received: %s",
  		          null === type ? "null" : typeof type
  		        );
  		      compare = {
  		        $$typeof: REACT_MEMO_TYPE,
  		        type: type,
  		        compare: void 0 === compare ? null : compare
  		      };
  		      var ownName;
  		      Object.defineProperty(compare, "displayName", {
  		        enumerable: false,
  		        configurable: true,
  		        get: function () {
  		          return ownName;
  		        },
  		        set: function (name) {
  		          ownName = name;
  		          type.name ||
  		            type.displayName ||
  		            (Object.defineProperty(type, "name", { value: name }),
  		            (type.displayName = name));
  		        }
  		      });
  		      return compare;
  		    };
  		    exports.startTransition = function (scope) {
  		      var prevTransition = ReactSharedInternals.T,
  		        currentTransition = {};
  		      ReactSharedInternals.T = currentTransition;
  		      currentTransition._updatedFibers = new Set();
  		      try {
  		        var returnValue = scope(),
  		          onStartTransitionFinish = ReactSharedInternals.S;
  		        null !== onStartTransitionFinish &&
  		          onStartTransitionFinish(currentTransition, returnValue);
  		        "object" === typeof returnValue &&
  		          null !== returnValue &&
  		          "function" === typeof returnValue.then &&
  		          returnValue.then(noop, reportGlobalError);
  		      } catch (error) {
  		        reportGlobalError(error);
  		      } finally {
  		        null === prevTransition &&
  		          currentTransition._updatedFibers &&
  		          ((scope = currentTransition._updatedFibers.size),
  		          currentTransition._updatedFibers.clear(),
  		          10 < scope &&
  		            console.warn(
  		              "Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table."
  		            )),
  		          (ReactSharedInternals.T = prevTransition);
  		      }
  		    };
  		    exports.unstable_useCacheRefresh = function () {
  		      return resolveDispatcher().useCacheRefresh();
  		    };
  		    exports.use = function (usable) {
  		      return resolveDispatcher().use(usable);
  		    };
  		    exports.useActionState = function (action, initialState, permalink) {
  		      return resolveDispatcher().useActionState(
  		        action,
  		        initialState,
  		        permalink
  		      );
  		    };
  		    exports.useCallback = function (callback, deps) {
  		      return resolveDispatcher().useCallback(callback, deps);
  		    };
  		    exports.useContext = function (Context) {
  		      var dispatcher = resolveDispatcher();
  		      Context.$$typeof === REACT_CONSUMER_TYPE &&
  		        console.error(
  		          "Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?"
  		        );
  		      return dispatcher.useContext(Context);
  		    };
  		    exports.useDebugValue = function (value, formatterFn) {
  		      return resolveDispatcher().useDebugValue(value, formatterFn);
  		    };
  		    exports.useDeferredValue = function (value, initialValue) {
  		      return resolveDispatcher().useDeferredValue(value, initialValue);
  		    };
  		    exports.useEffect = function (create, deps) {
  		      return resolveDispatcher().useEffect(create, deps);
  		    };
  		    exports.useId = function () {
  		      return resolveDispatcher().useId();
  		    };
  		    exports.useImperativeHandle = function (ref, create, deps) {
  		      return resolveDispatcher().useImperativeHandle(ref, create, deps);
  		    };
  		    exports.useInsertionEffect = function (create, deps) {
  		      return resolveDispatcher().useInsertionEffect(create, deps);
  		    };
  		    exports.useLayoutEffect = function (create, deps) {
  		      return resolveDispatcher().useLayoutEffect(create, deps);
  		    };
  		    exports.useMemo = function (create, deps) {
  		      return resolveDispatcher().useMemo(create, deps);
  		    };
  		    exports.useOptimistic = function (passthrough, reducer) {
  		      return resolveDispatcher().useOptimistic(passthrough, reducer);
  		    };
  		    exports.useReducer = function (reducer, initialArg, init) {
  		      return resolveDispatcher().useReducer(reducer, initialArg, init);
  		    };
  		    exports.useRef = function (initialValue) {
  		      return resolveDispatcher().useRef(initialValue);
  		    };
  		    exports.useState = function (initialState) {
  		      return resolveDispatcher().useState(initialState);
  		    };
  		    exports.useSyncExternalStore = function (
  		      subscribe,
  		      getSnapshot,
  		      getServerSnapshot
  		    ) {
  		      return resolveDispatcher().useSyncExternalStore(
  		        subscribe,
  		        getSnapshot,
  		        getServerSnapshot
  		      );
  		    };
  		    exports.useTransition = function () {
  		      return resolveDispatcher().useTransition();
  		    };
  		    exports.version = "19.0.0";
  		    "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ &&
  		      "function" ===
  		        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop &&
  		      __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
  		  })(); 
  	} (react_development, react_development.exports));
  	return react_development.exports;
  }

  var hasRequiredReact;

  function requireReact () {
  	if (hasRequiredReact) return react.exports;
  	hasRequiredReact = 1;

  	if (process.env.NODE_ENV === 'production') {
  	  react.exports = requireReact_production();
  	} else {
  	  react.exports = requireReact_development();
  	}
  	return react.exports;
  }

  /******/

  var hasRequiredBackend;

  function requireBackend () {
  	if (hasRequiredBackend) return backend.exports;
  	hasRequiredBackend = 1;
  	(function (module) {
  		(() => { // webpackBootstrap
  		/******/ 	var __webpack_modules__ = ({

  		/***/ 3018:
  		/***/ ((module, __unused_webpack_exports, __webpack_require__) => {
  		 // A linked list to keep track of recently-used-ness

  		const Yallist = __webpack_require__(5986);

  		const MAX = Symbol('max');
  		const LENGTH = Symbol('length');
  		const LENGTH_CALCULATOR = Symbol('lengthCalculator');
  		const ALLOW_STALE = Symbol('allowStale');
  		const MAX_AGE = Symbol('maxAge');
  		const DISPOSE = Symbol('dispose');
  		const NO_DISPOSE_ON_SET = Symbol('noDisposeOnSet');
  		const LRU_LIST = Symbol('lruList');
  		const CACHE = Symbol('cache');
  		const UPDATE_AGE_ON_GET = Symbol('updateAgeOnGet');

  		const naiveLength = () => 1; // lruList is a yallist where the head is the youngest
  		// item, and the tail is the oldest.  the list contains the Hit
  		// objects as the entries.
  		// Each Hit object has a reference to its Yallist.Node.  This
  		// never changes.
  		//
  		// cache is a Map (or PseudoMap) that matches the keys to
  		// the Yallist.Node object.


  		class LRUCache {
  		  constructor(options) {
  		    if (typeof options === 'number') options = {
  		      max: options
  		    };
  		    if (!options) options = {};
  		    if (options.max && (typeof options.max !== 'number' || options.max < 0)) throw new TypeError('max must be a non-negative number'); // Kind of weird to have a default max of Infinity, but oh well.

  		    this[MAX] = options.max || Infinity;
  		    const lc = options.length || naiveLength;
  		    this[LENGTH_CALCULATOR] = typeof lc !== 'function' ? naiveLength : lc;
  		    this[ALLOW_STALE] = options.stale || false;
  		    if (options.maxAge && typeof options.maxAge !== 'number') throw new TypeError('maxAge must be a number');
  		    this[MAX_AGE] = options.maxAge || 0;
  		    this[DISPOSE] = options.dispose;
  		    this[NO_DISPOSE_ON_SET] = options.noDisposeOnSet || false;
  		    this[UPDATE_AGE_ON_GET] = options.updateAgeOnGet || false;
  		    this.reset();
  		  } // resize the cache when the max changes.


  		  set max(mL) {
  		    if (typeof mL !== 'number' || mL < 0) throw new TypeError('max must be a non-negative number');
  		    this[MAX] = mL || Infinity;
  		    trim(this);
  		  }

  		  get max() {
  		    return this[MAX];
  		  }

  		  set allowStale(allowStale) {
  		    this[ALLOW_STALE] = !!allowStale;
  		  }

  		  get allowStale() {
  		    return this[ALLOW_STALE];
  		  }

  		  set maxAge(mA) {
  		    if (typeof mA !== 'number') throw new TypeError('maxAge must be a non-negative number');
  		    this[MAX_AGE] = mA;
  		    trim(this);
  		  }

  		  get maxAge() {
  		    return this[MAX_AGE];
  		  } // resize the cache when the lengthCalculator changes.


  		  set lengthCalculator(lC) {
  		    if (typeof lC !== 'function') lC = naiveLength;

  		    if (lC !== this[LENGTH_CALCULATOR]) {
  		      this[LENGTH_CALCULATOR] = lC;
  		      this[LENGTH] = 0;
  		      this[LRU_LIST].forEach(hit => {
  		        hit.length = this[LENGTH_CALCULATOR](hit.value, hit.key);
  		        this[LENGTH] += hit.length;
  		      });
  		    }

  		    trim(this);
  		  }

  		  get lengthCalculator() {
  		    return this[LENGTH_CALCULATOR];
  		  }

  		  get length() {
  		    return this[LENGTH];
  		  }

  		  get itemCount() {
  		    return this[LRU_LIST].length;
  		  }

  		  rforEach(fn, thisp) {
  		    thisp = thisp || this;

  		    for (let walker = this[LRU_LIST].tail; walker !== null;) {
  		      const prev = walker.prev;
  		      forEachStep(this, fn, walker, thisp);
  		      walker = prev;
  		    }
  		  }

  		  forEach(fn, thisp) {
  		    thisp = thisp || this;

  		    for (let walker = this[LRU_LIST].head; walker !== null;) {
  		      const next = walker.next;
  		      forEachStep(this, fn, walker, thisp);
  		      walker = next;
  		    }
  		  }

  		  keys() {
  		    return this[LRU_LIST].toArray().map(k => k.key);
  		  }

  		  values() {
  		    return this[LRU_LIST].toArray().map(k => k.value);
  		  }

  		  reset() {
  		    if (this[DISPOSE] && this[LRU_LIST] && this[LRU_LIST].length) {
  		      this[LRU_LIST].forEach(hit => this[DISPOSE](hit.key, hit.value));
  		    }

  		    this[CACHE] = new Map(); // hash of items by key

  		    this[LRU_LIST] = new Yallist(); // list of items in order of use recency

  		    this[LENGTH] = 0; // length of items in the list
  		  }

  		  dump() {
  		    return this[LRU_LIST].map(hit => isStale(this, hit) ? false : {
  		      k: hit.key,
  		      v: hit.value,
  		      e: hit.now + (hit.maxAge || 0)
  		    }).toArray().filter(h => h);
  		  }

  		  dumpLru() {
  		    return this[LRU_LIST];
  		  }

  		  set(key, value, maxAge) {
  		    maxAge = maxAge || this[MAX_AGE];
  		    if (maxAge && typeof maxAge !== 'number') throw new TypeError('maxAge must be a number');
  		    const now = maxAge ? Date.now() : 0;
  		    const len = this[LENGTH_CALCULATOR](value, key);

  		    if (this[CACHE].has(key)) {
  		      if (len > this[MAX]) {
  		        del(this, this[CACHE].get(key));
  		        return false;
  		      }

  		      const node = this[CACHE].get(key);
  		      const item = node.value; // dispose of the old one before overwriting
  		      // split out into 2 ifs for better coverage tracking

  		      if (this[DISPOSE]) {
  		        if (!this[NO_DISPOSE_ON_SET]) this[DISPOSE](key, item.value);
  		      }

  		      item.now = now;
  		      item.maxAge = maxAge;
  		      item.value = value;
  		      this[LENGTH] += len - item.length;
  		      item.length = len;
  		      this.get(key);
  		      trim(this);
  		      return true;
  		    }

  		    const hit = new Entry(key, value, len, now, maxAge); // oversized objects fall out of cache automatically.

  		    if (hit.length > this[MAX]) {
  		      if (this[DISPOSE]) this[DISPOSE](key, value);
  		      return false;
  		    }

  		    this[LENGTH] += hit.length;
  		    this[LRU_LIST].unshift(hit);
  		    this[CACHE].set(key, this[LRU_LIST].head);
  		    trim(this);
  		    return true;
  		  }

  		  has(key) {
  		    if (!this[CACHE].has(key)) return false;
  		    const hit = this[CACHE].get(key).value;
  		    return !isStale(this, hit);
  		  }

  		  get(key) {
  		    return get(this, key, true);
  		  }

  		  peek(key) {
  		    return get(this, key, false);
  		  }

  		  pop() {
  		    const node = this[LRU_LIST].tail;
  		    if (!node) return null;
  		    del(this, node);
  		    return node.value;
  		  }

  		  del(key) {
  		    del(this, this[CACHE].get(key));
  		  }

  		  load(arr) {
  		    // reset the cache
  		    this.reset();
  		    const now = Date.now(); // A previous serialized cache has the most recent items first

  		    for (let l = arr.length - 1; l >= 0; l--) {
  		      const hit = arr[l];
  		      const expiresAt = hit.e || 0;
  		      if (expiresAt === 0) // the item was created without expiration in a non aged cache
  		        this.set(hit.k, hit.v);else {
  		        const maxAge = expiresAt - now; // dont add already expired items

  		        if (maxAge > 0) {
  		          this.set(hit.k, hit.v, maxAge);
  		        }
  		      }
  		    }
  		  }

  		  prune() {
  		    this[CACHE].forEach((value, key) => get(this, key, false));
  		  }

  		}

  		const get = (self, key, doUse) => {
  		  const node = self[CACHE].get(key);

  		  if (node) {
  		    const hit = node.value;

  		    if (isStale(self, hit)) {
  		      del(self, node);
  		      if (!self[ALLOW_STALE]) return undefined;
  		    } else {
  		      if (doUse) {
  		        if (self[UPDATE_AGE_ON_GET]) node.value.now = Date.now();
  		        self[LRU_LIST].unshiftNode(node);
  		      }
  		    }

  		    return hit.value;
  		  }
  		};

  		const isStale = (self, hit) => {
  		  if (!hit || !hit.maxAge && !self[MAX_AGE]) return false;
  		  const diff = Date.now() - hit.now;
  		  return hit.maxAge ? diff > hit.maxAge : self[MAX_AGE] && diff > self[MAX_AGE];
  		};

  		const trim = self => {
  		  if (self[LENGTH] > self[MAX]) {
  		    for (let walker = self[LRU_LIST].tail; self[LENGTH] > self[MAX] && walker !== null;) {
  		      // We know that we're about to delete this one, and also
  		      // what the next least recently used key will be, so just
  		      // go ahead and set it now.
  		      const prev = walker.prev;
  		      del(self, walker);
  		      walker = prev;
  		    }
  		  }
  		};

  		const del = (self, node) => {
  		  if (node) {
  		    const hit = node.value;
  		    if (self[DISPOSE]) self[DISPOSE](hit.key, hit.value);
  		    self[LENGTH] -= hit.length;
  		    self[CACHE].delete(hit.key);
  		    self[LRU_LIST].removeNode(node);
  		  }
  		};

  		class Entry {
  		  constructor(key, value, length, now, maxAge) {
  		    this.key = key;
  		    this.value = value;
  		    this.length = length;
  		    this.now = now;
  		    this.maxAge = maxAge || 0;
  		  }

  		}

  		const forEachStep = (self, fn, node, thisp) => {
  		  let hit = node.value;

  		  if (isStale(self, hit)) {
  		    del(self, node);
  		    if (!self[ALLOW_STALE]) hit = undefined;
  		  }

  		  if (hit) fn.call(thisp, hit.value, hit.key, self);
  		};

  		module.exports = LRUCache;

  		/***/ }),

  		/***/ 7533:
  		/***/ ((module) => {


  		module.exports = function (Yallist) {
  		  Yallist.prototype[Symbol.iterator] = function* () {
  		    for (let walker = this.head; walker; walker = walker.next) {
  		      yield walker.value;
  		    }
  		  };
  		};

  		/***/ }),

  		/***/ 5986:
  		/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


  		module.exports = Yallist;
  		Yallist.Node = Node;
  		Yallist.create = Yallist;

  		function Yallist(list) {
  		  var self = this;

  		  if (!(self instanceof Yallist)) {
  		    self = new Yallist();
  		  }

  		  self.tail = null;
  		  self.head = null;
  		  self.length = 0;

  		  if (list && typeof list.forEach === 'function') {
  		    list.forEach(function (item) {
  		      self.push(item);
  		    });
  		  } else if (arguments.length > 0) {
  		    for (var i = 0, l = arguments.length; i < l; i++) {
  		      self.push(arguments[i]);
  		    }
  		  }

  		  return self;
  		}

  		Yallist.prototype.removeNode = function (node) {
  		  if (node.list !== this) {
  		    throw new Error('removing node which does not belong to this list');
  		  }

  		  var next = node.next;
  		  var prev = node.prev;

  		  if (next) {
  		    next.prev = prev;
  		  }

  		  if (prev) {
  		    prev.next = next;
  		  }

  		  if (node === this.head) {
  		    this.head = next;
  		  }

  		  if (node === this.tail) {
  		    this.tail = prev;
  		  }

  		  node.list.length--;
  		  node.next = null;
  		  node.prev = null;
  		  node.list = null;
  		  return next;
  		};

  		Yallist.prototype.unshiftNode = function (node) {
  		  if (node === this.head) {
  		    return;
  		  }

  		  if (node.list) {
  		    node.list.removeNode(node);
  		  }

  		  var head = this.head;
  		  node.list = this;
  		  node.next = head;

  		  if (head) {
  		    head.prev = node;
  		  }

  		  this.head = node;

  		  if (!this.tail) {
  		    this.tail = node;
  		  }

  		  this.length++;
  		};

  		Yallist.prototype.pushNode = function (node) {
  		  if (node === this.tail) {
  		    return;
  		  }

  		  if (node.list) {
  		    node.list.removeNode(node);
  		  }

  		  var tail = this.tail;
  		  node.list = this;
  		  node.prev = tail;

  		  if (tail) {
  		    tail.next = node;
  		  }

  		  this.tail = node;

  		  if (!this.head) {
  		    this.head = node;
  		  }

  		  this.length++;
  		};

  		Yallist.prototype.push = function () {
  		  for (var i = 0, l = arguments.length; i < l; i++) {
  		    push(this, arguments[i]);
  		  }

  		  return this.length;
  		};

  		Yallist.prototype.unshift = function () {
  		  for (var i = 0, l = arguments.length; i < l; i++) {
  		    unshift(this, arguments[i]);
  		  }

  		  return this.length;
  		};

  		Yallist.prototype.pop = function () {
  		  if (!this.tail) {
  		    return undefined;
  		  }

  		  var res = this.tail.value;
  		  this.tail = this.tail.prev;

  		  if (this.tail) {
  		    this.tail.next = null;
  		  } else {
  		    this.head = null;
  		  }

  		  this.length--;
  		  return res;
  		};

  		Yallist.prototype.shift = function () {
  		  if (!this.head) {
  		    return undefined;
  		  }

  		  var res = this.head.value;
  		  this.head = this.head.next;

  		  if (this.head) {
  		    this.head.prev = null;
  		  } else {
  		    this.tail = null;
  		  }

  		  this.length--;
  		  return res;
  		};

  		Yallist.prototype.forEach = function (fn, thisp) {
  		  thisp = thisp || this;

  		  for (var walker = this.head, i = 0; walker !== null; i++) {
  		    fn.call(thisp, walker.value, i, this);
  		    walker = walker.next;
  		  }
  		};

  		Yallist.prototype.forEachReverse = function (fn, thisp) {
  		  thisp = thisp || this;

  		  for (var walker = this.tail, i = this.length - 1; walker !== null; i--) {
  		    fn.call(thisp, walker.value, i, this);
  		    walker = walker.prev;
  		  }
  		};

  		Yallist.prototype.get = function (n) {
  		  for (var i = 0, walker = this.head; walker !== null && i < n; i++) {
  		    // abort out of the list early if we hit a cycle
  		    walker = walker.next;
  		  }

  		  if (i === n && walker !== null) {
  		    return walker.value;
  		  }
  		};

  		Yallist.prototype.getReverse = function (n) {
  		  for (var i = 0, walker = this.tail; walker !== null && i < n; i++) {
  		    // abort out of the list early if we hit a cycle
  		    walker = walker.prev;
  		  }

  		  if (i === n && walker !== null) {
  		    return walker.value;
  		  }
  		};

  		Yallist.prototype.map = function (fn, thisp) {
  		  thisp = thisp || this;
  		  var res = new Yallist();

  		  for (var walker = this.head; walker !== null;) {
  		    res.push(fn.call(thisp, walker.value, this));
  		    walker = walker.next;
  		  }

  		  return res;
  		};

  		Yallist.prototype.mapReverse = function (fn, thisp) {
  		  thisp = thisp || this;
  		  var res = new Yallist();

  		  for (var walker = this.tail; walker !== null;) {
  		    res.push(fn.call(thisp, walker.value, this));
  		    walker = walker.prev;
  		  }

  		  return res;
  		};

  		Yallist.prototype.reduce = function (fn, initial) {
  		  var acc;
  		  var walker = this.head;

  		  if (arguments.length > 1) {
  		    acc = initial;
  		  } else if (this.head) {
  		    walker = this.head.next;
  		    acc = this.head.value;
  		  } else {
  		    throw new TypeError('Reduce of empty list with no initial value');
  		  }

  		  for (var i = 0; walker !== null; i++) {
  		    acc = fn(acc, walker.value, i);
  		    walker = walker.next;
  		  }

  		  return acc;
  		};

  		Yallist.prototype.reduceReverse = function (fn, initial) {
  		  var acc;
  		  var walker = this.tail;

  		  if (arguments.length > 1) {
  		    acc = initial;
  		  } else if (this.tail) {
  		    walker = this.tail.prev;
  		    acc = this.tail.value;
  		  } else {
  		    throw new TypeError('Reduce of empty list with no initial value');
  		  }

  		  for (var i = this.length - 1; walker !== null; i--) {
  		    acc = fn(acc, walker.value, i);
  		    walker = walker.prev;
  		  }

  		  return acc;
  		};

  		Yallist.prototype.toArray = function () {
  		  var arr = new Array(this.length);

  		  for (var i = 0, walker = this.head; walker !== null; i++) {
  		    arr[i] = walker.value;
  		    walker = walker.next;
  		  }

  		  return arr;
  		};

  		Yallist.prototype.toArrayReverse = function () {
  		  var arr = new Array(this.length);

  		  for (var i = 0, walker = this.tail; walker !== null; i++) {
  		    arr[i] = walker.value;
  		    walker = walker.prev;
  		  }

  		  return arr;
  		};

  		Yallist.prototype.slice = function (from, to) {
  		  to = to || this.length;

  		  if (to < 0) {
  		    to += this.length;
  		  }

  		  from = from || 0;

  		  if (from < 0) {
  		    from += this.length;
  		  }

  		  var ret = new Yallist();

  		  if (to < from || to < 0) {
  		    return ret;
  		  }

  		  if (from < 0) {
  		    from = 0;
  		  }

  		  if (to > this.length) {
  		    to = this.length;
  		  }

  		  for (var i = 0, walker = this.head; walker !== null && i < from; i++) {
  		    walker = walker.next;
  		  }

  		  for (; walker !== null && i < to; i++, walker = walker.next) {
  		    ret.push(walker.value);
  		  }

  		  return ret;
  		};

  		Yallist.prototype.sliceReverse = function (from, to) {
  		  to = to || this.length;

  		  if (to < 0) {
  		    to += this.length;
  		  }

  		  from = from || 0;

  		  if (from < 0) {
  		    from += this.length;
  		  }

  		  var ret = new Yallist();

  		  if (to < from || to < 0) {
  		    return ret;
  		  }

  		  if (from < 0) {
  		    from = 0;
  		  }

  		  if (to > this.length) {
  		    to = this.length;
  		  }

  		  for (var i = this.length, walker = this.tail; walker !== null && i > to; i--) {
  		    walker = walker.prev;
  		  }

  		  for (; walker !== null && i > from; i--, walker = walker.prev) {
  		    ret.push(walker.value);
  		  }

  		  return ret;
  		};

  		Yallist.prototype.splice = function (start, deleteCount
  		/*, ...nodes */
  		) {
  		  if (start > this.length) {
  		    start = this.length - 1;
  		  }

  		  if (start < 0) {
  		    start = this.length + start;
  		  }

  		  for (var i = 0, walker = this.head; walker !== null && i < start; i++) {
  		    walker = walker.next;
  		  }

  		  var ret = [];

  		  for (var i = 0; walker && i < deleteCount; i++) {
  		    ret.push(walker.value);
  		    walker = this.removeNode(walker);
  		  }

  		  if (walker === null) {
  		    walker = this.tail;
  		  }

  		  if (walker !== this.head && walker !== this.tail) {
  		    walker = walker.prev;
  		  }

  		  for (var i = 2; i < arguments.length; i++) {
  		    walker = insert(this, walker, arguments[i]);
  		  }

  		  return ret;
  		};

  		Yallist.prototype.reverse = function () {
  		  var head = this.head;
  		  var tail = this.tail;

  		  for (var walker = head; walker !== null; walker = walker.prev) {
  		    var p = walker.prev;
  		    walker.prev = walker.next;
  		    walker.next = p;
  		  }

  		  this.head = tail;
  		  this.tail = head;
  		  return this;
  		};

  		function insert(self, node, value) {
  		  var inserted = node === self.head ? new Node(value, null, node, self) : new Node(value, node, node.next, self);

  		  if (inserted.next === null) {
  		    self.tail = inserted;
  		  }

  		  if (inserted.prev === null) {
  		    self.head = inserted;
  		  }

  		  self.length++;
  		  return inserted;
  		}

  		function push(self, item) {
  		  self.tail = new Node(item, self.tail, null, self);

  		  if (!self.head) {
  		    self.head = self.tail;
  		  }

  		  self.length++;
  		}

  		function unshift(self, item) {
  		  self.head = new Node(item, null, self.head, self);

  		  if (!self.tail) {
  		    self.tail = self.head;
  		  }

  		  self.length++;
  		}

  		function Node(value, prev, next, list) {
  		  if (!(this instanceof Node)) {
  		    return new Node(value, prev, next, list);
  		  }

  		  this.list = list;
  		  this.value = value;

  		  if (prev) {
  		    prev.next = this;
  		    this.prev = prev;
  		  } else {
  		    this.prev = null;
  		  }

  		  if (next) {
  		    next.prev = this;
  		    this.next = next;
  		  } else {
  		    this.next = null;
  		  }
  		}

  		try {
  		  // add if support for Symbol.iterator is present
  		  __webpack_require__(7533)(Yallist);
  		} catch (er) {}

  		/***/ }),

  		/***/ 2235:
  		/***/ (function(module, exports, __webpack_require__) {

  		var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function (root, factory) {

  		  /* istanbul ignore next */

  		  {
  		    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(5907)], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
  				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
  				(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
  				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
  		  }
  		})(this, function ErrorStackParser(StackFrame) {

  		  var FIREFOX_SAFARI_STACK_REGEXP = /(^|@)\S+:\d+/;
  		  var CHROME_IE_STACK_REGEXP = /^\s*at .*(\S+:\d+|\(native\))/m;
  		  var SAFARI_NATIVE_CODE_REGEXP = /^(eval@)?(\[native code])?$/;
  		  return {
  		    /**
  		     * Given an Error object, extract the most information from it.
  		     *
  		     * @param {Error} error object
  		     * @return {Array} of StackFrames
  		     */
  		    parse: function ErrorStackParser$$parse(error) {
  		      if (typeof error.stacktrace !== 'undefined' || typeof error['opera#sourceloc'] !== 'undefined') {
  		        return this.parseOpera(error);
  		      } else if (error.stack && error.stack.match(CHROME_IE_STACK_REGEXP)) {
  		        return this.parseV8OrIE(error);
  		      } else if (error.stack) {
  		        return this.parseFFOrSafari(error);
  		      } else {
  		        throw new Error('Cannot parse given Error object');
  		      }
  		    },
  		    // Separate line and column numbers from a string of the form: (URI:Line:Column)
  		    extractLocation: function ErrorStackParser$$extractLocation(urlLike) {
  		      // Fail-fast but return locations like "(native)"
  		      if (urlLike.indexOf(':') === -1) {
  		        return [urlLike];
  		      }

  		      var regExp = /(.+?)(?::(\d+))?(?::(\d+))?$/;
  		      var parts = regExp.exec(urlLike.replace(/[()]/g, ''));
  		      return [parts[1], parts[2] || undefined, parts[3] || undefined];
  		    },
  		    parseV8OrIE: function ErrorStackParser$$parseV8OrIE(error) {
  		      var filtered = error.stack.split('\n').filter(function (line) {
  		        return !!line.match(CHROME_IE_STACK_REGEXP);
  		      }, this);
  		      return filtered.map(function (line) {
  		        if (line.indexOf('(eval ') > -1) {
  		          // Throw away eval information until we implement stacktrace.js/stackframe#8
  		          line = line.replace(/eval code/g, 'eval').replace(/(\(eval at [^()]*)|(,.*$)/g, '');
  		        }

  		        var sanitizedLine = line.replace(/^\s+/, '').replace(/\(eval code/g, '(').replace(/^.*?\s+/, ''); // capture and preseve the parenthesized location "(/foo/my bar.js:12:87)" in
  		        // case it has spaces in it, as the string is split on \s+ later on

  		        var location = sanitizedLine.match(/ (\(.+\)$)/); // remove the parenthesized location from the line, if it was matched

  		        sanitizedLine = location ? sanitizedLine.replace(location[0], '') : sanitizedLine; // if a location was matched, pass it to extractLocation() otherwise pass all sanitizedLine
  		        // because this line doesn't have function name

  		        var locationParts = this.extractLocation(location ? location[1] : sanitizedLine);
  		        var functionName = location && sanitizedLine || undefined;
  		        var fileName = ['eval', '<anonymous>'].indexOf(locationParts[0]) > -1 ? undefined : locationParts[0];
  		        return new StackFrame({
  		          functionName: functionName,
  		          fileName: fileName,
  		          lineNumber: locationParts[1],
  		          columnNumber: locationParts[2],
  		          source: line
  		        });
  		      }, this);
  		    },
  		    parseFFOrSafari: function ErrorStackParser$$parseFFOrSafari(error) {
  		      var filtered = error.stack.split('\n').filter(function (line) {
  		        return !line.match(SAFARI_NATIVE_CODE_REGEXP);
  		      }, this);
  		      return filtered.map(function (line) {
  		        // Throw away eval information until we implement stacktrace.js/stackframe#8
  		        if (line.indexOf(' > eval') > -1) {
  		          line = line.replace(/ line (\d+)(?: > eval line \d+)* > eval:\d+:\d+/g, ':$1');
  		        }

  		        if (line.indexOf('@') === -1 && line.indexOf(':') === -1) {
  		          // Safari eval frames only have function names and nothing else
  		          return new StackFrame({
  		            functionName: line
  		          });
  		        } else {
  		          var functionNameRegex = /((.*".+"[^@]*)?[^@]*)(?:@)/;
  		          var matches = line.match(functionNameRegex);
  		          var functionName = matches && matches[1] ? matches[1] : undefined;
  		          var locationParts = this.extractLocation(line.replace(functionNameRegex, ''));
  		          return new StackFrame({
  		            functionName: functionName,
  		            fileName: locationParts[0],
  		            lineNumber: locationParts[1],
  		            columnNumber: locationParts[2],
  		            source: line
  		          });
  		        }
  		      }, this);
  		    },
  		    parseOpera: function ErrorStackParser$$parseOpera(e) {
  		      if (!e.stacktrace || e.message.indexOf('\n') > -1 && e.message.split('\n').length > e.stacktrace.split('\n').length) {
  		        return this.parseOpera9(e);
  		      } else if (!e.stack) {
  		        return this.parseOpera10(e);
  		      } else {
  		        return this.parseOpera11(e);
  		      }
  		    },
  		    parseOpera9: function ErrorStackParser$$parseOpera9(e) {
  		      var lineRE = /Line (\d+).*script (?:in )?(\S+)/i;
  		      var lines = e.message.split('\n');
  		      var result = [];

  		      for (var i = 2, len = lines.length; i < len; i += 2) {
  		        var match = lineRE.exec(lines[i]);

  		        if (match) {
  		          result.push(new StackFrame({
  		            fileName: match[2],
  		            lineNumber: match[1],
  		            source: lines[i]
  		          }));
  		        }
  		      }

  		      return result;
  		    },
  		    parseOpera10: function ErrorStackParser$$parseOpera10(e) {
  		      var lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i;
  		      var lines = e.stacktrace.split('\n');
  		      var result = [];

  		      for (var i = 0, len = lines.length; i < len; i += 2) {
  		        var match = lineRE.exec(lines[i]);

  		        if (match) {
  		          result.push(new StackFrame({
  		            functionName: match[3] || undefined,
  		            fileName: match[2],
  		            lineNumber: match[1],
  		            source: lines[i]
  		          }));
  		        }
  		      }

  		      return result;
  		    },
  		    // Opera 10.65+ Error.stack very similar to FF/Safari
  		    parseOpera11: function ErrorStackParser$$parseOpera11(error) {
  		      var filtered = error.stack.split('\n').filter(function (line) {
  		        return !!line.match(FIREFOX_SAFARI_STACK_REGEXP) && !line.match(/^Error created at/);
  		      }, this);
  		      return filtered.map(function (line) {
  		        var tokens = line.split('@');
  		        var locationParts = this.extractLocation(tokens.pop());
  		        var functionCall = tokens.shift() || '';
  		        var functionName = functionCall.replace(/<anonymous function(: (\w+))?>/, '$2').replace(/\([^)]*\)/g, '') || undefined;
  		        var argsRaw;

  		        if (functionCall.match(/\(([^)]*)\)/)) {
  		          argsRaw = functionCall.replace(/^[^(]+\(([^)]*)\)$/, '$1');
  		        }

  		        var args = argsRaw === undefined || argsRaw === '[arguments not available]' ? undefined : argsRaw.split(',');
  		        return new StackFrame({
  		          functionName: functionName,
  		          args: args,
  		          fileName: locationParts[0],
  		          lineNumber: locationParts[1],
  		          columnNumber: locationParts[2],
  		          source: line
  		        });
  		      }, this);
  		    }
  		  };
  		});

  		/***/ }),

  		/***/ 5907:
  		/***/ (function(module, exports) {

  		var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function (root, factory) {

  		  /* istanbul ignore next */

  		  {
  		    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
  				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
  				(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
  				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
  		  }
  		})(this, function () {

  		  function _isNumber(n) {
  		    return !isNaN(parseFloat(n)) && isFinite(n);
  		  }

  		  function _capitalize(str) {
  		    return str.charAt(0).toUpperCase() + str.substring(1);
  		  }

  		  function _getter(p) {
  		    return function () {
  		      return this[p];
  		    };
  		  }

  		  var booleanProps = ['isConstructor', 'isEval', 'isNative', 'isToplevel'];
  		  var numericProps = ['columnNumber', 'lineNumber'];
  		  var stringProps = ['fileName', 'functionName', 'source'];
  		  var arrayProps = ['args'];
  		  var objectProps = ['evalOrigin'];
  		  var props = booleanProps.concat(numericProps, stringProps, arrayProps, objectProps);

  		  function StackFrame(obj) {
  		    if (!obj) return;

  		    for (var i = 0; i < props.length; i++) {
  		      if (obj[props[i]] !== undefined) {
  		        this['set' + _capitalize(props[i])](obj[props[i]]);
  		      }
  		    }
  		  }

  		  StackFrame.prototype = {
  		    getArgs: function () {
  		      return this.args;
  		    },
  		    setArgs: function (v) {
  		      if (Object.prototype.toString.call(v) !== '[object Array]') {
  		        throw new TypeError('Args must be an Array');
  		      }

  		      this.args = v;
  		    },
  		    getEvalOrigin: function () {
  		      return this.evalOrigin;
  		    },
  		    setEvalOrigin: function (v) {
  		      if (v instanceof StackFrame) {
  		        this.evalOrigin = v;
  		      } else if (v instanceof Object) {
  		        this.evalOrigin = new StackFrame(v);
  		      } else {
  		        throw new TypeError('Eval Origin must be an Object or StackFrame');
  		      }
  		    },
  		    toString: function () {
  		      var fileName = this.getFileName() || '';
  		      var lineNumber = this.getLineNumber() || '';
  		      var columnNumber = this.getColumnNumber() || '';
  		      var functionName = this.getFunctionName() || '';

  		      if (this.getIsEval()) {
  		        if (fileName) {
  		          return '[eval] (' + fileName + ':' + lineNumber + ':' + columnNumber + ')';
  		        }

  		        return '[eval]:' + lineNumber + ':' + columnNumber;
  		      }

  		      if (functionName) {
  		        return functionName + ' (' + fileName + ':' + lineNumber + ':' + columnNumber + ')';
  		      }

  		      return fileName + ':' + lineNumber + ':' + columnNumber;
  		    }
  		  };

  		  StackFrame.fromString = function StackFrame$$fromString(str) {
  		    var argsStartIndex = str.indexOf('(');
  		    var argsEndIndex = str.lastIndexOf(')');
  		    var functionName = str.substring(0, argsStartIndex);
  		    var args = str.substring(argsStartIndex + 1, argsEndIndex).split(',');
  		    var locationString = str.substring(argsEndIndex + 1);

  		    if (locationString.indexOf('@') === 0) {
  		      var parts = /@(.+?)(?::(\d+))?(?::(\d+))?$/.exec(locationString, '');
  		      var fileName = parts[1];
  		      var lineNumber = parts[2];
  		      var columnNumber = parts[3];
  		    }

  		    return new StackFrame({
  		      functionName: functionName,
  		      args: args || undefined,
  		      fileName: fileName,
  		      lineNumber: lineNumber || undefined,
  		      columnNumber: columnNumber || undefined
  		    });
  		  };

  		  for (var i = 0; i < booleanProps.length; i++) {
  		    StackFrame.prototype['get' + _capitalize(booleanProps[i])] = _getter(booleanProps[i]);

  		    StackFrame.prototype['set' + _capitalize(booleanProps[i])] = function (p) {
  		      return function (v) {
  		        this[p] = Boolean(v);
  		      };
  		    }(booleanProps[i]);
  		  }

  		  for (var j = 0; j < numericProps.length; j++) {
  		    StackFrame.prototype['get' + _capitalize(numericProps[j])] = _getter(numericProps[j]);

  		    StackFrame.prototype['set' + _capitalize(numericProps[j])] = function (p) {
  		      return function (v) {
  		        if (!_isNumber(v)) {
  		          throw new TypeError(p + ' must be a Number');
  		        }

  		        this[p] = Number(v);
  		      };
  		    }(numericProps[j]);
  		  }

  		  for (var k = 0; k < stringProps.length; k++) {
  		    StackFrame.prototype['get' + _capitalize(stringProps[k])] = _getter(stringProps[k]);

  		    StackFrame.prototype['set' + _capitalize(stringProps[k])] = function (p) {
  		      return function (v) {
  		        this[p] = String(v);
  		      };
  		    }(stringProps[k]);
  		  }

  		  return StackFrame;
  		});

  		/***/ })

  		/******/ 	});
  		/************************************************************************/
  		/******/ 	// The module cache
  		/******/ 	var __webpack_module_cache__ = {};
  		/******/ 	
  		/******/ 	// The require function
  		/******/ 	function __webpack_require__(moduleId) {
  		/******/ 		// Check if module is in cache
  		/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
  		/******/ 		if (cachedModule !== undefined) {
  		/******/ 			return cachedModule.exports;
  		/******/ 		}
  		/******/ 		// Create a new module (and put it into the cache)
  		/******/ 		var module = __webpack_module_cache__[moduleId] = {
  		/******/ 			// no module.id needed
  		/******/ 			// no module.loaded needed
  		/******/ 			exports: {}
  		/******/ 		};
  		/******/ 	
  		/******/ 		// Execute the module function
  		/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
  		/******/ 	
  		/******/ 		// Return the exports of the module
  		/******/ 		return module.exports;
  		/******/ 	}
  		/******/ 	
  		/************************************************************************/
  		/******/ 	/* webpack/runtime/compat get default export */
  		/******/ 	(() => {
  		/******/ 		// getDefaultExport function for compatibility with non-harmony modules
  		/******/ 		__webpack_require__.n = (module) => {
  		/******/ 			var getter = module && module.__esModule ?
  		/******/ 				() => (module['default']) :
  		/******/ 				() => (module);
  		/******/ 			__webpack_require__.d(getter, { a: getter });
  		/******/ 			return getter;
  		/******/ 		};
  		/******/ 	})();
  		/******/ 	
  		/******/ 	/* webpack/runtime/define property getters */
  		/******/ 	(() => {
  		/******/ 		// define getter functions for harmony exports
  		/******/ 		__webpack_require__.d = (exports, definition) => {
  		/******/ 			for(var key in definition) {
  		/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
  		/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
  		/******/ 				}
  		/******/ 			}
  		/******/ 		};
  		/******/ 	})();
  		/******/ 	
  		/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
  		/******/ 	(() => {
  		/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop));
  		/******/ 	})();
  		/******/ 	
  		/******/ 	/* webpack/runtime/make namespace object */
  		/******/ 	(() => {
  		/******/ 		// define __esModule on exports
  		/******/ 		__webpack_require__.r = (exports) => {
  		/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
  		/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
  		/******/ 			}
  		/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
  		/******/ 		};
  		/******/ 	})();
  		/******/ 	
  		/************************************************************************/
  		var __webpack_exports__ = {};
  		// This entry need to be wrapped in an IIFE because it need to be in strict mode.
  		(() => {
  		// ESM COMPAT FLAG
  		__webpack_require__.r(__webpack_exports__);

  		// EXPORTS
  		__webpack_require__.d(__webpack_exports__, {
  		  "activate": () => (/* binding */ activate),
  		  "createBridge": () => (/* binding */ createBridge),
  		  "initialize": () => (/* binding */ backend_initialize)
  		});
  		function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		class EventEmitter {
  		  constructor() {
  		    _defineProperty(this, "listenersMap", new Map());
  		  }

  		  addListener(event, listener) {
  		    const listeners = this.listenersMap.get(event);

  		    if (listeners === undefined) {
  		      this.listenersMap.set(event, [listener]);
  		    } else {
  		      const index = listeners.indexOf(listener);

  		      if (index < 0) {
  		        listeners.push(listener);
  		      }
  		    }
  		  }

  		  emit(event, ...args) {
  		    const listeners = this.listenersMap.get(event);

  		    if (listeners !== undefined) {
  		      if (listeners.length === 1) {
  		        // No need to clone or try/catch
  		        const listener = listeners[0];
  		        listener.apply(null, args);
  		      } else {
  		        let didThrow = false;
  		        let caughtError = null;
  		        const clonedListeners = Array.from(listeners);

  		        for (let i = 0; i < clonedListeners.length; i++) {
  		          const listener = clonedListeners[i];

  		          try {
  		            listener.apply(null, args);
  		          } catch (error) {
  		            if (caughtError === null) {
  		              didThrow = true;
  		              caughtError = error;
  		            }
  		          }
  		        }

  		        if (didThrow) {
  		          throw caughtError;
  		        }
  		      }
  		    }
  		  }

  		  removeAllListeners() {
  		    this.listenersMap.clear();
  		  }

  		  removeListener(event, listener) {
  		    const listeners = this.listenersMap.get(event);

  		    if (listeners !== undefined) {
  		      const index = listeners.indexOf(listener);

  		      if (index >= 0) {
  		        listeners.splice(index, 1);
  		      }
  		    }
  		  }

  		}
  		const TREE_OPERATION_ADD = 1;
  		const TREE_OPERATION_REMOVE = 2;
  		const TREE_OPERATION_REORDER_CHILDREN = 3;
  		const TREE_OPERATION_UPDATE_TREE_BASE_DURATION = 4;
  		const TREE_OPERATION_UPDATE_ERRORS_OR_WARNINGS = 5;
  		const TREE_OPERATION_SET_SUBTREE_MODE = 7;
  		const PROFILING_FLAG_BASIC_SUPPORT = 0b01;
  		const PROFILING_FLAG_TIMELINE_SUPPORT = 0b10;
  		const SESSION_STORAGE_LAST_SELECTION_KEY = 'React::DevTools::lastSelection';
  		const constants_SESSION_STORAGE_RECORD_CHANGE_DESCRIPTIONS_KEY = 'React::DevTools::recordChangeDescriptions';
  		const constants_SESSION_STORAGE_RECORD_TIMELINE_KEY = 'React::DevTools::recordTimeline';
  		const SESSION_STORAGE_RELOAD_AND_PROFILE_KEY = 'React::DevTools::reloadAndProfile';
  		const ANSI_STYLE_DIMMING_TEMPLATE = '\x1b[2;38;2;124;124;124m%s\x1b[0m';
  		const ANSI_STYLE_DIMMING_TEMPLATE_WITH_COMPONENT_STACK = '\x1b[2;38;2;124;124;124m%s %o\x1b[0m';
  		/**
  		 * Compare [semver](https://semver.org/) version strings to find greater, equal or lesser.
  		 * This library supports the full semver specification, including comparing versions with different number of digits like `1.0.0`, `1.0`, `1`, and pre-release versions like `1.0.0-alpha`.
  		 * @param v1 - First version to compare
  		 * @param v2 - Second version to compare
  		 * @returns Numeric value compatible with the [Array.sort(fn) interface](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Parameters).
  		 */
  		const compareVersions = (v1, v2) => {
  		  // validate input and split into segments
  		  const n1 = validateAndParse(v1);
  		  const n2 = validateAndParse(v2); // pop off the patch

  		  const p1 = n1.pop();
  		  const p2 = n2.pop(); // validate numbers

  		  const r = compareSegments(n1, n2);
  		  if (r !== 0) return r; // validate pre-release

  		  if (p1 && p2) {
  		    return compareSegments(p1.split('.'), p2.split('.'));
  		  } else if (p1 || p2) {
  		    return p1 ? -1 : 1;
  		  }

  		  return 0;
  		};
  		const semver = /^[v^~<>=]*?(\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+))?(?:-([\da-z\-]+(?:\.[\da-z\-]+)*))?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?)?)?$/i;

  		const validateAndParse = version => {
  		  if (typeof version !== 'string') {
  		    throw new TypeError('Invalid argument expected string');
  		  }

  		  const match = version.match(semver);

  		  if (!match) {
  		    throw new Error(`Invalid argument not valid semver ('${version}' received)`);
  		  }

  		  match.shift();
  		  return match;
  		};

  		const isWildcard = s => s === '*' || s === 'x' || s === 'X';

  		const tryParse = v => {
  		  const n = parseInt(v, 10);
  		  return isNaN(n) ? v : n;
  		};

  		const forceType = (a, b) => typeof a !== typeof b ? [String(a), String(b)] : [a, b];

  		const compareStrings = (a, b) => {
  		  if (isWildcard(a) || isWildcard(b)) return 0;
  		  const [ap, bp] = forceType(tryParse(a), tryParse(b));
  		  if (ap > bp) return 1;
  		  if (ap < bp) return -1;
  		  return 0;
  		};

  		const compareSegments = (a, b) => {
  		  for (let i = 0; i < Math.max(a.length, b.length); i++) {
  		    const r = compareStrings(a[i] || '0', b[i] || '0');
  		    if (r !== 0) return r;
  		  }

  		  return 0;
  		};
  		// EXTERNAL MODULE: ../../node_modules/lru-cache/index.js
  		var lru_cache = __webpack_require__(3018);
  		var lru_cache_default = /*#__PURE__*/__webpack_require__.n(lru_cache);
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		 // ATTENTION
  		// When adding new symbols to this file,
  		// Please consider also adding to 'react-devtools-shared/src/backend/ReactSymbols'
  		// The Symbol used to tag the ReactElement-like types.

  		const REACT_LEGACY_ELEMENT_TYPE = Symbol.for('react.element');
  		const REACT_ELEMENT_TYPE = Symbol.for('react.transitional.element') ;
  		const REACT_PORTAL_TYPE = Symbol.for('react.portal');
  		const REACT_FRAGMENT_TYPE = Symbol.for('react.fragment');
  		const REACT_STRICT_MODE_TYPE = Symbol.for('react.strict_mode');
  		const REACT_PROFILER_TYPE = Symbol.for('react.profiler');
  		const REACT_CONSUMER_TYPE = Symbol.for('react.consumer');
  		const REACT_CONTEXT_TYPE = Symbol.for('react.context');
  		const REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');
  		const REACT_SUSPENSE_TYPE = Symbol.for('react.suspense');
  		const REACT_SUSPENSE_LIST_TYPE = Symbol.for('react.suspense_list');
  		const REACT_MEMO_TYPE = Symbol.for('react.memo');
  		const REACT_LAZY_TYPE = Symbol.for('react.lazy');
  		const REACT_TRACING_MARKER_TYPE = Symbol.for('react.tracing_marker');
  		const REACT_MEMO_CACHE_SENTINEL = Symbol.for('react.memo_cache_sentinel');
  		const REACT_VIEW_TRANSITION_TYPE = Symbol.for('react.view_transition');
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */

  		/**
  		 * WARNING:
  		 * This file contains types that are designed for React DevTools UI and how it interacts with the backend.
  		 * They might be used in different versions of DevTools backends.
  		 * Be mindful of backwards compatibility when making changes.
  		 */
  		// WARNING
  		// The values below are referenced by ComponentFilters (which are saved via localStorage).
  		// Do not change them or it will break previously saved user customizations.
  		// If new element types are added, use new numbers rather than re-ordering existing ones.
  		//
  		// Changing these types is also a backwards breaking change for the standalone shell,
  		// since the frontend and backend must share the same values-
  		// and the backend is embedded in certain environments (like React Native).
  		const types_ElementTypeClass = 1;
  		const ElementTypeContext = 2;
  		const types_ElementTypeFunction = 5;
  		const types_ElementTypeForwardRef = 6;
  		const ElementTypeHostComponent = 7;
  		const types_ElementTypeMemo = 8;
  		const ElementTypeOtherOrUnknown = 9;
  		const ElementTypeProfiler = 10;
  		const ElementTypeRoot = 11;
  		const ElementTypeSuspense = 12;
  		const ElementTypeSuspenseList = 13;
  		const ElementTypeTracingMarker = 14;
  		const types_ElementTypeVirtual = 15;
  		const ElementTypeViewTransition = 16;
  		const ElementTypeActivity = 17; // Different types of elements displayed in the Elements tree.
  		// These types may be used to visually distinguish types,
  		// or to enable/disable certain functionality.

  		// WARNING
  		// The values below are referenced by ComponentFilters (which are saved via localStorage).
  		// Do not change them or it will break previously saved user customizations.
  		// If new filter types are added, use new numbers rather than re-ordering existing ones.
  		const ComponentFilterElementType = 1;
  		const ComponentFilterDisplayName = 2;
  		const ComponentFilterLocation = 3;
  		const ComponentFilterHOC = 4;
  		const ComponentFilterEnvironmentName = 5; // Hide all elements of types in this Set.
  		// We hide host components only by default.
  		// Hide all elements with displayNames or paths matching one or more of the RegExps in this Set.
  		// Path filters are only used when elements include debug source location.
  		// Map of hook source ("<filename>:<line-number>:<column-number>") to name.
  		// Hook source is used instead of the hook itself because the latter is not stable between element inspections.
  		// We use a Map rather than an Array because of nested hooks and traversal ordering.

  		const StrictMode = 1; // Each element on the frontend corresponds to an ElementID (e.g. a Fiber) on the backend.
  		function storage_sessionStorageGetItem(key) {
  		  try {
  		    return sessionStorage.getItem(key);
  		  } catch (error) {
  		    return null;
  		  }
  		}
  		function sessionStorageRemoveItem(key) {
  		  try {
  		    sessionStorage.removeItem(key);
  		  } catch (error) {}
  		}
  		function sessionStorageSetItem(key, value) {
  		  try {
  		    return sessionStorage.setItem(key, value);
  		  } catch (error) {}
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		const isArray = Array.isArray;
  		/* harmony default export */ const src_isArray = (isArray);
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */








  		 // $FlowFixMe[method-unbinding]

  		const utils_hasOwnProperty = Object.prototype.hasOwnProperty;
  		const cachedDisplayNames = new WeakMap(); // On large trees, encoding takes significant time.
  		// Try to reuse the already encoded strings.

  		const encodedStringCache = new (lru_cache_default())({
  		  max: 1000
  		}); // Previously, the type of `Context.Provider`.

  		const LEGACY_REACT_PROVIDER_TYPE = Symbol.for('react.provider');
  		function alphaSortKeys(a, b) {
  		  if (a.toString() > b.toString()) {
  		    return 1;
  		  } else if (b.toString() > a.toString()) {
  		    return -1;
  		  } else {
  		    return 0;
  		  }
  		}
  		function getAllEnumerableKeys(obj) {
  		  const keys = new Set();
  		  let current = obj;

  		  while (current != null) {
  		    const currentKeys = [...Object.keys(current), ...Object.getOwnPropertySymbols(current)];
  		    const descriptors = Object.getOwnPropertyDescriptors(current);
  		    currentKeys.forEach(key => {
  		      // $FlowFixMe[incompatible-type]: key can be a Symbol https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyDescriptor
  		      if (descriptors[key].enumerable) {
  		        keys.add(key);
  		      }
  		    });
  		    current = Object.getPrototypeOf(current);
  		  }

  		  return keys;
  		} // Mirror https://github.com/facebook/react/blob/7c21bf72ace77094fd1910cc350a548287ef8350/packages/shared/getComponentName.js#L27-L37

  		function getWrappedDisplayName(outerType, innerType, wrapperName, fallbackName) {
  		  const displayName = outerType?.displayName;
  		  return displayName || `${wrapperName}(${getDisplayName(innerType, fallbackName)})`;
  		}
  		function getDisplayName(type, fallbackName = 'Anonymous') {
  		  const nameFromCache = cachedDisplayNames.get(type);

  		  if (nameFromCache != null) {
  		    return nameFromCache;
  		  }

  		  let displayName = fallbackName; // The displayName property is not guaranteed to be a string.
  		  // It's only safe to use for our purposes if it's a string.
  		  // github.com/facebook/react-devtools/issues/803

  		  if (typeof type.displayName === 'string') {
  		    displayName = type.displayName;
  		  } else if (typeof type.name === 'string' && type.name !== '') {
  		    displayName = type.name;
  		  }

  		  cachedDisplayNames.set(type, displayName);
  		  return displayName;
  		}
  		let uidCounter = 0;
  		function getUID() {
  		  return ++uidCounter;
  		}

  		function surrogatePairToCodePoint(charCode1, charCode2) {
  		  return ((charCode1 & 0x3ff) << 10) + (charCode2 & 0x3ff) + 0x10000;
  		} // Credit for this encoding approach goes to Tim Down:
  		// https://stackoverflow.com/questions/4877326/how-can-i-tell-if-a-string-contains-multibyte-characters-in-javascript


  		function utfEncodeString(string) {
  		  const cached = encodedStringCache.get(string);

  		  if (cached !== undefined) {
  		    return cached;
  		  }

  		  const encoded = [];
  		  let i = 0;
  		  let charCode;

  		  while (i < string.length) {
  		    charCode = string.charCodeAt(i); // Handle multibyte unicode characters (like emoji).

  		    if ((charCode & 0xf800) === 0xd800) {
  		      encoded.push(surrogatePairToCodePoint(charCode, string.charCodeAt(++i)));
  		    } else {
  		      encoded.push(charCode);
  		    }

  		    ++i;
  		  }

  		  encodedStringCache.set(string, encoded);
  		  return encoded;
  		}
  		function getDefaultComponentFilters() {
  		  return [{
  		    type: ComponentFilterElementType,
  		    value: ElementTypeHostComponent,
  		    isEnabled: true
  		  }];
  		}
  		// of a component, represented by the Fiber, is based on lazily generating and parsing component stack frames
  		// To find the original location, React DevTools will perform symbolication, source maps are required for that.
  		// In order to start filtering Fibers, we need to find location for all of them, which can't be done lazily.
  		// Eager symbolication can become quite expensive for large applications.

  		function filterOutLocationComponentFilters(componentFilters) {
  		  // This is just an additional check to preserve the previous state
  		  // Filters can be stored on the backend side or in user land (in a window object)
  		  if (!Array.isArray(componentFilters)) {
  		    return componentFilters;
  		  }

  		  return componentFilters.filter(f => f.type !== ComponentFilterLocation);
  		}
  		function utils_getInObject(object, path) {
  		  return path.reduce((reduced, attr) => {
  		    if (reduced) {
  		      if (utils_hasOwnProperty.call(reduced, attr)) {
  		        return reduced[attr];
  		      }

  		      if (typeof reduced[Symbol.iterator] === 'function') {
  		        // Convert iterable to array and return array[index]
  		        //
  		        // TRICKY
  		        // Don't use [...spread] syntax for this purpose.
  		        // This project uses @babel/plugin-transform-spread in "loose" mode which only works with Array values.
  		        // Other types (e.g. typed arrays, Sets) will not spread correctly.
  		        return Array.from(reduced)[attr];
  		      }
  		    }

  		    return null;
  		  }, object);
  		}
  		function deletePathInObject(object, path) {
  		  const length = path.length;
  		  const last = path[length - 1];

  		  if (object != null) {
  		    const parent = utils_getInObject(object, path.slice(0, length - 1));

  		    if (parent) {
  		      if (src_isArray(parent)) {
  		        parent.splice(last, 1);
  		      } else {
  		        delete parent[last];
  		      }
  		    }
  		  }
  		}
  		function renamePathInObject(object, oldPath, newPath) {
  		  const length = oldPath.length;

  		  if (object != null) {
  		    const parent = utils_getInObject(object, oldPath.slice(0, length - 1));

  		    if (parent) {
  		      const lastOld = oldPath[length - 1];
  		      const lastNew = newPath[length - 1];
  		      parent[lastNew] = parent[lastOld];

  		      if (src_isArray(parent)) {
  		        parent.splice(lastOld, 1);
  		      } else {
  		        delete parent[lastOld];
  		      }
  		    }
  		  }
  		}
  		function utils_setInObject(object, path, value) {
  		  const length = path.length;
  		  const last = path[length - 1];

  		  if (object != null) {
  		    const parent = utils_getInObject(object, path.slice(0, length - 1));

  		    if (parent) {
  		      parent[last] = value;
  		    }
  		  }
  		}

  		function isError(data) {
  		  // If it doesn't event look like an error, it won't be an actual error.
  		  if ('name' in data && 'message' in data) {
  		    while (data) {
  		      // $FlowFixMe[method-unbinding]
  		      if (Object.prototype.toString.call(data) === '[object Error]') {
  		        return true;
  		      }

  		      data = Object.getPrototypeOf(data);
  		    }
  		  }

  		  return false;
  		}
  		/**
  		 * Get a enhanced/artificial type string based on the object instance
  		 */


  		function getDataType(data) {
  		  if (data === null) {
  		    return 'null';
  		  } else if (data === undefined) {
  		    return 'undefined';
  		  }

  		  if (typeof HTMLElement !== 'undefined' && data instanceof HTMLElement) {
  		    return 'html_element';
  		  }

  		  const type = typeof data;

  		  switch (type) {
  		    case 'bigint':
  		      return 'bigint';

  		    case 'boolean':
  		      return 'boolean';

  		    case 'function':
  		      return 'function';

  		    case 'number':
  		      if (Number.isNaN(data)) {
  		        return 'nan';
  		      } else if (!Number.isFinite(data)) {
  		        return 'infinity';
  		      } else {
  		        return 'number';
  		      }

  		    case 'object':
  		      if (data.$$typeof === REACT_ELEMENT_TYPE || data.$$typeof === REACT_LEGACY_ELEMENT_TYPE) {
  		        return 'react_element';
  		      }

  		      if (src_isArray(data)) {
  		        return 'array';
  		      } else if (ArrayBuffer.isView(data)) {
  		        return utils_hasOwnProperty.call(data.constructor, 'BYTES_PER_ELEMENT') ? 'typed_array' : 'data_view';
  		      } else if (data.constructor && data.constructor.name === 'ArrayBuffer') {
  		        // HACK This ArrayBuffer check is gross; is there a better way?
  		        // We could try to create a new DataView with the value.
  		        // If it doesn't error, we know it's an ArrayBuffer,
  		        // but this seems kind of awkward and expensive.
  		        return 'array_buffer';
  		      } else if (typeof data[Symbol.iterator] === 'function') {
  		        const iterator = data[Symbol.iterator]();

  		        if (!iterator) ; else {
  		          return iterator === data ? 'opaque_iterator' : 'iterator';
  		        }
  		      } else if (data.constructor && data.constructor.name === 'RegExp') {
  		        return 'regexp';
  		      } else if (typeof data.then === 'function') {
  		        return 'thenable';
  		      } else if (isError(data)) {
  		        return 'error';
  		      } else {
  		        // $FlowFixMe[method-unbinding]
  		        const toStringValue = Object.prototype.toString.call(data);

  		        if (toStringValue === '[object Date]') {
  		          return 'date';
  		        } else if (toStringValue === '[object HTMLAllCollection]') {
  		          return 'html_all_collection';
  		        }
  		      }

  		      if (!isPlainObject(data)) {
  		        return 'class_instance';
  		      }

  		      return 'object';

  		    case 'string':
  		      return 'string';

  		    case 'symbol':
  		      return 'symbol';

  		    case 'undefined':
  		      if ( // $FlowFixMe[method-unbinding]
  		      Object.prototype.toString.call(data) === '[object HTMLAllCollection]') {
  		        return 'html_all_collection';
  		      }

  		      return 'undefined';

  		    default:
  		      return 'unknown';
  		  }
  		} // Fork of packages/react-is/src/ReactIs.js:30, but with legacy element type
  		// Which has been changed in https://github.com/facebook/react/pull/28813

  		function typeOfWithLegacyElementSymbol(object) {
  		  if (typeof object === 'object' && object !== null) {
  		    const $$typeof = object.$$typeof;

  		    switch ($$typeof) {
  		      case REACT_ELEMENT_TYPE:
  		      case REACT_LEGACY_ELEMENT_TYPE:
  		        const type = object.type;

  		        switch (type) {
  		          case REACT_FRAGMENT_TYPE:
  		          case REACT_PROFILER_TYPE:
  		          case REACT_STRICT_MODE_TYPE:
  		          case REACT_SUSPENSE_TYPE:
  		          case REACT_SUSPENSE_LIST_TYPE:
  		          case REACT_VIEW_TRANSITION_TYPE:
  		            return type;

  		          default:
  		            const $$typeofType = type && type.$$typeof;

  		            switch ($$typeofType) {
  		              case REACT_CONTEXT_TYPE:
  		              case REACT_FORWARD_REF_TYPE:
  		              case REACT_LAZY_TYPE:
  		              case REACT_MEMO_TYPE:
  		                return $$typeofType;

  		              case REACT_CONSUMER_TYPE:
  		                return $$typeofType;
  		              // Fall through

  		              default:
  		                return $$typeof;
  		            }

  		        }

  		      case REACT_PORTAL_TYPE:
  		        return $$typeof;
  		    }
  		  }

  		  return undefined;
  		}

  		function getDisplayNameForReactElement(element) {
  		  const elementType = typeOfWithLegacyElementSymbol(element);

  		  switch (elementType) {
  		    case REACT_CONSUMER_TYPE:
  		      return 'ContextConsumer';

  		    case LEGACY_REACT_PROVIDER_TYPE:
  		      return 'ContextProvider';

  		    case REACT_CONTEXT_TYPE:
  		      return 'Context';

  		    case REACT_FORWARD_REF_TYPE:
  		      return 'ForwardRef';

  		    case REACT_FRAGMENT_TYPE:
  		      return 'Fragment';

  		    case REACT_LAZY_TYPE:
  		      return 'Lazy';

  		    case REACT_MEMO_TYPE:
  		      return 'Memo';

  		    case REACT_PORTAL_TYPE:
  		      return 'Portal';

  		    case REACT_PROFILER_TYPE:
  		      return 'Profiler';

  		    case REACT_STRICT_MODE_TYPE:
  		      return 'StrictMode';

  		    case REACT_SUSPENSE_TYPE:
  		      return 'Suspense';

  		    case REACT_SUSPENSE_LIST_TYPE:
  		      return 'SuspenseList';

  		    case REACT_VIEW_TRANSITION_TYPE:
  		      return 'ViewTransition';

  		    case REACT_TRACING_MARKER_TYPE:
  		      return 'TracingMarker';

  		    default:
  		      const {
  		        type
  		      } = element;

  		      if (typeof type === 'string') {
  		        return type;
  		      } else if (typeof type === 'function') {
  		        return getDisplayName(type, 'Anonymous');
  		      } else if (type != null) {
  		        return 'NotImplementedInDevtools';
  		      } else {
  		        return 'Element';
  		      }

  		  }
  		}
  		const MAX_PREVIEW_STRING_LENGTH = 50;

  		function truncateForDisplay(string, length = MAX_PREVIEW_STRING_LENGTH) {
  		  if (string.length > length) {
  		    return string.slice(0, length) + '…';
  		  } else {
  		    return string;
  		  }
  		} // Attempts to mimic Chrome's inline preview for values.
  		// For example, the following value...
  		//   {
  		//      foo: 123,
  		//      bar: "abc",
  		//      baz: [true, false],
  		//      qux: { ab: 1, cd: 2 }
  		//   };
  		//
  		// Would show a preview of...
  		//   {foo: 123, bar: "abc", baz: Array(2), qux: {…}}
  		//
  		// And the following value...
  		//   [
  		//     123,
  		//     "abc",
  		//     [true, false],
  		//     { foo: 123, bar: "abc" }
  		//   ];
  		//
  		// Would show a preview of...
  		//   [123, "abc", Array(2), {…}]


  		function formatDataForPreview(data, showFormattedValue) {
  		  if (data != null && utils_hasOwnProperty.call(data, meta.type)) {
  		    return showFormattedValue ? data[meta.preview_long] : data[meta.preview_short];
  		  }

  		  const type = getDataType(data);

  		  switch (type) {
  		    case 'html_element':
  		      return `<${truncateForDisplay(data.tagName.toLowerCase())} />`;

  		    case 'function':
  		      if (typeof data.name === 'function' || data.name === '') {
  		        return '() => {}';
  		      }

  		      return `${truncateForDisplay(data.name)}() {}`;

  		    case 'string':
  		      return `"${data}"`;

  		    case 'bigint':
  		      return truncateForDisplay(data.toString() + 'n');

  		    case 'regexp':
  		      return truncateForDisplay(data.toString());

  		    case 'symbol':
  		      return truncateForDisplay(data.toString());

  		    case 'react_element':
  		      return `<${truncateForDisplay(getDisplayNameForReactElement(data) || 'Unknown')} />`;

  		    case 'array_buffer':
  		      return `ArrayBuffer(${data.byteLength})`;

  		    case 'data_view':
  		      return `DataView(${data.buffer.byteLength})`;

  		    case 'array':
  		      if (showFormattedValue) {
  		        let formatted = '';

  		        for (let i = 0; i < data.length; i++) {
  		          if (i > 0) {
  		            formatted += ', ';
  		          }

  		          formatted += formatDataForPreview(data[i], false);

  		          if (formatted.length > MAX_PREVIEW_STRING_LENGTH) {
  		            // Prevent doing a lot of unnecessary iteration...
  		            break;
  		          }
  		        }

  		        return `[${truncateForDisplay(formatted)}]`;
  		      } else {
  		        const length = utils_hasOwnProperty.call(data, meta.size) ? data[meta.size] : data.length;
  		        return `Array(${length})`;
  		      }

  		    case 'typed_array':
  		      const shortName = `${data.constructor.name}(${data.length})`;

  		      if (showFormattedValue) {
  		        let formatted = '';

  		        for (let i = 0; i < data.length; i++) {
  		          if (i > 0) {
  		            formatted += ', ';
  		          }

  		          formatted += data[i];

  		          if (formatted.length > MAX_PREVIEW_STRING_LENGTH) {
  		            // Prevent doing a lot of unnecessary iteration...
  		            break;
  		          }
  		        }

  		        return `${shortName} [${truncateForDisplay(formatted)}]`;
  		      } else {
  		        return shortName;
  		      }

  		    case 'iterator':
  		      const name = data.constructor.name;

  		      if (showFormattedValue) {
  		        // TRICKY
  		        // Don't use [...spread] syntax for this purpose.
  		        // This project uses @babel/plugin-transform-spread in "loose" mode which only works with Array values.
  		        // Other types (e.g. typed arrays, Sets) will not spread correctly.
  		        const array = Array.from(data);
  		        let formatted = '';

  		        for (let i = 0; i < array.length; i++) {
  		          const entryOrEntries = array[i];

  		          if (i > 0) {
  		            formatted += ', ';
  		          } // TRICKY
  		          // Browsers display Maps and Sets differently.
  		          // To mimic their behavior, detect if we've been given an entries tuple.
  		          //   Map(2) {"abc" => 123, "def" => 123}
  		          //   Set(2) {"abc", 123}


  		          if (src_isArray(entryOrEntries)) {
  		            const key = formatDataForPreview(entryOrEntries[0], true);
  		            const value = formatDataForPreview(entryOrEntries[1], false);
  		            formatted += `${key} => ${value}`;
  		          } else {
  		            formatted += formatDataForPreview(entryOrEntries, false);
  		          }

  		          if (formatted.length > MAX_PREVIEW_STRING_LENGTH) {
  		            // Prevent doing a lot of unnecessary iteration...
  		            break;
  		          }
  		        }

  		        return `${name}(${data.size}) {${truncateForDisplay(formatted)}}`;
  		      } else {
  		        return `${name}(${data.size})`;
  		      }

  		    case 'opaque_iterator':
  		      {
  		        return data[Symbol.toStringTag];
  		      }

  		    case 'date':
  		      return data.toString();

  		    case 'class_instance':
  		      try {
  		        let resolvedConstructorName = data.constructor.name;

  		        if (typeof resolvedConstructorName === 'string') {
  		          return resolvedConstructorName;
  		        }

  		        resolvedConstructorName = Object.getPrototypeOf(data).constructor.name;

  		        if (typeof resolvedConstructorName === 'string') {
  		          return resolvedConstructorName;
  		        }

  		        try {
  		          return truncateForDisplay(String(data));
  		        } catch (error) {
  		          return 'unserializable';
  		        }
  		      } catch (error) {
  		        return 'unserializable';
  		      }

  		    case 'thenable':
  		      let displayName;

  		      if (isPlainObject(data)) {
  		        displayName = 'Thenable';
  		      } else {
  		        let resolvedConstructorName = data.constructor.name;

  		        if (typeof resolvedConstructorName !== 'string') {
  		          resolvedConstructorName = Object.getPrototypeOf(data).constructor.name;
  		        }

  		        if (typeof resolvedConstructorName === 'string') {
  		          displayName = resolvedConstructorName;
  		        } else {
  		          displayName = 'Thenable';
  		        }
  		      }

  		      switch (data.status) {
  		        case 'pending':
  		          return `pending ${displayName}`;

  		        case 'fulfilled':
  		          if (showFormattedValue) {
  		            const formatted = formatDataForPreview(data.value, false);
  		            return `fulfilled ${displayName} {${truncateForDisplay(formatted)}}`;
  		          } else {
  		            return `fulfilled ${displayName} {…}`;
  		          }

  		        case 'rejected':
  		          if (showFormattedValue) {
  		            const formatted = formatDataForPreview(data.reason, false);
  		            return `rejected ${displayName} {${truncateForDisplay(formatted)}}`;
  		          } else {
  		            return `rejected ${displayName} {…}`;
  		          }

  		        default:
  		          return displayName;
  		      }

  		    case 'object':
  		      if (showFormattedValue) {
  		        const keys = Array.from(getAllEnumerableKeys(data)).sort(alphaSortKeys);
  		        let formatted = '';

  		        for (let i = 0; i < keys.length; i++) {
  		          const key = keys[i];

  		          if (i > 0) {
  		            formatted += ', ';
  		          }

  		          formatted += `${key.toString()}: ${formatDataForPreview(data[key], false)}`;

  		          if (formatted.length > MAX_PREVIEW_STRING_LENGTH) {
  		            // Prevent doing a lot of unnecessary iteration...
  		            break;
  		          }
  		        }

  		        return `{${truncateForDisplay(formatted)}}`;
  		      } else {
  		        return '{…}';
  		      }

  		    case 'error':
  		      return truncateForDisplay(String(data));

  		    case 'boolean':
  		    case 'number':
  		    case 'infinity':
  		    case 'nan':
  		    case 'null':
  		    case 'undefined':
  		      return String(data);

  		    default:
  		      try {
  		        return truncateForDisplay(String(data));
  		      } catch (error) {
  		        return 'unserializable';
  		      }

  		  }
  		} // Basically checking that the object only has Object in its prototype chain

  		const isPlainObject = object => {
  		  const objectPrototype = Object.getPrototypeOf(object);
  		  if (!objectPrototype) return true;
  		  const objectParentPrototype = Object.getPrototypeOf(objectPrototype);
  		  return !objectParentPrototype;
  		};
  		function getIsReloadAndProfileSupported() {
  		  // Notify the frontend if the backend supports the Storage API (e.g. localStorage).
  		  // If not, features like reload-and-profile will not work correctly and must be disabled.
  		  let isBackendStorageAPISupported = false;

  		  try {
  		    localStorage.getItem('test');
  		    isBackendStorageAPISupported = true;
  		  } catch (error) {}

  		  return isBackendStorageAPISupported && isSynchronousXHRSupported();
  		} // Expected to be used only by browser extension and react-devtools-inline

  		function getIfReloadedAndProfiling() {
  		  return storage_sessionStorageGetItem(SESSION_STORAGE_RELOAD_AND_PROFILE_KEY) === 'true';
  		}
  		function onReloadAndProfile(recordChangeDescriptions, recordTimeline) {
  		  sessionStorageSetItem(SESSION_STORAGE_RELOAD_AND_PROFILE_KEY, 'true');
  		  sessionStorageSetItem(constants_SESSION_STORAGE_RECORD_CHANGE_DESCRIPTIONS_KEY, recordChangeDescriptions ? 'true' : 'false');
  		  sessionStorageSetItem(constants_SESSION_STORAGE_RECORD_TIMELINE_KEY, recordTimeline ? 'true' : 'false');
  		}
  		function onReloadAndProfileFlagsReset() {
  		  sessionStorageRemoveItem(SESSION_STORAGE_RELOAD_AND_PROFILE_KEY);
  		  sessionStorageRemoveItem(constants_SESSION_STORAGE_RECORD_CHANGE_DESCRIPTIONS_KEY);
  		  sessionStorageRemoveItem(constants_SESSION_STORAGE_RECORD_TIMELINE_KEY);
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */

  		const meta = {
  		  preview_long: Symbol('preview_long'),
  		  preview_short: Symbol('preview_short'),
  		  size: Symbol('size'),
  		  type: Symbol('type')}; // Typed arrays, other complex iteratable objects (e.g. Map, Set, ImmutableJS) or Promises need special handling.
  		// These objects can't be serialized without losing type information,
  		// so a "Unserializable" type wrapper is used (with meta-data keys) to send nested values-
  		// while preserving the original type and name.

  		// This threshold determines the depth at which the bridge "dehydrates" nested data.
  		// Dehydration means that we don't serialize the data for e.g. postMessage or stringify,
  		// unless the frontend explicitly requests it (e.g. a user clicks to expand a props object).
  		//
  		// Reducing this threshold will improve the speed of initial component inspection,
  		// but may decrease the responsiveness of expanding objects/arrays to inspect further.
  		const LEVEL_THRESHOLD = 2;
  		/**
  		 * Generate the dehydrated metadata for complex object instances
  		 */

  		function createDehydrated(type, inspectable, data, cleaned, path) {
  		  cleaned.push(path);
  		  const dehydrated = {
  		    inspectable,
  		    type,
  		    preview_long: formatDataForPreview(data, true),
  		    preview_short: formatDataForPreview(data, false),
  		    name: typeof data.constructor !== 'function' || typeof data.constructor.name !== 'string' || data.constructor.name === 'Object' ? '' : data.constructor.name
  		  };

  		  if (type === 'array' || type === 'typed_array') {
  		    dehydrated.size = data.length;
  		  } else if (type === 'object') {
  		    dehydrated.size = Object.keys(data).length;
  		  }

  		  if (type === 'iterator' || type === 'typed_array') {
  		    dehydrated.readonly = true;
  		  }

  		  return dehydrated;
  		}
  		/**
  		 * Strip out complex data (instances, functions, and data nested > LEVEL_THRESHOLD levels deep).
  		 * The paths of the stripped out objects are appended to the `cleaned` list.
  		 * On the other side of the barrier, the cleaned list is used to "re-hydrate" the cleaned representation into
  		 * an object with symbols as attributes, so that a sanitized object can be distinguished from a normal object.
  		 *
  		 * Input: {"some": {"attr": fn()}, "other": AnInstance}
  		 * Output: {
  		 *   "some": {
  		 *     "attr": {"name": the fn.name, type: "function"}
  		 *   },
  		 *   "other": {
  		 *     "name": "AnInstance",
  		 *     "type": "object",
  		 *   },
  		 * }
  		 * and cleaned = [["some", "attr"], ["other"]]
  		 */


  		function dehydrate(data, cleaned, unserializable, path, isPathAllowed, level = 0) {
  		  const type = getDataType(data);
  		  let isPathAllowedCheck;

  		  switch (type) {
  		    case 'html_element':
  		      cleaned.push(path);
  		      return {
  		        inspectable: false,
  		        preview_short: formatDataForPreview(data, false),
  		        preview_long: formatDataForPreview(data, true),
  		        name: data.tagName,
  		        type
  		      };

  		    case 'function':
  		      cleaned.push(path);
  		      return {
  		        inspectable: false,
  		        preview_short: formatDataForPreview(data, false),
  		        preview_long: formatDataForPreview(data, true),
  		        name: typeof data.name === 'function' || !data.name ? 'function' : data.name,
  		        type
  		      };

  		    case 'string':
  		      isPathAllowedCheck = isPathAllowed(path);

  		      if (isPathAllowedCheck) {
  		        return data;
  		      } else {
  		        return data.length <= 500 ? data : data.slice(0, 500) + '...';
  		      }

  		    case 'bigint':
  		      cleaned.push(path);
  		      return {
  		        inspectable: false,
  		        preview_short: formatDataForPreview(data, false),
  		        preview_long: formatDataForPreview(data, true),
  		        name: data.toString(),
  		        type
  		      };

  		    case 'symbol':
  		      cleaned.push(path);
  		      return {
  		        inspectable: false,
  		        preview_short: formatDataForPreview(data, false),
  		        preview_long: formatDataForPreview(data, true),
  		        name: data.toString(),
  		        type
  		      };
  		    // React Elements aren't very inspector-friendly,
  		    // and often contain private fields or circular references.

  		    case 'react_element':
  		      cleaned.push(path);
  		      return {
  		        inspectable: false,
  		        preview_short: formatDataForPreview(data, false),
  		        preview_long: formatDataForPreview(data, true),
  		        name: getDisplayNameForReactElement(data) || 'Unknown',
  		        type
  		      };
  		    // ArrayBuffers error if you try to inspect them.

  		    case 'array_buffer':
  		    case 'data_view':
  		      cleaned.push(path);
  		      return {
  		        inspectable: false,
  		        preview_short: formatDataForPreview(data, false),
  		        preview_long: formatDataForPreview(data, true),
  		        name: type === 'data_view' ? 'DataView' : 'ArrayBuffer',
  		        size: data.byteLength,
  		        type
  		      };

  		    case 'array':
  		      isPathAllowedCheck = isPathAllowed(path);

  		      if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) {
  		        return createDehydrated(type, true, data, cleaned, path);
  		      }

  		      const arr = [];

  		      for (let i = 0; i < data.length; i++) {
  		        arr[i] = dehydrateKey(data, i, cleaned, unserializable, path.concat([i]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
  		      }

  		      return arr;

  		    case 'html_all_collection':
  		    case 'typed_array':
  		    case 'iterator':
  		      isPathAllowedCheck = isPathAllowed(path);

  		      if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) {
  		        return createDehydrated(type, true, data, cleaned, path);
  		      } else {
  		        const unserializableValue = {
  		          unserializable: true,
  		          type: type,
  		          readonly: true,
  		          size: type === 'typed_array' ? data.length : undefined,
  		          preview_short: formatDataForPreview(data, false),
  		          preview_long: formatDataForPreview(data, true),
  		          name: typeof data.constructor !== 'function' || typeof data.constructor.name !== 'string' || data.constructor.name === 'Object' ? '' : data.constructor.name
  		        }; // TRICKY
  		        // Don't use [...spread] syntax for this purpose.
  		        // This project uses @babel/plugin-transform-spread in "loose" mode which only works with Array values.
  		        // Other types (e.g. typed arrays, Sets) will not spread correctly.

  		        Array.from(data).forEach((item, i) => unserializableValue[i] = dehydrate(item, cleaned, unserializable, path.concat([i]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1));
  		        unserializable.push(path);
  		        return unserializableValue;
  		      }

  		    case 'opaque_iterator':
  		      cleaned.push(path);
  		      return {
  		        inspectable: false,
  		        preview_short: formatDataForPreview(data, false),
  		        preview_long: formatDataForPreview(data, true),
  		        name: data[Symbol.toStringTag],
  		        type
  		      };

  		    case 'date':
  		      cleaned.push(path);
  		      return {
  		        inspectable: false,
  		        preview_short: formatDataForPreview(data, false),
  		        preview_long: formatDataForPreview(data, true),
  		        name: data.toString(),
  		        type
  		      };

  		    case 'regexp':
  		      cleaned.push(path);
  		      return {
  		        inspectable: false,
  		        preview_short: formatDataForPreview(data, false),
  		        preview_long: formatDataForPreview(data, true),
  		        name: data.toString(),
  		        type
  		      };

  		    case 'thenable':
  		      isPathAllowedCheck = isPathAllowed(path);

  		      if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) {
  		        return {
  		          inspectable: data.status === 'fulfilled' || data.status === 'rejected',
  		          preview_short: formatDataForPreview(data, false),
  		          preview_long: formatDataForPreview(data, true),
  		          name: data.toString(),
  		          type
  		        };
  		      }

  		      switch (data.status) {
  		        case 'fulfilled':
  		          {
  		            const unserializableValue = {
  		              unserializable: true,
  		              type: type,
  		              preview_short: formatDataForPreview(data, false),
  		              preview_long: formatDataForPreview(data, true),
  		              name: 'fulfilled Thenable'
  		            };
  		            unserializableValue.value = dehydrate(data.value, cleaned, unserializable, path.concat(['value']), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
  		            unserializable.push(path);
  		            return unserializableValue;
  		          }

  		        case 'rejected':
  		          {
  		            const unserializableValue = {
  		              unserializable: true,
  		              type: type,
  		              preview_short: formatDataForPreview(data, false),
  		              preview_long: formatDataForPreview(data, true),
  		              name: 'rejected Thenable'
  		            };
  		            unserializableValue.reason = dehydrate(data.reason, cleaned, unserializable, path.concat(['reason']), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
  		            unserializable.push(path);
  		            return unserializableValue;
  		          }

  		        default:
  		          cleaned.push(path);
  		          return {
  		            inspectable: false,
  		            preview_short: formatDataForPreview(data, false),
  		            preview_long: formatDataForPreview(data, true),
  		            name: data.toString(),
  		            type
  		          };
  		      }

  		    case 'object':
  		      isPathAllowedCheck = isPathAllowed(path);

  		      if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) {
  		        return createDehydrated(type, true, data, cleaned, path);
  		      } else {
  		        const object = {};
  		        getAllEnumerableKeys(data).forEach(key => {
  		          const name = key.toString();
  		          object[name] = dehydrateKey(data, key, cleaned, unserializable, path.concat([name]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
  		        });
  		        return object;
  		      }

  		    case 'class_instance':
  		      {
  		        isPathAllowedCheck = isPathAllowed(path);

  		        if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) {
  		          return createDehydrated(type, true, data, cleaned, path);
  		        }

  		        const value = {
  		          unserializable: true,
  		          type,
  		          readonly: true,
  		          preview_short: formatDataForPreview(data, false),
  		          preview_long: formatDataForPreview(data, true),
  		          name: typeof data.constructor !== 'function' || typeof data.constructor.name !== 'string' ? '' : data.constructor.name
  		        };
  		        getAllEnumerableKeys(data).forEach(key => {
  		          const keyAsString = key.toString();
  		          value[keyAsString] = dehydrate(data[key], cleaned, unserializable, path.concat([keyAsString]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
  		        });
  		        unserializable.push(path);
  		        return value;
  		      }

  		    case 'error':
  		      {
  		        isPathAllowedCheck = isPathAllowed(path);

  		        if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) {
  		          return createDehydrated(type, true, data, cleaned, path);
  		        }

  		        const value = {
  		          unserializable: true,
  		          type,
  		          readonly: true,
  		          preview_short: formatDataForPreview(data, false),
  		          preview_long: formatDataForPreview(data, true),
  		          name: data.name
  		        }; // name, message, stack and cause are not enumerable yet still interesting.

  		        value.message = dehydrate(data.message, cleaned, unserializable, path.concat(['message']), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
  		        value.stack = dehydrate(data.stack, cleaned, unserializable, path.concat(['stack']), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);

  		        if ('cause' in data) {
  		          value.cause = dehydrate(data.cause, cleaned, unserializable, path.concat(['cause']), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
  		        }

  		        getAllEnumerableKeys(data).forEach(key => {
  		          const keyAsString = key.toString();
  		          value[keyAsString] = dehydrate(data[key], cleaned, unserializable, path.concat([keyAsString]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
  		        });
  		        unserializable.push(path);
  		        return value;
  		      }

  		    case 'infinity':
  		    case 'nan':
  		    case 'undefined':
  		      // Some values are lossy when sent through a WebSocket.
  		      // We dehydrate+rehydrate them to preserve their type.
  		      cleaned.push(path);
  		      return {
  		        type
  		      };

  		    default:
  		      return data;
  		  }
  		}

  		function dehydrateKey(parent, key, cleaned, unserializable, path, isPathAllowed, level = 0) {
  		  try {
  		    return dehydrate(parent[key], cleaned, unserializable, path, isPathAllowed, level);
  		  } catch (error) {
  		    let preview = '';

  		    if (typeof error === 'object' && error !== null && typeof error.stack === 'string') {
  		      preview = error.stack;
  		    } else if (typeof error === 'string') {
  		      preview = error;
  		    }

  		    cleaned.push(path);
  		    return {
  		      inspectable: false,
  		      preview_short: '[Exception]',
  		      preview_long: preview ? '[Exception: ' + preview + ']' : '[Exception]',
  		      name: preview,
  		      type: 'unknown'
  		    };
  		  }
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		const isArrayImpl = Array.isArray;

  		function isArray_isArray(a) {
  		  return isArrayImpl(a);
  		}

  		/* harmony default export */ const shared_isArray = (isArray_isArray);
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		// This is a DevTools fork of shared/ReactOwnerStackFrames.
  		function formatOwnerStack(error) {
  		  const prevPrepareStackTrace = Error.prepareStackTrace; // $FlowFixMe[incompatible-type] It does accept undefined.

  		  Error.prepareStackTrace = undefined;
  		  const stack = error.stack;
  		  Error.prepareStackTrace = prevPrepareStackTrace;
  		  return formatOwnerStackString(stack);
  		}
  		function formatOwnerStackString(stack) {
  		  if (stack.startsWith('Error: react-stack-top-frame\n')) {
  		    // V8's default formatting prefixes with the error message which we
  		    // don't want/need.
  		    stack = stack.slice(29);
  		  }

  		  let idx = stack.indexOf('\n');

  		  if (idx !== -1) {
  		    // Pop the JSX frame.
  		    stack = stack.slice(idx + 1);
  		  }

  		  idx = stack.indexOf('react_stack_bottom_frame');

  		  if (idx === -1) {
  		    idx = stack.indexOf('react-stack-bottom-frame');
  		  }

  		  if (idx !== -1) {
  		    idx = stack.lastIndexOf('\n', idx);
  		  }

  		  if (idx !== -1) {
  		    // Cut off everything after the bottom frame since it'll be internals.
  		    stack = stack.slice(0, idx);
  		  } else {
  		    // We didn't find any internal callsite out to user space.
  		    // This means that this was called outside an owner or the owner is fully internal.
  		    // To keep things light we exclude the entire trace in this case.
  		    return '';
  		  }

  		  return stack;
  		}
  		/**
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */





  		 // TODO: update this to the first React version that has a corresponding DevTools backend

  		const FIRST_DEVTOOLS_BACKEND_LOCKSTEP_VER = '999.9.9';
  		function hasAssignedBackend(version) {
  		  if (version == null || version === '') {
  		    return false;
  		  }

  		  return gte(version, FIRST_DEVTOOLS_BACKEND_LOCKSTEP_VER);
  		}
  		function cleanForBridge(data, isPathAllowed, path = []) {
  		  if (data !== null) {
  		    const cleanedPaths = [];
  		    const unserializablePaths = [];
  		    const cleanedData = dehydrate(data, cleanedPaths, unserializablePaths, path, isPathAllowed);
  		    return {
  		      data: cleanedData,
  		      cleaned: cleanedPaths,
  		      unserializable: unserializablePaths
  		    };
  		  } else {
  		    return null;
  		  }
  		}
  		function copyWithDelete(obj, path, index = 0) {
  		  const key = path[index];
  		  const updated = shared_isArray(obj) ? obj.slice() : { ...obj
  		  };

  		  if (index + 1 === path.length) {
  		    if (shared_isArray(updated)) {
  		      updated.splice(key, 1);
  		    } else {
  		      delete updated[key];
  		    }
  		  } else {
  		    // $FlowFixMe[incompatible-use] number or string is fine here
  		    updated[key] = copyWithDelete(obj[key], path, index + 1);
  		  }

  		  return updated;
  		} // This function expects paths to be the same except for the final value.
  		// e.g. ['path', 'to', 'foo'] and ['path', 'to', 'bar']

  		function copyWithRename(obj, oldPath, newPath, index = 0) {
  		  const oldKey = oldPath[index];
  		  const updated = shared_isArray(obj) ? obj.slice() : { ...obj
  		  };

  		  if (index + 1 === oldPath.length) {
  		    const newKey = newPath[index]; // $FlowFixMe[incompatible-use] number or string is fine here

  		    updated[newKey] = updated[oldKey];

  		    if (shared_isArray(updated)) {
  		      updated.splice(oldKey, 1);
  		    } else {
  		      delete updated[oldKey];
  		    }
  		  } else {
  		    // $FlowFixMe[incompatible-use] number or string is fine here
  		    updated[oldKey] = copyWithRename(obj[oldKey], oldPath, newPath, index + 1);
  		  }

  		  return updated;
  		}
  		function copyWithSet(obj, path, value, index = 0) {
  		  if (index >= path.length) {
  		    return value;
  		  }

  		  const key = path[index];
  		  const updated = shared_isArray(obj) ? obj.slice() : { ...obj
  		  }; // $FlowFixMe[incompatible-use] number or string is fine here

  		  updated[key] = copyWithSet(obj[key], path, value, index + 1);
  		  return updated;
  		}
  		function getEffectDurations(root) {
  		  // Profiling durations are only available for certain builds.
  		  // If available, they'll be stored on the HostRoot.
  		  let effectDuration = null;
  		  let passiveEffectDuration = null;
  		  const hostRoot = root.current;

  		  if (hostRoot != null) {
  		    const stateNode = hostRoot.stateNode;

  		    if (stateNode != null) {
  		      effectDuration = stateNode.effectDuration != null ? stateNode.effectDuration : null;
  		      passiveEffectDuration = stateNode.passiveEffectDuration != null ? stateNode.passiveEffectDuration : null;
  		    }
  		  }

  		  return {
  		    effectDuration,
  		    passiveEffectDuration
  		  };
  		}
  		function serializeToString(data) {
  		  if (data === undefined) {
  		    return 'undefined';
  		  }

  		  if (typeof data === 'function') {
  		    return data.toString();
  		  }

  		  const cache = new Set(); // Use a custom replacer function to protect against circular references.

  		  return JSON.stringify(data, (key, value) => {
  		    if (typeof value === 'object' && value !== null) {
  		      if (cache.has(value)) {
  		        return;
  		      }

  		      cache.add(value);
  		    }

  		    if (typeof value === 'bigint') {
  		      return value.toString() + 'n';
  		    }

  		    return value;
  		  }, 2);
  		}

  		function safeToString(val) {
  		  try {
  		    return String(val);
  		  } catch (err) {
  		    if (typeof val === 'object') {
  		      // An object with no prototype and no `[Symbol.toPrimitive]()`, `toString()`, and `valueOf()` methods would throw.
  		      // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String#string_coercion
  		      return '[object Object]';
  		    }

  		    throw err;
  		  }
  		} // based on https://github.com/tmpfs/format-util/blob/0e62d430efb0a1c51448709abd3e2406c14d8401/format.js#L1
  		// based on https://developer.mozilla.org/en-US/docs/Web/API/console#Using_string_substitutions
  		// Implements s, d, i and f placeholders


  		function formatConsoleArgumentsToSingleString(maybeMessage, ...inputArgs) {
  		  const args = inputArgs.slice();
  		  let formatted = safeToString(maybeMessage); // If the first argument is a string, check for substitutions.

  		  if (typeof maybeMessage === 'string') {
  		    if (args.length) {
  		      const REGEXP = /(%?)(%([jds]))/g; // $FlowFixMe[incompatible-call]

  		      formatted = formatted.replace(REGEXP, (match, escaped, ptn, flag) => {
  		        let arg = args.shift();

  		        switch (flag) {
  		          case 's':
  		            // $FlowFixMe[unsafe-addition]
  		            arg += '';
  		            break;

  		          case 'd':
  		          case 'i':
  		            arg = parseInt(arg, 10).toString();
  		            break;

  		          case 'f':
  		            arg = parseFloat(arg).toString();
  		            break;
  		        }

  		        if (!escaped) {
  		          return arg;
  		        }

  		        args.unshift(arg);
  		        return match;
  		      });
  		    }
  		  } // Arguments that remain after formatting.


  		  if (args.length) {
  		    for (let i = 0; i < args.length; i++) {
  		      formatted += ' ' + safeToString(args[i]);
  		    }
  		  } // Update escaped %% values.


  		  formatted = formatted.replace(/%{2,2}/g, '%');
  		  return String(formatted);
  		}
  		function isSynchronousXHRSupported() {
  		  return !!(window.document && window.document.featurePolicy && window.document.featurePolicy.allowsFeature('sync-xhr'));
  		}
  		function gt(a = '', b = '') {
  		  return compareVersions(a, b) === 1;
  		}
  		function gte(a = '', b = '') {
  		  return compareVersions(a, b) > -1;
  		}
  		const isReactNativeEnvironment = () => {
  		  // We've been relying on this for such a long time
  		  // We should probably define the client for DevTools on the backend side and share it with the frontend
  		  return window.document == null;
  		};

  		function extractLocation(url) {
  		  if (url.indexOf(':') === -1) {
  		    return null;
  		  } // remove any parentheses from start and end


  		  const withoutParentheses = url.replace(/^\(+/, '').replace(/\)+$/, '');
  		  const locationParts = /(at )?(.+?)(?::(\d+))?(?::(\d+))?$/.exec(withoutParentheses);

  		  if (locationParts == null) {
  		    return null;
  		  }

  		  const [,, sourceURL, line, column] = locationParts;
  		  return {
  		    sourceURL,
  		    line,
  		    column
  		  };
  		}

  		const CHROME_STACK_REGEXP = /^\s*at .*(\S+:\d+|\(native\))/m;

  		function parseSourceFromChromeStack(stack) {
  		  const frames = stack.split('\n'); // eslint-disable-next-line no-for-of-loops/no-for-of-loops

  		  for (const frame of frames) {
  		    const sanitizedFrame = frame.trim();
  		    const locationInParenthesesMatch = sanitizedFrame.match(/ (\(.+\)$)/);
  		    const possibleLocation = locationInParenthesesMatch ? locationInParenthesesMatch[1] : sanitizedFrame;
  		    const location = extractLocation(possibleLocation); // Continue the search until at least sourceURL is found

  		    if (location == null) {
  		      continue;
  		    }

  		    const {
  		      sourceURL,
  		      line = '1',
  		      column = '1'
  		    } = location;
  		    return {
  		      sourceURL,
  		      line: parseInt(line, 10),
  		      column: parseInt(column, 10)
  		    };
  		  }

  		  return null;
  		}

  		function parseSourceFromFirefoxStack(stack) {
  		  const frames = stack.split('\n'); // eslint-disable-next-line no-for-of-loops/no-for-of-loops

  		  for (const frame of frames) {
  		    const sanitizedFrame = frame.trim();
  		    const frameWithoutFunctionName = sanitizedFrame.replace(/((.*".+"[^@]*)?[^@]*)(?:@)/, '');
  		    const location = extractLocation(frameWithoutFunctionName); // Continue the search until at least sourceURL is found

  		    if (location == null) {
  		      continue;
  		    }

  		    const {
  		      sourceURL,
  		      line = '1',
  		      column = '1'
  		    } = location;
  		    return {
  		      sourceURL,
  		      line: parseInt(line, 10),
  		      column: parseInt(column, 10)
  		    };
  		  }

  		  return null;
  		}

  		function parseSourceFromComponentStack(componentStack) {
  		  if (componentStack.match(CHROME_STACK_REGEXP)) {
  		    return parseSourceFromChromeStack(componentStack);
  		  }

  		  return parseSourceFromFirefoxStack(componentStack);
  		}
  		let collectedLocation = null;

  		function collectStackTrace(error, structuredStackTrace) {
  		  let result = null; // Collect structured stack traces from the callsites.
  		  // We mirror how V8 serializes stack frames and how we later parse them.

  		  for (let i = 0; i < structuredStackTrace.length; i++) {
  		    const callSite = structuredStackTrace[i];
  		    const name = callSite.getFunctionName();

  		    if (name != null && (name.includes('react_stack_bottom_frame') || name.includes('react-stack-bottom-frame'))) {
  		      // We pick the last frame that matches before the bottom frame since
  		      // that will be immediately inside the component as opposed to some helper.
  		      // If we don't find a bottom frame then we bail to string parsing.
  		      collectedLocation = result; // Skip everything after the bottom frame since it'll be internals.

  		      break;
  		    } else {
  		      const sourceURL = callSite.getScriptNameOrSourceURL();
  		      const line = // $FlowFixMe[prop-missing]
  		      typeof callSite.getEnclosingLineNumber === 'function' ? callSite.getEnclosingLineNumber() : callSite.getLineNumber();
  		      const col = // $FlowFixMe[prop-missing]
  		      typeof callSite.getEnclosingColumnNumber === 'function' ? callSite.getEnclosingColumnNumber() : callSite.getColumnNumber();

  		      if (!sourceURL || !line || !col) {
  		        // Skip eval etc. without source url. They don't have location.
  		        continue;
  		      }

  		      result = {
  		        sourceURL,
  		        line: line,
  		        column: col
  		      };
  		    }
  		  } // At the same time we generate a string stack trace just in case someone
  		  // else reads it.


  		  const name = error.name || 'Error';
  		  const message = error.message || '';
  		  let stack = name + ': ' + message;

  		  for (let i = 0; i < structuredStackTrace.length; i++) {
  		    stack += '\n    at ' + structuredStackTrace[i].toString();
  		  }

  		  return stack;
  		}

  		function parseSourceFromOwnerStack(error) {
  		  // First attempt to collected the structured data using prepareStackTrace.
  		  collectedLocation = null;
  		  const previousPrepare = Error.prepareStackTrace;
  		  Error.prepareStackTrace = collectStackTrace;
  		  let stack;

  		  try {
  		    stack = error.stack;
  		  } catch (e) {
  		    // $FlowFixMe[incompatible-type] It does accept undefined.
  		    Error.prepareStackTrace = undefined;
  		    stack = error.stack;
  		  } finally {
  		    Error.prepareStackTrace = previousPrepare;
  		  }

  		  if (collectedLocation !== null) {
  		    return collectedLocation;
  		  }

  		  if (stack == null) {
  		    return null;
  		  } // Fallback to parsing the string form.


  		  const componentStack = formatOwnerStackString(stack);
  		  return parseSourceFromComponentStack(componentStack);
  		} // 0.123456789 => 0.123
  		// Expects high-resolution timestamp in milliseconds, like from performance.now()
  		// Mainly used for optimizing the size of serialized profiling payload

  		function formatDurationToMicrosecondsGranularity(duration) {
  		  return Math.round(duration * 1000) / 1000;
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		// Get the window object for the document that a node belongs to,
  		// or return null if it cannot be found (node not attached to DOM,
  		// etc).
  		function getOwnerWindow(node) {
  		  if (!node.ownerDocument) {
  		    return null;
  		  }

  		  return node.ownerDocument.defaultView;
  		} // Get the iframe containing a node, or return null if it cannot
  		// be found (node not within iframe, etc).

  		function getOwnerIframe(node) {
  		  const nodeWindow = getOwnerWindow(node);

  		  if (nodeWindow) {
  		    return nodeWindow.frameElement;
  		  }

  		  return null;
  		} // Get a bounding client rect for a node, with an
  		// offset added to compensate for its border.

  		function getBoundingClientRectWithBorderOffset(node) {
  		  const dimensions = getElementDimensions(node);
  		  return mergeRectOffsets([node.getBoundingClientRect(), {
  		    top: dimensions.borderTop,
  		    left: dimensions.borderLeft,
  		    bottom: dimensions.borderBottom,
  		    right: dimensions.borderRight,
  		    // This width and height won't get used by mergeRectOffsets (since this
  		    // is not the first rect in the array), but we set them so that this
  		    // object type checks as a ClientRect.
  		    width: 0,
  		    height: 0
  		  }]);
  		} // Add together the top, left, bottom, and right properties of
  		// each ClientRect, but keep the width and height of the first one.

  		function mergeRectOffsets(rects) {
  		  return rects.reduce((previousRect, rect) => {
  		    if (previousRect == null) {
  		      return rect;
  		    }

  		    return {
  		      top: previousRect.top + rect.top,
  		      left: previousRect.left + rect.left,
  		      width: previousRect.width,
  		      height: previousRect.height,
  		      bottom: previousRect.bottom + rect.bottom,
  		      right: previousRect.right + rect.right
  		    };
  		  });
  		} // Calculate a boundingClientRect for a node relative to boundaryWindow,
  		// taking into account any offsets caused by intermediate iframes.

  		function getNestedBoundingClientRect(node, boundaryWindow) {
  		  const ownerIframe = getOwnerIframe(node);

  		  if (ownerIframe && ownerIframe !== boundaryWindow) {
  		    const rects = [node.getBoundingClientRect()];
  		    let currentIframe = ownerIframe;
  		    let onlyOneMore = false;

  		    while (currentIframe) {
  		      const rect = getBoundingClientRectWithBorderOffset(currentIframe);
  		      rects.push(rect);
  		      currentIframe = getOwnerIframe(currentIframe);

  		      if (onlyOneMore) {
  		        break;
  		      } // We don't want to calculate iframe offsets upwards beyond
  		      // the iframe containing the boundaryWindow, but we
  		      // need to calculate the offset relative to the boundaryWindow.


  		      if (currentIframe && getOwnerWindow(currentIframe) === boundaryWindow) {
  		        onlyOneMore = true;
  		      }
  		    }

  		    return mergeRectOffsets(rects);
  		  } else {
  		    return node.getBoundingClientRect();
  		  }
  		}
  		function getElementDimensions(domElement) {
  		  const calculatedStyle = window.getComputedStyle(domElement);
  		  return {
  		    borderLeft: parseInt(calculatedStyle.borderLeftWidth, 10),
  		    borderRight: parseInt(calculatedStyle.borderRightWidth, 10),
  		    borderTop: parseInt(calculatedStyle.borderTopWidth, 10),
  		    borderBottom: parseInt(calculatedStyle.borderBottomWidth, 10),
  		    marginLeft: parseInt(calculatedStyle.marginLeft, 10),
  		    marginRight: parseInt(calculatedStyle.marginRight, 10),
  		    marginTop: parseInt(calculatedStyle.marginTop, 10),
  		    marginBottom: parseInt(calculatedStyle.marginBottom, 10),
  		    paddingLeft: parseInt(calculatedStyle.paddingLeft, 10),
  		    paddingRight: parseInt(calculatedStyle.paddingRight, 10),
  		    paddingTop: parseInt(calculatedStyle.paddingTop, 10),
  		    paddingBottom: parseInt(calculatedStyle.paddingBottom, 10)
  		  };
  		}
  		function extractHOCNames(displayName) {
  		  if (!displayName) return {
  		    baseComponentName: '',
  		    hocNames: []
  		  };
  		  const hocRegex = /([A-Z][a-zA-Z0-9]*?)\((.*)\)/g;
  		  const hocNames = [];
  		  let baseComponentName = displayName;
  		  let match;

  		  while ((match = hocRegex.exec(baseComponentName)) != null) {
  		    if (Array.isArray(match)) {
  		      const [, hocName, inner] = match;
  		      hocNames.push(hocName);
  		      baseComponentName = inner;
  		    }
  		  }

  		  return {
  		    baseComponentName,
  		    hocNames
  		  };
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */

  		const Overlay_assign = Object.assign; // Note that the Overlay components are not affected by the active Theme,
  		// because they highlight elements in the main Chrome window (outside of devtools).
  		// The colors below were chosen to roughly match those used by Chrome devtools.

  		class OverlayRect {
  		  constructor(doc, container) {
  		    this.node = doc.createElement('div');
  		    this.border = doc.createElement('div');
  		    this.padding = doc.createElement('div');
  		    this.content = doc.createElement('div');
  		    this.border.style.borderColor = overlayStyles.border;
  		    this.padding.style.borderColor = overlayStyles.padding;
  		    this.content.style.backgroundColor = overlayStyles.background;
  		    Overlay_assign(this.node.style, {
  		      borderColor: overlayStyles.margin,
  		      pointerEvents: 'none',
  		      position: 'fixed'
  		    });
  		    this.node.style.zIndex = '10000000';
  		    this.node.appendChild(this.border);
  		    this.border.appendChild(this.padding);
  		    this.padding.appendChild(this.content);
  		    container.appendChild(this.node);
  		  }

  		  remove() {
  		    if (this.node.parentNode) {
  		      this.node.parentNode.removeChild(this.node);
  		    }
  		  }

  		  update(box, dims) {
  		    boxWrap(dims, 'margin', this.node);
  		    boxWrap(dims, 'border', this.border);
  		    boxWrap(dims, 'padding', this.padding);
  		    Overlay_assign(this.content.style, {
  		      height: box.height - dims.borderTop - dims.borderBottom - dims.paddingTop - dims.paddingBottom + 'px',
  		      width: box.width - dims.borderLeft - dims.borderRight - dims.paddingLeft - dims.paddingRight + 'px'
  		    });
  		    Overlay_assign(this.node.style, {
  		      top: box.top - dims.marginTop + 'px',
  		      left: box.left - dims.marginLeft + 'px'
  		    });
  		  }

  		}

  		class OverlayTip {
  		  constructor(doc, container) {
  		    this.tip = doc.createElement('div');
  		    Overlay_assign(this.tip.style, {
  		      display: 'flex',
  		      flexFlow: 'row nowrap',
  		      backgroundColor: '#333740',
  		      borderRadius: '2px',
  		      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',
  		      fontWeight: 'bold',
  		      padding: '3px 5px',
  		      pointerEvents: 'none',
  		      position: 'fixed',
  		      fontSize: '12px',
  		      whiteSpace: 'nowrap'
  		    });
  		    this.nameSpan = doc.createElement('span');
  		    this.tip.appendChild(this.nameSpan);
  		    Overlay_assign(this.nameSpan.style, {
  		      color: '#ee78e6',
  		      borderRight: '1px solid #aaaaaa',
  		      paddingRight: '0.5rem',
  		      marginRight: '0.5rem'
  		    });
  		    this.dimSpan = doc.createElement('span');
  		    this.tip.appendChild(this.dimSpan);
  		    Overlay_assign(this.dimSpan.style, {
  		      color: '#d7d7d7'
  		    });
  		    this.tip.style.zIndex = '10000000';
  		    container.appendChild(this.tip);
  		  }

  		  remove() {
  		    if (this.tip.parentNode) {
  		      this.tip.parentNode.removeChild(this.tip);
  		    }
  		  }

  		  updateText(name, width, height) {
  		    this.nameSpan.textContent = name;
  		    this.dimSpan.textContent = Math.round(width) + 'px × ' + Math.round(height) + 'px';
  		  }

  		  updatePosition(dims, bounds) {
  		    const tipRect = this.tip.getBoundingClientRect();
  		    const tipPos = findTipPos(dims, bounds, {
  		      width: tipRect.width,
  		      height: tipRect.height
  		    });
  		    Overlay_assign(this.tip.style, tipPos.style);
  		  }

  		}

  		class Overlay {
  		  constructor(agent) {
  		    // Find the root window, because overlays are positioned relative to it.
  		    const currentWindow = window.__REACT_DEVTOOLS_TARGET_WINDOW__ || window;
  		    this.window = currentWindow; // When opened in shells/dev, the tooltip should be bound by the app iframe, not by the topmost window.

  		    const tipBoundsWindow = window.__REACT_DEVTOOLS_TARGET_WINDOW__ || window;
  		    this.tipBoundsWindow = tipBoundsWindow;
  		    const doc = currentWindow.document;
  		    this.container = doc.createElement('div');
  		    this.container.style.zIndex = '10000000';
  		    this.tip = new OverlayTip(doc, this.container);
  		    this.rects = [];
  		    this.agent = agent;
  		    doc.body.appendChild(this.container);
  		  }

  		  remove() {
  		    this.tip.remove();
  		    this.rects.forEach(rect => {
  		      rect.remove();
  		    });
  		    this.rects.length = 0;

  		    if (this.container.parentNode) {
  		      this.container.parentNode.removeChild(this.container);
  		    }
  		  }

  		  inspect(nodes, name) {
  		    // We can't get the size of text nodes or comment nodes. React as of v15
  		    // heavily uses comment nodes to delimit text.
  		    const elements = nodes.filter(node => node.nodeType === Node.ELEMENT_NODE);

  		    while (this.rects.length > elements.length) {
  		      const rect = this.rects.pop(); // $FlowFixMe[incompatible-use]

  		      rect.remove();
  		    }

  		    if (elements.length === 0) {
  		      return;
  		    }

  		    while (this.rects.length < elements.length) {
  		      this.rects.push(new OverlayRect(this.window.document, this.container));
  		    }

  		    const outerBox = {
  		      top: Number.POSITIVE_INFINITY,
  		      right: Number.NEGATIVE_INFINITY,
  		      bottom: Number.NEGATIVE_INFINITY,
  		      left: Number.POSITIVE_INFINITY
  		    };
  		    elements.forEach((element, index) => {
  		      const box = getNestedBoundingClientRect(element, this.window);
  		      const dims = getElementDimensions(element);
  		      outerBox.top = Math.min(outerBox.top, box.top - dims.marginTop);
  		      outerBox.right = Math.max(outerBox.right, box.left + box.width + dims.marginRight);
  		      outerBox.bottom = Math.max(outerBox.bottom, box.top + box.height + dims.marginBottom);
  		      outerBox.left = Math.min(outerBox.left, box.left - dims.marginLeft);
  		      const rect = this.rects[index];
  		      rect.update(box, dims);
  		    });

  		    if (!name) {
  		      name = elements[0].nodeName.toLowerCase();
  		      const node = elements[0];
  		      const ownerName = this.agent.getComponentNameForHostInstance(node);

  		      if (ownerName) {
  		        name += ' (in ' + ownerName + ')';
  		      }
  		    }

  		    this.tip.updateText(name, outerBox.right - outerBox.left, outerBox.bottom - outerBox.top);
  		    const tipBounds = getNestedBoundingClientRect(this.tipBoundsWindow.document.documentElement, this.window);
  		    this.tip.updatePosition({
  		      top: outerBox.top,
  		      left: outerBox.left,
  		      height: outerBox.bottom - outerBox.top,
  		      width: outerBox.right - outerBox.left
  		    }, {
  		      top: tipBounds.top + this.tipBoundsWindow.scrollY,
  		      left: tipBounds.left + this.tipBoundsWindow.scrollX,
  		      height: this.tipBoundsWindow.innerHeight,
  		      width: this.tipBoundsWindow.innerWidth
  		    });
  		  }

  		}

  		function findTipPos(dims, bounds, tipSize) {
  		  const tipHeight = Math.max(tipSize.height, 20);
  		  const tipWidth = Math.max(tipSize.width, 60);
  		  const margin = 5;
  		  let top;

  		  if (dims.top + dims.height + tipHeight <= bounds.top + bounds.height) {
  		    if (dims.top + dims.height < bounds.top + 0) {
  		      top = bounds.top + margin;
  		    } else {
  		      top = dims.top + dims.height + margin;
  		    }
  		  } else if (dims.top - tipHeight <= bounds.top + bounds.height) {
  		    if (dims.top - tipHeight - margin < bounds.top + margin) {
  		      top = bounds.top + margin;
  		    } else {
  		      top = dims.top - tipHeight - margin;
  		    }
  		  } else {
  		    top = bounds.top + bounds.height - tipHeight - margin;
  		  }

  		  let left = dims.left + margin;

  		  if (dims.left < bounds.left) {
  		    left = bounds.left + margin;
  		  }

  		  if (dims.left + tipWidth > bounds.left + bounds.width) {
  		    left = bounds.left + bounds.width - tipWidth - margin;
  		  }

  		  top += 'px';
  		  left += 'px';
  		  return {
  		    style: {
  		      top,
  		      left
  		    }
  		  };
  		}

  		function boxWrap(dims, what, node) {
  		  Overlay_assign(node.style, {
  		    borderTopWidth: dims[what + 'Top'] + 'px',
  		    borderLeftWidth: dims[what + 'Left'] + 'px',
  		    borderRightWidth: dims[what + 'Right'] + 'px',
  		    borderBottomWidth: dims[what + 'Bottom'] + 'px',
  		    borderStyle: 'solid'
  		  });
  		}

  		const overlayStyles = {
  		  background: 'rgba(120, 170, 210, 0.7)',
  		  padding: 'rgba(77, 200, 0, 0.3)',
  		  margin: 'rgba(255, 155, 0, 0.3)',
  		  border: 'rgba(255, 200, 50, 0.3)'
  		};
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */


  		const SHOW_DURATION = 2000;
  		let timeoutID = null;
  		let overlay = null;

  		function hideOverlayNative(agent) {
  		  agent.emit('hideNativeHighlight');
  		}

  		function hideOverlayWeb() {
  		  timeoutID = null;

  		  if (overlay !== null) {
  		    overlay.remove();
  		    overlay = null;
  		  }
  		}

  		function hideOverlay(agent) {
  		  return isReactNativeEnvironment() ? hideOverlayNative(agent) : hideOverlayWeb();
  		}

  		function showOverlayNative(elements, agent) {
  		  agent.emit('showNativeHighlight', elements);
  		}

  		function showOverlayWeb(elements, componentName, agent, hideAfterTimeout) {
  		  if (timeoutID !== null) {
  		    clearTimeout(timeoutID);
  		  }

  		  if (overlay === null) {
  		    overlay = new Overlay(agent);
  		  }

  		  overlay.inspect(elements, componentName);

  		  if (hideAfterTimeout) {
  		    timeoutID = setTimeout(() => hideOverlay(agent), SHOW_DURATION);
  		  }
  		}

  		function showOverlay(elements, componentName, agent, hideAfterTimeout) {
  		  return isReactNativeEnvironment() ? showOverlayNative(elements, agent) : showOverlayWeb(elements, componentName, agent, hideAfterTimeout);
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */


  		// This plug-in provides in-page highlighting of the selected element.
  		// It is used by the browser extension and the standalone DevTools shell (when connected to a browser).
  		// It is not currently the mechanism used to highlight React Native views.
  		// That is done by the React Native Inspector component.
  		let iframesListeningTo = new Set();
  		function setupHighlighter(bridge, agent) {
  		  bridge.addListener('clearHostInstanceHighlight', clearHostInstanceHighlight);
  		  bridge.addListener('highlightHostInstance', highlightHostInstance);
  		  bridge.addListener('shutdown', stopInspectingHost);
  		  bridge.addListener('startInspectingHost', startInspectingHost);
  		  bridge.addListener('stopInspectingHost', stopInspectingHost);

  		  function startInspectingHost() {
  		    registerListenersOnWindow(window);
  		  }

  		  function registerListenersOnWindow(window) {
  		    // This plug-in may run in non-DOM environments (e.g. React Native).
  		    if (window && typeof window.addEventListener === 'function') {
  		      window.addEventListener('click', onClick, true);
  		      window.addEventListener('mousedown', onMouseEvent, true);
  		      window.addEventListener('mouseover', onMouseEvent, true);
  		      window.addEventListener('mouseup', onMouseEvent, true);
  		      window.addEventListener('pointerdown', onPointerDown, true);
  		      window.addEventListener('pointermove', onPointerMove, true);
  		      window.addEventListener('pointerup', onPointerUp, true);
  		    } else {
  		      agent.emit('startInspectingNative');
  		    }
  		  }

  		  function stopInspectingHost() {
  		    hideOverlay(agent);
  		    removeListenersOnWindow(window);
  		    iframesListeningTo.forEach(function (frame) {
  		      try {
  		        removeListenersOnWindow(frame.contentWindow);
  		      } catch (error) {// This can error when the iframe is on a cross-origin.
  		      }
  		    });
  		    iframesListeningTo = new Set();
  		  }

  		  function removeListenersOnWindow(window) {
  		    // This plug-in may run in non-DOM environments (e.g. React Native).
  		    if (window && typeof window.removeEventListener === 'function') {
  		      window.removeEventListener('click', onClick, true);
  		      window.removeEventListener('mousedown', onMouseEvent, true);
  		      window.removeEventListener('mouseover', onMouseEvent, true);
  		      window.removeEventListener('mouseup', onMouseEvent, true);
  		      window.removeEventListener('pointerdown', onPointerDown, true);
  		      window.removeEventListener('pointermove', onPointerMove, true);
  		      window.removeEventListener('pointerup', onPointerUp, true);
  		    } else {
  		      agent.emit('stopInspectingNative');
  		    }
  		  }

  		  function clearHostInstanceHighlight() {
  		    hideOverlay(agent);
  		  }

  		  function highlightHostInstance({
  		    displayName,
  		    hideAfterTimeout,
  		    id,
  		    openBuiltinElementsPanel,
  		    rendererID,
  		    scrollIntoView
  		  }) {
  		    const renderer = agent.rendererInterfaces[rendererID];

  		    if (renderer == null) {
  		      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
  		      hideOverlay(agent);
  		      return;
  		    } // In some cases fiber may already be unmounted


  		    if (!renderer.hasElementWithId(id)) {
  		      hideOverlay(agent);
  		      return;
  		    }

  		    const nodes = renderer.findHostInstancesForElementID(id);

  		    if (nodes != null && nodes[0] != null) {
  		      const node = nodes[0]; // $FlowFixMe[method-unbinding]

  		      if (scrollIntoView && typeof node.scrollIntoView === 'function') {
  		        // If the node isn't visible show it before highlighting it.
  		        // We may want to reconsider this; it might be a little disruptive.
  		        node.scrollIntoView({
  		          block: 'nearest',
  		          inline: 'nearest'
  		        });
  		      }

  		      showOverlay(nodes, displayName, agent, hideAfterTimeout);

  		      if (openBuiltinElementsPanel) {
  		        window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$0 = node;
  		        bridge.send('syncSelectionToBuiltinElementsPanel');
  		      }
  		    } else {
  		      hideOverlay(agent);
  		    }
  		  }

  		  function onClick(event) {
  		    event.preventDefault();
  		    event.stopPropagation();
  		    stopInspectingHost();
  		    bridge.send('stopInspectingHost', true);
  		  }

  		  function onMouseEvent(event) {
  		    event.preventDefault();
  		    event.stopPropagation();
  		  }

  		  function onPointerDown(event) {
  		    event.preventDefault();
  		    event.stopPropagation();
  		    selectElementForNode(getEventTarget(event));
  		  }

  		  let lastHoveredNode = null;

  		  function onPointerMove(event) {
  		    event.preventDefault();
  		    event.stopPropagation();
  		    const target = getEventTarget(event);
  		    if (lastHoveredNode === target) return;
  		    lastHoveredNode = target;

  		    if (target.tagName === 'IFRAME') {
  		      const iframe = target;

  		      try {
  		        if (!iframesListeningTo.has(iframe)) {
  		          const window = iframe.contentWindow;
  		          registerListenersOnWindow(window);
  		          iframesListeningTo.add(iframe);
  		        }
  		      } catch (error) {// This can error when the iframe is on a cross-origin.
  		      }
  		    } // Don't pass the name explicitly.
  		    // It will be inferred from DOM tag and Fiber owner.


  		    showOverlay([target], null, agent, false);
  		    selectElementForNode(target);
  		  }

  		  function onPointerUp(event) {
  		    event.preventDefault();
  		    event.stopPropagation();
  		  }

  		  const selectElementForNode = node => {
  		    const id = agent.getIDForHostInstance(node);

  		    if (id !== null) {
  		      bridge.send('selectElement', id);
  		    }
  		  };

  		  function getEventTarget(event) {
  		    if (event.composed) {
  		      return event.composedPath()[0];
  		    }

  		    return event.target;
  		  }
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		 // Note these colors are in sync with DevTools Profiler chart colors.

  		const COLORS = ['#37afa9', '#63b19e', '#80b393', '#97b488', '#abb67d', '#beb771', '#cfb965', '#dfba57', '#efbb49', '#febc38'];
  		let canvas = null;

  		function drawNative(nodeToData, agent) {
  		  const nodesToDraw = [];
  		  iterateNodes(nodeToData, ({
  		    color,
  		    node
  		  }) => {
  		    nodesToDraw.push({
  		      node,
  		      color
  		    });
  		  });
  		  agent.emit('drawTraceUpdates', nodesToDraw);
  		  const mergedNodes = groupAndSortNodes(nodeToData);
  		  agent.emit('drawGroupedTraceUpdatesWithNames', mergedNodes);
  		}

  		function drawWeb(nodeToData) {
  		  if (canvas === null) {
  		    initialize();
  		  }

  		  const dpr = window.devicePixelRatio || 1;
  		  const canvasFlow = canvas;
  		  canvasFlow.width = window.innerWidth * dpr;
  		  canvasFlow.height = window.innerHeight * dpr;
  		  canvasFlow.style.width = `${window.innerWidth}px`;
  		  canvasFlow.style.height = `${window.innerHeight}px`;
  		  const context = canvasFlow.getContext('2d');
  		  context.scale(dpr, dpr);
  		  context.clearRect(0, 0, canvasFlow.width / dpr, canvasFlow.height / dpr);
  		  const mergedNodes = groupAndSortNodes(nodeToData);
  		  mergedNodes.forEach(group => {
  		    drawGroupBorders(context, group);
  		    drawGroupLabel(context, group);
  		  });

  		  if (canvas !== null) {
  		    if (nodeToData.size === 0 && canvas.matches(':popover-open')) {
  		      // $FlowFixMe[prop-missing]: Flow doesn't recognize Popover API
  		      // $FlowFixMe[incompatible-use]: Flow doesn't recognize Popover API
  		      canvas.hidePopover();
  		      return;
  		    } // $FlowFixMe[incompatible-use]: Flow doesn't recognize Popover API


  		    if (canvas.matches(':popover-open')) {
  		      // $FlowFixMe[prop-missing]: Flow doesn't recognize Popover API
  		      // $FlowFixMe[incompatible-use]: Flow doesn't recognize Popover API
  		      canvas.hidePopover();
  		    } // $FlowFixMe[prop-missing]: Flow doesn't recognize Popover API
  		    // $FlowFixMe[incompatible-use]: Flow doesn't recognize Popover API


  		    canvas.showPopover();
  		  }
  		}

  		function groupAndSortNodes(nodeToData) {
  		  const positionGroups = new Map();
  		  iterateNodes(nodeToData, ({
  		    rect,
  		    color,
  		    displayName,
  		    count
  		  }) => {
  		    if (!rect) return;
  		    const key = `${rect.left},${rect.top}`;
  		    if (!positionGroups.has(key)) positionGroups.set(key, []);
  		    positionGroups.get(key)?.push({
  		      rect,
  		      color,
  		      displayName,
  		      count
  		    });
  		  });
  		  return Array.from(positionGroups.values()).sort((groupA, groupB) => {
  		    const maxCountA = Math.max(...groupA.map(item => item.count));
  		    const maxCountB = Math.max(...groupB.map(item => item.count));
  		    return maxCountA - maxCountB;
  		  });
  		}

  		function drawGroupBorders(context, group) {
  		  group.forEach(({
  		    color,
  		    rect
  		  }) => {
  		    context.beginPath();
  		    context.strokeStyle = color;
  		    context.rect(rect.left, rect.top, rect.width - 1, rect.height - 1);
  		    context.stroke();
  		  });
  		}

  		function drawGroupLabel(context, group) {
  		  const mergedName = group.map(({
  		    displayName,
  		    count
  		  }) => displayName ? `${displayName}${count > 1 ? ` x${count}` : ''}` : '').filter(Boolean).join(', ');

  		  if (mergedName) {
  		    drawLabel(context, group[0].rect, mergedName, group[0].color);
  		  }
  		}

  		function draw(nodeToData, agent) {
  		  return isReactNativeEnvironment() ? drawNative(nodeToData, agent) : drawWeb(nodeToData);
  		}

  		function iterateNodes(nodeToData, execute) {
  		  nodeToData.forEach((data, node) => {
  		    const colorIndex = Math.min(COLORS.length - 1, data.count - 1);
  		    const color = COLORS[colorIndex];
  		    execute({
  		      color,
  		      node,
  		      count: data.count,
  		      displayName: data.displayName,
  		      expirationTime: data.expirationTime,
  		      lastMeasuredAt: data.lastMeasuredAt,
  		      rect: data.rect
  		    });
  		  });
  		}

  		function drawLabel(context, rect, text, color) {
  		  const {
  		    left,
  		    top
  		  } = rect;
  		  context.font = '10px monospace';
  		  context.textBaseline = 'middle';
  		  context.textAlign = 'center';
  		  const padding = 2;
  		  const textHeight = 14;
  		  const metrics = context.measureText(text);
  		  const backgroundWidth = metrics.width + padding * 2;
  		  const backgroundHeight = textHeight;
  		  const labelX = left;
  		  const labelY = top - backgroundHeight;
  		  context.fillStyle = color;
  		  context.fillRect(labelX, labelY, backgroundWidth, backgroundHeight);
  		  context.fillStyle = '#000000';
  		  context.fillText(text, labelX + backgroundWidth / 2, labelY + backgroundHeight / 2);
  		}

  		function destroyNative(agent) {
  		  agent.emit('disableTraceUpdates');
  		}

  		function destroyWeb() {
  		  if (canvas !== null) {
  		    if (canvas.matches(':popover-open')) {
  		      // $FlowFixMe[prop-missing]: Flow doesn't recognize Popover API
  		      // $FlowFixMe[incompatible-use]: Flow doesn't recognize Popover API
  		      canvas.hidePopover();
  		    } // $FlowFixMe[incompatible-use]: Flow doesn't recognize Popover API and loses canvas nullability tracking


  		    if (canvas.parentNode != null) {
  		      // $FlowFixMe[incompatible-call]: Flow doesn't track that canvas is non-null here
  		      canvas.parentNode.removeChild(canvas);
  		    }

  		    canvas = null;
  		  }
  		}

  		function destroy(agent) {
  		  return isReactNativeEnvironment() ? destroyNative(agent) : destroyWeb();
  		}

  		function initialize() {
  		  canvas = window.document.createElement('canvas');
  		  canvas.setAttribute('popover', 'manual'); // $FlowFixMe[incompatible-use]: Flow doesn't recognize Popover API

  		  canvas.style.cssText = `
    xx-background-color: red;
    xx-opacity: 0.5;
    bottom: 0;
    left: 0;
    pointer-events: none;
    position: fixed;
    right: 0;
    top: 0;
    background-color: transparent;
    outline: none;
    box-shadow: none;
    border: none;
  `;
  		  const root = window.document.documentElement;
  		  root.insertBefore(canvas, root.firstChild);
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */



  		// How long the rect should be shown for?
  		const DISPLAY_DURATION = 250; // What's the longest we are willing to show the overlay for?
  		// This can be important if we're getting a flurry of events (e.g. scroll update).

  		const MAX_DISPLAY_DURATION = 3000; // How long should a rect be considered valid for?

  		const REMEASUREMENT_AFTER_DURATION = 250; // Markers for different types of HOCs

  		const HOC_MARKERS = new Map([['Forget', '✨'], ['Memo', '🧠']]); // Some environments (e.g. React Native / Hermes) don't support the performance API yet.

  		const getCurrentTime = // $FlowFixMe[method-unbinding]
  		typeof performance === 'object' && typeof performance.now === 'function' ? () => performance.now() : () => Date.now();
  		const nodeToData = new Map();
  		let agent = null;
  		let drawAnimationFrameID = null;
  		let isEnabled = false;
  		let redrawTimeoutID = null;
  		function TraceUpdates_initialize(injectedAgent) {
  		  agent = injectedAgent;
  		  agent.addListener('traceUpdates', traceUpdates);
  		}
  		function toggleEnabled(value) {
  		  isEnabled = value;

  		  if (!isEnabled) {
  		    nodeToData.clear();

  		    if (drawAnimationFrameID !== null) {
  		      cancelAnimationFrame(drawAnimationFrameID);
  		      drawAnimationFrameID = null;
  		    }

  		    if (redrawTimeoutID !== null) {
  		      clearTimeout(redrawTimeoutID);
  		      redrawTimeoutID = null;
  		    }

  		    destroy(agent);
  		  }
  		}

  		function traceUpdates(nodes) {
  		  if (!isEnabled) return;
  		  nodes.forEach(node => {
  		    const data = nodeToData.get(node);
  		    const now = getCurrentTime();
  		    let lastMeasuredAt = data != null ? data.lastMeasuredAt : 0;
  		    let rect = data != null ? data.rect : null;

  		    if (rect === null || lastMeasuredAt + REMEASUREMENT_AFTER_DURATION < now) {
  		      lastMeasuredAt = now;
  		      rect = measureNode(node);
  		    }

  		    let displayName = agent.getComponentNameForHostInstance(node);

  		    if (displayName) {
  		      const {
  		        baseComponentName,
  		        hocNames
  		      } = extractHOCNames(displayName);
  		      const markers = hocNames.map(hoc => HOC_MARKERS.get(hoc) || '').join('');
  		      const enhancedDisplayName = markers ? `${markers}${baseComponentName}` : baseComponentName;
  		      displayName = enhancedDisplayName;
  		    }

  		    nodeToData.set(node, {
  		      count: data != null ? data.count + 1 : 1,
  		      expirationTime: data != null ? Math.min(now + MAX_DISPLAY_DURATION, data.expirationTime + DISPLAY_DURATION) : now + DISPLAY_DURATION,
  		      lastMeasuredAt,
  		      rect,
  		      displayName
  		    });
  		  });

  		  if (redrawTimeoutID !== null) {
  		    clearTimeout(redrawTimeoutID);
  		    redrawTimeoutID = null;
  		  }

  		  if (drawAnimationFrameID === null) {
  		    drawAnimationFrameID = requestAnimationFrame(prepareToDraw);
  		  }
  		}

  		function prepareToDraw() {
  		  drawAnimationFrameID = null;
  		  redrawTimeoutID = null;
  		  const now = getCurrentTime();
  		  let earliestExpiration = Number.MAX_VALUE; // Remove any items that have already expired.

  		  nodeToData.forEach((data, node) => {
  		    if (data.expirationTime < now) {
  		      nodeToData.delete(node);
  		    } else {
  		      earliestExpiration = Math.min(earliestExpiration, data.expirationTime);
  		    }
  		  });
  		  draw(nodeToData, agent);

  		  if (earliestExpiration !== Number.MAX_VALUE) {
  		    redrawTimeoutID = setTimeout(prepareToDraw, earliestExpiration - now);
  		  }
  		}

  		function measureNode(node) {
  		  if (!node || typeof node.getBoundingClientRect !== 'function') {
  		    return null;
  		  }

  		  const currentWindow = window.__REACT_DEVTOOLS_TARGET_WINDOW__ || window;
  		  return getNestedBoundingClientRect(node, currentWindow);
  		}
  		function bridge_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		 // This message specifies the version of the DevTools protocol currently supported by the backend,
  		// as well as the earliest NPM version (e.g. "4.13.0") that protocol is supported by on the frontend.
  		// This enables an older frontend to display an upgrade message to users for a newer, unsupported backend.

  		// Bump protocol version whenever a backwards breaking change is made
  		// in the messages sent between BackendBridge and FrontendBridge.
  		// This mapping is embedded in both frontend and backend builds.
  		//
  		// The backend protocol will always be the latest entry in the BRIDGE_PROTOCOL array.
  		//
  		// When an older frontend connects to a newer backend,
  		// the backend can send the minNpmVersion and the frontend can display an NPM upgrade prompt.
  		//
  		// When a newer frontend connects with an older protocol version,
  		// the frontend can use the embedded minNpmVersion/maxNpmVersion values to display a downgrade prompt.
  		const BRIDGE_PROTOCOL = [// This version technically never existed,
  		// but a backwards breaking change was added in 4.11,
  		// so the safest guess to downgrade the frontend would be to version 4.10.
  		{
  		  version: 0,
  		  minNpmVersion: '"<4.11.0"',
  		  maxNpmVersion: '"<4.11.0"'
  		}, // Versions 4.11.x – 4.12.x contained the backwards breaking change,
  		// but we didn't add the "fix" of checking the protocol version until 4.13,
  		// so we don't recommend downgrading to 4.11 or 4.12.
  		{
  		  version: 1,
  		  minNpmVersion: '4.13.0',
  		  maxNpmVersion: '4.21.0'
  		}, // Version 2 adds a StrictMode-enabled and supports-StrictMode bits to add-root operation.
  		{
  		  version: 2,
  		  minNpmVersion: '4.22.0',
  		  maxNpmVersion: null
  		}];
  		const currentBridgeProtocol = BRIDGE_PROTOCOL[BRIDGE_PROTOCOL.length - 1];

  		class Bridge extends EventEmitter {
  		  constructor(wall) {
  		    super();

  		    bridge_defineProperty(this, "_isShutdown", false);

  		    bridge_defineProperty(this, "_messageQueue", []);

  		    bridge_defineProperty(this, "_scheduledFlush", false);

  		    bridge_defineProperty(this, "_wallUnlisten", null);

  		    bridge_defineProperty(this, "_flush", () => {
  		      // This method is used after the bridge is marked as destroyed in shutdown sequence,
  		      // so we do not bail out if the bridge marked as destroyed.
  		      // It is a private method that the bridge ensures is only called at the right times.
  		      try {
  		        if (this._messageQueue.length) {
  		          for (let i = 0; i < this._messageQueue.length; i += 2) {
  		            this._wall.send(this._messageQueue[i], ...this._messageQueue[i + 1]);
  		          }

  		          this._messageQueue.length = 0;
  		        }
  		      } finally {
  		        // We set this at the end in case new messages are added synchronously above.
  		        // They're already handled so they shouldn't queue more flushes.
  		        this._scheduledFlush = false;
  		      }
  		    });

  		    bridge_defineProperty(this, "overrideValueAtPath", ({
  		      id,
  		      path,
  		      rendererID,
  		      type,
  		      value
  		    }) => {
  		      switch (type) {
  		        case 'context':
  		          this.send('overrideContext', {
  		            id,
  		            path,
  		            rendererID,
  		            wasForwarded: true,
  		            value
  		          });
  		          break;

  		        case 'hooks':
  		          this.send('overrideHookState', {
  		            id,
  		            path,
  		            rendererID,
  		            wasForwarded: true,
  		            value
  		          });
  		          break;

  		        case 'props':
  		          this.send('overrideProps', {
  		            id,
  		            path,
  		            rendererID,
  		            wasForwarded: true,
  		            value
  		          });
  		          break;

  		        case 'state':
  		          this.send('overrideState', {
  		            id,
  		            path,
  		            rendererID,
  		            wasForwarded: true,
  		            value
  		          });
  		          break;
  		      }
  		    });

  		    this._wall = wall;
  		    this._wallUnlisten = wall.listen(message => {
  		      if (message && message.event) {
  		        this.emit(message.event, message.payload);
  		      }
  		    }) || null; // Temporarily support older standalone front-ends sending commands to newer embedded backends.
  		    // We do this because React Native embeds the React DevTools backend,
  		    // but cannot control which version of the frontend users use.

  		    this.addListener('overrideValueAtPath', this.overrideValueAtPath);
  		  } // Listening directly to the wall isn't advised.
  		  // It can be used to listen for legacy (v3) messages (since they use a different format).


  		  get wall() {
  		    return this._wall;
  		  }

  		  send(event, ...payload) {
  		    if (this._isShutdown) {
  		      console.warn(`Cannot send message "${event}" through a Bridge that has been shutdown.`);
  		      return;
  		    } // When we receive a message:
  		    // - we add it to our queue of messages to be sent
  		    // - if there hasn't been a message recently, we set a timer for 0 ms in
  		    //   the future, allowing all messages created in the same tick to be sent
  		    //   together
  		    // - if there *has* been a message flushed in the last BATCH_DURATION ms
  		    //   (or we're waiting for our setTimeout-0 to fire), then _timeoutID will
  		    //   be set, and we'll simply add to the queue and wait for that


  		    this._messageQueue.push(event, payload);

  		    if (!this._scheduledFlush) {
  		      this._scheduledFlush = true; // $FlowFixMe

  		      if (typeof devtoolsJestTestScheduler === 'function') {
  		        // This exists just for our own jest tests.
  		        // They're written in such a way that we can neither mock queueMicrotask
  		        // because then we break React DOM and we can't not mock it because then
  		        // we can't synchronously flush it. So they need to be rewritten.
  		        // $FlowFixMe
  		        devtoolsJestTestScheduler(this._flush); // eslint-disable-line no-undef
  		      } else {
  		        queueMicrotask(this._flush);
  		      }
  		    }
  		  }

  		  shutdown() {
  		    if (this._isShutdown) {
  		      console.warn('Bridge was already shutdown.');
  		      return;
  		    } // Queue the shutdown outgoing message for subscribers.


  		    this.emit('shutdown');
  		    this.send('shutdown'); // Mark this bridge as destroyed, i.e. disable its public API.

  		    this._isShutdown = true; // Disable the API inherited from EventEmitter that can add more listeners and send more messages.
  		    // $FlowFixMe[cannot-write] This property is not writable.

  		    this.addListener = function () {}; // $FlowFixMe[cannot-write] This property is not writable.


  		    this.emit = function () {}; // NOTE: There's also EventEmitter API like `on` and `prependListener` that we didn't add to our Flow type of EventEmitter.
  		    // Unsubscribe this bridge incoming message listeners to be sure, and so they don't have to do that.


  		    this.removeAllListeners(); // Stop accepting and emitting incoming messages from the wall.

  		    const wallUnlisten = this._wallUnlisten;

  		    if (wallUnlisten) {
  		      wallUnlisten();
  		    } // Synchronously flush all queued outgoing messages.
  		    // At this step the subscribers' code may run in this call stack.


  		    do {
  		      this._flush();
  		    } while (this._messageQueue.length);
  		  } // Temporarily support older standalone backends by forwarding "overrideValueAtPath" commands
  		  // to the older message types they may be listening to.


  		}

  		/* harmony default export */ const bridge = (Bridge);
  		function agent_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

  		class Agent extends EventEmitter {
  		  constructor(bridge, isProfiling = false, onReloadAndProfile) {
  		    super();

  		    agent_defineProperty(this, "_isProfiling", false);

  		    agent_defineProperty(this, "_rendererInterfaces", {});

  		    agent_defineProperty(this, "_persistedSelection", null);

  		    agent_defineProperty(this, "_persistedSelectionMatch", null);

  		    agent_defineProperty(this, "_traceUpdatesEnabled", false);

  		    agent_defineProperty(this, "clearErrorsAndWarnings", ({
  		      rendererID
  		    }) => {
  		      const renderer = this._rendererInterfaces[rendererID];

  		      if (renderer == null) {
  		        console.warn(`Invalid renderer id "${rendererID}"`);
  		      } else {
  		        renderer.clearErrorsAndWarnings();
  		      }
  		    });

  		    agent_defineProperty(this, "clearErrorsForElementID", ({
  		      id,
  		      rendererID
  		    }) => {
  		      const renderer = this._rendererInterfaces[rendererID];

  		      if (renderer == null) {
  		        console.warn(`Invalid renderer id "${rendererID}"`);
  		      } else {
  		        renderer.clearErrorsForElementID(id);
  		      }
  		    });

  		    agent_defineProperty(this, "clearWarningsForElementID", ({
  		      id,
  		      rendererID
  		    }) => {
  		      const renderer = this._rendererInterfaces[rendererID];

  		      if (renderer == null) {
  		        console.warn(`Invalid renderer id "${rendererID}"`);
  		      } else {
  		        renderer.clearWarningsForElementID(id);
  		      }
  		    });

  		    agent_defineProperty(this, "copyElementPath", ({
  		      id,
  		      path,
  		      rendererID
  		    }) => {
  		      const renderer = this._rendererInterfaces[rendererID];

  		      if (renderer == null) {
  		        console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
  		      } else {
  		        const value = renderer.getSerializedElementValueByPath(id, path);

  		        if (value != null) {
  		          this._bridge.send('saveToClipboard', value);
  		        } else {
  		          console.warn(`Unable to obtain serialized value for element "${id}"`);
  		        }
  		      }
  		    });

  		    agent_defineProperty(this, "deletePath", ({
  		      hookID,
  		      id,
  		      path,
  		      rendererID,
  		      type
  		    }) => {
  		      const renderer = this._rendererInterfaces[rendererID];

  		      if (renderer == null) {
  		        console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
  		      } else {
  		        renderer.deletePath(type, id, hookID, path);
  		      }
  		    });

  		    agent_defineProperty(this, "getBackendVersion", () => {
  		      const version = "6.1.5-5d87cd2244";

  		      {
  		        this._bridge.send('backendVersion', version);
  		      }
  		    });

  		    agent_defineProperty(this, "getBridgeProtocol", () => {
  		      this._bridge.send('bridgeProtocol', currentBridgeProtocol);
  		    });

  		    agent_defineProperty(this, "getProfilingData", ({
  		      rendererID
  		    }) => {
  		      const renderer = this._rendererInterfaces[rendererID];

  		      if (renderer == null) {
  		        console.warn(`Invalid renderer id "${rendererID}"`);
  		      }

  		      this._bridge.send('profilingData', renderer.getProfilingData());
  		    });

  		    agent_defineProperty(this, "getProfilingStatus", () => {
  		      this._bridge.send('profilingStatus', this._isProfiling);
  		    });

  		    agent_defineProperty(this, "getOwnersList", ({
  		      id,
  		      rendererID
  		    }) => {
  		      const renderer = this._rendererInterfaces[rendererID];

  		      if (renderer == null) {
  		        console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
  		      } else {
  		        const owners = renderer.getOwnersList(id);

  		        this._bridge.send('ownersList', {
  		          id,
  		          owners
  		        });
  		      }
  		    });

  		    agent_defineProperty(this, "inspectElement", ({
  		      forceFullData,
  		      id,
  		      path,
  		      rendererID,
  		      requestID
  		    }) => {
  		      const renderer = this._rendererInterfaces[rendererID];

  		      if (renderer == null) {
  		        console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
  		      } else {
  		        this._bridge.send('inspectedElement', renderer.inspectElement(requestID, id, path, forceFullData)); // When user selects an element, stop trying to restore the selection,
  		        // and instead remember the current selection for the next reload.


  		        if (this._persistedSelectionMatch === null || this._persistedSelectionMatch.id !== id) {
  		          this._persistedSelection = null;
  		          this._persistedSelectionMatch = null;
  		          renderer.setTrackedPath(null); // Throttle persisting the selection.

  		          this._lastSelectedElementID = id;
  		          this._lastSelectedRendererID = rendererID;

  		          if (!this._persistSelectionTimerScheduled) {
  		            this._persistSelectionTimerScheduled = true;
  		            setTimeout(this._persistSelection, 1000);
  		          }
  		        } // TODO: If there was a way to change the selected DOM element
  		        // in built-in Elements tab without forcing a switch to it, we'd do it here.
  		        // For now, it doesn't seem like there is a way to do that:
  		        // https://github.com/bvaughn/react-devtools-experimental/issues/102
  		        // (Setting $0 doesn't work, and calling inspect() switches the tab.)

  		      }
  		    });

  		    agent_defineProperty(this, "logElementToConsole", ({
  		      id,
  		      rendererID
  		    }) => {
  		      const renderer = this._rendererInterfaces[rendererID];

  		      if (renderer == null) {
  		        console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
  		      } else {
  		        renderer.logElementToConsole(id);
  		      }
  		    });

  		    agent_defineProperty(this, "overrideError", ({
  		      id,
  		      rendererID,
  		      forceError
  		    }) => {
  		      const renderer = this._rendererInterfaces[rendererID];

  		      if (renderer == null) {
  		        console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
  		      } else {
  		        renderer.overrideError(id, forceError);
  		      }
  		    });

  		    agent_defineProperty(this, "overrideSuspense", ({
  		      id,
  		      rendererID,
  		      forceFallback
  		    }) => {
  		      const renderer = this._rendererInterfaces[rendererID];

  		      if (renderer == null) {
  		        console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
  		      } else {
  		        renderer.overrideSuspense(id, forceFallback);
  		      }
  		    });

  		    agent_defineProperty(this, "overrideValueAtPath", ({
  		      hookID,
  		      id,
  		      path,
  		      rendererID,
  		      type,
  		      value
  		    }) => {
  		      const renderer = this._rendererInterfaces[rendererID];

  		      if (renderer == null) {
  		        console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
  		      } else {
  		        renderer.overrideValueAtPath(type, id, hookID, path, value);
  		      }
  		    });

  		    agent_defineProperty(this, "overrideContext", ({
  		      id,
  		      path,
  		      rendererID,
  		      wasForwarded,
  		      value
  		    }) => {
  		      // Don't forward a message that's already been forwarded by the front-end Bridge.
  		      // We only need to process the override command once!
  		      if (!wasForwarded) {
  		        this.overrideValueAtPath({
  		          id,
  		          path,
  		          rendererID,
  		          type: 'context',
  		          value
  		        });
  		      }
  		    });

  		    agent_defineProperty(this, "overrideHookState", ({
  		      id,
  		      hookID,
  		      path,
  		      rendererID,
  		      wasForwarded,
  		      value
  		    }) => {
  		      // Don't forward a message that's already been forwarded by the front-end Bridge.
  		      // We only need to process the override command once!
  		      if (!wasForwarded) {
  		        this.overrideValueAtPath({
  		          id,
  		          path,
  		          rendererID,
  		          type: 'hooks',
  		          value
  		        });
  		      }
  		    });

  		    agent_defineProperty(this, "overrideProps", ({
  		      id,
  		      path,
  		      rendererID,
  		      wasForwarded,
  		      value
  		    }) => {
  		      // Don't forward a message that's already been forwarded by the front-end Bridge.
  		      // We only need to process the override command once!
  		      if (!wasForwarded) {
  		        this.overrideValueAtPath({
  		          id,
  		          path,
  		          rendererID,
  		          type: 'props',
  		          value
  		        });
  		      }
  		    });

  		    agent_defineProperty(this, "overrideState", ({
  		      id,
  		      path,
  		      rendererID,
  		      wasForwarded,
  		      value
  		    }) => {
  		      // Don't forward a message that's already been forwarded by the front-end Bridge.
  		      // We only need to process the override command once!
  		      if (!wasForwarded) {
  		        this.overrideValueAtPath({
  		          id,
  		          path,
  		          rendererID,
  		          type: 'state',
  		          value
  		        });
  		      }
  		    });

  		    agent_defineProperty(this, "onReloadAndProfileSupportedByHost", () => {
  		      this._bridge.send('isReloadAndProfileSupportedByBackend', true);
  		    });

  		    agent_defineProperty(this, "reloadAndProfile", ({
  		      recordChangeDescriptions,
  		      recordTimeline
  		    }) => {
  		      if (typeof this._onReloadAndProfile === 'function') {
  		        this._onReloadAndProfile(recordChangeDescriptions, recordTimeline);
  		      } // This code path should only be hit if the shell has explicitly told the Store that it supports profiling.
  		      // In that case, the shell must also listen for this specific message to know when it needs to reload the app.
  		      // The agent can't do this in a way that is renderer agnostic.


  		      this._bridge.send('reloadAppForProfiling');
  		    });

  		    agent_defineProperty(this, "renamePath", ({
  		      hookID,
  		      id,
  		      newPath,
  		      oldPath,
  		      rendererID,
  		      type
  		    }) => {
  		      const renderer = this._rendererInterfaces[rendererID];

  		      if (renderer == null) {
  		        console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
  		      } else {
  		        renderer.renamePath(type, id, hookID, oldPath, newPath);
  		      }
  		    });

  		    agent_defineProperty(this, "setTraceUpdatesEnabled", traceUpdatesEnabled => {
  		      this._traceUpdatesEnabled = traceUpdatesEnabled;
  		      toggleEnabled(traceUpdatesEnabled);

  		      for (const rendererID in this._rendererInterfaces) {
  		        const renderer = this._rendererInterfaces[rendererID];
  		        renderer.setTraceUpdatesEnabled(traceUpdatesEnabled);
  		      }
  		    });

  		    agent_defineProperty(this, "syncSelectionFromBuiltinElementsPanel", () => {
  		      const target = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$0;

  		      if (target == null) {
  		        return;
  		      }

  		      this.selectNode(target);
  		    });

  		    agent_defineProperty(this, "shutdown", () => {
  		      // Clean up the overlay if visible, and associated events.
  		      this.emit('shutdown');

  		      this._bridge.removeAllListeners();

  		      this.removeAllListeners();
  		    });

  		    agent_defineProperty(this, "startProfiling", ({
  		      recordChangeDescriptions,
  		      recordTimeline
  		    }) => {
  		      this._isProfiling = true;

  		      for (const rendererID in this._rendererInterfaces) {
  		        const renderer = this._rendererInterfaces[rendererID];
  		        renderer.startProfiling(recordChangeDescriptions, recordTimeline);
  		      }

  		      this._bridge.send('profilingStatus', this._isProfiling);
  		    });

  		    agent_defineProperty(this, "stopProfiling", () => {
  		      this._isProfiling = false;

  		      for (const rendererID in this._rendererInterfaces) {
  		        const renderer = this._rendererInterfaces[rendererID];
  		        renderer.stopProfiling();
  		      }

  		      this._bridge.send('profilingStatus', this._isProfiling);
  		    });

  		    agent_defineProperty(this, "stopInspectingNative", selected => {
  		      this._bridge.send('stopInspectingHost', selected);
  		    });

  		    agent_defineProperty(this, "storeAsGlobal", ({
  		      count,
  		      id,
  		      path,
  		      rendererID
  		    }) => {
  		      const renderer = this._rendererInterfaces[rendererID];

  		      if (renderer == null) {
  		        console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
  		      } else {
  		        renderer.storeAsGlobal(id, path, count);
  		      }
  		    });

  		    agent_defineProperty(this, "updateHookSettings", settings => {
  		      // Propagate the settings, so Backend can subscribe to it and modify hook
  		      this.emit('updateHookSettings', settings);
  		    });

  		    agent_defineProperty(this, "getHookSettings", () => {
  		      this.emit('getHookSettings');
  		    });

  		    agent_defineProperty(this, "onHookSettings", settings => {
  		      this._bridge.send('hookSettings', settings);
  		    });

  		    agent_defineProperty(this, "updateComponentFilters", componentFilters => {
  		      for (const rendererIDString in this._rendererInterfaces) {
  		        const rendererID = +rendererIDString;
  		        const renderer = this._rendererInterfaces[rendererID];

  		        if (this._lastSelectedRendererID === rendererID) {
  		          // Changing component filters will unmount and remount the DevTools tree.
  		          // Track the last selection's path so we can restore the selection.
  		          const path = renderer.getPathForElement(this._lastSelectedElementID);

  		          if (path !== null) {
  		            renderer.setTrackedPath(path);
  		            this._persistedSelection = {
  		              rendererID,
  		              path
  		            };
  		          }
  		        }

  		        renderer.updateComponentFilters(componentFilters);
  		      }
  		    });

  		    agent_defineProperty(this, "getEnvironmentNames", () => {
  		      let accumulatedNames = null;

  		      for (const rendererID in this._rendererInterfaces) {
  		        const renderer = this._rendererInterfaces[+rendererID];
  		        const names = renderer.getEnvironmentNames();

  		        if (accumulatedNames === null) {
  		          accumulatedNames = names;
  		        } else {
  		          for (let i = 0; i < names.length; i++) {
  		            if (accumulatedNames.indexOf(names[i]) === -1) {
  		              accumulatedNames.push(names[i]);
  		            }
  		          }
  		        }
  		      }

  		      this._bridge.send('environmentNames', accumulatedNames || []);
  		    });

  		    agent_defineProperty(this, "onTraceUpdates", nodes => {
  		      this.emit('traceUpdates', nodes);
  		    });

  		    agent_defineProperty(this, "onFastRefreshScheduled", () => {

  		      this._bridge.send('fastRefreshScheduled');
  		    });

  		    agent_defineProperty(this, "onHookOperations", operations => {
  		      // The chrome.runtime does not currently support transferables; it forces JSON serialization.
  		      // See bug https://bugs.chromium.org/p/chromium/issues/detail?id=927134
  		      //
  		      // Regarding transferables, the postMessage doc states:
  		      // If the ownership of an object is transferred, it becomes unusable (neutered)
  		      // in the context it was sent from and becomes available only to the worker it was sent to.
  		      //
  		      // Even though Chrome is eventually JSON serializing the array buffer,
  		      // using the transferable approach also sometimes causes it to throw:
  		      //   DOMException: Failed to execute 'postMessage' on 'Window': ArrayBuffer at index 0 is already neutered.
  		      //
  		      // See bug https://github.com/bvaughn/react-devtools-experimental/issues/25
  		      //
  		      // The Store has a fallback in place that parses the message as JSON if the type isn't an array.
  		      // For now the simplest fix seems to be to not transfer the array.
  		      // This will negatively impact performance on Firefox so it's unfortunate,
  		      // but until we're able to fix the Chrome error mentioned above, it seems necessary.
  		      //
  		      // this._bridge.send('operations', operations, [operations.buffer]);


  		      this._bridge.send('operations', operations);

  		      if (this._persistedSelection !== null) {
  		        const rendererID = operations[0];

  		        if (this._persistedSelection.rendererID === rendererID) {
  		          // Check if we can select a deeper match for the persisted selection.
  		          const renderer = this._rendererInterfaces[rendererID];

  		          if (renderer == null) {
  		            console.warn(`Invalid renderer id "${rendererID}"`);
  		          } else {
  		            const prevMatch = this._persistedSelectionMatch;
  		            const nextMatch = renderer.getBestMatchForTrackedPath();
  		            this._persistedSelectionMatch = nextMatch;
  		            const prevMatchID = prevMatch !== null ? prevMatch.id : null;
  		            const nextMatchID = nextMatch !== null ? nextMatch.id : null;

  		            if (prevMatchID !== nextMatchID) {
  		              if (nextMatchID !== null) {
  		                // We moved forward, unlocking a deeper node.
  		                this._bridge.send('selectElement', nextMatchID);
  		              }
  		            }

  		            if (nextMatch !== null && nextMatch.isFullMatch) {
  		              // We've just unlocked the innermost selected node.
  		              // There's no point tracking it further.
  		              this._persistedSelection = null;
  		              this._persistedSelectionMatch = null;
  		              renderer.setTrackedPath(null);
  		            }
  		          }
  		        }
  		      }
  		    });

  		    agent_defineProperty(this, "getIfHasUnsupportedRendererVersion", () => {
  		      this.emit('getIfHasUnsupportedRendererVersion');
  		    });

  		    agent_defineProperty(this, "_persistSelectionTimerScheduled", false);

  		    agent_defineProperty(this, "_lastSelectedRendererID", -1);

  		    agent_defineProperty(this, "_lastSelectedElementID", -1);

  		    agent_defineProperty(this, "_persistSelection", () => {
  		      this._persistSelectionTimerScheduled = false;
  		      const rendererID = this._lastSelectedRendererID;
  		      const id = this._lastSelectedElementID; // This is throttled, so both renderer and selected ID
  		      // might not be available by the time we read them.
  		      // This is why we need the defensive checks here.

  		      const renderer = this._rendererInterfaces[rendererID];
  		      const path = renderer != null ? renderer.getPathForElement(id) : null;

  		      if (path !== null) {
  		        sessionStorageSetItem(SESSION_STORAGE_LAST_SELECTION_KEY, JSON.stringify({
  		          rendererID,
  		          path
  		        }));
  		      } else {
  		        sessionStorageRemoveItem(SESSION_STORAGE_LAST_SELECTION_KEY);
  		      }
  		    });

  		    this._isProfiling = isProfiling;
  		    this._onReloadAndProfile = onReloadAndProfile;
  		    const persistedSelectionString = storage_sessionStorageGetItem(SESSION_STORAGE_LAST_SELECTION_KEY);

  		    if (persistedSelectionString != null) {
  		      this._persistedSelection = JSON.parse(persistedSelectionString);
  		    }

  		    this._bridge = bridge;
  		    bridge.addListener('clearErrorsAndWarnings', this.clearErrorsAndWarnings);
  		    bridge.addListener('clearErrorsForElementID', this.clearErrorsForElementID);
  		    bridge.addListener('clearWarningsForElementID', this.clearWarningsForElementID);
  		    bridge.addListener('copyElementPath', this.copyElementPath);
  		    bridge.addListener('deletePath', this.deletePath);
  		    bridge.addListener('getBackendVersion', this.getBackendVersion);
  		    bridge.addListener('getBridgeProtocol', this.getBridgeProtocol);
  		    bridge.addListener('getProfilingData', this.getProfilingData);
  		    bridge.addListener('getProfilingStatus', this.getProfilingStatus);
  		    bridge.addListener('getOwnersList', this.getOwnersList);
  		    bridge.addListener('inspectElement', this.inspectElement);
  		    bridge.addListener('logElementToConsole', this.logElementToConsole);
  		    bridge.addListener('overrideError', this.overrideError);
  		    bridge.addListener('overrideSuspense', this.overrideSuspense);
  		    bridge.addListener('overrideValueAtPath', this.overrideValueAtPath);
  		    bridge.addListener('reloadAndProfile', this.reloadAndProfile);
  		    bridge.addListener('renamePath', this.renamePath);
  		    bridge.addListener('setTraceUpdatesEnabled', this.setTraceUpdatesEnabled);
  		    bridge.addListener('startProfiling', this.startProfiling);
  		    bridge.addListener('stopProfiling', this.stopProfiling);
  		    bridge.addListener('storeAsGlobal', this.storeAsGlobal);
  		    bridge.addListener('syncSelectionFromBuiltinElementsPanel', this.syncSelectionFromBuiltinElementsPanel);
  		    bridge.addListener('shutdown', this.shutdown);
  		    bridge.addListener('updateHookSettings', this.updateHookSettings);
  		    bridge.addListener('getHookSettings', this.getHookSettings);
  		    bridge.addListener('updateComponentFilters', this.updateComponentFilters);
  		    bridge.addListener('getEnvironmentNames', this.getEnvironmentNames);
  		    bridge.addListener('getIfHasUnsupportedRendererVersion', this.getIfHasUnsupportedRendererVersion); // Temporarily support older standalone front-ends sending commands to newer embedded backends.
  		    // We do this because React Native embeds the React DevTools backend,
  		    // but cannot control which version of the frontend users use.

  		    bridge.addListener('overrideContext', this.overrideContext);
  		    bridge.addListener('overrideHookState', this.overrideHookState);
  		    bridge.addListener('overrideProps', this.overrideProps);
  		    bridge.addListener('overrideState', this.overrideState);
  		    setupHighlighter(bridge, this);
  		    TraceUpdates_initialize(this); // By this time, Store should already be initialized and intercept events

  		    bridge.send('backendInitialized');

  		    if (this._isProfiling) {
  		      bridge.send('profilingStatus', true);
  		    }
  		  }

  		  get rendererInterfaces() {
  		    return this._rendererInterfaces;
  		  }

  		  getInstanceAndStyle({
  		    id,
  		    rendererID
  		  }) {
  		    const renderer = this._rendererInterfaces[rendererID];

  		    if (renderer == null) {
  		      console.warn(`Invalid renderer id "${rendererID}"`);
  		      return null;
  		    }

  		    return renderer.getInstanceAndStyle(id);
  		  }

  		  getIDForHostInstance(target) {
  		    if (isReactNativeEnvironment() || typeof target.nodeType !== 'number') {
  		      // In React Native or non-DOM we simply pick any renderer that has a match.
  		      for (const rendererID in this._rendererInterfaces) {
  		        const renderer = this._rendererInterfaces[rendererID];

  		        try {
  		          const match = renderer.getElementIDForHostInstance(target);

  		          if (match != null) {
  		            return match;
  		          }
  		        } catch (error) {// Some old React versions might throw if they can't find a match.
  		          // If so we should ignore it...
  		        }
  		      }

  		      return null;
  		    } else {
  		      // In the DOM we use a smarter mechanism to find the deepest a DOM node
  		      // that is registered if there isn't an exact match.
  		      let bestMatch = null;
  		      let bestRenderer = null; // Find the nearest ancestor which is mounted by a React.

  		      for (const rendererID in this._rendererInterfaces) {
  		        const renderer = this._rendererInterfaces[rendererID];
  		        const nearestNode = renderer.getNearestMountedDOMNode(target);

  		        if (nearestNode !== null) {
  		          if (nearestNode === target) {
  		            // Exact match we can exit early.
  		            bestMatch = nearestNode;
  		            bestRenderer = renderer;
  		            break;
  		          }

  		          if (bestMatch === null || bestMatch.contains(nearestNode)) {
  		            // If this is the first match or the previous match contains the new match,
  		            // so the new match is a deeper and therefore better match.
  		            bestMatch = nearestNode;
  		            bestRenderer = renderer;
  		          }
  		        }
  		      }

  		      if (bestRenderer != null && bestMatch != null) {
  		        try {
  		          return bestRenderer.getElementIDForHostInstance(bestMatch);
  		        } catch (error) {// Some old React versions might throw if they can't find a match.
  		          // If so we should ignore it...
  		        }
  		      }

  		      return null;
  		    }
  		  }

  		  getComponentNameForHostInstance(target) {
  		    // We duplicate this code from getIDForHostInstance to avoid an object allocation.
  		    if (isReactNativeEnvironment() || typeof target.nodeType !== 'number') {
  		      // In React Native or non-DOM we simply pick any renderer that has a match.
  		      for (const rendererID in this._rendererInterfaces) {
  		        const renderer = this._rendererInterfaces[rendererID];

  		        try {
  		          const id = renderer.getElementIDForHostInstance(target);

  		          if (id) {
  		            return renderer.getDisplayNameForElementID(id);
  		          }
  		        } catch (error) {// Some old React versions might throw if they can't find a match.
  		          // If so we should ignore it...
  		        }
  		      }

  		      return null;
  		    } else {
  		      // In the DOM we use a smarter mechanism to find the deepest a DOM node
  		      // that is registered if there isn't an exact match.
  		      let bestMatch = null;
  		      let bestRenderer = null; // Find the nearest ancestor which is mounted by a React.

  		      for (const rendererID in this._rendererInterfaces) {
  		        const renderer = this._rendererInterfaces[rendererID];
  		        const nearestNode = renderer.getNearestMountedDOMNode(target);

  		        if (nearestNode !== null) {
  		          if (nearestNode === target) {
  		            // Exact match we can exit early.
  		            bestMatch = nearestNode;
  		            bestRenderer = renderer;
  		            break;
  		          }

  		          if (bestMatch === null || bestMatch.contains(nearestNode)) {
  		            // If this is the first match or the previous match contains the new match,
  		            // so the new match is a deeper and therefore better match.
  		            bestMatch = nearestNode;
  		            bestRenderer = renderer;
  		          }
  		        }
  		      }

  		      if (bestRenderer != null && bestMatch != null) {
  		        try {
  		          const id = bestRenderer.getElementIDForHostInstance(bestMatch);

  		          if (id) {
  		            return bestRenderer.getDisplayNameForElementID(id);
  		          }
  		        } catch (error) {// Some old React versions might throw if they can't find a match.
  		          // If so we should ignore it...
  		        }
  		      }

  		      return null;
  		    }
  		  } // Temporarily support older standalone front-ends by forwarding the older message types
  		  // to the new "overrideValueAtPath" command the backend is now listening to.
  		  // Temporarily support older standalone front-ends by forwarding the older message types
  		  // to the new "overrideValueAtPath" command the backend is now listening to.
  		  // Temporarily support older standalone front-ends by forwarding the older message types
  		  // to the new "overrideValueAtPath" command the backend is now listening to.
  		  // Temporarily support older standalone front-ends by forwarding the older message types
  		  // to the new "overrideValueAtPath" command the backend is now listening to.


  		  selectNode(target) {
  		    const id = this.getIDForHostInstance(target);

  		    if (id !== null) {
  		      this._bridge.send('selectElement', id);
  		    }
  		  }

  		  registerRendererInterface(rendererID, rendererInterface) {
  		    this._rendererInterfaces[rendererID] = rendererInterface;
  		    rendererInterface.setTraceUpdatesEnabled(this._traceUpdatesEnabled); // When the renderer is attached, we need to tell it whether
  		    // we remember the previous selection that we'd like to restore.
  		    // It'll start tracking mounts for matches to the last selection path.

  		    const selection = this._persistedSelection;

  		    if (selection !== null && selection.rendererID === rendererID) {
  		      rendererInterface.setTrackedPath(selection.path);
  		    }
  		  }

  		  onUnsupportedRenderer() {
  		    this._bridge.send('unsupportedRendererVersion');
  		  }

  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */

  		function initBackend(hook, agent, global, isReloadAndProfileSupported) {
  		  if (hook == null) {
  		    // DevTools didn't get injected into this page (maybe b'c of the contentType).
  		    return () => {};
  		  }

  		  function registerRendererInterface(id, rendererInterface) {
  		    agent.registerRendererInterface(id, rendererInterface); // Now that the Store and the renderer interface are connected,
  		    // it's time to flush the pending operation codes to the frontend.

  		    rendererInterface.flushInitialOperations();
  		  }

  		  const subs = [hook.sub('renderer-attached', ({
  		    id,
  		    rendererInterface
  		  }) => {
  		    registerRendererInterface(id, rendererInterface);
  		  }), hook.sub('unsupported-renderer-version', () => {
  		    agent.onUnsupportedRenderer();
  		  }), hook.sub('fastRefreshScheduled', agent.onFastRefreshScheduled), hook.sub('operations', agent.onHookOperations), hook.sub('traceUpdates', agent.onTraceUpdates), hook.sub('settingsInitialized', agent.onHookSettings) // TODO Add additional subscriptions required for profiling mode
  		  ];
  		  agent.addListener('getIfHasUnsupportedRendererVersion', () => {
  		    if (hook.hasUnsupportedRendererAttached) {
  		      agent.onUnsupportedRenderer();
  		    }
  		  });
  		  hook.rendererInterfaces.forEach((rendererInterface, id) => {
  		    registerRendererInterface(id, rendererInterface);
  		  });
  		  hook.emit('react-devtools', agent);
  		  hook.reactDevtoolsAgent = agent;

  		  const onAgentShutdown = () => {
  		    subs.forEach(fn => fn());
  		    hook.rendererInterfaces.forEach(rendererInterface => {
  		      rendererInterface.cleanup();
  		    });
  		    hook.reactDevtoolsAgent = null;
  		  }; // Agent's event listeners are cleaned up by Agent in `shutdown` implementation.


  		  agent.addListener('shutdown', onAgentShutdown);
  		  agent.addListener('updateHookSettings', settings => {
  		    hook.settings = settings;
  		  });
  		  agent.addListener('getHookSettings', () => {
  		    if (hook.settings != null) {
  		      agent.onHookSettings(hook.settings);
  		    }
  		  });

  		  if (isReloadAndProfileSupported) {
  		    agent.onReloadAndProfileSupportedByHost();
  		  }

  		  return () => {
  		    subs.forEach(fn => fn());
  		  };
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		// This is a DevTools fork of shared/ConsolePatchingDev.
  		// The shared console patching code is DEV-only.
  		// We can't use it since DevTools only ships production builds.
  		// Helpers to patch console.logs to avoid logging during side-effect free
  		// replaying on render function. This currently only patches the object
  		// lazily which won't cover if the log function was extracted eagerly.
  		// We could also eagerly patch the method.
  		let disabledDepth = 0;
  		let prevLog;
  		let prevInfo;
  		let prevWarn;
  		let prevError;
  		let prevGroup;
  		let prevGroupCollapsed;
  		let prevGroupEnd;

  		function disabledLog() {}

  		disabledLog.__reactDisabledLog = true;
  		function disableLogs() {
  		  if (disabledDepth === 0) {
  		    prevLog = console.log;
  		    prevInfo = console.info;
  		    prevWarn = console.warn;
  		    prevError = console.error;
  		    prevGroup = console.group;
  		    prevGroupCollapsed = console.groupCollapsed;
  		    prevGroupEnd = console.groupEnd; // https://github.com/facebook/react/issues/19099

  		    const props = {
  		      configurable: true,
  		      enumerable: true,
  		      value: disabledLog,
  		      writable: true
  		    }; // $FlowFixMe[cannot-write] Flow thinks console is immutable.

  		    Object.defineProperties(console, {
  		      info: props,
  		      log: props,
  		      warn: props,
  		      error: props,
  		      group: props,
  		      groupCollapsed: props,
  		      groupEnd: props
  		    });
  		    /* eslint-enable react-internal/no-production-logging */
  		  }

  		  disabledDepth++;
  		}
  		function reenableLogs() {
  		  disabledDepth--;

  		  if (disabledDepth === 0) {
  		    const props = {
  		      configurable: true,
  		      enumerable: true,
  		      writable: true
  		    }; // $FlowFixMe[cannot-write] Flow thinks console is immutable.

  		    Object.defineProperties(console, {
  		      log: { ...props,
  		        value: prevLog
  		      },
  		      info: { ...props,
  		        value: prevInfo
  		      },
  		      warn: { ...props,
  		        value: prevWarn
  		      },
  		      error: { ...props,
  		        value: prevError
  		      },
  		      group: { ...props,
  		        value: prevGroup
  		      },
  		      groupCollapsed: { ...props,
  		        value: prevGroupCollapsed
  		      },
  		      groupEnd: { ...props,
  		        value: prevGroupEnd
  		      }
  		    });
  		    /* eslint-enable react-internal/no-production-logging */
  		  }

  		  if (disabledDepth < 0) {
  		    console.error('disabledDepth fell below zero. ' + 'This is a bug in React. Please file an issue.');
  		  }
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		// This is a DevTools fork of ReactComponentStackFrame.
  		// This fork enables DevTools to use the same "native" component stack format,
  		// while still maintaining support for multiple renderer versions
  		// (which use different values for ReactTypeOfWork).
  		// The shared console patching code is DEV-only.
  		// We can't use it since DevTools only ships production builds.

  		let prefix;
  		function describeBuiltInComponentFrame(name) {
  		  if (prefix === undefined) {
  		    // Extract the VM specific prefix used by each line.
  		    try {
  		      throw Error();
  		    } catch (x) {
  		      const match = x.stack.trim().match(/\n( *(at )?)/);
  		      prefix = match && match[1] || '';
  		    }
  		  }

  		  let suffix = '';
  		  // We use a suffix to ensure it gets parsed natively.


  		  return '\n' + prefix + name + suffix;
  		}
  		function describeDebugInfoFrame(name, env) {
  		  return describeBuiltInComponentFrame(name + (env ? ' [' + env + ']' : ''));
  		}
  		let reentry = false;

  		function describeNativeComponentFrame(fn, construct, currentDispatcherRef) {
  		  // If something asked for a stack inside a fake render, it should get ignored.
  		  if (!fn || reentry) {
  		    return '';
  		  }

  		  const previousPrepareStackTrace = Error.prepareStackTrace; // $FlowFixMe[incompatible-type] It does accept undefined.

  		  Error.prepareStackTrace = undefined;
  		  reentry = true; // Override the dispatcher so effects scheduled by this shallow render are thrown away.
  		  //
  		  // Note that unlike the code this was forked from (in ReactComponentStackFrame)
  		  // DevTools should override the dispatcher even when DevTools is compiled in production mode,
  		  // because the app itself may be in development mode and log errors/warnings.

  		  const previousDispatcher = currentDispatcherRef.H;
  		  currentDispatcherRef.H = null;
  		  disableLogs();

  		  try {
  		    // NOTE: keep in sync with the implementation in ReactComponentStackFrame

  		    /**
  		     * Finding a common stack frame between sample and control errors can be
  		     * tricky given the different types and levels of stack trace truncation from
  		     * different JS VMs. So instead we'll attempt to control what that common
  		     * frame should be through this object method:
  		     * Having both the sample and control errors be in the function under the
  		     * `DescribeNativeComponentFrameRoot` property, + setting the `name` and
  		     * `displayName` properties of the function ensures that a stack
  		     * frame exists that has the method name `DescribeNativeComponentFrameRoot` in
  		     * it for both control and sample stacks.
  		     */
  		    const RunInRootFrame = {
  		      DetermineComponentFrameRoot() {
  		        let control;

  		        try {
  		          // This should throw.
  		          if (construct) {
  		            // Something should be setting the props in the constructor.
  		            const Fake = function () {
  		              throw Error();
  		            }; // $FlowFixMe[prop-missing]


  		            Object.defineProperty(Fake.prototype, 'props', {
  		              set: function () {
  		                // We use a throwing setter instead of frozen or non-writable props
  		                // because that won't throw in a non-strict mode function.
  		                throw Error();
  		              }
  		            });

  		            if (typeof Reflect === 'object' && Reflect.construct) {
  		              // We construct a different control for this case to include any extra
  		              // frames added by the construct call.
  		              try {
  		                Reflect.construct(Fake, []);
  		              } catch (x) {
  		                control = x;
  		              }

  		              Reflect.construct(fn, [], Fake);
  		            } else {
  		              try {
  		                Fake.call();
  		              } catch (x) {
  		                control = x;
  		              } // $FlowFixMe[prop-missing] found when upgrading Flow


  		              fn.call(Fake.prototype);
  		            }
  		          } else {
  		            try {
  		              throw Error();
  		            } catch (x) {
  		              control = x;
  		            } // TODO(luna): This will currently only throw if the function component
  		            // tries to access React/ReactDOM/props. We should probably make this throw
  		            // in simple components too


  		            const maybePromise = fn(); // If the function component returns a promise, it's likely an async
  		            // component, which we don't yet support. Attach a noop catch handler to
  		            // silence the error.
  		            // TODO: Implement component stacks for async client components?

  		            if (maybePromise && typeof maybePromise.catch === 'function') {
  		              maybePromise.catch(() => {});
  		            }
  		          }
  		        } catch (sample) {
  		          // This is inlined manually because closure doesn't do it for us.
  		          if (sample && control && typeof sample.stack === 'string') {
  		            return [sample.stack, control.stack];
  		          }
  		        }

  		        return [null, null];
  		      }

  		    }; // $FlowFixMe[prop-missing]

  		    RunInRootFrame.DetermineComponentFrameRoot.displayName = 'DetermineComponentFrameRoot';
  		    const namePropDescriptor = Object.getOwnPropertyDescriptor(RunInRootFrame.DetermineComponentFrameRoot, 'name'); // Before ES6, the `name` property was not configurable.

  		    if (namePropDescriptor && namePropDescriptor.configurable) {
  		      // V8 utilizes a function's `name` property when generating a stack trace.
  		      Object.defineProperty(RunInRootFrame.DetermineComponentFrameRoot, // Configurable properties can be updated even if its writable descriptor
  		      // is set to `false`.
  		      // $FlowFixMe[cannot-write]
  		      'name', {
  		        value: 'DetermineComponentFrameRoot'
  		      });
  		    }

  		    const [sampleStack, controlStack] = RunInRootFrame.DetermineComponentFrameRoot();

  		    if (sampleStack && controlStack) {
  		      // This extracts the first frame from the sample that isn't also in the control.
  		      // Skipping one frame that we assume is the frame that calls the two.
  		      const sampleLines = sampleStack.split('\n');
  		      const controlLines = controlStack.split('\n');
  		      let s = 0;
  		      let c = 0;

  		      while (s < sampleLines.length && !sampleLines[s].includes('DetermineComponentFrameRoot')) {
  		        s++;
  		      }

  		      while (c < controlLines.length && !controlLines[c].includes('DetermineComponentFrameRoot')) {
  		        c++;
  		      } // We couldn't find our intentionally injected common root frame, attempt
  		      // to find another common root frame by search from the bottom of the
  		      // control stack...


  		      if (s === sampleLines.length || c === controlLines.length) {
  		        s = sampleLines.length - 1;
  		        c = controlLines.length - 1;

  		        while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {
  		          // We expect at least one stack frame to be shared.
  		          // Typically this will be the root most one. However, stack frames may be
  		          // cut off due to maximum stack limits. In this case, one maybe cut off
  		          // earlier than the other. We assume that the sample is longer or the same
  		          // and there for cut off earlier. So we should find the root most frame in
  		          // the sample somewhere in the control.
  		          c--;
  		        }
  		      }

  		      for (; s >= 1 && c >= 0; s--, c--) {
  		        // Next we find the first one that isn't the same which should be the
  		        // frame that called our sample function and the control.
  		        if (sampleLines[s] !== controlLines[c]) {
  		          // In V8, the first line is describing the message but other VMs don't.
  		          // If we're about to return the first line, and the control is also on the same
  		          // line, that's a pretty good indicator that our sample threw at same line as
  		          // the control. I.e. before we entered the sample frame. So we ignore this result.
  		          // This can happen if you passed a class to function component, or non-function.
  		          if (s !== 1 || c !== 1) {
  		            do {
  		              s--;
  		              c--; // We may still have similar intermediate frames from the construct call.
  		              // The next one that isn't the same should be our match though.

  		              if (c < 0 || sampleLines[s] !== controlLines[c]) {
  		                // V8 adds a "new" prefix for native classes. Let's remove it to make it prettier.
  		                let frame = '\n' + sampleLines[s].replace(' at new ', ' at '); // If our component frame is labeled "<anonymous>"
  		                // but we have a user-provided "displayName"
  		                // splice it in to make the stack more readable.

  		                if (fn.displayName && frame.includes('<anonymous>')) {
  		                  frame = frame.replace('<anonymous>', fn.displayName);
  		                }

  		                if (false) ; // Return the line we found.


  		                return frame;
  		              }
  		            } while (s >= 1 && c >= 0);
  		          }

  		          break;
  		        }
  		      }
  		    }
  		  } finally {
  		    reentry = false;
  		    Error.prepareStackTrace = previousPrepareStackTrace;
  		    currentDispatcherRef.H = previousDispatcher;
  		    reenableLogs();
  		  } // Fallback to just using the name if we couldn't make it throw.


  		  const name = fn ? fn.displayName || fn.name : '';
  		  const syntheticFrame = name ? describeBuiltInComponentFrame(name) : '';

  		  return syntheticFrame;
  		}
  		function describeClassComponentFrame(ctor, currentDispatcherRef) {
  		  return describeNativeComponentFrame(ctor, true, currentDispatcherRef);
  		}
  		function describeFunctionComponentFrame(fn, currentDispatcherRef) {
  		  return describeNativeComponentFrame(fn, false, currentDispatcherRef);
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		// This is a DevTools fork of ReactComponentInfoStack.
  		// This fork enables DevTools to use the same "native" component stack format,
  		// while still maintaining support for multiple renderer versions
  		// (which use different values for ReactTypeOfWork).


  		function getOwnerStackByComponentInfoInDev(componentInfo) {
  		  try {
  		    let info = ''; // The owner stack of the current component will be where it was created, i.e. inside its owner.
  		    // There's no actual name of the currently executing component. Instead, that is available
  		    // on the regular stack that's currently executing. However, if there is no owner at all, then
  		    // there's no stack frame so we add the name of the root component to the stack to know which
  		    // component is currently executing.

  		    if (!componentInfo.owner && typeof componentInfo.name === 'string') {
  		      return describeBuiltInComponentFrame(componentInfo.name);
  		    }

  		    let owner = componentInfo;

  		    while (owner) {
  		      const ownerStack = owner.debugStack;

  		      if (ownerStack != null) {
  		        // Server Component
  		        owner = owner.owner;

  		        if (owner) {
  		          // TODO: Should we stash this somewhere for caching purposes?
  		          info += '\n' + formatOwnerStack(ownerStack);
  		        }
  		      } else {
  		        break;
  		      }
  		    }

  		    return info;
  		  } catch (x) {
  		    return '\nError generating stack: ' + x.message + '\n' + x.stack;
  		  }
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		// This keeps track of Server Component logs which may come from.
  		// This is in a shared module because Server Component logs don't come from a specific renderer
  		// but can become associated with a Virtual Instance of any renderer.
  		// This keeps it around as long as the ComponentInfo is alive which
  		// lets the Fiber get reparented/remounted and still observe the previous errors/warnings.
  		// Unless we explicitly clear the logs from a Fiber.
  		const componentInfoToComponentLogsMap = new WeakMap();
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */





  		function supportsConsoleTasks(componentInfo) {
  		  // If this ReactComponentInfo supports native console.createTask then we are already running
  		  // inside a native async stack trace if it's active - meaning the DevTools is open.
  		  // Ideally we'd detect if this task was created while the DevTools was open or not.
  		  return !!componentInfo.debugTask;
  		}

  		function attach(hook, rendererID, renderer, global) {
  		  const {
  		    getCurrentComponentInfo
  		  } = renderer;

  		  function getComponentStack(topFrame) {
  		    if (getCurrentComponentInfo === undefined) {
  		      // Expected this to be part of the renderer. Ignore.
  		      return null;
  		    }

  		    const current = getCurrentComponentInfo();

  		    if (current === null) {
  		      // Outside of our render scope.
  		      return null;
  		    }

  		    if (supportsConsoleTasks(current)) {
  		      // This will be handled natively by console.createTask. No need for
  		      // DevTools to add it.
  		      return null;
  		    }

  		    const enableOwnerStacks = current.debugStack != null;
  		    let componentStack = '';

  		    if (enableOwnerStacks) {
  		      // Prefix the owner stack with the current stack. I.e. what called
  		      // console.error. While this will also be part of the native stack,
  		      // it is hidden and not presented alongside this argument so we print
  		      // them all together.
  		      const topStackFrames = formatOwnerStack(topFrame);

  		      if (topStackFrames) {
  		        componentStack += '\n' + topStackFrames;
  		      }

  		      componentStack += getOwnerStackByComponentInfoInDev(current);
  		    }

  		    return {
  		      enableOwnerStacks,
  		      componentStack
  		    };
  		  } // Called when an error or warning is logged during render, commit, or passive (including unmount functions).


  		  function onErrorOrWarning(type, args) {
  		    if (getCurrentComponentInfo === undefined) {
  		      // Expected this to be part of the renderer. Ignore.
  		      return;
  		    }

  		    const componentInfo = getCurrentComponentInfo();

  		    if (componentInfo === null) {
  		      // Outside of our render scope.
  		      return;
  		    }

  		    if (args.length > 3 && typeof args[0] === 'string' && args[0].startsWith('%c%s%c ') && typeof args[1] === 'string' && typeof args[2] === 'string' && typeof args[3] === 'string') {
  		      // This looks like the badge we prefixed to the log. Our UI doesn't support formatted logs.
  		      // We remove the formatting. If the environment of the log is the same as the environment of
  		      // the component (the common case) we remove the badge completely otherwise leave it plain
  		      const format = args[0].slice(7);
  		      const env = args[2].trim();
  		      args = args.slice(4);

  		      if (env !== componentInfo.env) {
  		        args.unshift('[' + env + '] ' + format);
  		      } else {
  		        args.unshift(format);
  		      }
  		    } // We can't really use this message as a unique key, since we can't distinguish
  		    // different objects in this implementation. We have to delegate displaying of the objects
  		    // to the environment, the browser console, for example, so this is why this should be kept
  		    // as an array of arguments, instead of the plain string.
  		    // [Warning: %o, {...}] and [Warning: %o, {...}] will be considered as the same message,
  		    // even if objects are different


  		    const message = formatConsoleArgumentsToSingleString(...args); // Track the warning/error for later.

  		    let componentLogsEntry = componentInfoToComponentLogsMap.get(componentInfo);

  		    if (componentLogsEntry === undefined) {
  		      componentLogsEntry = {
  		        errors: new Map(),
  		        errorsCount: 0,
  		        warnings: new Map(),
  		        warningsCount: 0
  		      };
  		      componentInfoToComponentLogsMap.set(componentInfo, componentLogsEntry);
  		    }

  		    const messageMap = type === 'error' ? componentLogsEntry.errors : componentLogsEntry.warnings;
  		    const count = messageMap.get(message) || 0;
  		    messageMap.set(message, count + 1);

  		    if (type === 'error') {
  		      componentLogsEntry.errorsCount++;
  		    } else {
  		      componentLogsEntry.warningsCount++;
  		    } // The changes will be flushed later when we commit this tree to Fiber.

  		  }

  		  return {
  		    cleanup() {},

  		    clearErrorsAndWarnings() {},

  		    clearErrorsForElementID() {},

  		    clearWarningsForElementID() {},

  		    getSerializedElementValueByPath() {},

  		    deletePath() {},

  		    findHostInstancesForElementID() {
  		      return null;
  		    },

  		    flushInitialOperations() {},

  		    getBestMatchForTrackedPath() {
  		      return null;
  		    },

  		    getComponentStack,

  		    getDisplayNameForElementID() {
  		      return null;
  		    },

  		    getNearestMountedDOMNode() {
  		      return null;
  		    },

  		    getElementIDForHostInstance() {
  		      return null;
  		    },

  		    getInstanceAndStyle() {
  		      return {
  		        instance: null,
  		        style: null
  		      };
  		    },

  		    getOwnersList() {
  		      return null;
  		    },

  		    getPathForElement() {
  		      return null;
  		    },

  		    getProfilingData() {
  		      throw new Error('getProfilingData not supported by this renderer');
  		    },

  		    handleCommitFiberRoot() {},

  		    handleCommitFiberUnmount() {},

  		    handlePostCommitFiberRoot() {},

  		    hasElementWithId() {
  		      return false;
  		    },

  		    inspectElement(requestID, id, path) {
  		      return {
  		        id,
  		        responseID: requestID,
  		        type: 'not-found'
  		      };
  		    },

  		    logElementToConsole() {},

  		    getElementAttributeByPath() {},

  		    getElementSourceFunctionById() {},

  		    onErrorOrWarning,

  		    overrideError() {},

  		    overrideSuspense() {},

  		    overrideValueAtPath() {},

  		    renamePath() {},

  		    renderer,

  		    setTraceUpdatesEnabled() {},

  		    setTrackedPath() {},

  		    startProfiling() {},

  		    stopProfiling() {},

  		    storeAsGlobal() {},

  		    updateComponentFilters() {},

  		    getEnvironmentNames() {
  		      return [];
  		    }

  		  };
  		}
  		// EXTERNAL MODULE: ../react-debug-tools/node_modules/error-stack-parser/error-stack-parser.js
  		var error_stack_parser = __webpack_require__(2235);
  		var error_stack_parser_default = /*#__PURE__*/__webpack_require__.n(error_stack_parser);
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		const assign_assign = Object.assign;
  		/* harmony default export */ const shared_assign = (assign_assign);
  		const external_react_namespaceObject = requireReact();
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */

  		const ReactSharedInternals = external_react_namespaceObject.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  		/* harmony default export */ const shared_ReactSharedInternals = (ReactSharedInternals);
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		const FunctionComponent = 0;
  		const ContextProvider = 10;
  		const ForwardRef = 11;
  		const SimpleMemoComponent = 15;
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		// $FlowFixMe[method-unbinding]
  		const hasOwnProperty_hasOwnProperty = Object.prototype.hasOwnProperty;
  		/* harmony default export */ const shared_hasOwnProperty = (hasOwnProperty_hasOwnProperty);
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */





  		 // Used to track hooks called during a render

  		let hookLog = []; // Primitives

  		let primitiveStackCache = null;

  		function getPrimitiveStackCache() {
  		  // This initializes a cache of all primitive hooks so that the top
  		  // most stack frames added by calling the primitive hook can be removed.
  		  if (primitiveStackCache === null) {
  		    const cache = new Map();
  		    let readHookLog;

  		    try {
  		      // Use all hooks here to add them to the hook log.
  		      Dispatcher.useContext({
  		        _currentValue: null
  		      });
  		      Dispatcher.useState(null);
  		      Dispatcher.useReducer((s, a) => s, null);
  		      Dispatcher.useRef(null);

  		      if (typeof Dispatcher.useCacheRefresh === 'function') {
  		        // This type check is for Flow only.
  		        Dispatcher.useCacheRefresh();
  		      }

  		      Dispatcher.useLayoutEffect(() => {});
  		      Dispatcher.useInsertionEffect(() => {});
  		      Dispatcher.useEffect(() => {});
  		      Dispatcher.useImperativeHandle(undefined, () => null);
  		      Dispatcher.useDebugValue(null);
  		      Dispatcher.useCallback(() => {});
  		      Dispatcher.useTransition();
  		      Dispatcher.useSyncExternalStore(() => () => {}, () => null, () => null);
  		      Dispatcher.useDeferredValue(null);
  		      Dispatcher.useMemo(() => null);
  		      Dispatcher.useOptimistic(null, (s, a) => s);
  		      Dispatcher.useFormState((s, p) => s, null);
  		      Dispatcher.useActionState((s, p) => s, null);
  		      Dispatcher.useHostTransitionStatus();

  		      if (typeof Dispatcher.useMemoCache === 'function') {
  		        // This type check is for Flow only.
  		        Dispatcher.useMemoCache(0);
  		      }

  		      if (typeof Dispatcher.use === 'function') {
  		        // This type check is for Flow only.
  		        Dispatcher.use({
  		          $$typeof: REACT_CONTEXT_TYPE,
  		          _currentValue: null
  		        });
  		        Dispatcher.use({
  		          then() {},

  		          status: 'fulfilled',
  		          value: null
  		        });

  		        try {
  		          Dispatcher.use({
  		            then() {}

  		          });
  		        } catch (x) {}
  		      }

  		      Dispatcher.useId();

  		      if (typeof Dispatcher.useEffectEvent === 'function') {
  		        Dispatcher.useEffectEvent(args => {});
  		      }
  		    } finally {
  		      readHookLog = hookLog;
  		      hookLog = [];
  		    }

  		    for (let i = 0; i < readHookLog.length; i++) {
  		      const hook = readHookLog[i];
  		      cache.set(hook.primitive, error_stack_parser_default().parse(hook.stackError));
  		    }

  		    primitiveStackCache = cache;
  		  }

  		  return primitiveStackCache;
  		}

  		let currentFiber = null;
  		let currentHook = null;
  		let currentContextDependency = null;

  		function nextHook() {
  		  const hook = currentHook;

  		  if (hook !== null) {
  		    currentHook = hook.next;
  		  }

  		  return hook;
  		}

  		function readContext(context) {
  		  if (currentFiber === null) {
  		    // Hook inspection without access to the Fiber tree
  		    // e.g. when warming up the primitive stack cache or during `ReactDebugTools.inspectHooks()`.
  		    return context._currentValue;
  		  } else {
  		    if (currentContextDependency === null) {
  		      throw new Error('Context reads do not line up with context dependencies. This is a bug in React Debug Tools.');
  		    }

  		    let value; // For now we don't expose readContext usage in the hooks debugging info.

  		    if (shared_hasOwnProperty.call(currentContextDependency, 'memoizedValue')) {
  		      // $FlowFixMe[incompatible-use] Flow thinks `hasOwnProperty` mutates `currentContextDependency`
  		      value = currentContextDependency.memoizedValue; // $FlowFixMe[incompatible-use] Flow thinks `hasOwnProperty` mutates `currentContextDependency`

  		      currentContextDependency = currentContextDependency.next;
  		    } else {
  		      // Before React 18, we did not have `memoizedValue` so we rely on `setupContexts` in those versions.
  		      // Multiple reads of the same context were also only tracked as a single dependency.
  		      // We just give up on advancing context dependencies and solely rely on `setupContexts`.
  		      value = context._currentValue;
  		    }

  		    return value;
  		  }
  		}

  		const SuspenseException = new Error("Suspense Exception: This is not a real error! It's an implementation " + 'detail of `use` to interrupt the current render. You must either ' + 'rethrow it immediately, or move the `use` call outside of the ' + '`try/catch` block. Capturing without rethrowing will lead to ' + 'unexpected behavior.\n\n' + 'To handle async errors, wrap your component in an error boundary, or ' + "call the promise's `.catch` method and pass the result to `use`.");

  		function use(usable) {
  		  if (usable !== null && typeof usable === 'object') {
  		    // $FlowFixMe[method-unbinding]
  		    if (typeof usable.then === 'function') {
  		      const thenable = usable;

  		      switch (thenable.status) {
  		        case 'fulfilled':
  		          {
  		            const fulfilledValue = thenable.value;
  		            hookLog.push({
  		              displayName: null,
  		              primitive: 'Promise',
  		              stackError: new Error(),
  		              value: fulfilledValue,
  		              debugInfo: thenable._debugInfo === undefined ? null : thenable._debugInfo,
  		              dispatcherHookName: 'Use'
  		            });
  		            return fulfilledValue;
  		          }

  		        case 'rejected':
  		          {
  		            const rejectedError = thenable.reason;
  		            throw rejectedError;
  		          }
  		      } // If this was an uncached Promise we have to abandon this attempt
  		      // but we can still emit anything up until this point.


  		      hookLog.push({
  		        displayName: null,
  		        primitive: 'Unresolved',
  		        stackError: new Error(),
  		        value: thenable,
  		        debugInfo: thenable._debugInfo === undefined ? null : thenable._debugInfo,
  		        dispatcherHookName: 'Use'
  		      });
  		      throw SuspenseException;
  		    } else if (usable.$$typeof === REACT_CONTEXT_TYPE) {
  		      const context = usable;
  		      const value = readContext(context);
  		      hookLog.push({
  		        displayName: context.displayName || 'Context',
  		        primitive: 'Context (use)',
  		        stackError: new Error(),
  		        value,
  		        debugInfo: null,
  		        dispatcherHookName: 'Use'
  		      });
  		      return value;
  		    }
  		  } // eslint-disable-next-line react-internal/safe-string-coercion


  		  throw new Error('An unsupported type was passed to use(): ' + String(usable));
  		}

  		function useContext(context) {
  		  const value = readContext(context);
  		  hookLog.push({
  		    displayName: context.displayName || null,
  		    primitive: 'Context',
  		    stackError: new Error(),
  		    value: value,
  		    debugInfo: null,
  		    dispatcherHookName: 'Context'
  		  });
  		  return value;
  		}

  		function useState(initialState) {
  		  const hook = nextHook();
  		  const state = hook !== null ? hook.memoizedState : typeof initialState === 'function' ? // $FlowFixMe[incompatible-use]: Flow doesn't like mixed types
  		  initialState() : initialState;
  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'State',
  		    stackError: new Error(),
  		    value: state,
  		    debugInfo: null,
  		    dispatcherHookName: 'State'
  		  });
  		  return [state, action => {}];
  		}

  		function useReducer(reducer, initialArg, init) {
  		  const hook = nextHook();
  		  let state;

  		  if (hook !== null) {
  		    state = hook.memoizedState;
  		  } else {
  		    state = init !== undefined ? init(initialArg) : initialArg;
  		  }

  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'Reducer',
  		    stackError: new Error(),
  		    value: state,
  		    debugInfo: null,
  		    dispatcherHookName: 'Reducer'
  		  });
  		  return [state, action => {}];
  		}

  		function useRef(initialValue) {
  		  const hook = nextHook();
  		  const ref = hook !== null ? hook.memoizedState : {
  		    current: initialValue
  		  };
  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'Ref',
  		    stackError: new Error(),
  		    value: ref.current,
  		    debugInfo: null,
  		    dispatcherHookName: 'Ref'
  		  });
  		  return ref;
  		}

  		function useCacheRefresh() {
  		  const hook = nextHook();
  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'CacheRefresh',
  		    stackError: new Error(),
  		    value: hook !== null ? hook.memoizedState : function refresh() {},
  		    debugInfo: null,
  		    dispatcherHookName: 'CacheRefresh'
  		  });
  		  return () => {};
  		}

  		function useLayoutEffect(create, inputs) {
  		  nextHook();
  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'LayoutEffect',
  		    stackError: new Error(),
  		    value: create,
  		    debugInfo: null,
  		    dispatcherHookName: 'LayoutEffect'
  		  });
  		}

  		function useInsertionEffect(create, inputs) {
  		  nextHook();
  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'InsertionEffect',
  		    stackError: new Error(),
  		    value: create,
  		    debugInfo: null,
  		    dispatcherHookName: 'InsertionEffect'
  		  });
  		}

  		function useEffect(create, deps) {
  		  nextHook();
  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'Effect',
  		    stackError: new Error(),
  		    value: create,
  		    debugInfo: null,
  		    dispatcherHookName: 'Effect'
  		  });
  		}

  		function useImperativeHandle(ref, create, inputs) {
  		  nextHook(); // We don't actually store the instance anywhere if there is no ref callback
  		  // and if there is a ref callback it might not store it but if it does we
  		  // have no way of knowing where. So let's only enable introspection of the
  		  // ref itself if it is using the object form.

  		  let instance = undefined;

  		  if (ref !== null && typeof ref === 'object') {
  		    instance = ref.current;
  		  }

  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'ImperativeHandle',
  		    stackError: new Error(),
  		    value: instance,
  		    debugInfo: null,
  		    dispatcherHookName: 'ImperativeHandle'
  		  });
  		}

  		function useDebugValue(value, formatterFn) {
  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'DebugValue',
  		    stackError: new Error(),
  		    value: typeof formatterFn === 'function' ? formatterFn(value) : value,
  		    debugInfo: null,
  		    dispatcherHookName: 'DebugValue'
  		  });
  		}

  		function useCallback(callback, inputs) {
  		  const hook = nextHook();
  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'Callback',
  		    stackError: new Error(),
  		    value: hook !== null ? hook.memoizedState[0] : callback,
  		    debugInfo: null,
  		    dispatcherHookName: 'Callback'
  		  });
  		  return callback;
  		}

  		function useMemo(nextCreate, inputs) {
  		  const hook = nextHook();
  		  const value = hook !== null ? hook.memoizedState[0] : nextCreate();
  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'Memo',
  		    stackError: new Error(),
  		    value,
  		    debugInfo: null,
  		    dispatcherHookName: 'Memo'
  		  });
  		  return value;
  		}

  		function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
  		  // useSyncExternalStore() composes multiple hooks internally.
  		  // Advance the current hook index the same number of times
  		  // so that subsequent hooks have the right memoized state.
  		  nextHook(); // SyncExternalStore

  		  nextHook(); // Effect

  		  const value = getSnapshot();
  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'SyncExternalStore',
  		    stackError: new Error(),
  		    value,
  		    debugInfo: null,
  		    dispatcherHookName: 'SyncExternalStore'
  		  });
  		  return value;
  		}

  		function useTransition() {
  		  // useTransition() composes multiple hooks internally.
  		  // Advance the current hook index the same number of times
  		  // so that subsequent hooks have the right memoized state.
  		  const stateHook = nextHook();
  		  nextHook(); // Callback

  		  const isPending = stateHook !== null ? stateHook.memoizedState : false;
  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'Transition',
  		    stackError: new Error(),
  		    value: isPending,
  		    debugInfo: null,
  		    dispatcherHookName: 'Transition'
  		  });
  		  return [isPending, () => {}];
  		}

  		function useDeferredValue(value, initialValue) {
  		  const hook = nextHook();
  		  const prevValue = hook !== null ? hook.memoizedState : value;
  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'DeferredValue',
  		    stackError: new Error(),
  		    value: prevValue,
  		    debugInfo: null,
  		    dispatcherHookName: 'DeferredValue'
  		  });
  		  return prevValue;
  		}

  		function useId() {
  		  const hook = nextHook();
  		  const id = hook !== null ? hook.memoizedState : '';
  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'Id',
  		    stackError: new Error(),
  		    value: id,
  		    debugInfo: null,
  		    dispatcherHookName: 'Id'
  		  });
  		  return id;
  		} // useMemoCache is an implementation detail of Forget's memoization
  		// it should not be called directly in user-generated code


  		function useMemoCache(size) {
  		  const fiber = currentFiber; // Don't throw, in case this is called from getPrimitiveStackCache

  		  if (fiber == null) {
  		    return [];
  		  }

  		  const memoCache = // $FlowFixMe[incompatible-use]: updateQueue is mixed
  		  fiber.updateQueue != null ? fiber.updateQueue.memoCache : null;

  		  if (memoCache == null) {
  		    return [];
  		  }

  		  let data = memoCache.data[memoCache.index];

  		  if (data === undefined) {
  		    data = memoCache.data[memoCache.index] = new Array(size);

  		    for (let i = 0; i < size; i++) {
  		      data[i] = REACT_MEMO_CACHE_SENTINEL;
  		    }
  		  } // We don't write anything to hookLog on purpose, so this hook remains invisible to users.


  		  memoCache.index++;
  		  return data;
  		}

  		function useOptimistic(passthrough, reducer) {
  		  const hook = nextHook();
  		  let state;

  		  if (hook !== null) {
  		    state = hook.memoizedState;
  		  } else {
  		    state = passthrough;
  		  }

  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'Optimistic',
  		    stackError: new Error(),
  		    value: state,
  		    debugInfo: null,
  		    dispatcherHookName: 'Optimistic'
  		  });
  		  return [state, action => {}];
  		}

  		function useFormState(action, initialState, permalink) {
  		  const hook = nextHook(); // FormState

  		  nextHook(); // PendingState

  		  nextHook(); // ActionQueue

  		  const stackError = new Error();
  		  let value;
  		  let debugInfo = null;
  		  let error = null;

  		  if (hook !== null) {
  		    const actionResult = hook.memoizedState;

  		    if (typeof actionResult === 'object' && actionResult !== null && // $FlowFixMe[method-unbinding]
  		    typeof actionResult.then === 'function') {
  		      const thenable = actionResult;

  		      switch (thenable.status) {
  		        case 'fulfilled':
  		          {
  		            value = thenable.value;
  		            debugInfo = thenable._debugInfo === undefined ? null : thenable._debugInfo;
  		            break;
  		          }

  		        case 'rejected':
  		          {
  		            const rejectedError = thenable.reason;
  		            error = rejectedError;
  		            break;
  		          }

  		        default:
  		          // If this was an uncached Promise we have to abandon this attempt
  		          // but we can still emit anything up until this point.
  		          error = SuspenseException;
  		          debugInfo = thenable._debugInfo === undefined ? null : thenable._debugInfo;
  		          value = thenable;
  		      }
  		    } else {
  		      value = actionResult;
  		    }
  		  } else {
  		    value = initialState;
  		  }

  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'FormState',
  		    stackError: stackError,
  		    value: value,
  		    debugInfo: debugInfo,
  		    dispatcherHookName: 'FormState'
  		  });

  		  if (error !== null) {
  		    throw error;
  		  } // value being a Thenable is equivalent to error being not null
  		  // i.e. we only reach this point with Awaited<S>


  		  const state = value; // TODO: support displaying pending value

  		  return [state, payload => {}, false];
  		}

  		function useActionState(action, initialState, permalink) {
  		  const hook = nextHook(); // FormState

  		  nextHook(); // PendingState

  		  nextHook(); // ActionQueue

  		  const stackError = new Error();
  		  let value;
  		  let debugInfo = null;
  		  let error = null;

  		  if (hook !== null) {
  		    const actionResult = hook.memoizedState;

  		    if (typeof actionResult === 'object' && actionResult !== null && // $FlowFixMe[method-unbinding]
  		    typeof actionResult.then === 'function') {
  		      const thenable = actionResult;

  		      switch (thenable.status) {
  		        case 'fulfilled':
  		          {
  		            value = thenable.value;
  		            debugInfo = thenable._debugInfo === undefined ? null : thenable._debugInfo;
  		            break;
  		          }

  		        case 'rejected':
  		          {
  		            const rejectedError = thenable.reason;
  		            error = rejectedError;
  		            break;
  		          }

  		        default:
  		          // If this was an uncached Promise we have to abandon this attempt
  		          // but we can still emit anything up until this point.
  		          error = SuspenseException;
  		          debugInfo = thenable._debugInfo === undefined ? null : thenable._debugInfo;
  		          value = thenable;
  		      }
  		    } else {
  		      value = actionResult;
  		    }
  		  } else {
  		    value = initialState;
  		  }

  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'ActionState',
  		    stackError: stackError,
  		    value: value,
  		    debugInfo: debugInfo,
  		    dispatcherHookName: 'ActionState'
  		  });

  		  if (error !== null) {
  		    throw error;
  		  } // value being a Thenable is equivalent to error being not null
  		  // i.e. we only reach this point with Awaited<S>


  		  const state = value; // TODO: support displaying pending value

  		  return [state, payload => {}, false];
  		}

  		function useHostTransitionStatus() {
  		  const status = readContext( // $FlowFixMe[prop-missing] `readContext` only needs _currentValue
  		  {
  		    // $FlowFixMe[incompatible-cast] TODO: Incorrect bottom value without access to Fiber config.
  		    _currentValue: null
  		  });
  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'HostTransitionStatus',
  		    stackError: new Error(),
  		    value: status,
  		    debugInfo: null,
  		    dispatcherHookName: 'HostTransitionStatus'
  		  });
  		  return status;
  		}

  		function useEffectEvent(callback) {
  		  nextHook();
  		  hookLog.push({
  		    displayName: null,
  		    primitive: 'EffectEvent',
  		    stackError: new Error(),
  		    value: callback,
  		    debugInfo: null,
  		    dispatcherHookName: 'EffectEvent'
  		  });
  		  return callback;
  		}

  		const Dispatcher = {
  		  readContext,
  		  use,
  		  useCallback,
  		  useContext,
  		  useEffect,
  		  useImperativeHandle,
  		  useLayoutEffect,
  		  useInsertionEffect,
  		  useMemo,
  		  useReducer,
  		  useRef,
  		  useState,
  		  useDebugValue,
  		  useDeferredValue,
  		  useTransition,
  		  useSyncExternalStore,
  		  useId,
  		  useHostTransitionStatus,
  		  useFormState,
  		  useActionState,
  		  useOptimistic,
  		  useMemoCache,
  		  useCacheRefresh,
  		  useEffectEvent
  		}; // create a proxy to throw a custom error
  		// in case future versions of React adds more hooks

  		const DispatcherProxyHandler = {
  		  get(target, prop) {
  		    if (target.hasOwnProperty(prop)) {
  		      // $FlowFixMe[invalid-computed-prop]
  		      return target[prop];
  		    }

  		    const error = new Error('Missing method in Dispatcher: ' + prop); // Note: This error name needs to stay in sync with react-devtools-shared
  		    // TODO: refactor this if we ever combine the devtools and debug tools packages

  		    error.name = 'ReactDebugToolsUnsupportedHookError';
  		    throw error;
  		  }

  		}; // `Proxy` may not exist on some platforms

  		const DispatcherProxy = typeof Proxy === 'undefined' ? Dispatcher : new Proxy(Dispatcher, DispatcherProxyHandler); // Inspect

  		// Don't assume
  		//
  		// We can't assume that stack frames are nth steps away from anything.
  		// E.g. we can't assume that the root call shares all frames with the stack
  		// of a hook call. A simple way to demonstrate this is wrapping `new Error()`
  		// in a wrapper constructor like a polyfill. That'll add an extra frame.
  		// Similar things can happen with the call to the dispatcher. The top frame
  		// may not be the primitive.
  		//
  		// We also can't assume that the last frame of the root call is the same
  		// frame as the last frame of the hook call because long stack traces can be
  		// truncated to a stack trace limit.
  		let mostLikelyAncestorIndex = 0;

  		function findSharedIndex(hookStack, rootStack, rootIndex) {
  		  const source = rootStack[rootIndex].source;

  		  hookSearch: for (let i = 0; i < hookStack.length; i++) {
  		    if (hookStack[i].source === source) {
  		      // This looks like a match. Validate that the rest of both stack match up.
  		      for (let a = rootIndex + 1, b = i + 1; a < rootStack.length && b < hookStack.length; a++, b++) {
  		        if (hookStack[b].source !== rootStack[a].source) {
  		          // If not, give up and try a different match.
  		          continue hookSearch;
  		        }
  		      }

  		      return i;
  		    }
  		  }

  		  return -1;
  		}

  		function findCommonAncestorIndex(rootStack, hookStack) {
  		  let rootIndex = findSharedIndex(hookStack, rootStack, mostLikelyAncestorIndex);

  		  if (rootIndex !== -1) {
  		    return rootIndex;
  		  } // If the most likely one wasn't a hit, try any other frame to see if it is shared.
  		  // If that takes more than 5 frames, something probably went wrong.


  		  for (let i = 0; i < rootStack.length && i < 5; i++) {
  		    rootIndex = findSharedIndex(hookStack, rootStack, i);

  		    if (rootIndex !== -1) {
  		      mostLikelyAncestorIndex = i;
  		      return rootIndex;
  		    }
  		  }

  		  return -1;
  		}

  		function isReactWrapper(functionName, wrapperName) {
  		  const hookName = parseHookName(functionName);

  		  if (wrapperName === 'HostTransitionStatus') {
  		    return hookName === wrapperName || hookName === 'FormStatus';
  		  }

  		  return hookName === wrapperName;
  		}

  		function findPrimitiveIndex(hookStack, hook) {
  		  const stackCache = getPrimitiveStackCache();
  		  const primitiveStack = stackCache.get(hook.primitive);

  		  if (primitiveStack === undefined) {
  		    return -1;
  		  }

  		  for (let i = 0; i < primitiveStack.length && i < hookStack.length; i++) {
  		    // Note: there is no guarantee that we will find the top-most primitive frame in the stack
  		    // For React Native (uses Hermes), these source fields will be identical and skipped
  		    if (primitiveStack[i].source !== hookStack[i].source) {
  		      // If the next two frames are functions called `useX` then we assume that they're part of the
  		      // wrappers that the React package or other packages adds around the dispatcher.
  		      if (i < hookStack.length - 1 && isReactWrapper(hookStack[i].functionName, hook.dispatcherHookName)) {
  		        i++;
  		      }

  		      if (i < hookStack.length - 1 && isReactWrapper(hookStack[i].functionName, hook.dispatcherHookName)) {
  		        i++;
  		      }

  		      return i;
  		    }
  		  }

  		  return -1;
  		}

  		function parseTrimmedStack(rootStack, hook) {
  		  // Get the stack trace between the primitive hook function and
  		  // the root function call. I.e. the stack frames of custom hooks.
  		  const hookStack = error_stack_parser_default().parse(hook.stackError);
  		  const rootIndex = findCommonAncestorIndex(rootStack, hookStack);
  		  const primitiveIndex = findPrimitiveIndex(hookStack, hook);

  		  if (rootIndex === -1 || primitiveIndex === -1 || rootIndex - primitiveIndex < 2) {
  		    if (primitiveIndex === -1) {
  		      // Something went wrong. Give up.
  		      return [null, null];
  		    } else {
  		      return [hookStack[primitiveIndex - 1], null];
  		    }
  		  }

  		  return [hookStack[primitiveIndex - 1], hookStack.slice(primitiveIndex, rootIndex - 1)];
  		}

  		function parseHookName(functionName) {
  		  if (!functionName) {
  		    return '';
  		  }

  		  let startIndex = functionName.lastIndexOf('[as ');

  		  if (startIndex !== -1) {
  		    // Workaround for sourcemaps in Jest and Chrome.
  		    // In `node --enable-source-maps`, we don't see "Object.useHostTransitionStatus [as useFormStatus]" but "Object.useFormStatus"
  		    // "Object.useHostTransitionStatus [as useFormStatus]" -> "useFormStatus"
  		    return parseHookName(functionName.slice(startIndex + '[as '.length, -1));
  		  }

  		  startIndex = functionName.lastIndexOf('.');

  		  if (startIndex === -1) {
  		    startIndex = 0;
  		  } else {
  		    startIndex += 1;
  		  }

  		  if (functionName.slice(startIndex).startsWith('unstable_')) {
  		    startIndex += 'unstable_'.length;
  		  }

  		  if (functionName.slice(startIndex).startsWith('experimental_')) {
  		    startIndex += 'experimental_'.length;
  		  }

  		  if (functionName.slice(startIndex, startIndex + 3) === 'use') {
  		    if (functionName.length - startIndex === 3) {
  		      return 'Use';
  		    }

  		    startIndex += 3;
  		  }

  		  return functionName.slice(startIndex);
  		}

  		function buildTree(rootStack, readHookLog) {
  		  const rootChildren = [];
  		  let prevStack = null;
  		  let levelChildren = rootChildren;
  		  let nativeHookID = 0;
  		  const stackOfChildren = [];

  		  for (let i = 0; i < readHookLog.length; i++) {
  		    const hook = readHookLog[i];
  		    const parseResult = parseTrimmedStack(rootStack, hook);
  		    const primitiveFrame = parseResult[0];
  		    const stack = parseResult[1];
  		    let displayName = hook.displayName;

  		    if (displayName === null && primitiveFrame !== null) {
  		      displayName = parseHookName(primitiveFrame.functionName) || // Older versions of React do not have sourcemaps.
  		      // In those versions there was always a 1:1 mapping between wrapper and dispatcher method.
  		      parseHookName(hook.dispatcherHookName);
  		    }

  		    if (stack !== null) {
  		      // Note: The indices 0 <= n < length-1 will contain the names.
  		      // The indices 1 <= n < length will contain the source locations.
  		      // That's why we get the name from n - 1 and don't check the source
  		      // of index 0.
  		      let commonSteps = 0;

  		      if (prevStack !== null) {
  		        // Compare the current level's stack to the new stack.
  		        while (commonSteps < stack.length && commonSteps < prevStack.length) {
  		          const stackSource = stack[stack.length - commonSteps - 1].source;
  		          const prevSource = prevStack[prevStack.length - commonSteps - 1].source;

  		          if (stackSource !== prevSource) {
  		            break;
  		          }

  		          commonSteps++;
  		        } // Pop back the stack as many steps as were not common.


  		        for (let j = prevStack.length - 1; j > commonSteps; j--) {
  		          // $FlowFixMe[incompatible-type]
  		          levelChildren = stackOfChildren.pop();
  		        }
  		      } // The remaining part of the new stack are custom hooks. Push them
  		      // to the tree.


  		      for (let j = stack.length - commonSteps - 1; j >= 1; j--) {
  		        const children = [];
  		        const stackFrame = stack[j];
  		        const levelChild = {
  		          id: null,
  		          isStateEditable: false,
  		          name: parseHookName(stack[j - 1].functionName),
  		          value: undefined,
  		          subHooks: children,
  		          debugInfo: null,
  		          hookSource: {
  		            lineNumber: stackFrame.lineNumber,
  		            columnNumber: stackFrame.columnNumber,
  		            functionName: stackFrame.functionName,
  		            fileName: stackFrame.fileName
  		          }
  		        };
  		        levelChildren.push(levelChild);
  		        stackOfChildren.push(levelChildren);
  		        levelChildren = children;
  		      }

  		      prevStack = stack;
  		    }

  		    const {
  		      primitive,
  		      debugInfo
  		    } = hook; // For now, the "id" of stateful hooks is just the stateful hook index.
  		    // Custom hooks have no ids, nor do non-stateful native hooks (e.g. Context, DebugValue).

  		    const id = primitive === 'Context' || primitive === 'Context (use)' || primitive === 'DebugValue' || primitive === 'Promise' || primitive === 'Unresolved' || primitive === 'HostTransitionStatus' ? null : nativeHookID++; // For the time being, only State and Reducer hooks support runtime overrides.

  		    const isStateEditable = primitive === 'Reducer' || primitive === 'State';
  		    const name = displayName || primitive;
  		    const levelChild = {
  		      id,
  		      isStateEditable,
  		      name,
  		      value: hook.value,
  		      subHooks: [],
  		      debugInfo: debugInfo,
  		      hookSource: null
  		    };
  		    const hookSource = {
  		      lineNumber: null,
  		      functionName: null,
  		      fileName: null,
  		      columnNumber: null
  		    };

  		    if (stack && stack.length >= 1) {
  		      const stackFrame = stack[0];
  		      hookSource.lineNumber = stackFrame.lineNumber;
  		      hookSource.functionName = stackFrame.functionName;
  		      hookSource.fileName = stackFrame.fileName;
  		      hookSource.columnNumber = stackFrame.columnNumber;
  		    }

  		    levelChild.hookSource = hookSource;
  		    levelChildren.push(levelChild);
  		  } // Associate custom hook values (useDebugValue() hook entries) with the correct hooks.


  		  processDebugValues(rootChildren, null);
  		  return rootChildren;
  		} // Custom hooks support user-configurable labels (via the special useDebugValue() hook).
  		// That hook adds user-provided values to the hooks tree,
  		// but these values aren't intended to appear alongside of the other hooks.
  		// Instead they should be attributed to their parent custom hook.
  		// This method walks the tree and assigns debug values to their custom hook owners.


  		function processDebugValues(hooksTree, parentHooksNode) {
  		  const debugValueHooksNodes = [];

  		  for (let i = 0; i < hooksTree.length; i++) {
  		    const hooksNode = hooksTree[i];

  		    if (hooksNode.name === 'DebugValue' && hooksNode.subHooks.length === 0) {
  		      hooksTree.splice(i, 1);
  		      i--;
  		      debugValueHooksNodes.push(hooksNode);
  		    } else {
  		      processDebugValues(hooksNode.subHooks, hooksNode);
  		    }
  		  } // Bubble debug value labels to their custom hook owner.
  		  // If there is no parent hook, just ignore them for now.
  		  // (We may warn about this in the future.)


  		  if (parentHooksNode !== null) {
  		    if (debugValueHooksNodes.length === 1) {
  		      parentHooksNode.value = debugValueHooksNodes[0].value;
  		    } else if (debugValueHooksNodes.length > 1) {
  		      parentHooksNode.value = debugValueHooksNodes.map(({
  		        value
  		      }) => value);
  		    }
  		  }
  		}

  		function handleRenderFunctionError(error) {
  		  // original error might be any type.
  		  if (error === SuspenseException) {
  		    // An uncached Promise was used. We can't synchronously resolve the rest of
  		    // the Hooks but we can at least show what ever we got so far.
  		    return;
  		  }

  		  if (error instanceof Error && error.name === 'ReactDebugToolsUnsupportedHookError') {
  		    throw error;
  		  } // If the error is not caused by an unsupported feature, it means
  		  // that the error is caused by user's code in renderFunction.
  		  // In this case, we should wrap the original error inside a custom error
  		  // so that devtools can give a clear message about it.
  		  // $FlowFixMe[extra-arg]: Flow doesn't know about 2nd argument of Error constructor


  		  const wrapperError = new Error('Error rendering inspected component', {
  		    cause: error
  		  }); // Note: This error name needs to stay in sync with react-devtools-shared
  		  // TODO: refactor this if we ever combine the devtools and debug tools packages

  		  wrapperError.name = 'ReactDebugToolsRenderError'; // this stage-4 proposal is not supported by all environments yet.
  		  // $FlowFixMe[prop-missing] Flow doesn't have this type yet.

  		  wrapperError.cause = error;
  		  throw wrapperError;
  		}

  		function inspectHooks(renderFunction, props, currentDispatcher) {
  		  // DevTools will pass the current renderer's injected dispatcher.
  		  // Other apps might compile debug hooks as part of their app though.
  		  if (currentDispatcher == null) {
  		    currentDispatcher = shared_ReactSharedInternals;
  		  }

  		  const previousDispatcher = currentDispatcher.H;
  		  currentDispatcher.H = DispatcherProxy;
  		  let readHookLog;
  		  let ancestorStackError;

  		  try {
  		    ancestorStackError = new Error();
  		    renderFunction(props);
  		  } catch (error) {
  		    handleRenderFunctionError(error);
  		  } finally {
  		    readHookLog = hookLog;
  		    hookLog = []; // $FlowFixMe[incompatible-use] found when upgrading Flow

  		    currentDispatcher.H = previousDispatcher;
  		  }

  		  const rootStack = error_stack_parser_default().parse(ancestorStackError);
  		  return buildTree(rootStack, readHookLog);
  		}

  		function setupContexts(contextMap, fiber) {
  		  let current = fiber;

  		  while (current) {
  		    if (current.tag === ContextProvider) {
  		      let context = current.type;

  		      if (context._context !== undefined) {
  		        // Support inspection of pre-19+ providers.
  		        context = context._context;
  		      }

  		      if (!contextMap.has(context)) {
  		        // Store the current value that we're going to restore later.
  		        contextMap.set(context, context._currentValue); // Set the inner most provider value on the context.

  		        context._currentValue = current.memoizedProps.value;
  		      }
  		    }

  		    current = current.return;
  		  }
  		}

  		function restoreContexts(contextMap) {
  		  contextMap.forEach((value, context) => context._currentValue = value);
  		}

  		function inspectHooksOfForwardRef(renderFunction, props, ref, currentDispatcher) {
  		  const previousDispatcher = currentDispatcher.H;
  		  let readHookLog;
  		  currentDispatcher.H = DispatcherProxy;
  		  let ancestorStackError;

  		  try {
  		    ancestorStackError = new Error();
  		    renderFunction(props, ref);
  		  } catch (error) {
  		    handleRenderFunctionError(error);
  		  } finally {
  		    readHookLog = hookLog;
  		    hookLog = [];
  		    currentDispatcher.H = previousDispatcher;
  		  }

  		  const rootStack = error_stack_parser_default().parse(ancestorStackError);
  		  return buildTree(rootStack, readHookLog);
  		}

  		function resolveDefaultProps(Component, baseProps) {
  		  if (Component && Component.defaultProps) {
  		    // Resolve default props. Taken from ReactElement
  		    const props = shared_assign({}, baseProps);
  		    const defaultProps = Component.defaultProps;

  		    for (const propName in defaultProps) {
  		      if (props[propName] === undefined) {
  		        props[propName] = defaultProps[propName];
  		      }
  		    }

  		    return props;
  		  }

  		  return baseProps;
  		}

  		function inspectHooksOfFiber(fiber, currentDispatcher) {
  		  // DevTools will pass the current renderer's injected dispatcher.
  		  // Other apps might compile debug hooks as part of their app though.
  		  if (currentDispatcher == null) {
  		    currentDispatcher = shared_ReactSharedInternals;
  		  }

  		  if (fiber.tag !== FunctionComponent && fiber.tag !== SimpleMemoComponent && fiber.tag !== ForwardRef) {
  		    throw new Error('Unknown Fiber. Needs to be a function component to inspect hooks.');
  		  } // Warm up the cache so that it doesn't consume the currentHook.


  		  getPrimitiveStackCache(); // Set up the current hook so that we can step through and read the
  		  // current state from them.

  		  currentHook = fiber.memoizedState;
  		  currentFiber = fiber;

  		  if (shared_hasOwnProperty.call(currentFiber, 'dependencies')) {
  		    // $FlowFixMe[incompatible-use]: Flow thinks hasOwnProperty might have nulled `currentFiber`
  		    const dependencies = currentFiber.dependencies;
  		    currentContextDependency = dependencies !== null ? dependencies.firstContext : null;
  		  } else if (shared_hasOwnProperty.call(currentFiber, 'dependencies_old')) {
  		    const dependencies = currentFiber.dependencies_old;
  		    currentContextDependency = dependencies !== null ? dependencies.firstContext : null;
  		  } else if (shared_hasOwnProperty.call(currentFiber, 'dependencies_new')) {
  		    const dependencies = currentFiber.dependencies_new;
  		    currentContextDependency = dependencies !== null ? dependencies.firstContext : null;
  		  } else if (shared_hasOwnProperty.call(currentFiber, 'contextDependencies')) {
  		    const contextDependencies = currentFiber.contextDependencies;
  		    currentContextDependency = contextDependencies !== null ? contextDependencies.first : null;
  		  } else {
  		    throw new Error('Unsupported React version. This is a bug in React Debug Tools.');
  		  }

  		  const type = fiber.type;
  		  let props = fiber.memoizedProps;

  		  if (type !== fiber.elementType) {
  		    props = resolveDefaultProps(type, props);
  		  } // Only used for versions of React without memoized context value in context dependencies.


  		  const contextMap = new Map();

  		  try {
  		    if (currentContextDependency !== null && !shared_hasOwnProperty.call(currentContextDependency, 'memoizedValue')) {
  		      setupContexts(contextMap, fiber);
  		    }

  		    if (fiber.tag === ForwardRef) {
  		      return inspectHooksOfForwardRef(type.render, props, fiber.ref, currentDispatcher);
  		    }

  		    return inspectHooks(type, props, currentDispatcher);
  		  } finally {
  		    currentFiber = null;
  		    currentHook = null;
  		    currentContextDependency = null;
  		    restoreContexts(contextMap);
  		  }
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		// This list should be kept updated to reflect additions to 'shared/ReactSymbols'.
  		// DevTools can't import symbols from 'shared/ReactSymbols' directly for two reasons:
  		// 1. DevTools requires symbols which may have been deleted in more recent versions (e.g. concurrent mode)
  		// 2. DevTools must support both Symbol and numeric forms of each symbol;
  		//    Since e.g. standalone DevTools runs in a separate process, it can't rely on its own ES capabilities.
  		const CONCURRENT_MODE_NUMBER = 0xeacf;
  		const CONCURRENT_MODE_SYMBOL_STRING = 'Symbol(react.concurrent_mode)';
  		const CONTEXT_NUMBER = 0xeace;
  		const CONTEXT_SYMBOL_STRING = 'Symbol(react.context)';
  		const SERVER_CONTEXT_SYMBOL_STRING = 'Symbol(react.server_context)';
  		const DEPRECATED_ASYNC_MODE_SYMBOL_STRING = 'Symbol(react.async_mode)';
  		const FORWARD_REF_NUMBER = 0xead0;
  		const FORWARD_REF_SYMBOL_STRING = 'Symbol(react.forward_ref)';
  		const MEMO_NUMBER = 0xead3;
  		const MEMO_SYMBOL_STRING = 'Symbol(react.memo)';
  		const PROFILER_NUMBER = 0xead2;
  		const PROFILER_SYMBOL_STRING = 'Symbol(react.profiler)';
  		const PROVIDER_NUMBER = 0xeacd;
  		const PROVIDER_SYMBOL_STRING = 'Symbol(react.provider)';
  		const CONSUMER_SYMBOL_STRING = 'Symbol(react.consumer)';
  		const SCOPE_NUMBER = 0xead7;
  		const SCOPE_SYMBOL_STRING = 'Symbol(react.scope)';
  		const STRICT_MODE_NUMBER = 0xeacc;
  		const STRICT_MODE_SYMBOL_STRING = 'Symbol(react.strict_mode)';
  		const ReactSymbols_REACT_MEMO_CACHE_SENTINEL = Symbol.for('react.memo_cache_sentinel');
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */

  		/**
  		 * inlined Object.is polyfill to avoid requiring consumers ship their own
  		 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
  		 */
  		function is(x, y) {
  		  return x === y && (x !== 0 || 1 / x === 1 / y) || x !== x && y !== y // eslint-disable-line no-self-compare
  		  ;
  		}

  		const objectIs = // $FlowFixMe[method-unbinding]
  		typeof Object.is === 'function' ? Object.is : is;
  		/* harmony default export */ const shared_objectIs = (objectIs);
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		// This is a DevTools fork of ReactFiberComponentStack.
  		// This fork enables DevTools to use the same "native" component stack format,
  		// while still maintaining support for multiple renderer versions
  		// (which use different values for ReactTypeOfWork).


  		function describeFiber(workTagMap, workInProgress, currentDispatcherRef) {
  		  const {
  		    HostHoistable,
  		    HostSingleton,
  		    HostComponent,
  		    LazyComponent,
  		    SuspenseComponent,
  		    SuspenseListComponent,
  		    FunctionComponent,
  		    IndeterminateComponent,
  		    SimpleMemoComponent,
  		    ForwardRef,
  		    ClassComponent,
  		    ViewTransitionComponent,
  		    ActivityComponent
  		  } = workTagMap;

  		  switch (workInProgress.tag) {
  		    case HostHoistable:
  		    case HostSingleton:
  		    case HostComponent:
  		      return describeBuiltInComponentFrame(workInProgress.type);

  		    case LazyComponent:
  		      // TODO: When we support Thenables as component types we should rename this.
  		      return describeBuiltInComponentFrame('Lazy');

  		    case SuspenseComponent:
  		      return describeBuiltInComponentFrame('Suspense');

  		    case SuspenseListComponent:
  		      return describeBuiltInComponentFrame('SuspenseList');

  		    case ViewTransitionComponent:
  		      return describeBuiltInComponentFrame('ViewTransition');

  		    case ActivityComponent:
  		      return describeBuiltInComponentFrame('Activity');

  		    case FunctionComponent:
  		    case IndeterminateComponent:
  		    case SimpleMemoComponent:
  		      return describeFunctionComponentFrame(workInProgress.type, currentDispatcherRef);

  		    case ForwardRef:
  		      return describeFunctionComponentFrame(workInProgress.type.render, currentDispatcherRef);

  		    case ClassComponent:
  		      return describeClassComponentFrame(workInProgress.type, currentDispatcherRef);

  		    default:
  		      return '';
  		  }
  		}
  		function getStackByFiberInDevAndProd(workTagMap, workInProgress, currentDispatcherRef) {
  		  try {
  		    let info = '';
  		    let node = workInProgress;

  		    do {
  		      info += describeFiber(workTagMap, node, currentDispatcherRef); // Add any Server Component stack frames in reverse order.

  		      const debugInfo = node._debugInfo;

  		      if (debugInfo) {
  		        for (let i = debugInfo.length - 1; i >= 0; i--) {
  		          const entry = debugInfo[i];

  		          if (typeof entry.name === 'string') {
  		            info += describeDebugInfoFrame(entry.name, entry.env);
  		          }
  		        }
  		      } // $FlowFixMe[incompatible-type] we bail out when we get a null


  		      node = node.return;
  		    } while (node);

  		    return info;
  		  } catch (x) {
  		    return '\nError generating stack: ' + x.message + '\n' + x.stack;
  		  }
  		}
  		function getSourceLocationByFiber(workTagMap, fiber, currentDispatcherRef) {
  		  // This is like getStackByFiberInDevAndProd but just the first stack frame.
  		  try {
  		    const info = describeFiber(workTagMap, fiber, currentDispatcherRef);

  		    if (info !== '') {
  		      return info.slice(1); // skip the leading newline
  		    }
  		  } catch (x) {
  		    console.error(x);
  		  }

  		  return null;
  		}
  		function DevToolsFiberComponentStack_supportsConsoleTasks(fiber) {
  		  // If this Fiber supports native console.createTask then we are already running
  		  // inside a native async stack trace if it's active - meaning the DevTools is open.
  		  // Ideally we'd detect if this task was created while the DevTools was open or not.
  		  return !!fiber._debugTask;
  		}
  		function supportsOwnerStacks(fiber) {
  		  // If this Fiber supports owner stacks then it'll have the _debugStack field.
  		  // It might be null but that still means we should use the owner stack logic.
  		  return fiber._debugStack !== undefined;
  		}
  		function getOwnerStackByFiberInDev(workTagMap, workInProgress, currentDispatcherRef) {
  		  const {
  		    HostHoistable,
  		    HostSingleton,
  		    HostText,
  		    HostComponent,
  		    SuspenseComponent,
  		    SuspenseListComponent,
  		    ViewTransitionComponent,
  		    ActivityComponent
  		  } = workTagMap;

  		  try {
  		    let info = '';

  		    if (workInProgress.tag === HostText) {
  		      // Text nodes never have an owner/stack because they're not created through JSX.
  		      // We use the parent since text nodes are always created through a host parent.
  		      workInProgress = workInProgress.return;
  		    } // The owner stack of the current fiber will be where it was created, i.e. inside its owner.
  		    // There's no actual name of the currently executing component. Instead, that is available
  		    // on the regular stack that's currently executing. However, for built-ins there is no such
  		    // named stack frame and it would be ignored as being internal anyway. Therefore we add
  		    // add one extra frame just to describe the "current" built-in component by name.


  		    switch (workInProgress.tag) {
  		      case HostHoistable:
  		      case HostSingleton:
  		      case HostComponent:
  		        info += describeBuiltInComponentFrame(workInProgress.type);
  		        break;

  		      case SuspenseComponent:
  		        info += describeBuiltInComponentFrame('Suspense');
  		        break;

  		      case SuspenseListComponent:
  		        info += describeBuiltInComponentFrame('SuspenseList');
  		        break;

  		      case ViewTransitionComponent:
  		        info += describeBuiltInComponentFrame('ViewTransition');
  		        break;

  		      case ActivityComponent:
  		        info += describeBuiltInComponentFrame('Activity');
  		        break;
  		    }

  		    let owner = workInProgress;

  		    while (owner) {
  		      if (typeof owner.tag === 'number') {
  		        const fiber = owner;
  		        owner = fiber._debugOwner;
  		        let debugStack = fiber._debugStack; // If we don't actually print the stack if there is no owner of this JSX element.
  		        // In a real app it's typically not useful since the root app is always controlled
  		        // by the framework. These also tend to have noisy stacks because they're not rooted
  		        // in a React render but in some imperative bootstrapping code. It could be useful
  		        // if the element was created in module scope. E.g. hoisted. We could add a a single
  		        // stack frame for context for example but it doesn't say much if that's a wrapper.

  		        if (owner && debugStack) {
  		          if (typeof debugStack !== 'string') {
  		            debugStack = formatOwnerStack(debugStack);
  		          }

  		          if (debugStack !== '') {
  		            info += '\n' + debugStack;
  		          }
  		        }
  		      } else if (owner.debugStack != null) {
  		        // Server Component
  		        const ownerStack = owner.debugStack;
  		        owner = owner.owner;

  		        if (owner && ownerStack) {
  		          info += '\n' + formatOwnerStack(ownerStack);
  		        }
  		      } else {
  		        break;
  		      }
  		    }

  		    return info;
  		  } catch (x) {
  		    return '\nError generating stack: ' + x.message + '\n' + x.stack;
  		  }
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */

  		const REACT_TOTAL_NUM_LANES = 31; // Increment this number any time a backwards breaking change is made to the profiler metadata.

  		const SCHEDULING_PROFILER_VERSION = 1;
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */


  		 // Add padding to the start/stop time of the profile.
  		// This makes the UI nicer to use.

  		const TIME_OFFSET = 10;
  		let performanceTarget = null; // If performance exists and supports the subset of the User Timing API that we require.

  		let supportsUserTiming = typeof performance !== 'undefined' && // $FlowFixMe[method-unbinding]
  		typeof performance.mark === 'function' && // $FlowFixMe[method-unbinding]
  		typeof performance.clearMarks === 'function';
  		let supportsUserTimingV3 = false;

  		if (supportsUserTiming) {
  		  const CHECK_V3_MARK = '__v3';
  		  const markOptions = {};
  		  Object.defineProperty(markOptions, 'startTime', {
  		    get: function () {
  		      supportsUserTimingV3 = true;
  		      return 0;
  		    },
  		    set: function () {}
  		  });

  		  try {
  		    performance.mark(CHECK_V3_MARK, markOptions);
  		  } catch (error) {// Ignore
  		  } finally {
  		    performance.clearMarks(CHECK_V3_MARK);
  		  }
  		}

  		if (supportsUserTimingV3) {
  		  performanceTarget = performance;
  		} // Some environments (e.g. React Native / Hermes) don't support the performance API yet.


  		const profilingHooks_getCurrentTime = // $FlowFixMe[method-unbinding]
  		typeof performance === 'object' && typeof performance.now === 'function' ? () => performance.now() : () => Date.now(); // Mocking the Performance Object (and User Timing APIs) for testing is fragile.
  		function createProfilingHooks({
  		  getDisplayNameForFiber,
  		  getIsProfiling,
  		  getLaneLabelMap,
  		  workTagMap,
  		  currentDispatcherRef,
  		  reactVersion
  		}) {
  		  let currentBatchUID = 0;
  		  let currentReactComponentMeasure = null;
  		  let currentReactMeasuresStack = [];
  		  let currentTimelineData = null;
  		  let currentFiberStacks = new Map();
  		  let isProfiling = false;
  		  let nextRenderShouldStartNewBatch = false;

  		  function getRelativeTime() {
  		    const currentTime = profilingHooks_getCurrentTime();

  		    if (currentTimelineData) {
  		      if (currentTimelineData.startTime === 0) {
  		        currentTimelineData.startTime = currentTime - TIME_OFFSET;
  		      }

  		      return currentTime - currentTimelineData.startTime;
  		    }

  		    return 0;
  		  }

  		  function getInternalModuleRanges() {
  		    /* global __REACT_DEVTOOLS_GLOBAL_HOOK__ */
  		    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined' && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.getInternalModuleRanges === 'function') {
  		      // Ask the DevTools hook for module ranges that may have been reported by the current renderer(s).
  		      // Don't do this eagerly like the laneToLabelMap,
  		      // because some modules might not yet have registered their boundaries when the renderer is injected.
  		      const ranges = __REACT_DEVTOOLS_GLOBAL_HOOK__.getInternalModuleRanges(); // This check would not be required,
  		      // except that it's possible for things to override __REACT_DEVTOOLS_GLOBAL_HOOK__.


  		      if (shared_isArray(ranges)) {
  		        return ranges;
  		      }
  		    }

  		    return null;
  		  }

  		  function getTimelineData() {
  		    return currentTimelineData;
  		  }

  		  function laneToLanesArray(lanes) {
  		    const lanesArray = [];
  		    let lane = 1;

  		    for (let index = 0; index < REACT_TOTAL_NUM_LANES; index++) {
  		      if (lane & lanes) {
  		        lanesArray.push(lane);
  		      }

  		      lane *= 2;
  		    }

  		    return lanesArray;
  		  }

  		  const laneToLabelMap = typeof getLaneLabelMap === 'function' ? getLaneLabelMap() : null;

  		  function markMetadata() {
  		    markAndClear(`--react-version-${reactVersion}`);
  		    markAndClear(`--profiler-version-${SCHEDULING_PROFILER_VERSION}`);
  		    const ranges = getInternalModuleRanges();

  		    if (ranges) {
  		      for (let i = 0; i < ranges.length; i++) {
  		        const range = ranges[i];

  		        if (shared_isArray(range) && range.length === 2) {
  		          const [startStackFrame, stopStackFrame] = ranges[i];
  		          markAndClear(`--react-internal-module-start-${startStackFrame}`);
  		          markAndClear(`--react-internal-module-stop-${stopStackFrame}`);
  		        }
  		      }
  		    }

  		    if (laneToLabelMap != null) {
  		      const labels = Array.from(laneToLabelMap.values()).join(',');
  		      markAndClear(`--react-lane-labels-${labels}`);
  		    }
  		  }

  		  function markAndClear(markName) {
  		    // This method won't be called unless these functions are defined, so we can skip the extra typeof check.
  		    performanceTarget.mark(markName);
  		    performanceTarget.clearMarks(markName);
  		  }

  		  function recordReactMeasureStarted(type, lanes) {
  		    // Decide what depth thi work should be rendered at, based on what's on the top of the stack.
  		    // It's okay to render over top of "idle" work but everything else should be on its own row.
  		    let depth = 0;

  		    if (currentReactMeasuresStack.length > 0) {
  		      const top = currentReactMeasuresStack[currentReactMeasuresStack.length - 1];
  		      depth = top.type === 'render-idle' ? top.depth : top.depth + 1;
  		    }

  		    const lanesArray = laneToLanesArray(lanes);
  		    const reactMeasure = {
  		      type,
  		      batchUID: currentBatchUID,
  		      depth,
  		      lanes: lanesArray,
  		      timestamp: getRelativeTime(),
  		      duration: 0
  		    };
  		    currentReactMeasuresStack.push(reactMeasure);

  		    if (currentTimelineData) {
  		      const {
  		        batchUIDToMeasuresMap,
  		        laneToReactMeasureMap
  		      } = currentTimelineData;
  		      let reactMeasures = batchUIDToMeasuresMap.get(currentBatchUID);

  		      if (reactMeasures != null) {
  		        reactMeasures.push(reactMeasure);
  		      } else {
  		        batchUIDToMeasuresMap.set(currentBatchUID, [reactMeasure]);
  		      }

  		      lanesArray.forEach(lane => {
  		        reactMeasures = laneToReactMeasureMap.get(lane);

  		        if (reactMeasures) {
  		          reactMeasures.push(reactMeasure);
  		        }
  		      });
  		    }
  		  }

  		  function recordReactMeasureCompleted(type) {
  		    const currentTime = getRelativeTime();

  		    if (currentReactMeasuresStack.length === 0) {
  		      console.error('Unexpected type "%s" completed at %sms while currentReactMeasuresStack is empty.', type, currentTime); // Ignore work "completion" user timing mark that doesn't complete anything

  		      return;
  		    }

  		    const top = currentReactMeasuresStack.pop(); // $FlowFixMe[incompatible-type]

  		    if (top.type !== type) {
  		      console.error('Unexpected type "%s" completed at %sms before "%s" completed.', type, currentTime, // $FlowFixMe[incompatible-use]
  		      top.type);
  		    } // $FlowFixMe[cannot-write] This property should not be writable outside of this function.
  		    // $FlowFixMe[incompatible-use]


  		    top.duration = currentTime - top.timestamp;

  		    if (currentTimelineData) {
  		      currentTimelineData.duration = getRelativeTime() + TIME_OFFSET;
  		    }
  		  }

  		  function markCommitStarted(lanes) {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    recordReactMeasureStarted('commit', lanes); // TODO (timeline) Re-think this approach to "batching"; I don't think it works for Suspense or pre-rendering.
  		    // This issue applies to the User Timing data also.

  		    nextRenderShouldStartNewBatch = true;

  		    if (supportsUserTimingV3) {
  		      markAndClear(`--commit-start-${lanes}`); // Some metadata only needs to be logged once per session,
  		      // but if profiling information is being recorded via the Performance tab,
  		      // DevTools has no way of knowing when the recording starts.
  		      // Because of that, we log thie type of data periodically (once per commit).

  		      markMetadata();
  		    }
  		  }

  		  function markCommitStopped() {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    recordReactMeasureCompleted('commit');
  		    recordReactMeasureCompleted('render-idle');

  		    if (supportsUserTimingV3) {
  		      markAndClear('--commit-stop');
  		    }
  		  }

  		  function markComponentRenderStarted(fiber) {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    const componentName = getDisplayNameForFiber(fiber) || 'Unknown'; // TODO (timeline) Record and cache component stack

  		    currentReactComponentMeasure = {
  		      componentName,
  		      duration: 0,
  		      timestamp: getRelativeTime(),
  		      type: 'render',
  		      warning: null
  		    };

  		    if (supportsUserTimingV3) {
  		      markAndClear(`--component-render-start-${componentName}`);
  		    }
  		  }

  		  function markComponentRenderStopped() {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    if (currentReactComponentMeasure) {
  		      if (currentTimelineData) {
  		        currentTimelineData.componentMeasures.push(currentReactComponentMeasure);
  		      } // $FlowFixMe[incompatible-use] found when upgrading Flow


  		      currentReactComponentMeasure.duration = // $FlowFixMe[incompatible-use] found when upgrading Flow
  		      getRelativeTime() - currentReactComponentMeasure.timestamp;
  		      currentReactComponentMeasure = null;
  		    }

  		    if (supportsUserTimingV3) {
  		      markAndClear('--component-render-stop');
  		    }
  		  }

  		  function markComponentLayoutEffectMountStarted(fiber) {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    const componentName = getDisplayNameForFiber(fiber) || 'Unknown'; // TODO (timeline) Record and cache component stack

  		    currentReactComponentMeasure = {
  		      componentName,
  		      duration: 0,
  		      timestamp: getRelativeTime(),
  		      type: 'layout-effect-mount',
  		      warning: null
  		    };

  		    if (supportsUserTimingV3) {
  		      markAndClear(`--component-layout-effect-mount-start-${componentName}`);
  		    }
  		  }

  		  function markComponentLayoutEffectMountStopped() {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    if (currentReactComponentMeasure) {
  		      if (currentTimelineData) {
  		        currentTimelineData.componentMeasures.push(currentReactComponentMeasure);
  		      } // $FlowFixMe[incompatible-use] found when upgrading Flow


  		      currentReactComponentMeasure.duration = // $FlowFixMe[incompatible-use] found when upgrading Flow
  		      getRelativeTime() - currentReactComponentMeasure.timestamp;
  		      currentReactComponentMeasure = null;
  		    }

  		    if (supportsUserTimingV3) {
  		      markAndClear('--component-layout-effect-mount-stop');
  		    }
  		  }

  		  function markComponentLayoutEffectUnmountStarted(fiber) {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    const componentName = getDisplayNameForFiber(fiber) || 'Unknown'; // TODO (timeline) Record and cache component stack

  		    currentReactComponentMeasure = {
  		      componentName,
  		      duration: 0,
  		      timestamp: getRelativeTime(),
  		      type: 'layout-effect-unmount',
  		      warning: null
  		    };

  		    if (supportsUserTimingV3) {
  		      markAndClear(`--component-layout-effect-unmount-start-${componentName}`);
  		    }
  		  }

  		  function markComponentLayoutEffectUnmountStopped() {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    if (currentReactComponentMeasure) {
  		      if (currentTimelineData) {
  		        currentTimelineData.componentMeasures.push(currentReactComponentMeasure);
  		      } // $FlowFixMe[incompatible-use] found when upgrading Flow


  		      currentReactComponentMeasure.duration = // $FlowFixMe[incompatible-use] found when upgrading Flow
  		      getRelativeTime() - currentReactComponentMeasure.timestamp;
  		      currentReactComponentMeasure = null;
  		    }

  		    if (supportsUserTimingV3) {
  		      markAndClear('--component-layout-effect-unmount-stop');
  		    }
  		  }

  		  function markComponentPassiveEffectMountStarted(fiber) {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    const componentName = getDisplayNameForFiber(fiber) || 'Unknown'; // TODO (timeline) Record and cache component stack

  		    currentReactComponentMeasure = {
  		      componentName,
  		      duration: 0,
  		      timestamp: getRelativeTime(),
  		      type: 'passive-effect-mount',
  		      warning: null
  		    };

  		    if (supportsUserTimingV3) {
  		      markAndClear(`--component-passive-effect-mount-start-${componentName}`);
  		    }
  		  }

  		  function markComponentPassiveEffectMountStopped() {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    if (currentReactComponentMeasure) {
  		      if (currentTimelineData) {
  		        currentTimelineData.componentMeasures.push(currentReactComponentMeasure);
  		      } // $FlowFixMe[incompatible-use] found when upgrading Flow


  		      currentReactComponentMeasure.duration = // $FlowFixMe[incompatible-use] found when upgrading Flow
  		      getRelativeTime() - currentReactComponentMeasure.timestamp;
  		      currentReactComponentMeasure = null;
  		    }

  		    if (supportsUserTimingV3) {
  		      markAndClear('--component-passive-effect-mount-stop');
  		    }
  		  }

  		  function markComponentPassiveEffectUnmountStarted(fiber) {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    const componentName = getDisplayNameForFiber(fiber) || 'Unknown'; // TODO (timeline) Record and cache component stack

  		    currentReactComponentMeasure = {
  		      componentName,
  		      duration: 0,
  		      timestamp: getRelativeTime(),
  		      type: 'passive-effect-unmount',
  		      warning: null
  		    };

  		    if (supportsUserTimingV3) {
  		      markAndClear(`--component-passive-effect-unmount-start-${componentName}`);
  		    }
  		  }

  		  function markComponentPassiveEffectUnmountStopped() {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    if (currentReactComponentMeasure) {
  		      if (currentTimelineData) {
  		        currentTimelineData.componentMeasures.push(currentReactComponentMeasure);
  		      } // $FlowFixMe[incompatible-use] found when upgrading Flow


  		      currentReactComponentMeasure.duration = // $FlowFixMe[incompatible-use] found when upgrading Flow
  		      getRelativeTime() - currentReactComponentMeasure.timestamp;
  		      currentReactComponentMeasure = null;
  		    }

  		    if (supportsUserTimingV3) {
  		      markAndClear('--component-passive-effect-unmount-stop');
  		    }
  		  }

  		  function markComponentErrored(fiber, thrownValue, lanes) {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    const componentName = getDisplayNameForFiber(fiber) || 'Unknown';
  		    const phase = fiber.alternate === null ? 'mount' : 'update';
  		    let message = '';

  		    if (thrownValue !== null && typeof thrownValue === 'object' && typeof thrownValue.message === 'string') {
  		      message = thrownValue.message;
  		    } else if (typeof thrownValue === 'string') {
  		      message = thrownValue;
  		    } // TODO (timeline) Record and cache component stack


  		    if (currentTimelineData) {
  		      currentTimelineData.thrownErrors.push({
  		        componentName,
  		        message,
  		        phase,
  		        timestamp: getRelativeTime(),
  		        type: 'thrown-error'
  		      });
  		    }

  		    if (supportsUserTimingV3) {
  		      markAndClear(`--error-${componentName}-${phase}-${message}`);
  		    }
  		  }

  		  const PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map; // $FlowFixMe[incompatible-type]: Flow cannot handle polymorphic WeakMaps

  		  const wakeableIDs = new PossiblyWeakMap();
  		  let wakeableID = 0;

  		  function getWakeableID(wakeable) {
  		    if (!wakeableIDs.has(wakeable)) {
  		      wakeableIDs.set(wakeable, wakeableID++);
  		    }

  		    return wakeableIDs.get(wakeable);
  		  }

  		  function markComponentSuspended(fiber, wakeable, lanes) {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    const eventType = wakeableIDs.has(wakeable) ? 'resuspend' : 'suspend';
  		    const id = getWakeableID(wakeable);
  		    const componentName = getDisplayNameForFiber(fiber) || 'Unknown';
  		    const phase = fiber.alternate === null ? 'mount' : 'update'; // Following the non-standard fn.displayName convention,
  		    // frameworks like Relay may also annotate Promises with a displayName,
  		    // describing what operation/data the thrown Promise is related to.
  		    // When this is available we should pass it along to the Timeline.

  		    const displayName = wakeable.displayName || '';
  		    let suspenseEvent = null; // TODO (timeline) Record and cache component stack

  		    suspenseEvent = {
  		      componentName,
  		      depth: 0,
  		      duration: 0,
  		      id: `${id}`,
  		      phase,
  		      promiseName: displayName,
  		      resolution: 'unresolved',
  		      timestamp: getRelativeTime(),
  		      type: 'suspense',
  		      warning: null
  		    };

  		    if (currentTimelineData) {
  		      currentTimelineData.suspenseEvents.push(suspenseEvent);
  		    }

  		    if (supportsUserTimingV3) {
  		      markAndClear(`--suspense-${eventType}-${id}-${componentName}-${phase}-${lanes}-${displayName}`);
  		      wakeable.then(() => {
  		        if (suspenseEvent) {
  		          suspenseEvent.duration = getRelativeTime() - suspenseEvent.timestamp;
  		          suspenseEvent.resolution = 'resolved';
  		        }

  		        if (supportsUserTimingV3) {
  		          markAndClear(`--suspense-resolved-${id}-${componentName}`);
  		        }
  		      }, () => {
  		        if (suspenseEvent) {
  		          suspenseEvent.duration = getRelativeTime() - suspenseEvent.timestamp;
  		          suspenseEvent.resolution = 'rejected';
  		        }

  		        if (supportsUserTimingV3) {
  		          markAndClear(`--suspense-rejected-${id}-${componentName}`);
  		        }
  		      });
  		    }
  		  }

  		  function markLayoutEffectsStarted(lanes) {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    recordReactMeasureStarted('layout-effects', lanes);

  		    if (supportsUserTimingV3) {
  		      markAndClear(`--layout-effects-start-${lanes}`);
  		    }
  		  }

  		  function markLayoutEffectsStopped() {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    recordReactMeasureCompleted('layout-effects');

  		    if (supportsUserTimingV3) {
  		      markAndClear('--layout-effects-stop');
  		    }
  		  }

  		  function markPassiveEffectsStarted(lanes) {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    recordReactMeasureStarted('passive-effects', lanes);

  		    if (supportsUserTimingV3) {
  		      markAndClear(`--passive-effects-start-${lanes}`);
  		    }
  		  }

  		  function markPassiveEffectsStopped() {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    recordReactMeasureCompleted('passive-effects');

  		    if (supportsUserTimingV3) {
  		      markAndClear('--passive-effects-stop');
  		    }
  		  }

  		  function markRenderStarted(lanes) {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    if (nextRenderShouldStartNewBatch) {
  		      nextRenderShouldStartNewBatch = false;
  		      currentBatchUID++;
  		    } // If this is a new batch of work, wrap an "idle" measure around it.
  		    // Log it before the "render" measure to preserve the stack ordering.


  		    if (currentReactMeasuresStack.length === 0 || currentReactMeasuresStack[currentReactMeasuresStack.length - 1].type !== 'render-idle') {
  		      recordReactMeasureStarted('render-idle', lanes);
  		    }

  		    recordReactMeasureStarted('render', lanes);

  		    if (supportsUserTimingV3) {
  		      markAndClear(`--render-start-${lanes}`);
  		    }
  		  }

  		  function markRenderYielded() {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    recordReactMeasureCompleted('render');

  		    if (supportsUserTimingV3) {
  		      markAndClear('--render-yield');
  		    }
  		  }

  		  function markRenderStopped() {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    recordReactMeasureCompleted('render');

  		    if (supportsUserTimingV3) {
  		      markAndClear('--render-stop');
  		    }
  		  }

  		  function markRenderScheduled(lane) {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    if (currentTimelineData) {
  		      currentTimelineData.schedulingEvents.push({
  		        lanes: laneToLanesArray(lane),
  		        timestamp: getRelativeTime(),
  		        type: 'schedule-render',
  		        warning: null
  		      });
  		    }

  		    if (supportsUserTimingV3) {
  		      markAndClear(`--schedule-render-${lane}`);
  		    }
  		  }

  		  function markForceUpdateScheduled(fiber, lane) {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    const componentName = getDisplayNameForFiber(fiber) || 'Unknown'; // TODO (timeline) Record and cache component stack

  		    if (currentTimelineData) {
  		      currentTimelineData.schedulingEvents.push({
  		        componentName,
  		        lanes: laneToLanesArray(lane),
  		        timestamp: getRelativeTime(),
  		        type: 'schedule-force-update',
  		        warning: null
  		      });
  		    }

  		    if (supportsUserTimingV3) {
  		      markAndClear(`--schedule-forced-update-${lane}-${componentName}`);
  		    }
  		  }

  		  function getParentFibers(fiber) {
  		    const parents = [];
  		    let parent = fiber;

  		    while (parent !== null) {
  		      parents.push(parent);
  		      parent = parent.return;
  		    }

  		    return parents;
  		  }

  		  function markStateUpdateScheduled(fiber, lane) {
  		    if (!isProfiling) {
  		      return;
  		    }

  		    const componentName = getDisplayNameForFiber(fiber) || 'Unknown'; // TODO (timeline) Record and cache component stack

  		    if (currentTimelineData) {
  		      const event = {
  		        componentName,
  		        // Store the parent fibers so we can post process
  		        // them after we finish profiling
  		        lanes: laneToLanesArray(lane),
  		        timestamp: getRelativeTime(),
  		        type: 'schedule-state-update',
  		        warning: null
  		      };
  		      currentFiberStacks.set(event, getParentFibers(fiber)); // $FlowFixMe[incompatible-use] found when upgrading Flow

  		      currentTimelineData.schedulingEvents.push(event);
  		    }

  		    if (supportsUserTimingV3) {
  		      markAndClear(`--schedule-state-update-${lane}-${componentName}`);
  		    }
  		  }

  		  function toggleProfilingStatus(value, recordTimeline = false) {
  		    if (isProfiling !== value) {
  		      isProfiling = value;

  		      if (isProfiling) {
  		        const internalModuleSourceToRanges = new Map();

  		        if (supportsUserTimingV3) {
  		          const ranges = getInternalModuleRanges();

  		          if (ranges) {
  		            for (let i = 0; i < ranges.length; i++) {
  		              const range = ranges[i];

  		              if (shared_isArray(range) && range.length === 2) {
  		                const [startStackFrame, stopStackFrame] = ranges[i];
  		                markAndClear(`--react-internal-module-start-${startStackFrame}`);
  		                markAndClear(`--react-internal-module-stop-${stopStackFrame}`);
  		              }
  		            }
  		          }
  		        }

  		        const laneToReactMeasureMap = new Map();
  		        let lane = 1;

  		        for (let index = 0; index < REACT_TOTAL_NUM_LANES; index++) {
  		          laneToReactMeasureMap.set(lane, []);
  		          lane *= 2;
  		        }

  		        currentBatchUID = 0;
  		        currentReactComponentMeasure = null;
  		        currentReactMeasuresStack = [];
  		        currentFiberStacks = new Map();

  		        if (recordTimeline) {
  		          currentTimelineData = {
  		            // Session wide metadata; only collected once.
  		            internalModuleSourceToRanges,
  		            laneToLabelMap: laneToLabelMap || new Map(),
  		            reactVersion,
  		            // Data logged by React during profiling session.
  		            componentMeasures: [],
  		            schedulingEvents: [],
  		            suspenseEvents: [],
  		            thrownErrors: [],
  		            // Data inferred based on what React logs.
  		            batchUIDToMeasuresMap: new Map(),
  		            duration: 0,
  		            laneToReactMeasureMap,
  		            startTime: 0,
  		            // Data only available in Chrome profiles.
  		            flamechart: [],
  		            nativeEvents: [],
  		            networkMeasures: [],
  		            otherUserTimingMarks: [],
  		            snapshots: [],
  		            snapshotHeight: 0
  		          };
  		        }

  		        nextRenderShouldStartNewBatch = true;
  		      } else {
  		        // This is __EXPENSIVE__.
  		        // We could end up with hundreds of state updated, and for each one of them
  		        // would try to create a component stack with possibly hundreds of Fibers.
  		        // Creating a cache of component stacks won't help, generating a single stack is already expensive enough.
  		        // We should find a way to lazily generate component stacks on demand, when user inspects a specific event.
  		        // If we succeed with moving React DevTools Timeline Profiler to Performance panel, then Timeline Profiler would probably be removed.
  		        // Now that owner stacks are adopted, revisit this again and cache component stacks per Fiber,
  		        // but only return them when needed, sending hundreds of component stacks is beyond the Bridge's bandwidth.
  		        // Postprocess Profile data
  		        if (currentTimelineData !== null) {
  		          currentTimelineData.schedulingEvents.forEach(event => {
  		            if (event.type === 'schedule-state-update') {
  		              // TODO(luna): We can optimize this by creating a map of
  		              // fiber to component stack instead of generating the stack
  		              // for every fiber every time
  		              const fiberStack = currentFiberStacks.get(event);

  		              if (fiberStack && currentDispatcherRef != null) {
  		                event.componentStack = fiberStack.reduce((trace, fiber) => {
  		                  return trace + describeFiber(workTagMap, fiber, currentDispatcherRef);
  		                }, '');
  		              }
  		            }
  		          });
  		        } // Clear the current fiber stacks so we don't hold onto the fibers
  		        // in memory after profiling finishes


  		        currentFiberStacks.clear();
  		      }
  		    }
  		  }

  		  return {
  		    getTimelineData,
  		    profilingHooks: {
  		      markCommitStarted,
  		      markCommitStopped,
  		      markComponentRenderStarted,
  		      markComponentRenderStopped,
  		      markComponentPassiveEffectMountStarted,
  		      markComponentPassiveEffectMountStopped,
  		      markComponentPassiveEffectUnmountStarted,
  		      markComponentPassiveEffectUnmountStopped,
  		      markComponentLayoutEffectMountStarted,
  		      markComponentLayoutEffectMountStopped,
  		      markComponentLayoutEffectUnmountStarted,
  		      markComponentLayoutEffectUnmountStopped,
  		      markComponentErrored,
  		      markComponentSuspended,
  		      markLayoutEffectsStarted,
  		      markLayoutEffectsStopped,
  		      markPassiveEffectsStarted,
  		      markPassiveEffectsStopped,
  		      markRenderStarted,
  		      markRenderYielded,
  		      markRenderStopped,
  		      markRenderScheduled,
  		      markForceUpdateScheduled,
  		      markStateUpdateScheduled
  		    },
  		    toggleProfilingStatus
  		  };
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */











  		 // $FlowFixMe[method-unbinding]

  		const renderer_toString = Object.prototype.toString;

  		function renderer_isError(object) {
  		  return renderer_toString.call(object) === '[object Error]';
  		}




  		 // Kinds

  		const FIBER_INSTANCE = 0;
  		const VIRTUAL_INSTANCE = 1;
  		const FILTERED_FIBER_INSTANCE = 2; // This type represents a stateful instance of a Client Component i.e. a Fiber pair.
  		// These instances also let us track stateful DevTools meta data like id and warnings.

  		function createFiberInstance(fiber) {
  		  return {
  		    kind: FIBER_INSTANCE,
  		    id: getUID(),
  		    parent: null,
  		    firstChild: null,
  		    nextSibling: null,
  		    source: null,
  		    logCount: 0,
  		    treeBaseDuration: 0,
  		    data: fiber
  		  };
  		}

  		// This is used to represent a filtered Fiber but still lets us find its host instance.
  		function createFilteredFiberInstance(fiber) {
  		  return {
  		    kind: FILTERED_FIBER_INSTANCE,
  		    id: 0,
  		    parent: null,
  		    firstChild: null,
  		    nextSibling: null,
  		    source: null,
  		    logCount: 0,
  		    treeBaseDuration: 0,
  		    data: fiber
  		  };
  		} // This type represents a stateful instance of a Server Component or a Component
  		// that gets optimized away - e.g. call-through without creating a Fiber.
  		// It's basically a virtual Fiber. This is not a semantic concept in React.
  		// It only exists as a virtual concept to let the same Element in the DevTools
  		// persist. To be selectable separately from all ReactComponentInfo and overtime.


  		function createVirtualInstance(debugEntry) {
  		  return {
  		    kind: VIRTUAL_INSTANCE,
  		    id: getUID(),
  		    parent: null,
  		    firstChild: null,
  		    nextSibling: null,
  		    source: null,
  		    logCount: 0,
  		    treeBaseDuration: 0,
  		    data: debugEntry
  		  };
  		}

  		function getDispatcherRef(renderer) {
  		  if (renderer.currentDispatcherRef === undefined) {
  		    return undefined;
  		  }

  		  const injectedRef = renderer.currentDispatcherRef;

  		  if (typeof injectedRef.H === 'undefined' && typeof injectedRef.current !== 'undefined') {
  		    // We got a legacy dispatcher injected, let's create a wrapper proxy to translate.
  		    return {
  		      get H() {
  		        return injectedRef.current;
  		      },

  		      set H(value) {
  		        injectedRef.current = value;
  		      }

  		    };
  		  }

  		  return injectedRef;
  		}

  		function getFiberFlags(fiber) {
  		  // The name of this field changed from "effectTag" to "flags"
  		  return fiber.flags !== undefined ? fiber.flags : fiber.effectTag;
  		} // Some environments (e.g. React Native / Hermes) don't support the performance API yet.


  		const renderer_getCurrentTime = // $FlowFixMe[method-unbinding]
  		typeof performance === 'object' && typeof performance.now === 'function' ? () => performance.now() : () => Date.now();
  		function getInternalReactConstants(version) {
  		  // **********************************************************
  		  // The section below is copied from files in React repo.
  		  // Keep it in sync, and add version guards if it changes.
  		  //
  		  // Technically these priority levels are invalid for versions before 16.9,
  		  // but 16.9 is the first version to report priority level to DevTools,
  		  // so we can avoid checking for earlier versions and support pre-16.9 canary releases in the process.
  		  let ReactPriorityLevels = {
  		    ImmediatePriority: 99,
  		    UserBlockingPriority: 98,
  		    NormalPriority: 97,
  		    LowPriority: 96,
  		    IdlePriority: 95,
  		    NoPriority: 90
  		  };

  		  if (gt(version, '17.0.2')) {
  		    ReactPriorityLevels = {
  		      ImmediatePriority: 1,
  		      UserBlockingPriority: 2,
  		      NormalPriority: 3,
  		      LowPriority: 4,
  		      IdlePriority: 5,
  		      NoPriority: 0
  		    };
  		  }

  		  let StrictModeBits = 0;

  		  if (gte(version, '18.0.0-alpha')) {
  		    // 18+
  		    StrictModeBits = 0b011000;
  		  } else if (gte(version, '16.9.0')) {
  		    // 16.9 - 17
  		    StrictModeBits = 0b1;
  		  } else if (gte(version, '16.3.0')) {
  		    // 16.3 - 16.8
  		    StrictModeBits = 0b10;
  		  }

  		  let ReactTypeOfWork = null; // **********************************************************
  		  // The section below is copied from files in React repo.
  		  // Keep it in sync, and add version guards if it changes.
  		  //
  		  // TODO Update the gt() check below to be gte() whichever the next version number is.
  		  // Currently the version in Git is 17.0.2 (but that version has not been/may not end up being released).

  		  if (gt(version, '17.0.1')) {
  		    ReactTypeOfWork = {
  		      CacheComponent: 24,
  		      // Experimental
  		      ClassComponent: 1,
  		      ContextConsumer: 9,
  		      ContextProvider: 10,
  		      CoroutineComponent: -1,
  		      // Removed
  		      CoroutineHandlerPhase: -1,
  		      // Removed
  		      DehydratedSuspenseComponent: 18,
  		      // Behind a flag
  		      ForwardRef: 11,
  		      Fragment: 7,
  		      FunctionComponent: 0,
  		      HostComponent: 5,
  		      HostPortal: 4,
  		      HostRoot: 3,
  		      HostHoistable: 26,
  		      // In reality, 18.2+. But doesn't hurt to include it here
  		      HostSingleton: 27,
  		      // Same as above
  		      HostText: 6,
  		      IncompleteClassComponent: 17,
  		      IncompleteFunctionComponent: 28,
  		      IndeterminateComponent: 2,
  		      // removed in 19.0.0
  		      LazyComponent: 16,
  		      LegacyHiddenComponent: 23,
  		      MemoComponent: 14,
  		      Mode: 8,
  		      OffscreenComponent: 22,
  		      // Experimental
  		      Profiler: 12,
  		      ScopeComponent: 21,
  		      // Experimental
  		      SimpleMemoComponent: 15,
  		      SuspenseComponent: 13,
  		      SuspenseListComponent: 19,
  		      // Experimental
  		      TracingMarkerComponent: 25,
  		      // Experimental - This is technically in 18 but we don't
  		      // want to fork again so we're adding it here instead
  		      YieldComponent: -1,
  		      // Removed
  		      Throw: 29,
  		      ViewTransitionComponent: 30,
  		      // Experimental
  		      ActivityComponent: 31
  		    };
  		  } else if (gte(version, '17.0.0-alpha')) {
  		    ReactTypeOfWork = {
  		      CacheComponent: -1,
  		      // Doesn't exist yet
  		      ClassComponent: 1,
  		      ContextConsumer: 9,
  		      ContextProvider: 10,
  		      CoroutineComponent: -1,
  		      // Removed
  		      CoroutineHandlerPhase: -1,
  		      // Removed
  		      DehydratedSuspenseComponent: 18,
  		      // Behind a flag
  		      ForwardRef: 11,
  		      Fragment: 7,
  		      FunctionComponent: 0,
  		      HostComponent: 5,
  		      HostPortal: 4,
  		      HostRoot: 3,
  		      HostHoistable: -1,
  		      // Doesn't exist yet
  		      HostSingleton: -1,
  		      // Doesn't exist yet
  		      HostText: 6,
  		      IncompleteClassComponent: 17,
  		      IncompleteFunctionComponent: -1,
  		      // Doesn't exist yet
  		      IndeterminateComponent: 2,
  		      LazyComponent: 16,
  		      LegacyHiddenComponent: 24,
  		      MemoComponent: 14,
  		      Mode: 8,
  		      OffscreenComponent: 23,
  		      // Experimental
  		      Profiler: 12,
  		      ScopeComponent: 21,
  		      // Experimental
  		      SimpleMemoComponent: 15,
  		      SuspenseComponent: 13,
  		      SuspenseListComponent: 19,
  		      // Experimental
  		      TracingMarkerComponent: -1,
  		      // Doesn't exist yet
  		      YieldComponent: -1,
  		      // Removed
  		      Throw: -1,
  		      // Doesn't exist yet
  		      ViewTransitionComponent: -1,
  		      // Doesn't exist yet
  		      ActivityComponent: -1 // Doesn't exist yet

  		    };
  		  } else if (gte(version, '16.6.0-beta.0')) {
  		    ReactTypeOfWork = {
  		      CacheComponent: -1,
  		      // Doesn't exist yet
  		      ClassComponent: 1,
  		      ContextConsumer: 9,
  		      ContextProvider: 10,
  		      CoroutineComponent: -1,
  		      // Removed
  		      CoroutineHandlerPhase: -1,
  		      // Removed
  		      DehydratedSuspenseComponent: 18,
  		      // Behind a flag
  		      ForwardRef: 11,
  		      Fragment: 7,
  		      FunctionComponent: 0,
  		      HostComponent: 5,
  		      HostPortal: 4,
  		      HostRoot: 3,
  		      HostHoistable: -1,
  		      // Doesn't exist yet
  		      HostSingleton: -1,
  		      // Doesn't exist yet
  		      HostText: 6,
  		      IncompleteClassComponent: 17,
  		      IncompleteFunctionComponent: -1,
  		      // Doesn't exist yet
  		      IndeterminateComponent: 2,
  		      LazyComponent: 16,
  		      LegacyHiddenComponent: -1,
  		      MemoComponent: 14,
  		      Mode: 8,
  		      OffscreenComponent: -1,
  		      // Experimental
  		      Profiler: 12,
  		      ScopeComponent: -1,
  		      // Experimental
  		      SimpleMemoComponent: 15,
  		      SuspenseComponent: 13,
  		      SuspenseListComponent: 19,
  		      // Experimental
  		      TracingMarkerComponent: -1,
  		      // Doesn't exist yet
  		      YieldComponent: -1,
  		      // Removed
  		      Throw: -1,
  		      // Doesn't exist yet
  		      ViewTransitionComponent: -1,
  		      // Doesn't exist yet
  		      ActivityComponent: -1 // Doesn't exist yet

  		    };
  		  } else if (gte(version, '16.4.3-alpha')) {
  		    ReactTypeOfWork = {
  		      CacheComponent: -1,
  		      // Doesn't exist yet
  		      ClassComponent: 2,
  		      ContextConsumer: 11,
  		      ContextProvider: 12,
  		      CoroutineComponent: -1,
  		      // Removed
  		      CoroutineHandlerPhase: -1,
  		      // Removed
  		      DehydratedSuspenseComponent: -1,
  		      // Doesn't exist yet
  		      ForwardRef: 13,
  		      Fragment: 9,
  		      FunctionComponent: 0,
  		      HostComponent: 7,
  		      HostPortal: 6,
  		      HostRoot: 5,
  		      HostHoistable: -1,
  		      // Doesn't exist yet
  		      HostSingleton: -1,
  		      // Doesn't exist yet
  		      HostText: 8,
  		      IncompleteClassComponent: -1,
  		      // Doesn't exist yet
  		      IncompleteFunctionComponent: -1,
  		      // Doesn't exist yet
  		      IndeterminateComponent: 4,
  		      LazyComponent: -1,
  		      // Doesn't exist yet
  		      LegacyHiddenComponent: -1,
  		      MemoComponent: -1,
  		      // Doesn't exist yet
  		      Mode: 10,
  		      OffscreenComponent: -1,
  		      // Experimental
  		      Profiler: 15,
  		      ScopeComponent: -1,
  		      // Experimental
  		      SimpleMemoComponent: -1,
  		      // Doesn't exist yet
  		      SuspenseComponent: 16,
  		      SuspenseListComponent: -1,
  		      // Doesn't exist yet
  		      TracingMarkerComponent: -1,
  		      // Doesn't exist yet
  		      YieldComponent: -1,
  		      // Removed
  		      Throw: -1,
  		      // Doesn't exist yet
  		      ViewTransitionComponent: -1,
  		      // Doesn't exist yet
  		      ActivityComponent: -1 // Doesn't exist yet

  		    };
  		  } else {
  		    ReactTypeOfWork = {
  		      CacheComponent: -1,
  		      // Doesn't exist yet
  		      ClassComponent: 2,
  		      ContextConsumer: 12,
  		      ContextProvider: 13,
  		      CoroutineComponent: 7,
  		      CoroutineHandlerPhase: 8,
  		      DehydratedSuspenseComponent: -1,
  		      // Doesn't exist yet
  		      ForwardRef: 14,
  		      Fragment: 10,
  		      FunctionComponent: 1,
  		      HostComponent: 5,
  		      HostPortal: 4,
  		      HostRoot: 3,
  		      HostHoistable: -1,
  		      // Doesn't exist yet
  		      HostSingleton: -1,
  		      // Doesn't exist yet
  		      HostText: 6,
  		      IncompleteClassComponent: -1,
  		      // Doesn't exist yet
  		      IncompleteFunctionComponent: -1,
  		      // Doesn't exist yet
  		      IndeterminateComponent: 0,
  		      LazyComponent: -1,
  		      // Doesn't exist yet
  		      LegacyHiddenComponent: -1,
  		      MemoComponent: -1,
  		      // Doesn't exist yet
  		      Mode: 11,
  		      OffscreenComponent: -1,
  		      // Experimental
  		      Profiler: 15,
  		      ScopeComponent: -1,
  		      // Experimental
  		      SimpleMemoComponent: -1,
  		      // Doesn't exist yet
  		      SuspenseComponent: 16,
  		      SuspenseListComponent: -1,
  		      // Doesn't exist yet
  		      TracingMarkerComponent: -1,
  		      // Doesn't exist yet
  		      YieldComponent: 9,
  		      Throw: -1,
  		      // Doesn't exist yet
  		      ViewTransitionComponent: -1,
  		      // Doesn't exist yet
  		      ActivityComponent: -1 // Doesn't exist yet

  		    };
  		  } // **********************************************************
  		  // End of copied code.
  		  // **********************************************************


  		  function getTypeSymbol(type) {
  		    const symbolOrNumber = typeof type === 'object' && type !== null ? type.$$typeof : type;
  		    return typeof symbolOrNumber === 'symbol' ? symbolOrNumber.toString() : symbolOrNumber;
  		  }

  		  const {
  		    CacheComponent,
  		    ClassComponent,
  		    IncompleteClassComponent,
  		    IncompleteFunctionComponent,
  		    FunctionComponent,
  		    IndeterminateComponent,
  		    ForwardRef,
  		    HostRoot,
  		    HostHoistable,
  		    HostSingleton,
  		    HostComponent,
  		    HostPortal,
  		    HostText,
  		    Fragment,
  		    LazyComponent,
  		    LegacyHiddenComponent,
  		    MemoComponent,
  		    OffscreenComponent,
  		    Profiler,
  		    ScopeComponent,
  		    SimpleMemoComponent,
  		    SuspenseComponent,
  		    SuspenseListComponent,
  		    TracingMarkerComponent,
  		    Throw,
  		    ViewTransitionComponent,
  		    ActivityComponent
  		  } = ReactTypeOfWork;

  		  function resolveFiberType(type) {
  		    const typeSymbol = getTypeSymbol(type);

  		    switch (typeSymbol) {
  		      case MEMO_NUMBER:
  		      case MEMO_SYMBOL_STRING:
  		        // recursively resolving memo type in case of memo(forwardRef(Component))
  		        return resolveFiberType(type.type);

  		      case FORWARD_REF_NUMBER:
  		      case FORWARD_REF_SYMBOL_STRING:
  		        return type.render;

  		      default:
  		        return type;
  		    }
  		  } // NOTICE Keep in sync with shouldFilterFiber() and other get*ForFiber methods


  		  function getDisplayNameForFiber(fiber, shouldSkipForgetCheck = false) {
  		    const {
  		      elementType,
  		      type,
  		      tag
  		    } = fiber;
  		    let resolvedType = type;

  		    if (typeof type === 'object' && type !== null) {
  		      resolvedType = resolveFiberType(type);
  		    }

  		    let resolvedContext = null;

  		    if (!shouldSkipForgetCheck && ( // $FlowFixMe[incompatible-type] fiber.updateQueue is mixed
  		    fiber.updateQueue?.memoCache != null || Array.isArray(fiber.memoizedState?.memoizedState) && fiber.memoizedState.memoizedState[0]?.[ReactSymbols_REACT_MEMO_CACHE_SENTINEL] || fiber.memoizedState?.memoizedState?.[ReactSymbols_REACT_MEMO_CACHE_SENTINEL])) {
  		      const displayNameWithoutForgetWrapper = getDisplayNameForFiber(fiber, true);

  		      if (displayNameWithoutForgetWrapper == null) {
  		        return null;
  		      }

  		      return `Forget(${displayNameWithoutForgetWrapper})`;
  		    }

  		    switch (tag) {
  		      case ActivityComponent:
  		        return 'Activity';

  		      case CacheComponent:
  		        return 'Cache';

  		      case ClassComponent:
  		      case IncompleteClassComponent:
  		      case IncompleteFunctionComponent:
  		      case FunctionComponent:
  		      case IndeterminateComponent:
  		        return getDisplayName(resolvedType);

  		      case ForwardRef:
  		        return getWrappedDisplayName(elementType, resolvedType, 'ForwardRef', 'Anonymous');

  		      case HostRoot:
  		        const fiberRoot = fiber.stateNode;

  		        if (fiberRoot != null && fiberRoot._debugRootType !== null) {
  		          return fiberRoot._debugRootType;
  		        }

  		        return null;

  		      case HostComponent:
  		      case HostSingleton:
  		      case HostHoistable:
  		        return type;

  		      case HostPortal:
  		      case HostText:
  		        return null;

  		      case Fragment:
  		        return 'Fragment';

  		      case LazyComponent:
  		        // This display name will not be user visible.
  		        // Once a Lazy component loads its inner component, React replaces the tag and type.
  		        // This display name will only show up in console logs when DevTools DEBUG mode is on.
  		        return 'Lazy';

  		      case MemoComponent:
  		      case SimpleMemoComponent:
  		        // Display name in React does not use `Memo` as a wrapper but fallback name.
  		        return getWrappedDisplayName(elementType, resolvedType, 'Memo', 'Anonymous');

  		      case SuspenseComponent:
  		        return 'Suspense';

  		      case LegacyHiddenComponent:
  		        return 'LegacyHidden';

  		      case OffscreenComponent:
  		        return 'Offscreen';

  		      case ScopeComponent:
  		        return 'Scope';

  		      case SuspenseListComponent:
  		        return 'SuspenseList';

  		      case Profiler:
  		        return 'Profiler';

  		      case TracingMarkerComponent:
  		        return 'TracingMarker';

  		      case ViewTransitionComponent:
  		        return 'ViewTransition';

  		      case Throw:
  		        // This should really never be visible.
  		        return 'Error';

  		      default:
  		        const typeSymbol = getTypeSymbol(type);

  		        switch (typeSymbol) {
  		          case CONCURRENT_MODE_NUMBER:
  		          case CONCURRENT_MODE_SYMBOL_STRING:
  		          case DEPRECATED_ASYNC_MODE_SYMBOL_STRING:
  		            return null;

  		          case PROVIDER_NUMBER:
  		          case PROVIDER_SYMBOL_STRING:
  		            // 16.3.0 exposed the context object as "context"
  		            // PR #12501 changed it to "_context" for 16.3.1+
  		            // NOTE Keep in sync with inspectElementRaw()
  		            resolvedContext = fiber.type._context || fiber.type.context;
  		            return `${resolvedContext.displayName || 'Context'}.Provider`;

  		          case CONTEXT_NUMBER:
  		          case CONTEXT_SYMBOL_STRING:
  		          case SERVER_CONTEXT_SYMBOL_STRING:
  		            if (fiber.type._context === undefined && fiber.type.Provider === fiber.type) {
  		              // In 19+, Context.Provider === Context, so this is a provider.
  		              resolvedContext = fiber.type;
  		              return `${resolvedContext.displayName || 'Context'}.Provider`;
  		            } // 16.3-16.5 read from "type" because the Consumer is the actual context object.
  		            // 16.6+ should read from "type._context" because Consumer can be different (in DEV).
  		            // NOTE Keep in sync with inspectElementRaw()


  		            resolvedContext = fiber.type._context || fiber.type; // NOTE: TraceUpdatesBackendManager depends on the name ending in '.Consumer'
  		            // If you change the name, figure out a more resilient way to detect it.

  		            return `${resolvedContext.displayName || 'Context'}.Consumer`;

  		          case CONSUMER_SYMBOL_STRING:
  		            // 19+
  		            resolvedContext = fiber.type._context;
  		            return `${resolvedContext.displayName || 'Context'}.Consumer`;

  		          case STRICT_MODE_NUMBER:
  		          case STRICT_MODE_SYMBOL_STRING:
  		            return null;

  		          case PROFILER_NUMBER:
  		          case PROFILER_SYMBOL_STRING:
  		            return `Profiler(${fiber.memoizedProps.id})`;

  		          case SCOPE_NUMBER:
  		          case SCOPE_SYMBOL_STRING:
  		            return 'Scope';

  		          default:
  		            // Unknown element type.
  		            // This may mean a new element type that has not yet been added to DevTools.
  		            return null;
  		        }

  		    }
  		  }

  		  return {
  		    getDisplayNameForFiber,
  		    getTypeSymbol,
  		    ReactPriorityLevels,
  		    ReactTypeOfWork,
  		    StrictModeBits
  		  };
  		} // All environment names we've seen so far. This lets us create a list of filters to apply.
  		// This should ideally include env of filtered Components too so that you can add those as
  		// filters at the same time as removing some other filter.

  		const knownEnvironmentNames = new Set(); // Map of FiberRoot to their root FiberInstance.

  		const rootToFiberInstanceMap = new Map(); // Map of id to FiberInstance or VirtualInstance.
  		// This Map is used to e.g. get the display name for a Fiber or schedule an update,
  		// operations that should be the same whether the current and work-in-progress Fiber is used.

  		const idToDevToolsInstanceMap = new Map(); // Map of canonical HostInstances to the nearest parent DevToolsInstance.

  		const publicInstanceToDevToolsInstanceMap = new Map(); // Map of resource DOM nodes to all the nearest DevToolsInstances that depend on it.

  		const hostResourceToDevToolsInstanceMap = new Map(); // Ideally, this should be injected from Reconciler config

  		function getPublicInstance(instance) {
  		  // Typically the PublicInstance and HostInstance is the same thing but not in Fabric.
  		  // So we need to detect this and use that as the public instance.
  		  // React Native. Modern. Fabric.
  		  if (typeof instance === 'object' && instance !== null) {
  		    if (typeof instance.canonical === 'object' && instance.canonical !== null) {
  		      if (typeof instance.canonical.publicInstance === 'object' && instance.canonical.publicInstance !== null) {
  		        return instance.canonical.publicInstance;
  		      }
  		    } // React Native. Legacy. Paper.


  		    if (typeof instance._nativeTag === 'number') {
  		      return instance._nativeTag;
  		    }
  		  } // React Web. Usually a DOM element.


  		  return instance;
  		}

  		function getNativeTag(instance) {
  		  if (typeof instance !== 'object' || instance === null) {
  		    return null;
  		  } // Modern. Fabric.


  		  if (instance.canonical != null && typeof instance.canonical.nativeTag === 'number') {
  		    return instance.canonical.nativeTag;
  		  } // Legacy.  Paper.


  		  if (typeof instance._nativeTag === 'number') {
  		    return instance._nativeTag;
  		  }

  		  return null;
  		}

  		function aquireHostInstance(nearestInstance, hostInstance) {
  		  const publicInstance = getPublicInstance(hostInstance);
  		  publicInstanceToDevToolsInstanceMap.set(publicInstance, nearestInstance);
  		}

  		function releaseHostInstance(nearestInstance, hostInstance) {
  		  const publicInstance = getPublicInstance(hostInstance);

  		  if (publicInstanceToDevToolsInstanceMap.get(publicInstance) === nearestInstance) {
  		    publicInstanceToDevToolsInstanceMap.delete(publicInstance);
  		  }
  		}

  		function aquireHostResource(nearestInstance, resource) {
  		  const hostInstance = resource && resource.instance;

  		  if (hostInstance) {
  		    const publicInstance = getPublicInstance(hostInstance);
  		    let resourceInstances = hostResourceToDevToolsInstanceMap.get(publicInstance);

  		    if (resourceInstances === undefined) {
  		      resourceInstances = new Set();
  		      hostResourceToDevToolsInstanceMap.set(publicInstance, resourceInstances); // Store the first match in the main map for quick access when selecting DOM node.

  		      publicInstanceToDevToolsInstanceMap.set(publicInstance, nearestInstance);
  		    }

  		    resourceInstances.add(nearestInstance);
  		  }
  		}

  		function releaseHostResource(nearestInstance, resource) {
  		  const hostInstance = resource && resource.instance;

  		  if (hostInstance) {
  		    const publicInstance = getPublicInstance(hostInstance);
  		    const resourceInstances = hostResourceToDevToolsInstanceMap.get(publicInstance);

  		    if (resourceInstances !== undefined) {
  		      resourceInstances.delete(nearestInstance);

  		      if (resourceInstances.size === 0) {
  		        hostResourceToDevToolsInstanceMap.delete(publicInstance);
  		        publicInstanceToDevToolsInstanceMap.delete(publicInstance);
  		      } else if (publicInstanceToDevToolsInstanceMap.get(publicInstance) === nearestInstance) {
  		        // This was the first one. Store the next first one in the main map for easy access.
  		        // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  		        for (const firstInstance of resourceInstances) {
  		          publicInstanceToDevToolsInstanceMap.set(firstInstance, nearestInstance);
  		          break;
  		        }
  		      }
  		    }
  		  }
  		}

  		function renderer_attach(hook, rendererID, renderer, global, shouldStartProfilingNow, profilingSettings) {
  		  // Newer versions of the reconciler package also specific reconciler version.
  		  // If that version number is present, use it.
  		  // Third party renderer versions may not match the reconciler version,
  		  // and the latter is what's important in terms of tags and symbols.
  		  const version = renderer.reconcilerVersion || renderer.version;
  		  const {
  		    getDisplayNameForFiber,
  		    getTypeSymbol,
  		    ReactPriorityLevels,
  		    ReactTypeOfWork,
  		    StrictModeBits
  		  } = getInternalReactConstants(version);
  		  const {
  		    ActivityComponent,
  		    CacheComponent,
  		    ClassComponent,
  		    ContextConsumer,
  		    DehydratedSuspenseComponent,
  		    ForwardRef,
  		    Fragment,
  		    FunctionComponent,
  		    HostRoot,
  		    HostHoistable,
  		    HostSingleton,
  		    HostPortal,
  		    HostComponent,
  		    HostText,
  		    IncompleteClassComponent,
  		    IncompleteFunctionComponent,
  		    IndeterminateComponent,
  		    LegacyHiddenComponent,
  		    MemoComponent,
  		    OffscreenComponent,
  		    SimpleMemoComponent,
  		    SuspenseComponent,
  		    SuspenseListComponent,
  		    TracingMarkerComponent,
  		    Throw,
  		    ViewTransitionComponent
  		  } = ReactTypeOfWork;
  		  const {
  		    ImmediatePriority,
  		    UserBlockingPriority,
  		    NormalPriority,
  		    LowPriority,
  		    IdlePriority,
  		    NoPriority
  		  } = ReactPriorityLevels;
  		  const {
  		    getLaneLabelMap,
  		    injectProfilingHooks,
  		    overrideHookState,
  		    overrideHookStateDeletePath,
  		    overrideHookStateRenamePath,
  		    overrideProps,
  		    overridePropsDeletePath,
  		    overridePropsRenamePath,
  		    scheduleRefresh,
  		    setErrorHandler,
  		    setSuspenseHandler,
  		    scheduleUpdate,
  		    getCurrentFiber
  		  } = renderer;
  		  const supportsTogglingError = typeof setErrorHandler === 'function' && typeof scheduleUpdate === 'function';
  		  const supportsTogglingSuspense = typeof setSuspenseHandler === 'function' && typeof scheduleUpdate === 'function';

  		  if (typeof scheduleRefresh === 'function') {
  		    // When Fast Refresh updates a component, the frontend may need to purge cached information.
  		    // For example, ASTs cached for the component (for named hooks) may no longer be valid.
  		    // Send a signal to the frontend to purge this cached information.
  		    // The "fastRefreshScheduled" dispatched is global (not Fiber or even Renderer specific).
  		    // This is less effecient since it means the front-end will need to purge the entire cache,
  		    // but this is probably an okay trade off in order to reduce coupling between the DevTools and Fast Refresh.
  		    renderer.scheduleRefresh = (...args) => {
  		      try {
  		        hook.emit('fastRefreshScheduled');
  		      } finally {
  		        return scheduleRefresh(...args);
  		      }
  		    };
  		  }

  		  let getTimelineData = null;
  		  let toggleProfilingStatus = null;

  		  if (typeof injectProfilingHooks === 'function') {
  		    const response = createProfilingHooks({
  		      getDisplayNameForFiber,
  		      getIsProfiling: () => isProfiling,
  		      getLaneLabelMap,
  		      currentDispatcherRef: getDispatcherRef(renderer),
  		      workTagMap: ReactTypeOfWork,
  		      reactVersion: version
  		    }); // Pass the Profiling hooks to the reconciler for it to call during render.

  		    injectProfilingHooks(response.profilingHooks); // Hang onto this toggle so we can notify the external methods of profiling status changes.

  		    getTimelineData = response.getTimelineData;
  		    toggleProfilingStatus = response.toggleProfilingStatus;
  		  }

  		  // Tracks Errors/Warnings logs added to a Fiber. They are added before the commit and get
  		  // picked up a FiberInstance. This keeps it around as long as the Fiber is alive which
  		  // lets the Fiber get reparented/remounted and still observe the previous errors/warnings.
  		  // Unless we explicitly clear the logs from a Fiber.
  		  const fiberToComponentLogsMap = new WeakMap(); // Tracks whether we've performed a commit since the last log. This is used to know
  		  // whether we received any new logs between the commit and post commit phases. I.e.
  		  // if any passive effects called console.warn / console.error.

  		  let needsToFlushComponentLogs = false;

  		  function bruteForceFlushErrorsAndWarnings() {
  		    // Refresh error/warning count for all mounted unfiltered Fibers.
  		    let hasChanges = false; // eslint-disable-next-line no-for-of-loops/no-for-of-loops

  		    for (const devtoolsInstance of idToDevToolsInstanceMap.values()) {
  		      if (devtoolsInstance.kind === FIBER_INSTANCE) {
  		        const fiber = devtoolsInstance.data;
  		        const componentLogsEntry = fiberToComponentLogsMap.get(fiber);
  		        const changed = recordConsoleLogs(devtoolsInstance, componentLogsEntry);

  		        if (changed) {
  		          hasChanges = true;
  		          updateMostRecentlyInspectedElementIfNecessary(devtoolsInstance.id);
  		        }
  		      }
  		    }

  		    if (hasChanges) {
  		      flushPendingEvents();
  		    }
  		  }

  		  function clearErrorsAndWarnings() {
  		    // Note, this only clears logs for Fibers that have instances. If they're filtered
  		    // and then mount, the logs are there. Ensuring we only clear what you've seen.
  		    // If we wanted to clear the whole set, we'd replace fiberToComponentLogsMap with a
  		    // new WeakMap. It's unclear whether we should clear componentInfoToComponentLogsMap
  		    // since it's shared by other renderers but presumably it would.
  		    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  		    for (const devtoolsInstance of idToDevToolsInstanceMap.values()) {
  		      if (devtoolsInstance.kind === FIBER_INSTANCE) {
  		        const fiber = devtoolsInstance.data;
  		        fiberToComponentLogsMap.delete(fiber);

  		        if (fiber.alternate) {
  		          fiberToComponentLogsMap.delete(fiber.alternate);
  		        }
  		      } else {
  		        componentInfoToComponentLogsMap["delete"](devtoolsInstance.data);
  		      }

  		      const changed = recordConsoleLogs(devtoolsInstance, undefined);

  		      if (changed) {
  		        updateMostRecentlyInspectedElementIfNecessary(devtoolsInstance.id);
  		      }
  		    }

  		    flushPendingEvents();
  		  }

  		  function clearConsoleLogsHelper(instanceID, type) {
  		    const devtoolsInstance = idToDevToolsInstanceMap.get(instanceID);

  		    if (devtoolsInstance !== undefined) {
  		      let componentLogsEntry;

  		      if (devtoolsInstance.kind === FIBER_INSTANCE) {
  		        const fiber = devtoolsInstance.data;
  		        componentLogsEntry = fiberToComponentLogsMap.get(fiber);

  		        if (componentLogsEntry === undefined && fiber.alternate !== null) {
  		          componentLogsEntry = fiberToComponentLogsMap.get(fiber.alternate);
  		        }
  		      } else {
  		        const componentInfo = devtoolsInstance.data;
  		        componentLogsEntry = componentInfoToComponentLogsMap.get(componentInfo);
  		      }

  		      if (componentLogsEntry !== undefined) {
  		        if (type === 'error') {
  		          componentLogsEntry.errors.clear();
  		          componentLogsEntry.errorsCount = 0;
  		        } else {
  		          componentLogsEntry.warnings.clear();
  		          componentLogsEntry.warningsCount = 0;
  		        }

  		        const changed = recordConsoleLogs(devtoolsInstance, componentLogsEntry);

  		        if (changed) {
  		          flushPendingEvents();
  		          updateMostRecentlyInspectedElementIfNecessary(devtoolsInstance.id);
  		        }
  		      }
  		    }
  		  }

  		  function clearErrorsForElementID(instanceID) {
  		    clearConsoleLogsHelper(instanceID, 'error');
  		  }

  		  function clearWarningsForElementID(instanceID) {
  		    clearConsoleLogsHelper(instanceID, 'warn');
  		  }

  		  function updateMostRecentlyInspectedElementIfNecessary(fiberID) {
  		    if (mostRecentlyInspectedElement !== null && mostRecentlyInspectedElement.id === fiberID) {
  		      hasElementUpdatedSinceLastInspected = true;
  		    }
  		  }

  		  function getComponentStack(topFrame) {
  		    if (getCurrentFiber == null) {
  		      // Expected this to be part of the renderer. Ignore.
  		      return null;
  		    }

  		    const current = getCurrentFiber();

  		    if (current === null) {
  		      // Outside of our render scope.
  		      return null;
  		    }

  		    if (DevToolsFiberComponentStack_supportsConsoleTasks(current)) {
  		      // This will be handled natively by console.createTask. No need for
  		      // DevTools to add it.
  		      return null;
  		    }

  		    const dispatcherRef = getDispatcherRef(renderer);

  		    if (dispatcherRef === undefined) {
  		      return null;
  		    }

  		    const enableOwnerStacks = supportsOwnerStacks(current);
  		    let componentStack = '';

  		    if (enableOwnerStacks) {
  		      // Prefix the owner stack with the current stack. I.e. what called
  		      // console.error. While this will also be part of the native stack,
  		      // it is hidden and not presented alongside this argument so we print
  		      // them all together.
  		      const topStackFrames = formatOwnerStack(topFrame);

  		      if (topStackFrames) {
  		        componentStack += '\n' + topStackFrames;
  		      }

  		      componentStack += getOwnerStackByFiberInDev(ReactTypeOfWork, current);
  		    } else {
  		      componentStack = getStackByFiberInDevAndProd(ReactTypeOfWork, current, dispatcherRef);
  		    }

  		    return {
  		      enableOwnerStacks,
  		      componentStack
  		    };
  		  } // Called when an error or warning is logged during render, commit, or passive (including unmount functions).


  		  function onErrorOrWarning(type, args) {
  		    if (getCurrentFiber == null) {
  		      // Expected this to be part of the renderer. Ignore.
  		      return;
  		    }

  		    const fiber = getCurrentFiber();

  		    if (fiber === null) {
  		      // Outside of our render scope.
  		      return;
  		    }

  		    if (type === 'error') {
  		      // if this is an error simulated by us to trigger error boundary, ignore
  		      if (forceErrorForFibers.get(fiber) === true || fiber.alternate !== null && forceErrorForFibers.get(fiber.alternate) === true) {
  		        return;
  		      }
  		    } // We can't really use this message as a unique key, since we can't distinguish
  		    // different objects in this implementation. We have to delegate displaying of the objects
  		    // to the environment, the browser console, for example, so this is why this should be kept
  		    // as an array of arguments, instead of the plain string.
  		    // [Warning: %o, {...}] and [Warning: %o, {...}] will be considered as the same message,
  		    // even if objects are different


  		    const message = formatConsoleArgumentsToSingleString(...args); // Track the warning/error for later.

  		    let componentLogsEntry = fiberToComponentLogsMap.get(fiber);

  		    if (componentLogsEntry === undefined && fiber.alternate !== null) {
  		      componentLogsEntry = fiberToComponentLogsMap.get(fiber.alternate);

  		      if (componentLogsEntry !== undefined) {
  		        // Use the same set for both Fibers.
  		        fiberToComponentLogsMap.set(fiber, componentLogsEntry);
  		      }
  		    }

  		    if (componentLogsEntry === undefined) {
  		      componentLogsEntry = {
  		        errors: new Map(),
  		        errorsCount: 0,
  		        warnings: new Map(),
  		        warningsCount: 0
  		      };
  		      fiberToComponentLogsMap.set(fiber, componentLogsEntry);
  		    }

  		    const messageMap = type === 'error' ? componentLogsEntry.errors : componentLogsEntry.warnings;
  		    const count = messageMap.get(message) || 0;
  		    messageMap.set(message, count + 1);

  		    if (type === 'error') {
  		      componentLogsEntry.errorsCount++;
  		    } else {
  		      componentLogsEntry.warningsCount++;
  		    } // The changes will be flushed later when we commit.
  		    // If the log happened in a passive effect, then this happens after we've
  		    // already committed the new tree so the change won't show up until we rerender
  		    // that component again. We need to visit a Component with passive effects in
  		    // handlePostCommitFiberRoot again to ensure that we flush the changes after passive.


  		    needsToFlushComponentLogs = true;
  		  }


  		  const hideElementsWithDisplayNames = new Set();
  		  const hideElementsWithPaths = new Set();
  		  const hideElementsWithTypes = new Set();
  		  const hideElementsWithEnvs = new Set(); // Highlight updates

  		  let traceUpdatesEnabled = false;
  		  const traceUpdatesForNodes = new Set();

  		  function applyComponentFilters(componentFilters) {
  		    hideElementsWithTypes.clear();
  		    hideElementsWithDisplayNames.clear();
  		    hideElementsWithPaths.clear();
  		    hideElementsWithEnvs.clear();
  		    componentFilters.forEach(componentFilter => {
  		      if (!componentFilter.isEnabled) {
  		        return;
  		      }

  		      switch (componentFilter.type) {
  		        case ComponentFilterDisplayName:
  		          if (componentFilter.isValid && componentFilter.value !== '') {
  		            hideElementsWithDisplayNames.add(new RegExp(componentFilter.value, 'i'));
  		          }

  		          break;

  		        case ComponentFilterElementType:
  		          hideElementsWithTypes.add(componentFilter.value);
  		          break;

  		        case ComponentFilterLocation:
  		          if (componentFilter.isValid && componentFilter.value !== '') {
  		            hideElementsWithPaths.add(new RegExp(componentFilter.value, 'i'));
  		          }

  		          break;

  		        case ComponentFilterHOC:
  		          hideElementsWithDisplayNames.add(new RegExp('\\('));
  		          break;

  		        case ComponentFilterEnvironmentName:
  		          hideElementsWithEnvs.add(componentFilter.value);
  		          break;

  		        default:
  		          console.warn(`Invalid component filter type "${componentFilter.type}"`);
  		          break;
  		      }
  		    });
  		  } // The renderer interface can't read saved component filters directly,
  		  // because they are stored in localStorage within the context of the extension.
  		  // Instead it relies on the extension to pass filters through.


  		  if (window.__REACT_DEVTOOLS_COMPONENT_FILTERS__ != null) {
  		    const componentFiltersWithoutLocationBasedOnes = filterOutLocationComponentFilters(window.__REACT_DEVTOOLS_COMPONENT_FILTERS__);
  		    applyComponentFilters(componentFiltersWithoutLocationBasedOnes);
  		  } else {
  		    // Unfortunately this feature is not expected to work for React Native for now.
  		    // It would be annoying for us to spam YellowBox warnings with unactionable stuff,
  		    // so for now just skip this message...
  		    //console.warn('⚛ DevTools: Could not locate saved component filters');
  		    // Fallback to assuming the default filters in this case.
  		    applyComponentFilters(getDefaultComponentFilters());
  		  } // If necessary, we can revisit optimizing this operation.
  		  // For example, we could add a new recursive unmount tree operation.
  		  // The unmount operations are already significantly smaller than mount operations though.
  		  // This is something to keep in mind for later.


  		  function updateComponentFilters(componentFilters) {
  		    if (isProfiling) {
  		      // Re-mounting a tree while profiling is in progress might break a lot of assumptions.
  		      // If necessary, we could support this- but it doesn't seem like a necessary use case.
  		      throw Error('Cannot modify filter preferences while profiling');
  		    } // Recursively unmount all roots.


  		    hook.getFiberRoots(rendererID).forEach(root => {
  		      const rootInstance = rootToFiberInstanceMap.get(root);

  		      if (rootInstance === undefined) {
  		        throw new Error('Expected the root instance to already exist when applying filters');
  		      }

  		      currentRoot = rootInstance;
  		      unmountInstanceRecursively(rootInstance);
  		      rootToFiberInstanceMap.delete(root);
  		      flushPendingEvents();
  		      currentRoot = null;
  		    });
  		    applyComponentFilters(componentFilters); // Reset pseudo counters so that new path selections will be persisted.

  		    rootDisplayNameCounter.clear(); // Recursively re-mount all roots with new filter criteria applied.

  		    hook.getFiberRoots(rendererID).forEach(root => {
  		      const current = root.current;
  		      const newRoot = createFiberInstance(current);
  		      rootToFiberInstanceMap.set(root, newRoot);
  		      idToDevToolsInstanceMap.set(newRoot.id, newRoot); // Before the traversals, remember to start tracking
  		      // our path in case we have selection to restore.

  		      if (trackedPath !== null) {
  		        mightBeOnTrackedPath = true;
  		      }

  		      currentRoot = newRoot;
  		      setRootPseudoKey(currentRoot.id, root.current);
  		      mountFiberRecursively(root.current, false);
  		      flushPendingEvents();
  		      currentRoot = null;
  		    });
  		    flushPendingEvents();
  		    needsToFlushComponentLogs = false;
  		  }

  		  function getEnvironmentNames() {
  		    return Array.from(knownEnvironmentNames);
  		  }

  		  function shouldFilterVirtual(data, secondaryEnv) {
  		    // For purposes of filtering Server Components are always Function Components.
  		    // Environment will be used to filter Server vs Client.
  		    // Technically they can be forwardRef and memo too but those filters will go away
  		    // as those become just plain user space function components like any HoC.
  		    if (hideElementsWithTypes.has(types_ElementTypeFunction)) {
  		      return true;
  		    }

  		    if (hideElementsWithDisplayNames.size > 0) {
  		      const displayName = data.name;

  		      if (displayName != null) {
  		        // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  		        for (const displayNameRegExp of hideElementsWithDisplayNames) {
  		          if (displayNameRegExp.test(displayName)) {
  		            return true;
  		          }
  		        }
  		      }
  		    }

  		    if ((data.env == null || hideElementsWithEnvs.has(data.env)) && (secondaryEnv === null || hideElementsWithEnvs.has(secondaryEnv))) {
  		      // If a Component has two environments, you have to filter both for it not to appear.
  		      return true;
  		    }

  		    return false;
  		  } // NOTICE Keep in sync with get*ForFiber methods


  		  function shouldFilterFiber(fiber) {
  		    const {
  		      tag,
  		      type,
  		      key
  		    } = fiber;

  		    switch (tag) {
  		      case DehydratedSuspenseComponent:
  		        // TODO: ideally we would show dehydrated Suspense immediately.
  		        // However, it has some special behavior (like disconnecting
  		        // an alternate and turning into real Suspense) which breaks DevTools.
  		        // For now, ignore it, and only show it once it gets hydrated.
  		        // https://github.com/bvaughn/react-devtools-experimental/issues/197
  		        return true;

  		      case HostPortal:
  		      case HostText:
  		      case LegacyHiddenComponent:
  		      case OffscreenComponent:
  		      case Throw:
  		        return true;

  		      case HostRoot:
  		        // It is never valid to filter the root element.
  		        return false;

  		      case Fragment:
  		        return key === null;

  		      default:
  		        const typeSymbol = getTypeSymbol(type);

  		        switch (typeSymbol) {
  		          case CONCURRENT_MODE_NUMBER:
  		          case CONCURRENT_MODE_SYMBOL_STRING:
  		          case DEPRECATED_ASYNC_MODE_SYMBOL_STRING:
  		          case STRICT_MODE_NUMBER:
  		          case STRICT_MODE_SYMBOL_STRING:
  		            return true;
  		        }

  		    }

  		    const elementType = getElementTypeForFiber(fiber);

  		    if (hideElementsWithTypes.has(elementType)) {
  		      return true;
  		    }

  		    if (hideElementsWithDisplayNames.size > 0) {
  		      const displayName = getDisplayNameForFiber(fiber);

  		      if (displayName != null) {
  		        // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  		        for (const displayNameRegExp of hideElementsWithDisplayNames) {
  		          if (displayNameRegExp.test(displayName)) {
  		            return true;
  		          }
  		        }
  		      }
  		    }

  		    if (hideElementsWithEnvs.has('Client')) {
  		      // If we're filtering out the Client environment we should filter out all
  		      // "Client Components". Technically that also includes the built-ins but
  		      // since that doesn't actually include any additional code loading it's
  		      // useful to not filter out the built-ins. Those can be filtered separately.
  		      // There's no other way to filter out just Function components on the Client.
  		      // Therefore, this only filters Class and Function components.
  		      switch (tag) {
  		        case ClassComponent:
  		        case IncompleteClassComponent:
  		        case IncompleteFunctionComponent:
  		        case FunctionComponent:
  		        case IndeterminateComponent:
  		        case ForwardRef:
  		        case MemoComponent:
  		        case SimpleMemoComponent:
  		          return true;
  		      }
  		    }
  		    /* DISABLED: https://github.com/facebook/react/pull/28417
  		    if (hideElementsWithPaths.size > 0) {
  		      const source = getSourceForFiber(fiber);
  		       if (source != null) {
  		        const {fileName} = source;
  		        // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  		        for (const pathRegExp of hideElementsWithPaths) {
  		          if (pathRegExp.test(fileName)) {
  		            return true;
  		          }
  		        }
  		      }
  		    }
  		    */


  		    return false;
  		  } // NOTICE Keep in sync with shouldFilterFiber() and other get*ForFiber methods


  		  function getElementTypeForFiber(fiber) {
  		    const {
  		      type,
  		      tag
  		    } = fiber;

  		    switch (tag) {
  		      case ActivityComponent:
  		        return ElementTypeActivity;

  		      case ClassComponent:
  		      case IncompleteClassComponent:
  		        return types_ElementTypeClass;

  		      case IncompleteFunctionComponent:
  		      case FunctionComponent:
  		      case IndeterminateComponent:
  		        return types_ElementTypeFunction;

  		      case ForwardRef:
  		        return types_ElementTypeForwardRef;

  		      case HostRoot:
  		        return ElementTypeRoot;

  		      case HostComponent:
  		      case HostHoistable:
  		      case HostSingleton:
  		        return ElementTypeHostComponent;

  		      case HostPortal:
  		      case HostText:
  		      case Fragment:
  		        return ElementTypeOtherOrUnknown;

  		      case MemoComponent:
  		      case SimpleMemoComponent:
  		        return types_ElementTypeMemo;

  		      case SuspenseComponent:
  		        return ElementTypeSuspense;

  		      case SuspenseListComponent:
  		        return ElementTypeSuspenseList;

  		      case TracingMarkerComponent:
  		        return ElementTypeTracingMarker;

  		      case ViewTransitionComponent:
  		        return ElementTypeViewTransition;

  		      default:
  		        const typeSymbol = getTypeSymbol(type);

  		        switch (typeSymbol) {
  		          case CONCURRENT_MODE_NUMBER:
  		          case CONCURRENT_MODE_SYMBOL_STRING:
  		          case DEPRECATED_ASYNC_MODE_SYMBOL_STRING:
  		            return ElementTypeOtherOrUnknown;

  		          case PROVIDER_NUMBER:
  		          case PROVIDER_SYMBOL_STRING:
  		            return ElementTypeContext;

  		          case CONTEXT_NUMBER:
  		          case CONTEXT_SYMBOL_STRING:
  		            return ElementTypeContext;

  		          case STRICT_MODE_NUMBER:
  		          case STRICT_MODE_SYMBOL_STRING:
  		            return ElementTypeOtherOrUnknown;

  		          case PROFILER_NUMBER:
  		          case PROFILER_SYMBOL_STRING:
  		            return ElementTypeProfiler;

  		          default:
  		            return ElementTypeOtherOrUnknown;
  		        }

  		    }
  		  } // When a mount or update is in progress, this value tracks the root that is being operated on.


  		  let currentRoot = null; // Removes a Fiber (and its alternate) from the Maps used to track their id.
  		  // This method should always be called when a Fiber is unmounting.

  		  function untrackFiber(nearestInstance, fiber) {
  		    if (forceErrorForFibers.size > 0) {
  		      forceErrorForFibers.delete(fiber);

  		      if (fiber.alternate) {
  		        forceErrorForFibers.delete(fiber.alternate);
  		      }

  		      if (forceErrorForFibers.size === 0 && setErrorHandler != null) {
  		        setErrorHandler(shouldErrorFiberAlwaysNull);
  		      }
  		    }

  		    if (forceFallbackForFibers.size > 0) {
  		      forceFallbackForFibers.delete(fiber);

  		      if (fiber.alternate) {
  		        forceFallbackForFibers.delete(fiber.alternate);
  		      }

  		      if (forceFallbackForFibers.size === 0 && setSuspenseHandler != null) {
  		        setSuspenseHandler(shouldSuspendFiberAlwaysFalse);
  		      }
  		    } // TODO: Consider using a WeakMap instead. The only thing where that doesn't work
  		    // is React Native Paper which tracks tags but that support is eventually going away
  		    // and can use the old findFiberByHostInstance strategy.


  		    if (fiber.tag === HostHoistable) {
  		      releaseHostResource(nearestInstance, fiber.memoizedState);
  		    } else if (fiber.tag === HostComponent || fiber.tag === HostText || fiber.tag === HostSingleton) {
  		      releaseHostInstance(nearestInstance, fiber.stateNode);
  		    } // Recursively clean up any filtered Fibers below this one as well since
  		    // we won't recordUnmount on those.


  		    for (let child = fiber.child; child !== null; child = child.sibling) {
  		      if (shouldFilterFiber(child)) {
  		        untrackFiber(nearestInstance, child);
  		      }
  		    }
  		  }

  		  function getChangeDescription(prevFiber, nextFiber) {
  		    switch (nextFiber.tag) {
  		      case ClassComponent:
  		        if (prevFiber === null) {
  		          return {
  		            context: null,
  		            didHooksChange: false,
  		            isFirstMount: true,
  		            props: null,
  		            state: null
  		          };
  		        } else {
  		          const data = {
  		            context: getContextChanged(prevFiber, nextFiber),
  		            didHooksChange: false,
  		            isFirstMount: false,
  		            props: getChangedKeys(prevFiber.memoizedProps, nextFiber.memoizedProps),
  		            state: getChangedKeys(prevFiber.memoizedState, nextFiber.memoizedState)
  		          };
  		          return data;
  		        }

  		      case IncompleteFunctionComponent:
  		      case FunctionComponent:
  		      case IndeterminateComponent:
  		      case ForwardRef:
  		      case MemoComponent:
  		      case SimpleMemoComponent:
  		        if (prevFiber === null) {
  		          return {
  		            context: null,
  		            didHooksChange: false,
  		            isFirstMount: true,
  		            props: null,
  		            state: null
  		          };
  		        } else {
  		          const indices = getChangedHooksIndices(prevFiber.memoizedState, nextFiber.memoizedState);
  		          const data = {
  		            context: getContextChanged(prevFiber, nextFiber),
  		            didHooksChange: indices !== null && indices.length > 0,
  		            isFirstMount: false,
  		            props: getChangedKeys(prevFiber.memoizedProps, nextFiber.memoizedProps),
  		            state: null,
  		            hooks: indices
  		          }; // Only traverse the hooks list once, depending on what info we're returning.

  		          return data;
  		        }

  		      default:
  		        return null;
  		    }
  		  }

  		  function getContextChanged(prevFiber, nextFiber) {
  		    let prevContext = prevFiber.dependencies && prevFiber.dependencies.firstContext;
  		    let nextContext = nextFiber.dependencies && nextFiber.dependencies.firstContext;

  		    while (prevContext && nextContext) {
  		      // Note this only works for versions of React that support this key (e.v. 18+)
  		      // For older versions, there's no good way to read the current context value after render has completed.
  		      // This is because React maintains a stack of context values during render,
  		      // but by the time DevTools is called, render has finished and the stack is empty.
  		      if (prevContext.context !== nextContext.context) {
  		        // If the order of context has changed, then the later context values might have
  		        // changed too but the main reason it rerendered was earlier. Either an earlier
  		        // context changed value but then we would have exited already. If we end up here
  		        // it's because a state or props change caused the order of contexts used to change.
  		        // So the main cause is not the contexts themselves.
  		        return false;
  		      }

  		      if (!shared_objectIs(prevContext.memoizedValue, nextContext.memoizedValue)) {
  		        return true;
  		      }

  		      prevContext = prevContext.next;
  		      nextContext = nextContext.next;
  		    }

  		    return false;
  		  }

  		  function isHookThatCanScheduleUpdate(hookObject) {
  		    const queue = hookObject.queue;

  		    if (!queue) {
  		      return false;
  		    }

  		    const boundHasOwnProperty = shared_hasOwnProperty.bind(queue); // Detect the shape of useState() / useReducer() / useTransition()
  		    // using the attributes that are unique to these hooks
  		    // but also stable (e.g. not tied to current Lanes implementation)
  		    // We don't check for dispatch property, because useTransition doesn't have it

  		    if (boundHasOwnProperty('pending')) {
  		      return true;
  		    } // Detect useSyncExternalStore()


  		    return boundHasOwnProperty('value') && boundHasOwnProperty('getSnapshot') && typeof queue.getSnapshot === 'function';
  		  }

  		  function didStatefulHookChange(prev, next) {
  		    const prevMemoizedState = prev.memoizedState;
  		    const nextMemoizedState = next.memoizedState;

  		    if (isHookThatCanScheduleUpdate(prev)) {
  		      return prevMemoizedState !== nextMemoizedState;
  		    }

  		    return false;
  		  }

  		  function getChangedHooksIndices(prev, next) {
  		    if (prev == null || next == null) {
  		      return null;
  		    }

  		    const indices = [];
  		    let index = 0;

  		    while (next !== null) {
  		      if (didStatefulHookChange(prev, next)) {
  		        indices.push(index);
  		      }

  		      next = next.next;
  		      prev = prev.next;
  		      index++;
  		    }

  		    return indices;
  		  }

  		  function getChangedKeys(prev, next) {
  		    if (prev == null || next == null) {
  		      return null;
  		    }

  		    const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  		    const changedKeys = []; // eslint-disable-next-line no-for-of-loops/no-for-of-loops

  		    for (const key of keys) {
  		      if (prev[key] !== next[key]) {
  		        changedKeys.push(key);
  		      }
  		    }

  		    return changedKeys;
  		  }

  		  function didFiberRender(prevFiber, nextFiber) {
  		    switch (nextFiber.tag) {
  		      case ClassComponent:
  		      case FunctionComponent:
  		      case ContextConsumer:
  		      case MemoComponent:
  		      case SimpleMemoComponent:
  		      case ForwardRef:
  		        // For types that execute user code, we check PerformedWork effect.
  		        // We don't reflect bailouts (either referential or sCU) in DevTools.
  		        // TODO: This flag is a leaked implementation detail. Once we start
  		        // releasing DevTools in lockstep with React, we should import a
  		        // function from the reconciler instead.
  		        const PerformedWork = 0b000000000000000000000000001;
  		        return (getFiberFlags(nextFiber) & PerformedWork) === PerformedWork;
  		      // Note: ContextConsumer only gets PerformedWork effect in 16.3.3+
  		      // so it won't get highlighted with React 16.3.0 to 16.3.2.

  		      default:
  		        // For host components and other types, we compare inputs
  		        // to determine whether something is an update.
  		        return prevFiber.memoizedProps !== nextFiber.memoizedProps || prevFiber.memoizedState !== nextFiber.memoizedState || prevFiber.ref !== nextFiber.ref;
  		    }
  		  }

  		  const pendingOperations = [];
  		  const pendingRealUnmountedIDs = [];
  		  let pendingOperationsQueue = [];
  		  const pendingStringTable = new Map();
  		  let pendingStringTableLength = 0;
  		  let pendingUnmountedRootID = null;

  		  function pushOperation(op) {

  		    pendingOperations.push(op);
  		  }

  		  function shouldBailoutWithPendingOperations() {
  		    if (isProfiling) {
  		      if (currentCommitProfilingMetadata != null && currentCommitProfilingMetadata.durations.length > 0) {
  		        return false;
  		      }
  		    }

  		    return pendingOperations.length === 0 && pendingRealUnmountedIDs.length === 0 && pendingUnmountedRootID === null;
  		  }

  		  function flushOrQueueOperations(operations) {
  		    if (shouldBailoutWithPendingOperations()) {
  		      return;
  		    }

  		    if (pendingOperationsQueue !== null) {
  		      pendingOperationsQueue.push(operations);
  		    } else {
  		      hook.emit('operations', operations);
  		    }
  		  }

  		  function recordConsoleLogs(instance, componentLogsEntry) {
  		    if (componentLogsEntry === undefined) {
  		      if (instance.logCount === 0) {
  		        // Nothing has changed.
  		        return false;
  		      } // Reset to zero.


  		      instance.logCount = 0;
  		      pushOperation(TREE_OPERATION_UPDATE_ERRORS_OR_WARNINGS);
  		      pushOperation(instance.id);
  		      pushOperation(0);
  		      pushOperation(0);
  		      return true;
  		    } else {
  		      const totalCount = componentLogsEntry.errorsCount + componentLogsEntry.warningsCount;

  		      if (instance.logCount === totalCount) {
  		        // Nothing has changed.
  		        return false;
  		      } // Update counts.


  		      instance.logCount = totalCount;
  		      pushOperation(TREE_OPERATION_UPDATE_ERRORS_OR_WARNINGS);
  		      pushOperation(instance.id);
  		      pushOperation(componentLogsEntry.errorsCount);
  		      pushOperation(componentLogsEntry.warningsCount);
  		      return true;
  		    }
  		  }

  		  function flushPendingEvents(root) {
  		    if (shouldBailoutWithPendingOperations()) {
  		      // If we aren't profiling, we can just bail out here.
  		      // No use sending an empty update over the bridge.
  		      //
  		      // The Profiler stores metadata for each commit and reconstructs the app tree per commit using:
  		      // (1) an initial tree snapshot and
  		      // (2) the operations array for each commit
  		      // Because of this, it's important that the operations and metadata arrays align,
  		      // So it's important not to omit even empty operations while profiling is active.
  		      return;
  		    }

  		    const numUnmountIDs = pendingRealUnmountedIDs.length + (pendingUnmountedRootID === null ? 0 : 1);
  		    const operations = new Array( // Identify which renderer this update is coming from.
  		    2 + // [rendererID, rootFiberID]
  		    // How big is the string table?
  		    1 + // [stringTableLength]
  		    // Then goes the actual string table.
  		    pendingStringTableLength + ( // All unmounts are batched in a single message.
  		    // [TREE_OPERATION_REMOVE, removedIDLength, ...ids]
  		    numUnmountIDs > 0 ? 2 + numUnmountIDs : 0) + // Regular operations
  		    pendingOperations.length); // Identify which renderer this update is coming from.
  		    // This enables roots to be mapped to renderers,
  		    // Which in turn enables fiber props, states, and hooks to be inspected.

  		    let i = 0;
  		    operations[i++] = rendererID;

  		    if (currentRoot === null) {
  		      // TODO: This is not always safe so this field is probably not needed.
  		      operations[i++] = -1;
  		    } else {
  		      operations[i++] = currentRoot.id;
  		    } // Now fill in the string table.
  		    // [stringTableLength, str1Length, ...str1, str2Length, ...str2, ...]


  		    operations[i++] = pendingStringTableLength;
  		    pendingStringTable.forEach((entry, stringKey) => {
  		      const encodedString = entry.encodedString; // Don't use the string length.
  		      // It won't work for multibyte characters (like emoji).

  		      const length = encodedString.length;
  		      operations[i++] = length;

  		      for (let j = 0; j < length; j++) {
  		        operations[i + j] = encodedString[j];
  		      }

  		      i += length;
  		    });

  		    if (numUnmountIDs > 0) {
  		      // All unmounts except roots are batched in a single message.
  		      operations[i++] = TREE_OPERATION_REMOVE; // The first number is how many unmounted IDs we're gonna send.

  		      operations[i++] = numUnmountIDs; // Fill in the real unmounts in the reverse order.
  		      // They were inserted parents-first by React, but we want children-first.
  		      // So we traverse our array backwards.

  		      for (let j = 0; j < pendingRealUnmountedIDs.length; j++) {
  		        operations[i++] = pendingRealUnmountedIDs[j];
  		      } // The root ID should always be unmounted last.


  		      if (pendingUnmountedRootID !== null) {
  		        operations[i] = pendingUnmountedRootID;
  		        i++;
  		      }
  		    } // Fill in the rest of the operations.


  		    for (let j = 0; j < pendingOperations.length; j++) {
  		      operations[i + j] = pendingOperations[j];
  		    }

  		    i += pendingOperations.length; // Let the frontend know about tree operations.

  		    flushOrQueueOperations(operations); // Reset all of the pending state now that we've told the frontend about it.

  		    pendingOperations.length = 0;
  		    pendingRealUnmountedIDs.length = 0;
  		    pendingUnmountedRootID = null;
  		    pendingStringTable.clear();
  		    pendingStringTableLength = 0;
  		  }

  		  function getStringID(string) {
  		    if (string === null) {
  		      return 0;
  		    }

  		    const existingEntry = pendingStringTable.get(string);

  		    if (existingEntry !== undefined) {
  		      return existingEntry.id;
  		    }

  		    const id = pendingStringTable.size + 1;
  		    const encodedString = utfEncodeString(string);
  		    pendingStringTable.set(string, {
  		      encodedString,
  		      id
  		    }); // The string table total length needs to account both for the string length,
  		    // and for the array item that contains the length itself.
  		    //
  		    // Don't use string length for this table.
  		    // It won't work for multibyte characters (like emoji).

  		    pendingStringTableLength += encodedString.length + 1;
  		    return id;
  		  }

  		  function recordMount(fiber, parentInstance) {
  		    const isRoot = fiber.tag === HostRoot;
  		    let fiberInstance;

  		    if (isRoot) {
  		      const entry = rootToFiberInstanceMap.get(fiber.stateNode);

  		      if (entry === undefined) {
  		        throw new Error('The root should have been registered at this point');
  		      }

  		      fiberInstance = entry;
  		    } else {
  		      fiberInstance = createFiberInstance(fiber);
  		    }

  		    idToDevToolsInstanceMap.set(fiberInstance.id, fiberInstance);
  		    const id = fiberInstance.id;

  		    const isProfilingSupported = fiber.hasOwnProperty('treeBaseDuration');

  		    if (isRoot) {
  		      const hasOwnerMetadata = fiber.hasOwnProperty('_debugOwner'); // Adding a new field here would require a bridge protocol version bump (a backwads breaking change).
  		      // Instead let's re-purpose a pre-existing field to carry more information.

  		      let profilingFlags = 0;

  		      if (isProfilingSupported) {
  		        profilingFlags = PROFILING_FLAG_BASIC_SUPPORT;

  		        if (typeof injectProfilingHooks === 'function') {
  		          profilingFlags |= PROFILING_FLAG_TIMELINE_SUPPORT;
  		        }
  		      } // Set supportsStrictMode to false for production renderer builds


  		      const isProductionBuildOfRenderer = renderer.bundleType === 0;
  		      pushOperation(TREE_OPERATION_ADD);
  		      pushOperation(id);
  		      pushOperation(ElementTypeRoot);
  		      pushOperation((fiber.mode & StrictModeBits) !== 0 ? 1 : 0);
  		      pushOperation(profilingFlags);
  		      pushOperation(!isProductionBuildOfRenderer && StrictModeBits !== 0 ? 1 : 0);
  		      pushOperation(hasOwnerMetadata ? 1 : 0);

  		      if (isProfiling) {
  		        if (displayNamesByRootID !== null) {
  		          displayNamesByRootID.set(id, getDisplayNameForRoot(fiber));
  		        }
  		      }
  		    } else {
  		      const {
  		        key
  		      } = fiber;
  		      const displayName = getDisplayNameForFiber(fiber);
  		      const elementType = getElementTypeForFiber(fiber); // Finding the owner instance might require traversing the whole parent path which
  		      // doesn't have great big O notation. Ideally we'd lazily fetch the owner when we
  		      // need it but we have some synchronous operations in the front end like Alt+Left
  		      // which selects the owner immediately. Typically most owners are only a few parents
  		      // away so maybe it's not so bad.

  		      const debugOwner = getUnfilteredOwner(fiber);
  		      const ownerInstance = findNearestOwnerInstance(parentInstance, debugOwner);

  		      if (ownerInstance !== null && debugOwner === fiber._debugOwner && fiber._debugStack != null && ownerInstance.source === null) {
  		        // The new Fiber is directly owned by the ownerInstance. Therefore somewhere on
  		        // the debugStack will be a stack frame inside the ownerInstance's source.
  		        ownerInstance.source = fiber._debugStack;
  		      }

  		      const ownerID = ownerInstance === null ? 0 : ownerInstance.id;
  		      const parentID = parentInstance ? parentInstance.kind === FILTERED_FIBER_INSTANCE ? // A Filtered Fiber Instance will always have a Virtual Instance as a parent.
  		      parentInstance.parent.id : parentInstance.id : 0;
  		      const displayNameStringID = getStringID(displayName); // This check is a guard to handle a React element that has been modified
  		      // in such a way as to bypass the default stringification of the "key" property.

  		      const keyString = key === null ? null : String(key);
  		      const keyStringID = getStringID(keyString);
  		      pushOperation(TREE_OPERATION_ADD);
  		      pushOperation(id);
  		      pushOperation(elementType);
  		      pushOperation(parentID);
  		      pushOperation(ownerID);
  		      pushOperation(displayNameStringID);
  		      pushOperation(keyStringID); // If this subtree has a new mode, let the frontend know.

  		      if ((fiber.mode & StrictModeBits) !== 0) {
  		        let parentFiber = null;
  		        let parentFiberInstance = parentInstance;

  		        while (parentFiberInstance !== null) {
  		          if (parentFiberInstance.kind === FIBER_INSTANCE) {
  		            parentFiber = parentFiberInstance.data;
  		            break;
  		          }

  		          parentFiberInstance = parentFiberInstance.parent;
  		        }

  		        if (parentFiber === null || (parentFiber.mode & StrictModeBits) === 0) {
  		          pushOperation(TREE_OPERATION_SET_SUBTREE_MODE);
  		          pushOperation(id);
  		          pushOperation(StrictMode);
  		        }
  		      }
  		    }

  		    let componentLogsEntry = fiberToComponentLogsMap.get(fiber);

  		    if (componentLogsEntry === undefined && fiber.alternate !== null) {
  		      componentLogsEntry = fiberToComponentLogsMap.get(fiber.alternate);
  		    }

  		    recordConsoleLogs(fiberInstance, componentLogsEntry);

  		    if (isProfilingSupported) {
  		      recordProfilingDurations(fiberInstance, null);
  		    }

  		    return fiberInstance;
  		  }

  		  function recordVirtualMount(instance, parentInstance, secondaryEnv) {
  		    const id = instance.id;
  		    idToDevToolsInstanceMap.set(id, instance);
  		    const componentInfo = instance.data;
  		    const key = typeof componentInfo.key === 'string' ? componentInfo.key : null;
  		    const env = componentInfo.env;
  		    let displayName = componentInfo.name || '';

  		    if (typeof env === 'string') {
  		      // We model environment as an HoC name for now.
  		      if (secondaryEnv !== null) {
  		        displayName = secondaryEnv + '(' + displayName + ')';
  		      }

  		      displayName = env + '(' + displayName + ')';
  		    }

  		    const elementType = types_ElementTypeVirtual; // Finding the owner instance might require traversing the whole parent path which
  		    // doesn't have great big O notation. Ideally we'd lazily fetch the owner when we
  		    // need it but we have some synchronous operations in the front end like Alt+Left
  		    // which selects the owner immediately. Typically most owners are only a few parents
  		    // away so maybe it's not so bad.

  		    const debugOwner = getUnfilteredOwner(componentInfo);
  		    const ownerInstance = findNearestOwnerInstance(parentInstance, debugOwner);

  		    if (ownerInstance !== null && debugOwner === componentInfo.owner && componentInfo.debugStack != null && ownerInstance.source === null) {
  		      // The new Fiber is directly owned by the ownerInstance. Therefore somewhere on
  		      // the debugStack will be a stack frame inside the ownerInstance's source.
  		      ownerInstance.source = componentInfo.debugStack;
  		    }

  		    const ownerID = ownerInstance === null ? 0 : ownerInstance.id;
  		    const parentID = parentInstance ? parentInstance.kind === FILTERED_FIBER_INSTANCE ? // A Filtered Fiber Instance will always have a Virtual Instance as a parent.
  		    parentInstance.parent.id : parentInstance.id : 0;
  		    const displayNameStringID = getStringID(displayName); // This check is a guard to handle a React element that has been modified
  		    // in such a way as to bypass the default stringification of the "key" property.

  		    const keyString = key === null ? null : String(key);
  		    const keyStringID = getStringID(keyString);
  		    pushOperation(TREE_OPERATION_ADD);
  		    pushOperation(id);
  		    pushOperation(elementType);
  		    pushOperation(parentID);
  		    pushOperation(ownerID);
  		    pushOperation(displayNameStringID);
  		    pushOperation(keyStringID);
  		    const componentLogsEntry = componentInfoToComponentLogsMap.get(componentInfo);
  		    recordConsoleLogs(instance, componentLogsEntry);
  		  }

  		  function recordUnmount(fiberInstance) {
  		    const fiber = fiberInstance.data;

  		    if (trackedPathMatchInstance === fiberInstance) {
  		      // We're in the process of trying to restore previous selection.
  		      // If this fiber matched but is being unmounted, there's no use trying.
  		      // Reset the state so we don't keep holding onto it.
  		      setTrackedPath(null);
  		    }

  		    const id = fiberInstance.id;
  		    const isRoot = fiber.tag === HostRoot;

  		    if (isRoot) {
  		      // Roots must be removed only after all children have been removed.
  		      // So we track it separately.
  		      pendingUnmountedRootID = id;
  		    } else {
  		      // To maintain child-first ordering,
  		      // we'll push it into one of these queues,
  		      // and later arrange them in the correct order.
  		      pendingRealUnmountedIDs.push(id);
  		    }

  		    idToDevToolsInstanceMap.delete(fiberInstance.id);
  		    untrackFiber(fiberInstance, fiber);
  		  } // Running state of the remaining children from the previous version of this parent that
  		  // we haven't yet added back. This should be reset anytime we change parent.
  		  // Any remaining ones at the end will be deleted.


  		  let remainingReconcilingChildren = null; // The previously placed child.

  		  let previouslyReconciledSibling = null; // To save on stack allocation and ensure that they are updated as a pair, we also store
  		  // the current parent here as well.

  		  let reconcilingParent = null;

  		  function insertChild(instance) {
  		    const parentInstance = reconcilingParent;

  		    if (parentInstance === null) {
  		      // This instance is at the root.
  		      return;
  		    } // Place it in the parent.


  		    instance.parent = parentInstance;

  		    if (previouslyReconciledSibling === null) {
  		      previouslyReconciledSibling = instance;
  		      parentInstance.firstChild = instance;
  		    } else {
  		      previouslyReconciledSibling.nextSibling = instance;
  		      previouslyReconciledSibling = instance;
  		    }

  		    instance.nextSibling = null;
  		  }

  		  function moveChild(instance, previousSibling) {
  		    removeChild(instance, previousSibling);
  		    insertChild(instance);
  		  }

  		  function removeChild(instance, previousSibling) {
  		    if (instance.parent === null) {
  		      if (remainingReconcilingChildren === instance) {
  		        throw new Error('Remaining children should not have items with no parent');
  		      } else if (instance.nextSibling !== null) {
  		        throw new Error('A deleted instance should not have next siblings');
  		      } // Already deleted.


  		      return;
  		    }

  		    const parentInstance = reconcilingParent;

  		    if (parentInstance === null) {
  		      throw new Error('Should not have a parent if we are at the root');
  		    }

  		    if (instance.parent !== parentInstance) {
  		      throw new Error('Cannot remove a node from a different parent than is being reconciled.');
  		    } // Remove an existing child from its current position, which we assume is in the
  		    // remainingReconcilingChildren set.


  		    if (previousSibling === null) {
  		      // We're first in the remaining set. Remove us.
  		      if (remainingReconcilingChildren !== instance) {
  		        throw new Error('Expected a placed child to be moved from the remaining set.');
  		      }

  		      remainingReconcilingChildren = instance.nextSibling;
  		    } else {
  		      previousSibling.nextSibling = instance.nextSibling;
  		    }

  		    instance.nextSibling = null;
  		    instance.parent = null;
  		  }

  		  function unmountRemainingChildren() {
  		    let child = remainingReconcilingChildren;

  		    while (child !== null) {
  		      unmountInstanceRecursively(child);
  		      child = remainingReconcilingChildren;
  		    }
  		  }

  		  function mountVirtualInstanceRecursively(virtualInstance, firstChild, lastChild, // non-inclusive
  		  traceNearestHostComponentUpdate, virtualLevel // the nth level of virtual instances
  		  ) {
  		    // If we have the tree selection from previous reload, try to match this Instance.
  		    // Also remember whether to do the same for siblings.
  		    const mightSiblingsBeOnTrackedPath = updateVirtualTrackedPathStateBeforeMount(virtualInstance, reconcilingParent);
  		    const stashedParent = reconcilingParent;
  		    const stashedPrevious = previouslyReconciledSibling;
  		    const stashedRemaining = remainingReconcilingChildren; // Push a new DevTools instance parent while reconciling this subtree.

  		    reconcilingParent = virtualInstance;
  		    previouslyReconciledSibling = null;
  		    remainingReconcilingChildren = null;

  		    try {
  		      mountVirtualChildrenRecursively(firstChild, lastChild, traceNearestHostComponentUpdate, virtualLevel + 1); // Must be called after all children have been appended.

  		      recordVirtualProfilingDurations(virtualInstance);
  		    } finally {
  		      reconcilingParent = stashedParent;
  		      previouslyReconciledSibling = stashedPrevious;
  		      remainingReconcilingChildren = stashedRemaining;
  		      updateTrackedPathStateAfterMount(mightSiblingsBeOnTrackedPath);
  		    }
  		  }

  		  function recordVirtualUnmount(instance) {
  		    if (trackedPathMatchInstance === instance) {
  		      // We're in the process of trying to restore previous selection.
  		      // If this fiber matched but is being unmounted, there's no use trying.
  		      // Reset the state so we don't keep holding onto it.
  		      setTrackedPath(null);
  		    }

  		    const id = instance.id;
  		    pendingRealUnmountedIDs.push(id);
  		  }

  		  function getSecondaryEnvironmentName(debugInfo, index) {
  		    if (debugInfo != null) {
  		      const componentInfo = debugInfo[index];

  		      for (let i = index + 1; i < debugInfo.length; i++) {
  		        const debugEntry = debugInfo[i];

  		        if (typeof debugEntry.env === 'string') {
  		          // If the next environment is different then this component was the boundary
  		          // and it changed before entering the next component. So we assign this
  		          // component a secondary environment.
  		          return componentInfo.env !== debugEntry.env ? debugEntry.env : null;
  		        }
  		      }
  		    }

  		    return null;
  		  }

  		  function mountVirtualChildrenRecursively(firstChild, lastChild, // non-inclusive
  		  traceNearestHostComponentUpdate, virtualLevel // the nth level of virtual instances
  		  ) {
  		    // Iterate over siblings rather than recursing.
  		    // This reduces the chance of stack overflow for wide trees (e.g. lists with many items).
  		    let fiber = firstChild;
  		    let previousVirtualInstance = null;
  		    let previousVirtualInstanceFirstFiber = firstChild;

  		    while (fiber !== null && fiber !== lastChild) {
  		      let level = 0;

  		      if (fiber._debugInfo) {
  		        for (let i = 0; i < fiber._debugInfo.length; i++) {
  		          const debugEntry = fiber._debugInfo[i];

  		          if (typeof debugEntry.name !== 'string') {
  		            // Not a Component. Some other Debug Info.
  		            continue;
  		          } // Scan up until the next Component to see if this component changed environment.


  		          const componentInfo = debugEntry;
  		          const secondaryEnv = getSecondaryEnvironmentName(fiber._debugInfo, i);

  		          if (componentInfo.env != null) {
  		            knownEnvironmentNames.add(componentInfo.env);
  		          }

  		          if (secondaryEnv !== null) {
  		            knownEnvironmentNames.add(secondaryEnv);
  		          }

  		          if (shouldFilterVirtual(componentInfo, secondaryEnv)) {
  		            // Skip.
  		            continue;
  		          }

  		          if (level === virtualLevel) {
  		            if (previousVirtualInstance === null || // Consecutive children with the same debug entry as a parent gets
  		            // treated as if they share the same virtual instance.
  		            previousVirtualInstance.data !== debugEntry) {
  		              if (previousVirtualInstance !== null) {
  		                // Mount any previous children that should go into the previous parent.
  		                mountVirtualInstanceRecursively(previousVirtualInstance, previousVirtualInstanceFirstFiber, fiber, traceNearestHostComponentUpdate, virtualLevel);
  		              }

  		              previousVirtualInstance = createVirtualInstance(componentInfo);
  		              recordVirtualMount(previousVirtualInstance, reconcilingParent, secondaryEnv);
  		              insertChild(previousVirtualInstance);
  		              previousVirtualInstanceFirstFiber = fiber;
  		            }

  		            level++;
  		            break;
  		          } else {
  		            level++;
  		          }
  		        }
  		      }

  		      if (level === virtualLevel) {
  		        if (previousVirtualInstance !== null) {
  		          // If we were working on a virtual instance and this is not a virtual
  		          // instance, then we end the sequence and mount any previous children
  		          // that should go into the previous virtual instance.
  		          mountVirtualInstanceRecursively(previousVirtualInstance, previousVirtualInstanceFirstFiber, fiber, traceNearestHostComponentUpdate, virtualLevel);
  		          previousVirtualInstance = null;
  		        } // We've reached the end of the virtual levels, but not beyond,
  		        // and now continue with the regular fiber.


  		        mountFiberRecursively(fiber, traceNearestHostComponentUpdate);
  		      }

  		      fiber = fiber.sibling;
  		    }

  		    if (previousVirtualInstance !== null) {
  		      // Mount any previous children that should go into the previous parent.
  		      mountVirtualInstanceRecursively(previousVirtualInstance, previousVirtualInstanceFirstFiber, null, traceNearestHostComponentUpdate, virtualLevel);
  		    }
  		  }

  		  function mountChildrenRecursively(firstChild, traceNearestHostComponentUpdate) {
  		    mountVirtualChildrenRecursively(firstChild, null, traceNearestHostComponentUpdate, 0 // first level
  		    );
  		  }

  		  function mountFiberRecursively(fiber, traceNearestHostComponentUpdate) {
  		    const shouldIncludeInTree = !shouldFilterFiber(fiber);
  		    let newInstance = null;

  		    if (shouldIncludeInTree) {
  		      newInstance = recordMount(fiber, reconcilingParent);
  		      insertChild(newInstance);
  		    } else if (reconcilingParent !== null && reconcilingParent.kind === VIRTUAL_INSTANCE) {
  		      // If the parent is a Virtual Instance and we filtered this Fiber we include a
  		      // hidden node.
  		      if (reconcilingParent.data === fiber._debugOwner && fiber._debugStack != null && reconcilingParent.source === null) {
  		        // The new Fiber is directly owned by the parent. Therefore somewhere on the
  		        // debugStack will be a stack frame inside parent that we can use as its soruce.
  		        reconcilingParent.source = fiber._debugStack;
  		      }

  		      newInstance = createFilteredFiberInstance(fiber);
  		      insertChild(newInstance);
  		    } // If we have the tree selection from previous reload, try to match this Fiber.
  		    // Also remember whether to do the same for siblings.


  		    const mightSiblingsBeOnTrackedPath = updateTrackedPathStateBeforeMount(fiber, newInstance);
  		    const stashedParent = reconcilingParent;
  		    const stashedPrevious = previouslyReconciledSibling;
  		    const stashedRemaining = remainingReconcilingChildren;

  		    if (newInstance !== null) {
  		      // Push a new DevTools instance parent while reconciling this subtree.
  		      reconcilingParent = newInstance;
  		      previouslyReconciledSibling = null;
  		      remainingReconcilingChildren = null;
  		    }

  		    try {
  		      if (traceUpdatesEnabled) {
  		        if (traceNearestHostComponentUpdate) {
  		          const elementType = getElementTypeForFiber(fiber); // If an ancestor updated, we should mark the nearest host nodes for highlighting.

  		          if (elementType === ElementTypeHostComponent) {
  		            traceUpdatesForNodes.add(fiber.stateNode);
  		            traceNearestHostComponentUpdate = false;
  		          }
  		        } // We intentionally do not re-enable the traceNearestHostComponentUpdate flag in this branch,
  		        // because we don't want to highlight every host node inside of a newly mounted subtree.

  		      }

  		      if (fiber.tag === HostHoistable) {
  		        const nearestInstance = reconcilingParent;

  		        if (nearestInstance === null) {
  		          throw new Error('Did not expect a host hoistable to be the root');
  		        }

  		        aquireHostResource(nearestInstance, fiber.memoizedState);
  		      } else if (fiber.tag === HostComponent || fiber.tag === HostText || fiber.tag === HostSingleton) {
  		        const nearestInstance = reconcilingParent;

  		        if (nearestInstance === null) {
  		          throw new Error('Did not expect a host hoistable to be the root');
  		        }

  		        aquireHostInstance(nearestInstance, fiber.stateNode);
  		      }

  		      if (fiber.tag === SuspenseComponent) {
  		        const isTimedOut = fiber.memoizedState !== null;

  		        if (isTimedOut) {
  		          // Special case: if Suspense mounts in a timed-out state,
  		          // get the fallback child from the inner fragment and mount
  		          // it as if it was our own child. Updates handle this too.
  		          const primaryChildFragment = fiber.child;
  		          const fallbackChildFragment = primaryChildFragment ? primaryChildFragment.sibling : null;

  		          if (fallbackChildFragment) {
  		            const fallbackChild = fallbackChildFragment.child;

  		            if (fallbackChild !== null) {
  		              updateTrackedPathStateBeforeMount(fallbackChildFragment, null);
  		              mountChildrenRecursively(fallbackChild, traceNearestHostComponentUpdate);
  		            }
  		          }
  		        } else {
  		          let primaryChild = null;
  		          const areSuspenseChildrenConditionallyWrapped = OffscreenComponent === -1;

  		          if (areSuspenseChildrenConditionallyWrapped) {
  		            primaryChild = fiber.child;
  		          } else if (fiber.child !== null) {
  		            primaryChild = fiber.child.child;
  		            updateTrackedPathStateBeforeMount(fiber.child, null);
  		          }

  		          if (primaryChild !== null) {
  		            mountChildrenRecursively(primaryChild, traceNearestHostComponentUpdate);
  		          }
  		        }
  		      } else {
  		        if (fiber.child !== null) {
  		          mountChildrenRecursively(fiber.child, traceNearestHostComponentUpdate);
  		        }
  		      }
  		    } finally {
  		      if (newInstance !== null) {
  		        reconcilingParent = stashedParent;
  		        previouslyReconciledSibling = stashedPrevious;
  		        remainingReconcilingChildren = stashedRemaining;
  		      }
  		    } // We're exiting this Fiber now, and entering its siblings.
  		    // If we have selection to restore, we might need to re-activate tracking.


  		    updateTrackedPathStateAfterMount(mightSiblingsBeOnTrackedPath);
  		  } // We use this to simulate unmounting for Suspense trees
  		  // when we switch from primary to fallback, or deleting a subtree.


  		  function unmountInstanceRecursively(instance) {

  		    const stashedParent = reconcilingParent;
  		    const stashedPrevious = previouslyReconciledSibling;
  		    const stashedRemaining = remainingReconcilingChildren; // Push a new DevTools instance parent while reconciling this subtree.

  		    reconcilingParent = instance;
  		    previouslyReconciledSibling = null; // Move all the children of this instance to the remaining set.

  		    remainingReconcilingChildren = instance.firstChild;
  		    instance.firstChild = null;

  		    try {
  		      // Unmount the remaining set.
  		      unmountRemainingChildren();
  		    } finally {
  		      reconcilingParent = stashedParent;
  		      previouslyReconciledSibling = stashedPrevious;
  		      remainingReconcilingChildren = stashedRemaining;
  		    }

  		    if (instance.kind === FIBER_INSTANCE) {
  		      recordUnmount(instance);
  		    } else if (instance.kind === VIRTUAL_INSTANCE) {
  		      recordVirtualUnmount(instance);
  		    } else {
  		      untrackFiber(instance, instance.data);
  		    }

  		    removeChild(instance, null);
  		  }

  		  function recordProfilingDurations(fiberInstance, prevFiber) {
  		    const id = fiberInstance.id;
  		    const fiber = fiberInstance.data;
  		    const {
  		      actualDuration,
  		      treeBaseDuration
  		    } = fiber;
  		    fiberInstance.treeBaseDuration = treeBaseDuration || 0;

  		    if (isProfiling) {
  		      // It's important to update treeBaseDuration even if the current Fiber did not render,
  		      // because it's possible that one of its descendants did.
  		      if (prevFiber == null || treeBaseDuration !== prevFiber.treeBaseDuration) {
  		        // Tree base duration updates are included in the operations typed array.
  		        // So we have to convert them from milliseconds to microseconds so we can send them as ints.
  		        const convertedTreeBaseDuration = Math.floor((treeBaseDuration || 0) * 1000);
  		        pushOperation(TREE_OPERATION_UPDATE_TREE_BASE_DURATION);
  		        pushOperation(id);
  		        pushOperation(convertedTreeBaseDuration);
  		      }

  		      if (prevFiber == null || didFiberRender(prevFiber, fiber)) {
  		        if (actualDuration != null) {
  		          // The actual duration reported by React includes time spent working on children.
  		          // This is useful information, but it's also useful to be able to exclude child durations.
  		          // The frontend can't compute this, since the immediate children may have been filtered out.
  		          // So we need to do this on the backend.
  		          // Note that this calculated self duration is not the same thing as the base duration.
  		          // The two are calculated differently (tree duration does not accumulate).
  		          let selfDuration = actualDuration;
  		          let child = fiber.child;

  		          while (child !== null) {
  		            selfDuration -= child.actualDuration || 0;
  		            child = child.sibling;
  		          } // If profiling is active, store durations for elements that were rendered during the commit.
  		          // Note that we should do this for any fiber we performed work on, regardless of its actualDuration value.
  		          // In some cases actualDuration might be 0 for fibers we worked on (particularly if we're using Date.now)
  		          // In other cases (e.g. Memo) actualDuration might be greater than 0 even if we "bailed out".


  		          const metadata = currentCommitProfilingMetadata;
  		          metadata.durations.push(id, actualDuration, selfDuration);
  		          metadata.maxActualDuration = Math.max(metadata.maxActualDuration, actualDuration);

  		          if (recordChangeDescriptions) {
  		            const changeDescription = getChangeDescription(prevFiber, fiber);

  		            if (changeDescription !== null) {
  		              if (metadata.changeDescriptions !== null) {
  		                metadata.changeDescriptions.set(id, changeDescription);
  		              }
  		            }
  		          }
  		        }
  		      } // If this Fiber was in the set of memoizedUpdaters we need to record
  		      // it to be included in the description of the commit.


  		      const fiberRoot = currentRoot.data.stateNode;
  		      const updaters = fiberRoot.memoizedUpdaters;

  		      if (updaters != null && (updaters.has(fiber) || // We check the alternate here because we're matching identity and
  		      // prevFiber might be same as fiber.
  		      fiber.alternate !== null && updaters.has(fiber.alternate))) {
  		        const metadata = currentCommitProfilingMetadata;

  		        if (metadata.updaters === null) {
  		          metadata.updaters = [];
  		        }

  		        metadata.updaters.push(instanceToSerializedElement(fiberInstance));
  		      }
  		    }
  		  }

  		  function recordVirtualProfilingDurations(virtualInstance) {
  		    const id = virtualInstance.id;
  		    let treeBaseDuration = 0; // Add up the base duration of the child instances. The virtual base duration
  		    // will be the same as children's duration since we don't take up any render
  		    // time in the virtual instance.

  		    for (let child = virtualInstance.firstChild; child !== null; child = child.nextSibling) {
  		      treeBaseDuration += child.treeBaseDuration;
  		    }

  		    if (isProfiling) {
  		      const previousTreeBaseDuration = virtualInstance.treeBaseDuration;

  		      if (treeBaseDuration !== previousTreeBaseDuration) {
  		        // Tree base duration updates are included in the operations typed array.
  		        // So we have to convert them from milliseconds to microseconds so we can send them as ints.
  		        const convertedTreeBaseDuration = Math.floor((treeBaseDuration || 0) * 1000);
  		        pushOperation(TREE_OPERATION_UPDATE_TREE_BASE_DURATION);
  		        pushOperation(id);
  		        pushOperation(convertedTreeBaseDuration);
  		      }
  		    }

  		    virtualInstance.treeBaseDuration = treeBaseDuration;
  		  }

  		  function recordResetChildren(parentInstance) {
  		    // The first two don't really change, so we are only concerned with the order of children here.
  		    // This is trickier than a simple comparison though, since certain types of fibers are filtered.


  		    const nextChildren = [];
  		    let child = parentInstance.firstChild;

  		    while (child !== null) {
  		      if (child.kind === FILTERED_FIBER_INSTANCE) {
  		        for (let innerChild = parentInstance.firstChild; innerChild !== null; innerChild = innerChild.nextSibling) {
  		          nextChildren.push(innerChild.id);
  		        }
  		      } else {
  		        nextChildren.push(child.id);
  		      }

  		      child = child.nextSibling;
  		    }

  		    const numChildren = nextChildren.length;

  		    if (numChildren < 2) {
  		      // No need to reorder.
  		      return;
  		    }

  		    pushOperation(TREE_OPERATION_REORDER_CHILDREN);
  		    pushOperation(parentInstance.id);
  		    pushOperation(numChildren);

  		    for (let i = 0; i < nextChildren.length; i++) {
  		      pushOperation(nextChildren[i]);
  		    }
  		  }

  		  function updateVirtualInstanceRecursively(virtualInstance, nextFirstChild, nextLastChild, // non-inclusive
  		  prevFirstChild, traceNearestHostComponentUpdate, virtualLevel // the nth level of virtual instances
  		  ) {
  		    const stashedParent = reconcilingParent;
  		    const stashedPrevious = previouslyReconciledSibling;
  		    const stashedRemaining = remainingReconcilingChildren; // Push a new DevTools instance parent while reconciling this subtree.

  		    reconcilingParent = virtualInstance;
  		    previouslyReconciledSibling = null; // Move all the children of this instance to the remaining set.
  		    // We'll move them back one by one, and anything that remains is deleted.

  		    remainingReconcilingChildren = virtualInstance.firstChild;
  		    virtualInstance.firstChild = null;

  		    try {
  		      if (updateVirtualChildrenRecursively(nextFirstChild, nextLastChild, prevFirstChild, traceNearestHostComponentUpdate, virtualLevel + 1)) {
  		        recordResetChildren(virtualInstance);
  		      } // Update the errors/warnings count. If this Instance has switched to a different
  		      // ReactComponentInfo instance, such as when refreshing Server Components, then
  		      // we replace all the previous logs with the ones associated with the new ones rather
  		      // than merging. Because deduping is expected to happen at the request level.


  		      const componentLogsEntry = componentInfoToComponentLogsMap.get(virtualInstance.data);
  		      recordConsoleLogs(virtualInstance, componentLogsEntry); // Must be called after all children have been appended.

  		      recordVirtualProfilingDurations(virtualInstance);
  		    } finally {
  		      unmountRemainingChildren();
  		      reconcilingParent = stashedParent;
  		      previouslyReconciledSibling = stashedPrevious;
  		      remainingReconcilingChildren = stashedRemaining;
  		    }
  		  }

  		  function updateVirtualChildrenRecursively(nextFirstChild, nextLastChild, // non-inclusive
  		  prevFirstChild, traceNearestHostComponentUpdate, virtualLevel // the nth level of virtual instances
  		  ) {
  		    let shouldResetChildren = false; // If the first child is different, we need to traverse them.
  		    // Each next child will be either a new child (mount) or an alternate (update).

  		    let nextChild = nextFirstChild;
  		    let prevChildAtSameIndex = prevFirstChild;
  		    let previousVirtualInstance = null;
  		    let previousVirtualInstanceWasMount = false;
  		    let previousVirtualInstanceNextFirstFiber = nextFirstChild;
  		    let previousVirtualInstancePrevFirstFiber = prevFirstChild;

  		    while (nextChild !== null && nextChild !== nextLastChild) {
  		      let level = 0;

  		      if (nextChild._debugInfo) {
  		        for (let i = 0; i < nextChild._debugInfo.length; i++) {
  		          const debugEntry = nextChild._debugInfo[i];

  		          if (typeof debugEntry.name !== 'string') {
  		            // Not a Component. Some other Debug Info.
  		            continue;
  		          }

  		          const componentInfo = debugEntry;
  		          const secondaryEnv = getSecondaryEnvironmentName(nextChild._debugInfo, i);

  		          if (componentInfo.env != null) {
  		            knownEnvironmentNames.add(componentInfo.env);
  		          }

  		          if (secondaryEnv !== null) {
  		            knownEnvironmentNames.add(secondaryEnv);
  		          }

  		          if (shouldFilterVirtual(componentInfo, secondaryEnv)) {
  		            continue;
  		          }

  		          if (level === virtualLevel) {
  		            if (previousVirtualInstance === null || // Consecutive children with the same debug entry as a parent gets
  		            // treated as if they share the same virtual instance.
  		            previousVirtualInstance.data !== componentInfo) {
  		              if (previousVirtualInstance !== null) {
  		                // Mount any previous children that should go into the previous parent.
  		                if (previousVirtualInstanceWasMount) {
  		                  mountVirtualInstanceRecursively(previousVirtualInstance, previousVirtualInstanceNextFirstFiber, nextChild, traceNearestHostComponentUpdate, virtualLevel);
  		                } else {
  		                  updateVirtualInstanceRecursively(previousVirtualInstance, previousVirtualInstanceNextFirstFiber, nextChild, previousVirtualInstancePrevFirstFiber, traceNearestHostComponentUpdate, virtualLevel);
  		                }
  		              }

  		              let previousSiblingOfBestMatch = null;
  		              let bestMatch = remainingReconcilingChildren;

  		              if (componentInfo.key != null) {
  		                // If there is a key try to find a matching key in the set.
  		                bestMatch = remainingReconcilingChildren;

  		                while (bestMatch !== null) {
  		                  if (bestMatch.kind === VIRTUAL_INSTANCE && bestMatch.data.key === componentInfo.key) {
  		                    break;
  		                  }

  		                  previousSiblingOfBestMatch = bestMatch;
  		                  bestMatch = bestMatch.nextSibling;
  		                }
  		              }

  		              if (bestMatch !== null && bestMatch.kind === VIRTUAL_INSTANCE && bestMatch.data.name === componentInfo.name && bestMatch.data.env === componentInfo.env && bestMatch.data.key === componentInfo.key) {
  		                // If the previous children had a virtual instance in the same slot
  		                // with the same name, then we claim it and reuse it for this update.
  		                // Update it with the latest entry.
  		                bestMatch.data = componentInfo;
  		                moveChild(bestMatch, previousSiblingOfBestMatch);
  		                previousVirtualInstance = bestMatch;
  		                previousVirtualInstanceWasMount = false;
  		              } else {
  		                // Otherwise we create a new instance.
  		                const newVirtualInstance = createVirtualInstance(componentInfo);
  		                recordVirtualMount(newVirtualInstance, reconcilingParent, secondaryEnv);
  		                insertChild(newVirtualInstance);
  		                previousVirtualInstance = newVirtualInstance;
  		                previousVirtualInstanceWasMount = true;
  		                shouldResetChildren = true;
  		              } // Existing children might be reparented into this new virtual instance.
  		              // TODO: This will cause the front end to error which needs to be fixed.


  		              previousVirtualInstanceNextFirstFiber = nextChild;
  		              previousVirtualInstancePrevFirstFiber = prevChildAtSameIndex;
  		            }

  		            level++;
  		            break;
  		          } else {
  		            level++;
  		          }
  		        }
  		      }

  		      if (level === virtualLevel) {
  		        if (previousVirtualInstance !== null) {
  		          // If we were working on a virtual instance and this is not a virtual
  		          // instance, then we end the sequence and update any previous children
  		          // that should go into the previous virtual instance.
  		          if (previousVirtualInstanceWasMount) {
  		            mountVirtualInstanceRecursively(previousVirtualInstance, previousVirtualInstanceNextFirstFiber, nextChild, traceNearestHostComponentUpdate, virtualLevel);
  		          } else {
  		            updateVirtualInstanceRecursively(previousVirtualInstance, previousVirtualInstanceNextFirstFiber, nextChild, previousVirtualInstancePrevFirstFiber, traceNearestHostComponentUpdate, virtualLevel);
  		          }

  		          previousVirtualInstance = null;
  		        } // We've reached the end of the virtual levels, but not beyond,
  		        // and now continue with the regular fiber.
  		        // Do a fast pass over the remaining children to find the previous instance.
  		        // TODO: This doesn't have the best O(n) for a large set of children that are
  		        // reordered. Consider using a temporary map if it's not the very next one.


  		        let prevChild;

  		        if (prevChildAtSameIndex === nextChild) {
  		          // This set is unchanged. We're just going through it to place all the
  		          // children again.
  		          prevChild = nextChild;
  		        } else {
  		          // We don't actually need to rely on the alternate here. We could also
  		          // reconcile against stateNode, key or whatever. Doesn't have to be same
  		          // Fiber pair.
  		          prevChild = nextChild.alternate;
  		        }

  		        let previousSiblingOfExistingInstance = null;
  		        let existingInstance = null;

  		        if (prevChild !== null) {
  		          existingInstance = remainingReconcilingChildren;

  		          while (existingInstance !== null) {
  		            if (existingInstance.data === prevChild) {
  		              break;
  		            }

  		            previousSiblingOfExistingInstance = existingInstance;
  		            existingInstance = existingInstance.nextSibling;
  		          }
  		        }

  		        if (existingInstance !== null) {
  		          // Common case. Match in the same parent.
  		          const fiberInstance = existingInstance; // Only matches if it's a Fiber.
  		          // We keep track if the order of the children matches the previous order.
  		          // They are always different referentially, but if the instances line up
  		          // conceptually we'll want to know that.

  		          if (prevChild !== prevChildAtSameIndex) {
  		            shouldResetChildren = true;
  		          }

  		          moveChild(fiberInstance, previousSiblingOfExistingInstance);

  		          if (updateFiberRecursively(fiberInstance, nextChild, prevChild, traceNearestHostComponentUpdate)) {
  		            // If a nested tree child order changed but it can't handle its own
  		            // child order invalidation (e.g. because it's filtered out like host nodes),
  		            // propagate the need to reset child order upwards to this Fiber.
  		            shouldResetChildren = true;
  		          }
  		        } else if (prevChild !== null && shouldFilterFiber(nextChild)) {
  		          // If this Fiber should be filtered, we need to still update its children.
  		          // This relies on an alternate since we don't have an Instance with the previous
  		          // child on it. Ideally, the reconciliation wouldn't need previous Fibers that
  		          // are filtered from the tree.
  		          if (updateFiberRecursively(null, nextChild, prevChild, traceNearestHostComponentUpdate)) {
  		            shouldResetChildren = true;
  		          }
  		        } else {
  		          // It's possible for a FiberInstance to be reparented when virtual parents
  		          // get their sequence split or change structure with the same render result.
  		          // In this case we unmount the and remount the FiberInstances.
  		          // This might cause us to lose the selection but it's an edge case.
  		          // We let the previous instance remain in the "remaining queue" it is
  		          // in to be deleted at the end since it'll have no match.
  		          mountFiberRecursively(nextChild, traceNearestHostComponentUpdate); // Need to mark the parent set to remount the new instance.

  		          shouldResetChildren = true;
  		        }
  		      } // Try the next child.


  		      nextChild = nextChild.sibling; // Advance the pointer in the previous list so that we can
  		      // keep comparing if they line up.

  		      if (!shouldResetChildren && prevChildAtSameIndex !== null) {
  		        prevChildAtSameIndex = prevChildAtSameIndex.sibling;
  		      }
  		    }

  		    if (previousVirtualInstance !== null) {
  		      if (previousVirtualInstanceWasMount) {
  		        mountVirtualInstanceRecursively(previousVirtualInstance, previousVirtualInstanceNextFirstFiber, null, traceNearestHostComponentUpdate, virtualLevel);
  		      } else {
  		        updateVirtualInstanceRecursively(previousVirtualInstance, previousVirtualInstanceNextFirstFiber, null, previousVirtualInstancePrevFirstFiber, traceNearestHostComponentUpdate, virtualLevel);
  		      }
  		    } // If we have no more children, but used to, they don't line up.


  		    if (prevChildAtSameIndex !== null) {
  		      shouldResetChildren = true;
  		    }

  		    return shouldResetChildren;
  		  } // Returns whether closest unfiltered fiber parent needs to reset its child list.


  		  function updateChildrenRecursively(nextFirstChild, prevFirstChild, traceNearestHostComponentUpdate) {
  		    if (nextFirstChild === null) {
  		      return prevFirstChild !== null;
  		    }

  		    return updateVirtualChildrenRecursively(nextFirstChild, null, prevFirstChild, traceNearestHostComponentUpdate, 0);
  		  } // Returns whether closest unfiltered fiber parent needs to reset its child list.


  		  function updateFiberRecursively(fiberInstance, // null if this should be filtered
  		  nextFiber, prevFiber, traceNearestHostComponentUpdate) {

  		    if (traceUpdatesEnabled) {
  		      const elementType = getElementTypeForFiber(nextFiber);

  		      if (traceNearestHostComponentUpdate) {
  		        // If an ancestor updated, we should mark the nearest host nodes for highlighting.
  		        if (elementType === ElementTypeHostComponent) {
  		          traceUpdatesForNodes.add(nextFiber.stateNode);
  		          traceNearestHostComponentUpdate = false;
  		        }
  		      } else {
  		        if (elementType === types_ElementTypeFunction || elementType === types_ElementTypeClass || elementType === ElementTypeContext || elementType === types_ElementTypeMemo || elementType === types_ElementTypeForwardRef) {
  		          // Otherwise if this is a traced ancestor, flag for the nearest host descendant(s).
  		          traceNearestHostComponentUpdate = didFiberRender(prevFiber, nextFiber);
  		        }
  		      }
  		    }

  		    const stashedParent = reconcilingParent;
  		    const stashedPrevious = previouslyReconciledSibling;
  		    const stashedRemaining = remainingReconcilingChildren;

  		    if (fiberInstance !== null) {
  		      // Update the Fiber so we that we always keep the current Fiber on the data.
  		      fiberInstance.data = nextFiber;

  		      if (mostRecentlyInspectedElement !== null && mostRecentlyInspectedElement.id === fiberInstance.id && didFiberRender(prevFiber, nextFiber)) {
  		        // If this Fiber has updated, clear cached inspected data.
  		        // If it is inspected again, it may need to be re-run to obtain updated hooks values.
  		        hasElementUpdatedSinceLastInspected = true;
  		      } // Push a new DevTools instance parent while reconciling this subtree.


  		      reconcilingParent = fiberInstance;
  		      previouslyReconciledSibling = null; // Move all the children of this instance to the remaining set.
  		      // We'll move them back one by one, and anything that remains is deleted.

  		      remainingReconcilingChildren = fiberInstance.firstChild;
  		      fiberInstance.firstChild = null;
  		    }

  		    try {
  		      if (nextFiber.tag === HostHoistable && prevFiber.memoizedState !== nextFiber.memoizedState) {
  		        const nearestInstance = reconcilingParent;

  		        if (nearestInstance === null) {
  		          throw new Error('Did not expect a host hoistable to be the root');
  		        }

  		        releaseHostResource(nearestInstance, prevFiber.memoizedState);
  		        aquireHostResource(nearestInstance, nextFiber.memoizedState);
  		      } else if ((nextFiber.tag === HostComponent || nextFiber.tag === HostText || nextFiber.tag === HostSingleton) && prevFiber.stateNode !== nextFiber.stateNode) {
  		        // In persistent mode, it's possible for the stateNode to update with
  		        // a new clone. In that case we need to release the old one and aquire
  		        // new one instead.
  		        const nearestInstance = reconcilingParent;

  		        if (nearestInstance === null) {
  		          throw new Error('Did not expect a host hoistable to be the root');
  		        }

  		        releaseHostInstance(nearestInstance, prevFiber.stateNode);
  		        aquireHostInstance(nearestInstance, nextFiber.stateNode);
  		      }

  		      const isSuspense = nextFiber.tag === SuspenseComponent;
  		      let shouldResetChildren = false; // The behavior of timed-out Suspense trees is unique.
  		      // Rather than unmount the timed out content (and possibly lose important state),
  		      // React re-parents this content within a hidden Fragment while the fallback is showing.
  		      // This behavior doesn't need to be observable in the DevTools though.
  		      // It might even result in a bad user experience for e.g. node selection in the Elements panel.
  		      // The easiest fix is to strip out the intermediate Fragment fibers,
  		      // so the Elements panel and Profiler don't need to special case them.
  		      // Suspense components only have a non-null memoizedState if they're timed-out.

  		      const prevDidTimeout = isSuspense && prevFiber.memoizedState !== null;
  		      const nextDidTimeOut = isSuspense && nextFiber.memoizedState !== null; // The logic below is inspired by the code paths in updateSuspenseComponent()
  		      // inside ReactFiberBeginWork in the React source code.

  		      if (prevDidTimeout && nextDidTimeOut) {
  		        // Fallback -> Fallback:
  		        // 1. Reconcile fallback set.
  		        const nextFiberChild = nextFiber.child;
  		        const nextFallbackChildSet = nextFiberChild ? nextFiberChild.sibling : null; // Note: We can't use nextFiber.child.sibling.alternate
  		        // because the set is special and alternate may not exist.

  		        const prevFiberChild = prevFiber.child;
  		        const prevFallbackChildSet = prevFiberChild ? prevFiberChild.sibling : null;

  		        if (prevFallbackChildSet == null && nextFallbackChildSet != null) {
  		          mountChildrenRecursively(nextFallbackChildSet, traceNearestHostComponentUpdate);
  		          shouldResetChildren = true;
  		        }

  		        if (nextFallbackChildSet != null && prevFallbackChildSet != null && updateChildrenRecursively(nextFallbackChildSet, prevFallbackChildSet, traceNearestHostComponentUpdate)) {
  		          shouldResetChildren = true;
  		        }
  		      } else if (prevDidTimeout && !nextDidTimeOut) {
  		        // Fallback -> Primary:
  		        // 1. Unmount fallback set
  		        // Note: don't emulate fallback unmount because React actually did it.
  		        // 2. Mount primary set
  		        const nextPrimaryChildSet = nextFiber.child;

  		        if (nextPrimaryChildSet !== null) {
  		          mountChildrenRecursively(nextPrimaryChildSet, traceNearestHostComponentUpdate);
  		        }

  		        shouldResetChildren = true;
  		      } else if (!prevDidTimeout && nextDidTimeOut) {
  		        // Primary -> Fallback:
  		        // 1. Hide primary set
  		        // We simply don't re-add the fallback children and let
  		        // unmountRemainingChildren() handle it.
  		        // 2. Mount fallback set
  		        const nextFiberChild = nextFiber.child;
  		        const nextFallbackChildSet = nextFiberChild ? nextFiberChild.sibling : null;

  		        if (nextFallbackChildSet != null) {
  		          mountChildrenRecursively(nextFallbackChildSet, traceNearestHostComponentUpdate);
  		          shouldResetChildren = true;
  		        }
  		      } else {
  		        // Common case: Primary -> Primary.
  		        // This is the same code path as for non-Suspense fibers.
  		        if (nextFiber.child !== prevFiber.child) {
  		          if (updateChildrenRecursively(nextFiber.child, prevFiber.child, traceNearestHostComponentUpdate)) {
  		            shouldResetChildren = true;
  		          }
  		        } else {
  		          // Children are unchanged.
  		          if (fiberInstance !== null) {
  		            // All the remaining children will be children of this same fiber so we can just reuse them.
  		            // I.e. we just restore them by undoing what we did above.
  		            fiberInstance.firstChild = remainingReconcilingChildren;
  		            remainingReconcilingChildren = null;

  		            if (traceUpdatesEnabled) {
  		              // If we're tracing updates and we've bailed out before reaching a host node,
  		              // we should fall back to recursively marking the nearest host descendants for highlight.
  		              if (traceNearestHostComponentUpdate) {
  		                const hostInstances = findAllCurrentHostInstances(fiberInstance);
  		                hostInstances.forEach(hostInstance => {
  		                  traceUpdatesForNodes.add(hostInstance);
  		                });
  		              }
  		            }
  		          } else {
  		            // If this fiber is filtered there might be changes to this set elsewhere so we have
  		            // to visit each child to place it back in the set. We let the child bail out instead.
  		            if (updateChildrenRecursively(nextFiber.child, prevFiber.child, false)) {
  		              throw new Error('The children should not have changed if we pass in the same set.');
  		            }
  		          }
  		        }
  		      }

  		      if (fiberInstance !== null) {
  		        let componentLogsEntry = fiberToComponentLogsMap.get(fiberInstance.data);

  		        if (componentLogsEntry === undefined && fiberInstance.data.alternate) {
  		          componentLogsEntry = fiberToComponentLogsMap.get(fiberInstance.data.alternate);
  		        }

  		        recordConsoleLogs(fiberInstance, componentLogsEntry);
  		        const isProfilingSupported = nextFiber.hasOwnProperty('treeBaseDuration');

  		        if (isProfilingSupported) {
  		          recordProfilingDurations(fiberInstance, prevFiber);
  		        }
  		      }

  		      if (shouldResetChildren) {
  		        // We need to crawl the subtree for closest non-filtered Fibers
  		        // so that we can display them in a flat children set.
  		        if (fiberInstance !== null) {
  		          recordResetChildren(fiberInstance); // We've handled the child order change for this Fiber.
  		          // Since it's included, there's no need to invalidate parent child order.

  		          return false;
  		        } else {
  		          // Let the closest unfiltered parent Fiber reset its child order instead.
  		          return true;
  		        }
  		      } else {
  		        return false;
  		      }
  		    } finally {
  		      if (fiberInstance !== null) {
  		        unmountRemainingChildren();
  		        reconcilingParent = stashedParent;
  		        previouslyReconciledSibling = stashedPrevious;
  		        remainingReconcilingChildren = stashedRemaining;
  		      }
  		    }
  		  }

  		  function cleanup() {
  		    isProfiling = false;
  		  }

  		  function rootSupportsProfiling(root) {
  		    if (root.memoizedInteractions != null) {
  		      // v16 builds include this field for the scheduler/tracing API.
  		      return true;
  		    } else if (root.current != null && root.current.hasOwnProperty('treeBaseDuration')) {
  		      // The scheduler/tracing API was removed in v17 though
  		      // so we need to check a non-root Fiber.
  		      return true;
  		    } else {
  		      return false;
  		    }
  		  }

  		  function flushInitialOperations() {
  		    const localPendingOperationsQueue = pendingOperationsQueue;
  		    pendingOperationsQueue = null;

  		    if (localPendingOperationsQueue !== null && localPendingOperationsQueue.length > 0) {
  		      // We may have already queued up some operations before the frontend connected
  		      // If so, let the frontend know about them.
  		      localPendingOperationsQueue.forEach(operations => {
  		        hook.emit('operations', operations);
  		      });
  		    } else {
  		      // Before the traversals, remember to start tracking
  		      // our path in case we have selection to restore.
  		      if (trackedPath !== null) {
  		        mightBeOnTrackedPath = true;
  		      } // If we have not been profiling, then we can just walk the tree and build up its current state as-is.


  		      hook.getFiberRoots(rendererID).forEach(root => {
  		        const current = root.current;
  		        const newRoot = createFiberInstance(current);
  		        rootToFiberInstanceMap.set(root, newRoot);
  		        idToDevToolsInstanceMap.set(newRoot.id, newRoot);
  		        currentRoot = newRoot;
  		        setRootPseudoKey(currentRoot.id, root.current); // Handle multi-renderer edge-case where only some v16 renderers support profiling.

  		        if (isProfiling && rootSupportsProfiling(root)) {
  		          // If profiling is active, store commit time and duration.
  		          // The frontend may request this information after profiling has stopped.
  		          currentCommitProfilingMetadata = {
  		            changeDescriptions: recordChangeDescriptions ? new Map() : null,
  		            durations: [],
  		            commitTime: renderer_getCurrentTime() - profilingStartTime,
  		            maxActualDuration: 0,
  		            priorityLevel: null,
  		            updaters: null,
  		            effectDuration: null,
  		            passiveEffectDuration: null
  		          };
  		        }

  		        mountFiberRecursively(root.current, false);
  		        flushPendingEvents();
  		        needsToFlushComponentLogs = false;
  		        currentRoot = null;
  		      });
  		    }
  		  }

  		  function handleCommitFiberUnmount(fiber) {// This Hook is no longer used. After having shipped DevTools everywhere it is
  		    // safe to stop calling it from Fiber.
  		  }

  		  function handlePostCommitFiberRoot(root) {
  		    if (isProfiling && rootSupportsProfiling(root)) {
  		      if (currentCommitProfilingMetadata !== null) {
  		        const {
  		          effectDuration,
  		          passiveEffectDuration
  		        } = getEffectDurations(root); // $FlowFixMe[incompatible-use] found when upgrading Flow

  		        currentCommitProfilingMetadata.effectDuration = effectDuration; // $FlowFixMe[incompatible-use] found when upgrading Flow

  		        currentCommitProfilingMetadata.passiveEffectDuration = passiveEffectDuration;
  		      }
  		    }

  		    if (needsToFlushComponentLogs) {
  		      // We received new logs after commit. I.e. in a passive effect. We need to
  		      // traverse the tree to find the affected ones. If we just moved the whole
  		      // tree traversal from handleCommitFiberRoot to handlePostCommitFiberRoot
  		      // this wouldn't be needed. For now we just brute force check all instances.
  		      // This is not that common of a case.
  		      bruteForceFlushErrorsAndWarnings();
  		    }
  		  }

  		  function handleCommitFiberRoot(root, priorityLevel) {
  		    const current = root.current;
  		    let prevFiber = null;
  		    let rootInstance = rootToFiberInstanceMap.get(root);

  		    if (!rootInstance) {
  		      rootInstance = createFiberInstance(current);
  		      rootToFiberInstanceMap.set(root, rootInstance);
  		      idToDevToolsInstanceMap.set(rootInstance.id, rootInstance);
  		    } else {
  		      prevFiber = rootInstance.data;
  		    }

  		    currentRoot = rootInstance; // Before the traversals, remember to start tracking
  		    // our path in case we have selection to restore.

  		    if (trackedPath !== null) {
  		      mightBeOnTrackedPath = true;
  		    }

  		    if (traceUpdatesEnabled) {
  		      traceUpdatesForNodes.clear();
  		    } // Handle multi-renderer edge-case where only some v16 renderers support profiling.


  		    const isProfilingSupported = rootSupportsProfiling(root);

  		    if (isProfiling && isProfilingSupported) {
  		      // If profiling is active, store commit time and duration.
  		      // The frontend may request this information after profiling has stopped.
  		      currentCommitProfilingMetadata = {
  		        changeDescriptions: recordChangeDescriptions ? new Map() : null,
  		        durations: [],
  		        commitTime: renderer_getCurrentTime() - profilingStartTime,
  		        maxActualDuration: 0,
  		        priorityLevel: priorityLevel == null ? null : formatPriorityLevel(priorityLevel),
  		        updaters: null,
  		        // Initialize to null; if new enough React version is running,
  		        // these values will be read during separate handlePostCommitFiberRoot() call.
  		        effectDuration: null,
  		        passiveEffectDuration: null
  		      };
  		    }

  		    if (prevFiber !== null) {
  		      // TODO: relying on this seems a bit fishy.
  		      const wasMounted = prevFiber.memoizedState != null && prevFiber.memoizedState.element != null && // A dehydrated root is not considered mounted
  		      prevFiber.memoizedState.isDehydrated !== true;
  		      const isMounted = current.memoizedState != null && current.memoizedState.element != null && // A dehydrated root is not considered mounted
  		      current.memoizedState.isDehydrated !== true;

  		      if (!wasMounted && isMounted) {
  		        // Mount a new root.
  		        setRootPseudoKey(currentRoot.id, current);
  		        mountFiberRecursively(current, false);
  		      } else if (wasMounted && isMounted) {
  		        // Update an existing root.
  		        updateFiberRecursively(rootInstance, current, prevFiber, false);
  		      } else if (wasMounted && !isMounted) {
  		        // Unmount an existing root.
  		        unmountInstanceRecursively(rootInstance);
  		        removeRootPseudoKey(currentRoot.id);
  		        rootToFiberInstanceMap.delete(root);
  		      }
  		    } else {
  		      // Mount a new root.
  		      setRootPseudoKey(currentRoot.id, current);
  		      mountFiberRecursively(current, false);
  		    }

  		    if (isProfiling && isProfilingSupported) {
  		      if (!shouldBailoutWithPendingOperations()) {
  		        const commitProfilingMetadata = rootToCommitProfilingMetadataMap.get(currentRoot.id);

  		        if (commitProfilingMetadata != null) {
  		          commitProfilingMetadata.push(currentCommitProfilingMetadata);
  		        } else {
  		          rootToCommitProfilingMetadataMap.set(currentRoot.id, [currentCommitProfilingMetadata]);
  		        }
  		      }
  		    } // We're done here.


  		    flushPendingEvents();
  		    needsToFlushComponentLogs = false;

  		    if (traceUpdatesEnabled) {
  		      hook.emit('traceUpdates', traceUpdatesForNodes);
  		    }

  		    currentRoot = null;
  		  }

  		  function getResourceInstance(fiber) {
  		    if (fiber.tag === HostHoistable) {
  		      const resource = fiber.memoizedState; // Feature Detect a DOM Specific Instance of a Resource

  		      if (typeof resource === 'object' && resource !== null && resource.instance != null) {
  		        return resource.instance;
  		      }
  		    }

  		    return null;
  		  }

  		  function appendHostInstancesByDevToolsInstance(devtoolsInstance, hostInstances) {
  		    if (devtoolsInstance.kind !== VIRTUAL_INSTANCE) {
  		      const fiber = devtoolsInstance.data;
  		      appendHostInstancesByFiber(fiber, hostInstances);
  		      return;
  		    } // Search the tree for the nearest child Fiber and add all its host instances.
  		    // TODO: If the true nearest Fiber is filtered, we might skip it and instead include all
  		    // the children below it. In the extreme case, searching the whole tree.


  		    for (let child = devtoolsInstance.firstChild; child !== null; child = child.nextSibling) {
  		      appendHostInstancesByDevToolsInstance(child, hostInstances);
  		    }
  		  }

  		  function appendHostInstancesByFiber(fiber, hostInstances) {
  		    // Next we'll drill down this component to find all HostComponent/Text.
  		    let node = fiber;

  		    while (true) {
  		      if (node.tag === HostComponent || node.tag === HostText || node.tag === HostSingleton || node.tag === HostHoistable) {
  		        const hostInstance = node.stateNode || getResourceInstance(node);

  		        if (hostInstance) {
  		          hostInstances.push(hostInstance);
  		        }
  		      } else if (node.child) {
  		        node.child.return = node;
  		        node = node.child;
  		        continue;
  		      }

  		      if (node === fiber) {
  		        return;
  		      }

  		      while (!node.sibling) {
  		        if (!node.return || node.return === fiber) {
  		          return;
  		        }

  		        node = node.return;
  		      }

  		      node.sibling.return = node.return;
  		      node = node.sibling;
  		    }
  		  }

  		  function findAllCurrentHostInstances(devtoolsInstance) {
  		    const hostInstances = [];
  		    appendHostInstancesByDevToolsInstance(devtoolsInstance, hostInstances);
  		    return hostInstances;
  		  }

  		  function findHostInstancesForElementID(id) {
  		    try {
  		      const devtoolsInstance = idToDevToolsInstanceMap.get(id);

  		      if (devtoolsInstance === undefined) {
  		        console.warn(`Could not find DevToolsInstance with id "${id}"`);
  		        return null;
  		      }

  		      return findAllCurrentHostInstances(devtoolsInstance);
  		    } catch (err) {
  		      // The fiber might have unmounted by now.
  		      return null;
  		    }
  		  }

  		  function getDisplayNameForElementID(id) {
  		    const devtoolsInstance = idToDevToolsInstanceMap.get(id);

  		    if (devtoolsInstance === undefined) {
  		      return null;
  		    }

  		    if (devtoolsInstance.kind === FIBER_INSTANCE) {
  		      return getDisplayNameForFiber(devtoolsInstance.data);
  		    } else {
  		      return devtoolsInstance.data.name || '';
  		    }
  		  }

  		  function getNearestMountedDOMNode(publicInstance) {
  		    let domNode = publicInstance;

  		    while (domNode && !publicInstanceToDevToolsInstanceMap.has(domNode)) {
  		      // $FlowFixMe: In practice this is either null or Element.
  		      domNode = domNode.parentNode;
  		    }

  		    return domNode;
  		  }

  		  function getElementIDForHostInstance(publicInstance) {
  		    const instance = publicInstanceToDevToolsInstanceMap.get(publicInstance);

  		    if (instance !== undefined) {
  		      if (instance.kind === FILTERED_FIBER_INSTANCE) {
  		        // A Filtered Fiber Instance will always have a Virtual Instance as a parent.
  		        return instance.parent.id;
  		      }

  		      return instance.id;
  		    }

  		    return null;
  		  }

  		  function getElementAttributeByPath(id, path) {
  		    if (isMostRecentlyInspectedElement(id)) {
  		      return utils_getInObject(mostRecentlyInspectedElement, path);
  		    }

  		    return undefined;
  		  }

  		  function getElementSourceFunctionById(id) {
  		    const devtoolsInstance = idToDevToolsInstanceMap.get(id);

  		    if (devtoolsInstance === undefined) {
  		      console.warn(`Could not find DevToolsInstance with id "${id}"`);
  		      return null;
  		    }

  		    if (devtoolsInstance.kind !== FIBER_INSTANCE) {
  		      // TODO: Handle VirtualInstance.
  		      return null;
  		    }

  		    const fiber = devtoolsInstance.data;
  		    const {
  		      elementType,
  		      tag,
  		      type
  		    } = fiber;

  		    switch (tag) {
  		      case ClassComponent:
  		      case IncompleteClassComponent:
  		      case IncompleteFunctionComponent:
  		      case IndeterminateComponent:
  		      case FunctionComponent:
  		        return type;

  		      case ForwardRef:
  		        return type.render;

  		      case MemoComponent:
  		      case SimpleMemoComponent:
  		        return elementType != null && elementType.type != null ? elementType.type : type;

  		      default:
  		        return null;
  		    }
  		  }

  		  function instanceToSerializedElement(instance) {
  		    if (instance.kind === FIBER_INSTANCE) {
  		      const fiber = instance.data;
  		      return {
  		        displayName: getDisplayNameForFiber(fiber) || 'Anonymous',
  		        id: instance.id,
  		        key: fiber.key,
  		        type: getElementTypeForFiber(fiber)
  		      };
  		    } else {
  		      const componentInfo = instance.data;
  		      return {
  		        displayName: componentInfo.name || 'Anonymous',
  		        id: instance.id,
  		        key: componentInfo.key == null ? null : componentInfo.key,
  		        type: types_ElementTypeVirtual
  		      };
  		    }
  		  }

  		  function getOwnersList(id) {
  		    const devtoolsInstance = idToDevToolsInstanceMap.get(id);

  		    if (devtoolsInstance === undefined) {
  		      console.warn(`Could not find DevToolsInstance with id "${id}"`);
  		      return null;
  		    }

  		    const self = instanceToSerializedElement(devtoolsInstance);
  		    const owners = getOwnersListFromInstance(devtoolsInstance); // This is particular API is prefixed with the current instance too for some reason.

  		    if (owners === null) {
  		      return [self];
  		    }

  		    owners.unshift(self);
  		    owners.reverse();
  		    return owners;
  		  }

  		  function getOwnersListFromInstance(instance) {
  		    let owner = getUnfilteredOwner(instance.data);

  		    if (owner === null) {
  		      return null;
  		    }

  		    const owners = [];
  		    let parentInstance = instance.parent;

  		    while (parentInstance !== null && owner !== null) {
  		      const ownerInstance = findNearestOwnerInstance(parentInstance, owner);

  		      if (ownerInstance !== null) {
  		        owners.push(instanceToSerializedElement(ownerInstance)); // Get the next owner and keep searching from the previous match.

  		        owner = getUnfilteredOwner(owner);
  		        parentInstance = ownerInstance.parent;
  		      } else {
  		        break;
  		      }
  		    }

  		    return owners;
  		  }

  		  function getUnfilteredOwner(owner) {
  		    if (owner == null) {
  		      return null;
  		    }

  		    if (typeof owner.tag === 'number') {
  		      const ownerFiber = owner; // Refined

  		      owner = ownerFiber._debugOwner;
  		    } else {
  		      const ownerInfo = owner; // Refined

  		      owner = ownerInfo.owner;
  		    }

  		    while (owner) {
  		      if (typeof owner.tag === 'number') {
  		        const ownerFiber = owner; // Refined

  		        if (!shouldFilterFiber(ownerFiber)) {
  		          return ownerFiber;
  		        }

  		        owner = ownerFiber._debugOwner;
  		      } else {
  		        const ownerInfo = owner; // Refined

  		        if (!shouldFilterVirtual(ownerInfo, null)) {
  		          return ownerInfo;
  		        }

  		        owner = ownerInfo.owner;
  		      }
  		    }

  		    return null;
  		  }

  		  function findNearestOwnerInstance(parentInstance, owner) {
  		    if (owner == null) {
  		      return null;
  		    } // Search the parent path for any instance that matches this kind of owner.


  		    while (parentInstance !== null) {
  		      if (parentInstance.data === owner || // Typically both owner and instance.data would refer to the current version of a Fiber
  		      // but it is possible for memoization to ignore the owner on the JSX. Then the new Fiber
  		      // isn't propagated down as the new owner. In that case we might match the alternate
  		      // instead. This is a bit hacky but the fastest check since type casting owner to a Fiber
  		      // needs a duck type check anyway.
  		      parentInstance.data === owner.alternate) {
  		        if (parentInstance.kind === FILTERED_FIBER_INSTANCE) {
  		          return null;
  		        }

  		        return parentInstance;
  		      }

  		      parentInstance = parentInstance.parent;
  		    } // It is technically possible to create an element and render it in a different parent
  		    // but this is a weird edge case and it is worth not having to scan the tree or keep
  		    // a register for every fiber/component info.


  		    return null;
  		  } // Fast path props lookup for React Native style editor.
  		  // Could use inspectElementRaw() but that would require shallow rendering hooks components,
  		  // and could also mess with memoization.


  		  function getInstanceAndStyle(id) {
  		    let instance = null;
  		    let style = null;
  		    const devtoolsInstance = idToDevToolsInstanceMap.get(id);

  		    if (devtoolsInstance === undefined) {
  		      console.warn(`Could not find DevToolsInstance with id "${id}"`);
  		      return {
  		        instance,
  		        style
  		      };
  		    }

  		    if (devtoolsInstance.kind !== FIBER_INSTANCE) {
  		      // TODO: Handle VirtualInstance.
  		      return {
  		        instance,
  		        style
  		      };
  		    }

  		    const fiber = devtoolsInstance.data;

  		    if (fiber !== null) {
  		      instance = fiber.stateNode;

  		      if (fiber.memoizedProps !== null) {
  		        style = fiber.memoizedProps.style;
  		      }
  		    }

  		    return {
  		      instance,
  		      style
  		    };
  		  }

  		  function isErrorBoundary(fiber) {
  		    const {
  		      tag,
  		      type
  		    } = fiber;

  		    switch (tag) {
  		      case ClassComponent:
  		      case IncompleteClassComponent:
  		        const instance = fiber.stateNode;
  		        return typeof type.getDerivedStateFromError === 'function' || instance !== null && typeof instance.componentDidCatch === 'function';

  		      default:
  		        return false;
  		    }
  		  }

  		  function inspectElementRaw(id) {
  		    const devtoolsInstance = idToDevToolsInstanceMap.get(id);

  		    if (devtoolsInstance === undefined) {
  		      console.warn(`Could not find DevToolsInstance with id "${id}"`);
  		      return null;
  		    }

  		    if (devtoolsInstance.kind === VIRTUAL_INSTANCE) {
  		      return inspectVirtualInstanceRaw(devtoolsInstance);
  		    }

  		    if (devtoolsInstance.kind === FIBER_INSTANCE) {
  		      return inspectFiberInstanceRaw(devtoolsInstance);
  		    }

  		    throw new Error('Unsupported instance kind');
  		  }

  		  function inspectFiberInstanceRaw(fiberInstance) {
  		    const fiber = fiberInstance.data;

  		    if (fiber == null) {
  		      return null;
  		    }

  		    const {
  		      stateNode,
  		      key,
  		      memoizedProps,
  		      memoizedState,
  		      dependencies,
  		      tag,
  		      type
  		    } = fiber;
  		    const elementType = getElementTypeForFiber(fiber);
  		    const usesHooks = (tag === FunctionComponent || tag === SimpleMemoComponent || tag === ForwardRef) && (!!memoizedState || !!dependencies); // TODO Show custom UI for Cache like we do for Suspense
  		    // For now, just hide state data entirely since it's not meant to be inspected.

  		    const showState = !usesHooks && tag !== CacheComponent;
  		    const typeSymbol = getTypeSymbol(type);
  		    let canViewSource = false;
  		    let context = null;

  		    if (tag === ClassComponent || tag === FunctionComponent || tag === IncompleteClassComponent || tag === IncompleteFunctionComponent || tag === IndeterminateComponent || tag === MemoComponent || tag === ForwardRef || tag === SimpleMemoComponent) {
  		      canViewSource = true;

  		      if (stateNode && stateNode.context != null) {
  		        // Don't show an empty context object for class components that don't use the context API.
  		        const shouldHideContext = elementType === types_ElementTypeClass && !(type.contextTypes || type.contextType);

  		        if (!shouldHideContext) {
  		          context = stateNode.context;
  		        }
  		      }
  		    } else if ( // Detect pre-19 Context Consumers
  		    (typeSymbol === CONTEXT_NUMBER || typeSymbol === CONTEXT_SYMBOL_STRING) && !( // In 19+, CONTEXT_SYMBOL_STRING means a Provider instead.
  		    // It will be handled in a different branch below.
  		    // Eventually, this entire branch can be removed.
  		    type._context === undefined && type.Provider === type)) {
  		      // 16.3-16.5 read from "type" because the Consumer is the actual context object.
  		      // 16.6+ should read from "type._context" because Consumer can be different (in DEV).
  		      // NOTE Keep in sync with getDisplayNameForFiber()
  		      const consumerResolvedContext = type._context || type; // Global context value.

  		      context = consumerResolvedContext._currentValue || null; // Look for overridden value.

  		      let current = fiber.return;

  		      while (current !== null) {
  		        const currentType = current.type;
  		        const currentTypeSymbol = getTypeSymbol(currentType);

  		        if (currentTypeSymbol === PROVIDER_NUMBER || currentTypeSymbol === PROVIDER_SYMBOL_STRING) {
  		          // 16.3.0 exposed the context object as "context"
  		          // PR #12501 changed it to "_context" for 16.3.1+
  		          // NOTE Keep in sync with getDisplayNameForFiber()
  		          const providerResolvedContext = currentType._context || currentType.context;

  		          if (providerResolvedContext === consumerResolvedContext) {
  		            context = current.memoizedProps.value;
  		            break;
  		          }
  		        }

  		        current = current.return;
  		      }
  		    } else if ( // Detect 19+ Context Consumers
  		    typeSymbol === CONSUMER_SYMBOL_STRING) {
  		      // This branch is 19+ only, where Context.Provider === Context.
  		      // NOTE Keep in sync with getDisplayNameForFiber()
  		      const consumerResolvedContext = type._context; // Global context value.

  		      context = consumerResolvedContext._currentValue || null; // Look for overridden value.

  		      let current = fiber.return;

  		      while (current !== null) {
  		        const currentType = current.type;
  		        const currentTypeSymbol = getTypeSymbol(currentType);

  		        if ( // In 19+, these are Context Providers
  		        currentTypeSymbol === CONTEXT_SYMBOL_STRING) {
  		          const providerResolvedContext = currentType;

  		          if (providerResolvedContext === consumerResolvedContext) {
  		            context = current.memoizedProps.value;
  		            break;
  		          }
  		        }

  		        current = current.return;
  		      }
  		    }

  		    let hasLegacyContext = false;

  		    if (context !== null) {
  		      hasLegacyContext = !!type.contextTypes; // To simplify hydration and display logic for context, wrap in a value object.
  		      // Otherwise simple values (e.g. strings, booleans) become harder to handle.

  		      context = {
  		        value: context
  		      };
  		    }

  		    const owners = getOwnersListFromInstance(fiberInstance);
  		    let hooks = null;

  		    if (usesHooks) {
  		      const originalConsoleMethods = {}; // Temporarily disable all console logging before re-running the hook.

  		      for (const method in console) {
  		        try {
  		          // $FlowFixMe[invalid-computed-prop]
  		          originalConsoleMethods[method] = console[method]; // $FlowFixMe[prop-missing]

  		          console[method] = () => {};
  		        } catch (error) {}
  		      }

  		      try {
  		        hooks = inspectHooksOfFiber(fiber, getDispatcherRef(renderer));
  		      } finally {
  		        // Restore original console functionality.
  		        for (const method in originalConsoleMethods) {
  		          try {
  		            // $FlowFixMe[prop-missing]
  		            console[method] = originalConsoleMethods[method];
  		          } catch (error) {}
  		        }
  		      }
  		    }

  		    let rootType = null;
  		    let current = fiber;
  		    let hasErrorBoundary = false;
  		    let hasSuspenseBoundary = false;

  		    while (current.return !== null) {
  		      const temp = current;
  		      current = current.return;

  		      if (temp.tag === SuspenseComponent) {
  		        hasSuspenseBoundary = true;
  		      } else if (isErrorBoundary(temp)) {
  		        hasErrorBoundary = true;
  		      }
  		    }

  		    const fiberRoot = current.stateNode;

  		    if (fiberRoot != null && fiberRoot._debugRootType !== null) {
  		      rootType = fiberRoot._debugRootType;
  		    }

  		    const isTimedOutSuspense = tag === SuspenseComponent && memoizedState !== null;
  		    let isErrored = false;

  		    if (isErrorBoundary(fiber)) {
  		      // if the current inspected element is an error boundary,
  		      // either that we want to use it to toggle off error state
  		      // or that we allow to force error state on it if it's within another
  		      // error boundary
  		      //
  		      // TODO: This flag is a leaked implementation detail. Once we start
  		      // releasing DevTools in lockstep with React, we should import a function
  		      // from the reconciler instead.
  		      const DidCapture = 0b000000000000000000010000000;
  		      isErrored = (fiber.flags & DidCapture) !== 0 || forceErrorForFibers.get(fiber) === true || fiber.alternate !== null && forceErrorForFibers.get(fiber.alternate) === true;
  		    }

  		    const plugins = {
  		      stylex: null
  		    };

  		    let source = null;

  		    if (canViewSource) {
  		      source = getSourceForFiberInstance(fiberInstance);
  		    }

  		    let componentLogsEntry = fiberToComponentLogsMap.get(fiber);

  		    if (componentLogsEntry === undefined && fiber.alternate !== null) {
  		      componentLogsEntry = fiberToComponentLogsMap.get(fiber.alternate);
  		    }

  		    let nativeTag = null;

  		    if (elementType === ElementTypeHostComponent) {
  		      nativeTag = getNativeTag(fiber.stateNode);
  		    }

  		    return {
  		      id: fiberInstance.id,
  		      // Does the current renderer support editable hooks and function props?
  		      canEditHooks: typeof overrideHookState === 'function',
  		      canEditFunctionProps: typeof overrideProps === 'function',
  		      // Does the current renderer support advanced editing interface?
  		      canEditHooksAndDeletePaths: typeof overrideHookStateDeletePath === 'function',
  		      canEditHooksAndRenamePaths: typeof overrideHookStateRenamePath === 'function',
  		      canEditFunctionPropsDeletePaths: typeof overridePropsDeletePath === 'function',
  		      canEditFunctionPropsRenamePaths: typeof overridePropsRenamePath === 'function',
  		      canToggleError: supportsTogglingError && hasErrorBoundary,
  		      // Is this error boundary in error state.
  		      isErrored,
  		      canToggleSuspense: supportsTogglingSuspense && hasSuspenseBoundary && ( // If it's showing the real content, we can always flip fallback.
  		      !isTimedOutSuspense || // If it's showing fallback because we previously forced it to,
  		      // allow toggling it back to remove the fallback override.
  		      forceFallbackForFibers.has(fiber) || fiber.alternate !== null && forceFallbackForFibers.has(fiber.alternate)),
  		      // Can view component source location.
  		      canViewSource,
  		      source,
  		      // Does the component have legacy context attached to it.
  		      hasLegacyContext,
  		      key: key != null ? key : null,
  		      type: elementType,
  		      // Inspectable properties.
  		      // TODO Review sanitization approach for the below inspectable values.
  		      context,
  		      hooks,
  		      props: memoizedProps,
  		      state: showState ? memoizedState : null,
  		      errors: componentLogsEntry === undefined ? [] : Array.from(componentLogsEntry.errors.entries()),
  		      warnings: componentLogsEntry === undefined ? [] : Array.from(componentLogsEntry.warnings.entries()),
  		      // List of owners
  		      owners,
  		      rootType,
  		      rendererPackageName: renderer.rendererPackageName,
  		      rendererVersion: renderer.version,
  		      plugins,
  		      nativeTag
  		    };
  		  }

  		  function inspectVirtualInstanceRaw(virtualInstance) {
  		    const canViewSource = true;
  		    const source = getSourceForInstance(virtualInstance);
  		    const componentInfo = virtualInstance.data;
  		    const key = typeof componentInfo.key === 'string' ? componentInfo.key : null;
  		    const props = componentInfo.props == null ? null : componentInfo.props;
  		    const owners = getOwnersListFromInstance(virtualInstance);
  		    let rootType = null;
  		    let hasErrorBoundary = false;
  		    let hasSuspenseBoundary = false;
  		    const nearestFiber = getNearestFiber(virtualInstance);

  		    if (nearestFiber !== null) {
  		      let current = nearestFiber;

  		      while (current.return !== null) {
  		        const temp = current;
  		        current = current.return;

  		        if (temp.tag === SuspenseComponent) {
  		          hasSuspenseBoundary = true;
  		        } else if (isErrorBoundary(temp)) {
  		          hasErrorBoundary = true;
  		        }
  		      }

  		      const fiberRoot = current.stateNode;

  		      if (fiberRoot != null && fiberRoot._debugRootType !== null) {
  		        rootType = fiberRoot._debugRootType;
  		      }
  		    }

  		    const plugins = {
  		      stylex: null
  		    };
  		    const componentLogsEntry = componentInfoToComponentLogsMap.get(componentInfo);
  		    return {
  		      id: virtualInstance.id,
  		      canEditHooks: false,
  		      canEditFunctionProps: false,
  		      canEditHooksAndDeletePaths: false,
  		      canEditHooksAndRenamePaths: false,
  		      canEditFunctionPropsDeletePaths: false,
  		      canEditFunctionPropsRenamePaths: false,
  		      canToggleError: supportsTogglingError && hasErrorBoundary,
  		      isErrored: false,
  		      canToggleSuspense: supportsTogglingSuspense && hasSuspenseBoundary,
  		      // Can view component source location.
  		      canViewSource,
  		      source,
  		      // Does the component have legacy context attached to it.
  		      hasLegacyContext: false,
  		      key: key,
  		      type: types_ElementTypeVirtual,
  		      // Inspectable properties.
  		      // TODO Review sanitization approach for the below inspectable values.
  		      context: null,
  		      hooks: null,
  		      props: props,
  		      state: null,
  		      errors: componentLogsEntry === undefined ? [] : Array.from(componentLogsEntry.errors.entries()),
  		      warnings: componentLogsEntry === undefined ? [] : Array.from(componentLogsEntry.warnings.entries()),
  		      // List of owners
  		      owners,
  		      rootType,
  		      rendererPackageName: renderer.rendererPackageName,
  		      rendererVersion: renderer.version,
  		      plugins,
  		      nativeTag: null
  		    };
  		  }

  		  let mostRecentlyInspectedElement = null;
  		  let hasElementUpdatedSinceLastInspected = false;
  		  let currentlyInspectedPaths = {};

  		  function isMostRecentlyInspectedElement(id) {
  		    return mostRecentlyInspectedElement !== null && mostRecentlyInspectedElement.id === id;
  		  }

  		  function isMostRecentlyInspectedElementCurrent(id) {
  		    return isMostRecentlyInspectedElement(id) && !hasElementUpdatedSinceLastInspected;
  		  } // Track the intersection of currently inspected paths,
  		  // so that we can send their data along if the element is re-rendered.


  		  function mergeInspectedPaths(path) {
  		    let current = currentlyInspectedPaths;
  		    path.forEach(key => {
  		      if (!current[key]) {
  		        current[key] = {};
  		      }

  		      current = current[key];
  		    });
  		  }

  		  function createIsPathAllowed(key, secondaryCategory) {
  		    // This function helps prevent previously-inspected paths from being dehydrated in updates.
  		    // This is important to avoid a bad user experience where expanded toggles collapse on update.
  		    return function isPathAllowed(path) {
  		      switch (secondaryCategory) {
  		        case 'hooks':
  		          if (path.length === 1) {
  		            // Never dehydrate the "hooks" object at the top levels.
  		            return true;
  		          }

  		          if (path[path.length - 2] === 'hookSource' && path[path.length - 1] === 'fileName') {
  		            // It's important to preserve the full file name (URL) for hook sources
  		            // in case the user has enabled the named hooks feature.
  		            // Otherwise the frontend may end up with a partial URL which it can't load.
  		            return true;
  		          }

  		          if (path[path.length - 1] === 'subHooks' || path[path.length - 2] === 'subHooks') {
  		            // Dehydrating the 'subHooks' property makes the HooksTree UI a lot more complicated,
  		            // so it's easiest for now if we just don't break on this boundary.
  		            // We can always dehydrate a level deeper (in the value object).
  		            return true;
  		          }

  		          break;
  		      }

  		      let current = key === null ? currentlyInspectedPaths : currentlyInspectedPaths[key];

  		      if (!current) {
  		        return false;
  		      }

  		      for (let i = 0; i < path.length; i++) {
  		        current = current[path[i]];

  		        if (!current) {
  		          return false;
  		        }
  		      }

  		      return true;
  		    };
  		  }

  		  function updateSelectedElement(inspectedElement) {
  		    const {
  		      hooks,
  		      id,
  		      props
  		    } = inspectedElement;
  		    const devtoolsInstance = idToDevToolsInstanceMap.get(id);

  		    if (devtoolsInstance === undefined) {
  		      console.warn(`Could not find DevToolsInstance with id "${id}"`);
  		      return;
  		    }

  		    if (devtoolsInstance.kind !== FIBER_INSTANCE) {
  		      // TODO: Handle VirtualInstance.
  		      return;
  		    }

  		    const fiber = devtoolsInstance.data;
  		    const {
  		      elementType,
  		      stateNode,
  		      tag,
  		      type
  		    } = fiber;

  		    switch (tag) {
  		      case ClassComponent:
  		      case IncompleteClassComponent:
  		      case IndeterminateComponent:
  		        global.$r = stateNode;
  		        break;

  		      case IncompleteFunctionComponent:
  		      case FunctionComponent:
  		        global.$r = {
  		          hooks,
  		          props,
  		          type
  		        };
  		        break;

  		      case ForwardRef:
  		        global.$r = {
  		          hooks,
  		          props,
  		          type: type.render
  		        };
  		        break;

  		      case MemoComponent:
  		      case SimpleMemoComponent:
  		        global.$r = {
  		          hooks,
  		          props,
  		          type: elementType != null && elementType.type != null ? elementType.type : type
  		        };
  		        break;

  		      default:
  		        global.$r = null;
  		        break;
  		    }
  		  }

  		  function storeAsGlobal(id, path, count) {
  		    if (isMostRecentlyInspectedElement(id)) {
  		      const value = utils_getInObject(mostRecentlyInspectedElement, path);
  		      const key = `$reactTemp${count}`;
  		      window[key] = value;
  		      console.log(key);
  		      console.log(value);
  		    }
  		  }

  		  function getSerializedElementValueByPath(id, path) {
  		    if (isMostRecentlyInspectedElement(id)) {
  		      const valueToCopy = utils_getInObject(mostRecentlyInspectedElement, path);
  		      return serializeToString(valueToCopy);
  		    }
  		  }

  		  function inspectElement(requestID, id, path, forceFullData) {
  		    if (path !== null) {
  		      mergeInspectedPaths(path);
  		    }

  		    if (isMostRecentlyInspectedElement(id) && !forceFullData) {
  		      if (!hasElementUpdatedSinceLastInspected) {
  		        if (path !== null) {
  		          let secondaryCategory = null;

  		          if (path[0] === 'hooks') {
  		            secondaryCategory = 'hooks';
  		          } // If this element has not been updated since it was last inspected,
  		          // we can just return the subset of data in the newly-inspected path.


  		          return {
  		            id,
  		            responseID: requestID,
  		            type: 'hydrated-path',
  		            path,
  		            value: cleanForBridge(utils_getInObject(mostRecentlyInspectedElement, path), createIsPathAllowed(null, secondaryCategory), path)
  		          };
  		        } else {
  		          // If this element has not been updated since it was last inspected, we don't need to return it.
  		          // Instead we can just return the ID to indicate that it has not changed.
  		          return {
  		            id,
  		            responseID: requestID,
  		            type: 'no-change'
  		          };
  		        }
  		      }
  		    } else {
  		      currentlyInspectedPaths = {};
  		    }

  		    hasElementUpdatedSinceLastInspected = false;

  		    try {
  		      mostRecentlyInspectedElement = inspectElementRaw(id);
  		    } catch (error) {
  		      // the error name is synced with ReactDebugHooks
  		      if (error.name === 'ReactDebugToolsRenderError') {
  		        let message = 'Error rendering inspected element.';
  		        let stack; // Log error & cause for user to debug

  		        console.error(message + '\n\n', error);

  		        if (error.cause != null) {
  		          const componentName = getDisplayNameForElementID(id);
  		          console.error('React DevTools encountered an error while trying to inspect hooks. ' + 'This is most likely caused by an error in current inspected component' + (componentName != null ? `: "${componentName}".` : '.') + '\nThe error thrown in the component is: \n\n', error.cause);

  		          if (error.cause instanceof Error) {
  		            message = error.cause.message || message;
  		            stack = error.cause.stack;
  		          }
  		        }

  		        return {
  		          type: 'error',
  		          errorType: 'user',
  		          id,
  		          responseID: requestID,
  		          message,
  		          stack
  		        };
  		      } // the error name is synced with ReactDebugHooks


  		      if (error.name === 'ReactDebugToolsUnsupportedHookError') {
  		        return {
  		          type: 'error',
  		          errorType: 'unknown-hook',
  		          id,
  		          responseID: requestID,
  		          message: 'Unsupported hook in the react-debug-tools package: ' + error.message
  		        };
  		      } // Log Uncaught Error


  		      console.error('Error inspecting element.\n\n', error);
  		      return {
  		        type: 'error',
  		        errorType: 'uncaught',
  		        id,
  		        responseID: requestID,
  		        message: error.message,
  		        stack: error.stack
  		      };
  		    }

  		    if (mostRecentlyInspectedElement === null) {
  		      return {
  		        id,
  		        responseID: requestID,
  		        type: 'not-found'
  		      };
  		    } // Any time an inspected element has an update,
  		    // we should update the selected $r value as wel.
  		    // Do this before dehydration (cleanForBridge).


  		    updateSelectedElement(mostRecentlyInspectedElement); // Clone before cleaning so that we preserve the full data.
  		    // This will enable us to send patches without re-inspecting if hydrated paths are requested.
  		    // (Reducing how often we shallow-render is a better DX for function components that use hooks.)

  		    const cleanedInspectedElement = { ...mostRecentlyInspectedElement
  		    }; // $FlowFixMe[prop-missing] found when upgrading Flow

  		    cleanedInspectedElement.context = cleanForBridge(cleanedInspectedElement.context, createIsPathAllowed('context', null)); // $FlowFixMe[prop-missing] found when upgrading Flow

  		    cleanedInspectedElement.hooks = cleanForBridge(cleanedInspectedElement.hooks, createIsPathAllowed('hooks', 'hooks')); // $FlowFixMe[prop-missing] found when upgrading Flow

  		    cleanedInspectedElement.props = cleanForBridge(cleanedInspectedElement.props, createIsPathAllowed('props', null)); // $FlowFixMe[prop-missing] found when upgrading Flow

  		    cleanedInspectedElement.state = cleanForBridge(cleanedInspectedElement.state, createIsPathAllowed('state', null));
  		    return {
  		      id,
  		      responseID: requestID,
  		      type: 'full-data',
  		      // $FlowFixMe[prop-missing] found when upgrading Flow
  		      value: cleanedInspectedElement
  		    };
  		  }

  		  function logElementToConsole(id) {
  		    const result = isMostRecentlyInspectedElementCurrent(id) ? mostRecentlyInspectedElement : inspectElementRaw(id);

  		    if (result === null) {
  		      console.warn(`Could not find DevToolsInstance with id "${id}"`);
  		      return;
  		    }

  		    const displayName = getDisplayNameForElementID(id);
  		    const supportsGroup = typeof console.groupCollapsed === 'function';

  		    if (supportsGroup) {
  		      console.groupCollapsed(`[Click to expand] %c<${displayName || 'Component'} />`, // --dom-tag-name-color is the CSS variable Chrome styles HTML elements with in the console.
  		      'color: var(--dom-tag-name-color); font-weight: normal;');
  		    }

  		    if (result.props !== null) {
  		      console.log('Props:', result.props);
  		    }

  		    if (result.state !== null) {
  		      console.log('State:', result.state);
  		    }

  		    if (result.hooks !== null) {
  		      console.log('Hooks:', result.hooks);
  		    }

  		    const hostInstances = findHostInstancesForElementID(id);

  		    if (hostInstances !== null) {
  		      console.log('Nodes:', hostInstances);
  		    }

  		    if (window.chrome || /firefox/i.test(navigator.userAgent)) {
  		      console.log('Right-click any value to save it as a global variable for further inspection.');
  		    }

  		    if (supportsGroup) {
  		      console.groupEnd();
  		    }
  		  }

  		  function deletePath(type, id, hookID, path) {
  		    const devtoolsInstance = idToDevToolsInstanceMap.get(id);

  		    if (devtoolsInstance === undefined) {
  		      console.warn(`Could not find DevToolsInstance with id "${id}"`);
  		      return;
  		    }

  		    if (devtoolsInstance.kind !== FIBER_INSTANCE) {
  		      // TODO: Handle VirtualInstance.
  		      return;
  		    }

  		    const fiber = devtoolsInstance.data;

  		    if (fiber !== null) {
  		      const instance = fiber.stateNode;

  		      switch (type) {
  		        case 'context':
  		          // To simplify hydration and display of primitive context values (e.g. number, string)
  		          // the inspectElement() method wraps context in a {value: ...} object.
  		          // We need to remove the first part of the path (the "value") before continuing.
  		          path = path.slice(1);

  		          switch (fiber.tag) {
  		            case ClassComponent:
  		              if (path.length === 0) ; else {
  		                deletePathInObject(instance.context, path);
  		              }

  		              instance.forceUpdate();
  		              break;
  		          }

  		          break;

  		        case 'hooks':
  		          if (typeof overrideHookStateDeletePath === 'function') {
  		            overrideHookStateDeletePath(fiber, hookID, path);
  		          }

  		          break;

  		        case 'props':
  		          if (instance === null) {
  		            if (typeof overridePropsDeletePath === 'function') {
  		              overridePropsDeletePath(fiber, path);
  		            }
  		          } else {
  		            fiber.pendingProps = copyWithDelete(instance.props, path);
  		            instance.forceUpdate();
  		          }

  		          break;

  		        case 'state':
  		          deletePathInObject(instance.state, path);
  		          instance.forceUpdate();
  		          break;
  		      }
  		    }
  		  }

  		  function renamePath(type, id, hookID, oldPath, newPath) {
  		    const devtoolsInstance = idToDevToolsInstanceMap.get(id);

  		    if (devtoolsInstance === undefined) {
  		      console.warn(`Could not find DevToolsInstance with id "${id}"`);
  		      return;
  		    }

  		    if (devtoolsInstance.kind !== FIBER_INSTANCE) {
  		      // TODO: Handle VirtualInstance.
  		      return;
  		    }

  		    const fiber = devtoolsInstance.data;

  		    if (fiber !== null) {
  		      const instance = fiber.stateNode;

  		      switch (type) {
  		        case 'context':
  		          // To simplify hydration and display of primitive context values (e.g. number, string)
  		          // the inspectElement() method wraps context in a {value: ...} object.
  		          // We need to remove the first part of the path (the "value") before continuing.
  		          oldPath = oldPath.slice(1);
  		          newPath = newPath.slice(1);

  		          switch (fiber.tag) {
  		            case ClassComponent:
  		              if (oldPath.length === 0) ; else {
  		                renamePathInObject(instance.context, oldPath, newPath);
  		              }

  		              instance.forceUpdate();
  		              break;
  		          }

  		          break;

  		        case 'hooks':
  		          if (typeof overrideHookStateRenamePath === 'function') {
  		            overrideHookStateRenamePath(fiber, hookID, oldPath, newPath);
  		          }

  		          break;

  		        case 'props':
  		          if (instance === null) {
  		            if (typeof overridePropsRenamePath === 'function') {
  		              overridePropsRenamePath(fiber, oldPath, newPath);
  		            }
  		          } else {
  		            fiber.pendingProps = copyWithRename(instance.props, oldPath, newPath);
  		            instance.forceUpdate();
  		          }

  		          break;

  		        case 'state':
  		          renamePathInObject(instance.state, oldPath, newPath);
  		          instance.forceUpdate();
  		          break;
  		      }
  		    }
  		  }

  		  function overrideValueAtPath(type, id, hookID, path, value) {
  		    const devtoolsInstance = idToDevToolsInstanceMap.get(id);

  		    if (devtoolsInstance === undefined) {
  		      console.warn(`Could not find DevToolsInstance with id "${id}"`);
  		      return;
  		    }

  		    if (devtoolsInstance.kind !== FIBER_INSTANCE) {
  		      // TODO: Handle VirtualInstance.
  		      return;
  		    }

  		    const fiber = devtoolsInstance.data;

  		    if (fiber !== null) {
  		      const instance = fiber.stateNode;

  		      switch (type) {
  		        case 'context':
  		          // To simplify hydration and display of primitive context values (e.g. number, string)
  		          // the inspectElement() method wraps context in a {value: ...} object.
  		          // We need to remove the first part of the path (the "value") before continuing.
  		          path = path.slice(1);

  		          switch (fiber.tag) {
  		            case ClassComponent:
  		              if (path.length === 0) {
  		                // Simple context value
  		                instance.context = value;
  		              } else {
  		                utils_setInObject(instance.context, path, value);
  		              }

  		              instance.forceUpdate();
  		              break;
  		          }

  		          break;

  		        case 'hooks':
  		          if (typeof overrideHookState === 'function') {
  		            overrideHookState(fiber, hookID, path, value);
  		          }

  		          break;

  		        case 'props':
  		          switch (fiber.tag) {
  		            case ClassComponent:
  		              fiber.pendingProps = copyWithSet(instance.props, path, value);
  		              instance.forceUpdate();
  		              break;

  		            default:
  		              if (typeof overrideProps === 'function') {
  		                overrideProps(fiber, path, value);
  		              }

  		              break;
  		          }

  		          break;

  		        case 'state':
  		          switch (fiber.tag) {
  		            case ClassComponent:
  		              utils_setInObject(instance.state, path, value);
  		              instance.forceUpdate();
  		              break;
  		          }

  		          break;
  		      }
  		    }
  		  }

  		  let currentCommitProfilingMetadata = null;
  		  let displayNamesByRootID = null;
  		  let initialTreeBaseDurationsMap = null;
  		  let isProfiling = false;
  		  let profilingStartTime = 0;
  		  let recordChangeDescriptions = false;
  		  let recordTimeline = false;
  		  let rootToCommitProfilingMetadataMap = null;

  		  function getProfilingData() {
  		    const dataForRoots = [];

  		    if (rootToCommitProfilingMetadataMap === null) {
  		      throw Error('getProfilingData() called before any profiling data was recorded');
  		    }

  		    rootToCommitProfilingMetadataMap.forEach((commitProfilingMetadata, rootID) => {
  		      const commitData = [];
  		      const displayName = displayNamesByRootID !== null && displayNamesByRootID.get(rootID) || 'Unknown';
  		      const initialTreeBaseDurations = initialTreeBaseDurationsMap !== null && initialTreeBaseDurationsMap.get(rootID) || [];
  		      commitProfilingMetadata.forEach((commitProfilingData, commitIndex) => {
  		        const {
  		          changeDescriptions,
  		          durations,
  		          effectDuration,
  		          maxActualDuration,
  		          passiveEffectDuration,
  		          priorityLevel,
  		          commitTime,
  		          updaters
  		        } = commitProfilingData;
  		        const fiberActualDurations = [];
  		        const fiberSelfDurations = [];

  		        for (let i = 0; i < durations.length; i += 3) {
  		          const fiberID = durations[i];
  		          fiberActualDurations.push([fiberID, formatDurationToMicrosecondsGranularity(durations[i + 1])]);
  		          fiberSelfDurations.push([fiberID, formatDurationToMicrosecondsGranularity(durations[i + 2])]);
  		        }

  		        commitData.push({
  		          changeDescriptions: changeDescriptions !== null ? Array.from(changeDescriptions.entries()) : null,
  		          duration: formatDurationToMicrosecondsGranularity(maxActualDuration),
  		          effectDuration: effectDuration !== null ? formatDurationToMicrosecondsGranularity(effectDuration) : null,
  		          fiberActualDurations,
  		          fiberSelfDurations,
  		          passiveEffectDuration: passiveEffectDuration !== null ? formatDurationToMicrosecondsGranularity(passiveEffectDuration) : null,
  		          priorityLevel,
  		          timestamp: commitTime,
  		          updaters
  		        });
  		      });
  		      dataForRoots.push({
  		        commitData,
  		        displayName,
  		        initialTreeBaseDurations,
  		        rootID
  		      });
  		    });
  		    let timelineData = null;

  		    if (typeof getTimelineData === 'function') {
  		      const currentTimelineData = getTimelineData();

  		      if (currentTimelineData) {
  		        const {
  		          batchUIDToMeasuresMap,
  		          internalModuleSourceToRanges,
  		          laneToLabelMap,
  		          laneToReactMeasureMap,
  		          ...rest
  		        } = currentTimelineData;
  		        timelineData = { ...rest,
  		          // Most of the data is safe to parse as-is,
  		          // but we need to convert the nested Arrays back to Maps.
  		          // Most of the data is safe to serialize as-is,
  		          // but we need to convert the Maps to nested Arrays.
  		          batchUIDToMeasuresKeyValueArray: Array.from(batchUIDToMeasuresMap.entries()),
  		          internalModuleSourceToRanges: Array.from(internalModuleSourceToRanges.entries()),
  		          laneToLabelKeyValueArray: Array.from(laneToLabelMap.entries()),
  		          laneToReactMeasureKeyValueArray: Array.from(laneToReactMeasureMap.entries())
  		        };
  		      }
  		    }

  		    return {
  		      dataForRoots,
  		      rendererID,
  		      timelineData
  		    };
  		  }

  		  function snapshotTreeBaseDurations(instance, target) {
  		    // We don't need to convert milliseconds to microseconds in this case,
  		    // because the profiling summary is JSON serialized.
  		    if (instance.kind !== FILTERED_FIBER_INSTANCE) {
  		      target.push([instance.id, instance.treeBaseDuration]);
  		    }

  		    for (let child = instance.firstChild; child !== null; child = child.nextSibling) {
  		      snapshotTreeBaseDurations(child, target);
  		    }
  		  }

  		  function startProfiling(shouldRecordChangeDescriptions, shouldRecordTimeline) {
  		    if (isProfiling) {
  		      return;
  		    }

  		    recordChangeDescriptions = shouldRecordChangeDescriptions;
  		    recordTimeline = shouldRecordTimeline; // Capture initial values as of the time profiling starts.
  		    // It's important we snapshot both the durations and the id-to-root map,
  		    // since either of these may change during the profiling session
  		    // (e.g. when a fiber is re-rendered or when a fiber gets removed).

  		    displayNamesByRootID = new Map();
  		    initialTreeBaseDurationsMap = new Map();
  		    hook.getFiberRoots(rendererID).forEach(root => {
  		      const rootInstance = rootToFiberInstanceMap.get(root);

  		      if (rootInstance === undefined) {
  		        throw new Error('Expected the root instance to already exist when starting profiling');
  		      }

  		      const rootID = rootInstance.id;
  		      displayNamesByRootID.set(rootID, getDisplayNameForRoot(root.current));
  		      const initialTreeBaseDurations = [];
  		      snapshotTreeBaseDurations(rootInstance, initialTreeBaseDurations);
  		      initialTreeBaseDurationsMap.set(rootID, initialTreeBaseDurations);
  		    });
  		    isProfiling = true;
  		    profilingStartTime = renderer_getCurrentTime();
  		    rootToCommitProfilingMetadataMap = new Map();

  		    if (toggleProfilingStatus !== null) {
  		      toggleProfilingStatus(true, recordTimeline);
  		    }
  		  }

  		  function stopProfiling() {
  		    isProfiling = false;
  		    recordChangeDescriptions = false;

  		    if (toggleProfilingStatus !== null) {
  		      toggleProfilingStatus(false, recordTimeline);
  		    }

  		    recordTimeline = false;
  		  } // Automatically start profiling so that we don't miss timing info from initial "mount".


  		  if (shouldStartProfilingNow) {
  		    startProfiling(profilingSettings.recordChangeDescriptions, profilingSettings.recordTimeline);
  		  }

  		  function getNearestFiber(devtoolsInstance) {
  		    if (devtoolsInstance.kind === VIRTUAL_INSTANCE) {
  		      let inst = devtoolsInstance;

  		      while (inst.kind === VIRTUAL_INSTANCE) {
  		        // For virtual instances, we search deeper until we find a Fiber instance.
  		        // Then we search upwards from that Fiber. That's because Virtual Instances
  		        // will always have an Fiber child filtered or not. If we searched its parents
  		        // we might skip through a filtered Error Boundary before we hit a FiberInstance.
  		        if (inst.firstChild === null) {
  		          return null;
  		        }

  		        inst = inst.firstChild;
  		      }

  		      return inst.data.return;
  		    } else {
  		      return devtoolsInstance.data;
  		    }
  		  } // React will switch between these implementations depending on whether
  		  // we have any manually suspended/errored-out Fibers or not.


  		  function shouldErrorFiberAlwaysNull() {
  		    return null;
  		  } // Map of Fiber and its force error status: true (error), false (toggled off)


  		  const forceErrorForFibers = new Map();

  		  function shouldErrorFiberAccordingToMap(fiber) {
  		    if (typeof setErrorHandler !== 'function') {
  		      throw new Error('Expected overrideError() to not get called for earlier React versions.');
  		    }

  		    let status = forceErrorForFibers.get(fiber);

  		    if (status === false) {
  		      // TRICKY overrideError adds entries to this Map,
  		      // so ideally it would be the method that clears them too,
  		      // but that would break the functionality of the feature,
  		      // since DevTools needs to tell React to act differently than it normally would
  		      // (don't just re-render the failed boundary, but reset its errored state too).
  		      // So we can only clear it after telling React to reset the state.
  		      // Technically this is premature and we should schedule it for later,
  		      // since the render could always fail without committing the updated error boundary,
  		      // but since this is a DEV-only feature, the simplicity is worth the trade off.
  		      forceErrorForFibers.delete(fiber);

  		      if (forceErrorForFibers.size === 0) {
  		        // Last override is gone. Switch React back to fast path.
  		        setErrorHandler(shouldErrorFiberAlwaysNull);
  		      }

  		      return false;
  		    }

  		    if (status === undefined && fiber.alternate !== null) {
  		      status = forceErrorForFibers.get(fiber.alternate);

  		      if (status === false) {
  		        forceErrorForFibers.delete(fiber.alternate);

  		        if (forceErrorForFibers.size === 0) {
  		          // Last override is gone. Switch React back to fast path.
  		          setErrorHandler(shouldErrorFiberAlwaysNull);
  		        }
  		      }
  		    }

  		    if (status === undefined) {
  		      return false;
  		    }

  		    return status;
  		  }

  		  function overrideError(id, forceError) {
  		    if (typeof setErrorHandler !== 'function' || typeof scheduleUpdate !== 'function') {
  		      throw new Error('Expected overrideError() to not get called for earlier React versions.');
  		    }

  		    const devtoolsInstance = idToDevToolsInstanceMap.get(id);

  		    if (devtoolsInstance === undefined) {
  		      return;
  		    }

  		    const nearestFiber = getNearestFiber(devtoolsInstance);

  		    if (nearestFiber === null) {
  		      return;
  		    }

  		    let fiber = nearestFiber;

  		    while (!isErrorBoundary(fiber)) {
  		      if (fiber.return === null) {
  		        return;
  		      }

  		      fiber = fiber.return;
  		    }

  		    forceErrorForFibers.set(fiber, forceError);

  		    if (fiber.alternate !== null) {
  		      // We only need one of the Fibers in the set.
  		      forceErrorForFibers.delete(fiber.alternate);
  		    }

  		    if (forceErrorForFibers.size === 1) {
  		      // First override is added. Switch React to slower path.
  		      setErrorHandler(shouldErrorFiberAccordingToMap);
  		    }

  		    scheduleUpdate(fiber);
  		  }

  		  function shouldSuspendFiberAlwaysFalse() {
  		    return false;
  		  }

  		  const forceFallbackForFibers = new Set();

  		  function shouldSuspendFiberAccordingToSet(fiber) {
  		    return forceFallbackForFibers.has(fiber) || fiber.alternate !== null && forceFallbackForFibers.has(fiber.alternate);
  		  }

  		  function overrideSuspense(id, forceFallback) {
  		    if (typeof setSuspenseHandler !== 'function' || typeof scheduleUpdate !== 'function') {
  		      throw new Error('Expected overrideSuspense() to not get called for earlier React versions.');
  		    }

  		    const devtoolsInstance = idToDevToolsInstanceMap.get(id);

  		    if (devtoolsInstance === undefined) {
  		      return;
  		    }

  		    const nearestFiber = getNearestFiber(devtoolsInstance);

  		    if (nearestFiber === null) {
  		      return;
  		    }

  		    let fiber = nearestFiber;

  		    while (fiber.tag !== SuspenseComponent) {
  		      if (fiber.return === null) {
  		        return;
  		      }

  		      fiber = fiber.return;
  		    }

  		    if (fiber.alternate !== null) {
  		      // We only need one of the Fibers in the set.
  		      forceFallbackForFibers.delete(fiber.alternate);
  		    }

  		    if (forceFallback) {
  		      forceFallbackForFibers.add(fiber);

  		      if (forceFallbackForFibers.size === 1) {
  		        // First override is added. Switch React to slower path.
  		        setSuspenseHandler(shouldSuspendFiberAccordingToSet);
  		      }
  		    } else {
  		      forceFallbackForFibers.delete(fiber);

  		      if (forceFallbackForFibers.size === 0) {
  		        // Last override is gone. Switch React back to fast path.
  		        setSuspenseHandler(shouldSuspendFiberAlwaysFalse);
  		      }
  		    }

  		    scheduleUpdate(fiber);
  		  } // Remember if we're trying to restore the selection after reload.
  		  // In that case, we'll do some extra checks for matching mounts.


  		  let trackedPath = null;
  		  let trackedPathMatchFiber = null; // This is the deepest unfiltered match of a Fiber.

  		  let trackedPathMatchInstance = null; // This is the deepest matched filtered Instance.

  		  let trackedPathMatchDepth = -1;
  		  let mightBeOnTrackedPath = false;

  		  function setTrackedPath(path) {
  		    if (path === null) {
  		      trackedPathMatchFiber = null;
  		      trackedPathMatchInstance = null;
  		      trackedPathMatchDepth = -1;
  		      mightBeOnTrackedPath = false;
  		    }

  		    trackedPath = path;
  		  } // We call this before traversing a new mount.
  		  // It remembers whether this Fiber is the next best match for tracked path.
  		  // The return value signals whether we should keep matching siblings or not.


  		  function updateTrackedPathStateBeforeMount(fiber, fiberInstance) {
  		    if (trackedPath === null || !mightBeOnTrackedPath) {
  		      // Fast path: there's nothing to track so do nothing and ignore siblings.
  		      return false;
  		    }

  		    const returnFiber = fiber.return;
  		    const returnAlternate = returnFiber !== null ? returnFiber.alternate : null; // By now we know there's some selection to restore, and this is a new Fiber.
  		    // Is this newly mounted Fiber a direct child of the current best match?
  		    // (This will also be true for new roots if we haven't matched anything yet.)

  		    if (trackedPathMatchFiber === returnFiber || trackedPathMatchFiber === returnAlternate && returnAlternate !== null) {
  		      // Is this the next Fiber we should select? Let's compare the frames.
  		      const actualFrame = getPathFrame(fiber); // $FlowFixMe[incompatible-use] found when upgrading Flow

  		      const expectedFrame = trackedPath[trackedPathMatchDepth + 1];

  		      if (expectedFrame === undefined) {
  		        throw new Error('Expected to see a frame at the next depth.');
  		      }

  		      if (actualFrame.index === expectedFrame.index && actualFrame.key === expectedFrame.key && actualFrame.displayName === expectedFrame.displayName) {
  		        // We have our next match.
  		        trackedPathMatchFiber = fiber;

  		        if (fiberInstance !== null && fiberInstance.kind === FIBER_INSTANCE) {
  		          trackedPathMatchInstance = fiberInstance;
  		        }

  		        trackedPathMatchDepth++; // Are we out of frames to match?
  		        // $FlowFixMe[incompatible-use] found when upgrading Flow

  		        if (trackedPathMatchDepth === trackedPath.length - 1) {
  		          // There's nothing that can possibly match afterwards.
  		          // Don't check the children.
  		          mightBeOnTrackedPath = false;
  		        } else {
  		          // Check the children, as they might reveal the next match.
  		          mightBeOnTrackedPath = true;
  		        } // In either case, since we have a match, we don't need
  		        // to check the siblings. They'll never match.


  		        return false;
  		      }
  		    }

  		    if (trackedPathMatchFiber === null && fiberInstance === null) {
  		      // We're now looking for a Virtual Instance. It might be inside filtered Fibers
  		      // so we keep looking below.
  		      return true;
  		    } // This Fiber's parent is on the path, but this Fiber itself isn't.
  		    // There's no need to check its children--they won't be on the path either.


  		    mightBeOnTrackedPath = false; // However, one of its siblings may be on the path so keep searching.

  		    return true;
  		  }

  		  function updateVirtualTrackedPathStateBeforeMount(virtualInstance, parentInstance) {
  		    if (trackedPath === null || !mightBeOnTrackedPath) {
  		      // Fast path: there's nothing to track so do nothing and ignore siblings.
  		      return false;
  		    } // Check if we've matched our nearest unfiltered parent so far.


  		    if (trackedPathMatchInstance === parentInstance) {
  		      const actualFrame = getVirtualPathFrame(virtualInstance); // $FlowFixMe[incompatible-use] found when upgrading Flow

  		      const expectedFrame = trackedPath[trackedPathMatchDepth + 1];

  		      if (expectedFrame === undefined) {
  		        throw new Error('Expected to see a frame at the next depth.');
  		      }

  		      if (actualFrame.index === expectedFrame.index && actualFrame.key === expectedFrame.key && actualFrame.displayName === expectedFrame.displayName) {
  		        // We have our next match.
  		        trackedPathMatchFiber = null; // Don't bother looking in Fibers anymore. We're deeper now.

  		        trackedPathMatchInstance = virtualInstance;
  		        trackedPathMatchDepth++; // Are we out of frames to match?
  		        // $FlowFixMe[incompatible-use] found when upgrading Flow

  		        if (trackedPathMatchDepth === trackedPath.length - 1) {
  		          // There's nothing that can possibly match afterwards.
  		          // Don't check the children.
  		          mightBeOnTrackedPath = false;
  		        } else {
  		          // Check the children, as they might reveal the next match.
  		          mightBeOnTrackedPath = true;
  		        } // In either case, since we have a match, we don't need
  		        // to check the siblings. They'll never match.


  		        return false;
  		      }
  		    }

  		    if (trackedPathMatchFiber !== null) {
  		      // We're still looking for a Fiber which might be underneath this instance.
  		      return true;
  		    } // This Instance's parent is on the path, but this Instance itself isn't.
  		    // There's no need to check its children--they won't be on the path either.


  		    mightBeOnTrackedPath = false; // However, one of its siblings may be on the path so keep searching.

  		    return true;
  		  }

  		  function updateTrackedPathStateAfterMount(mightSiblingsBeOnTrackedPath) {
  		    // updateTrackedPathStateBeforeMount() told us whether to match siblings.
  		    // Now that we're entering siblings, let's use that information.
  		    mightBeOnTrackedPath = mightSiblingsBeOnTrackedPath;
  		  } // Roots don't have a real persistent identity.
  		  // A root's "pseudo key" is "childDisplayName:indexWithThatName".
  		  // For example, "App:0" or, in case of similar roots, "Story:0", "Story:1", etc.
  		  // We will use this to try to disambiguate roots when restoring selection between reloads.


  		  const rootPseudoKeys = new Map();
  		  const rootDisplayNameCounter = new Map();

  		  function setRootPseudoKey(id, fiber) {
  		    const name = getDisplayNameForRoot(fiber);
  		    const counter = rootDisplayNameCounter.get(name) || 0;
  		    rootDisplayNameCounter.set(name, counter + 1);
  		    const pseudoKey = `${name}:${counter}`;
  		    rootPseudoKeys.set(id, pseudoKey);
  		  }

  		  function removeRootPseudoKey(id) {
  		    const pseudoKey = rootPseudoKeys.get(id);

  		    if (pseudoKey === undefined) {
  		      throw new Error('Expected root pseudo key to be known.');
  		    }

  		    const name = pseudoKey.slice(0, pseudoKey.lastIndexOf(':'));
  		    const counter = rootDisplayNameCounter.get(name);

  		    if (counter === undefined) {
  		      throw new Error('Expected counter to be known.');
  		    }

  		    if (counter > 1) {
  		      rootDisplayNameCounter.set(name, counter - 1);
  		    } else {
  		      rootDisplayNameCounter.delete(name);
  		    }

  		    rootPseudoKeys.delete(id);
  		  }

  		  function getDisplayNameForRoot(fiber) {
  		    let preferredDisplayName = null;
  		    let fallbackDisplayName = null;
  		    let child = fiber.child; // Go at most three levels deep into direct children
  		    // while searching for a child that has a displayName.

  		    for (let i = 0; i < 3; i++) {
  		      if (child === null) {
  		        break;
  		      }

  		      const displayName = getDisplayNameForFiber(child);

  		      if (displayName !== null) {
  		        // Prefer display names that we get from user-defined components.
  		        // We want to avoid using e.g. 'Suspense' unless we find nothing else.
  		        if (typeof child.type === 'function') {
  		          // There's a few user-defined tags, but we'll prefer the ones
  		          // that are usually explicitly named (function or class components).
  		          preferredDisplayName = displayName;
  		        } else if (fallbackDisplayName === null) {
  		          fallbackDisplayName = displayName;
  		        }
  		      }

  		      if (preferredDisplayName !== null) {
  		        break;
  		      }

  		      child = child.child;
  		    }

  		    return preferredDisplayName || fallbackDisplayName || 'Anonymous';
  		  }

  		  function getPathFrame(fiber) {
  		    const {
  		      key
  		    } = fiber;
  		    let displayName = getDisplayNameForFiber(fiber);
  		    const index = fiber.index;

  		    switch (fiber.tag) {
  		      case HostRoot:
  		        // Roots don't have a real displayName, index, or key.
  		        // Instead, we'll use the pseudo key (childDisplayName:indexWithThatName).
  		        const rootInstance = rootToFiberInstanceMap.get(fiber.stateNode);

  		        if (rootInstance === undefined) {
  		          throw new Error('Expected the root instance to exist when computing a path');
  		        }

  		        const pseudoKey = rootPseudoKeys.get(rootInstance.id);

  		        if (pseudoKey === undefined) {
  		          throw new Error('Expected mounted root to have known pseudo key.');
  		        }

  		        displayName = pseudoKey;
  		        break;

  		      case HostComponent:
  		        displayName = fiber.type;
  		        break;
  		    }

  		    return {
  		      displayName,
  		      key,
  		      index
  		    };
  		  }

  		  function getVirtualPathFrame(virtualInstance) {
  		    return {
  		      displayName: virtualInstance.data.name || '',
  		      key: virtualInstance.data.key == null ? null : virtualInstance.data.key,
  		      index: -1 // We use -1 to indicate that this is a virtual path frame.

  		    };
  		  } // Produces a serializable representation that does a best effort
  		  // of identifying a particular Fiber between page reloads.
  		  // The return path will contain Fibers that are "invisible" to the store
  		  // because their keys and indexes are important to restoring the selection.


  		  function getPathForElement(id) {
  		    const devtoolsInstance = idToDevToolsInstanceMap.get(id);

  		    if (devtoolsInstance === undefined) {
  		      return null;
  		    }

  		    const keyPath = [];
  		    let inst = devtoolsInstance;

  		    while (inst.kind === VIRTUAL_INSTANCE) {
  		      keyPath.push(getVirtualPathFrame(inst));

  		      if (inst.parent === null) {
  		        // This is a bug but non-essential. We should've found a root instance.
  		        return null;
  		      }

  		      inst = inst.parent;
  		    }

  		    let fiber = inst.data;

  		    while (fiber !== null) {
  		      // $FlowFixMe[incompatible-call] found when upgrading Flow
  		      keyPath.push(getPathFrame(fiber)); // $FlowFixMe[incompatible-use] found when upgrading Flow

  		      fiber = fiber.return;
  		    }

  		    keyPath.reverse();
  		    return keyPath;
  		  }

  		  function getBestMatchForTrackedPath() {
  		    if (trackedPath === null) {
  		      // Nothing to match.
  		      return null;
  		    }

  		    if (trackedPathMatchInstance === null) {
  		      // We didn't find anything.
  		      return null;
  		    }

  		    return {
  		      id: trackedPathMatchInstance.id,
  		      // $FlowFixMe[incompatible-use] found when upgrading Flow
  		      isFullMatch: trackedPathMatchDepth === trackedPath.length - 1
  		    };
  		  }

  		  const formatPriorityLevel = priorityLevel => {
  		    if (priorityLevel == null) {
  		      return 'Unknown';
  		    }

  		    switch (priorityLevel) {
  		      case ImmediatePriority:
  		        return 'Immediate';

  		      case UserBlockingPriority:
  		        return 'User-Blocking';

  		      case NormalPriority:
  		        return 'Normal';

  		      case LowPriority:
  		        return 'Low';

  		      case IdlePriority:
  		        return 'Idle';

  		      case NoPriority:
  		      default:
  		        return 'Unknown';
  		    }
  		  };

  		  function setTraceUpdatesEnabled(isEnabled) {
  		    traceUpdatesEnabled = isEnabled;
  		  }

  		  function hasElementWithId(id) {
  		    return idToDevToolsInstanceMap.has(id);
  		  }

  		  function getSourceForFiberInstance(fiberInstance) {
  		    // Favor the owner source if we have one.
  		    const ownerSource = getSourceForInstance(fiberInstance);

  		    if (ownerSource !== null) {
  		      return ownerSource;
  		    } // Otherwise fallback to the throwing trick.


  		    const dispatcherRef = getDispatcherRef(renderer);
  		    const stackFrame = dispatcherRef == null ? null : getSourceLocationByFiber(ReactTypeOfWork, fiberInstance.data, dispatcherRef);

  		    if (stackFrame === null) {
  		      return null;
  		    }

  		    const source = parseSourceFromComponentStack(stackFrame);
  		    fiberInstance.source = source;
  		    return source;
  		  }

  		  function getSourceForInstance(instance) {
  		    let unresolvedSource = instance.source;

  		    if (unresolvedSource === null) {
  		      // We don't have any source yet. We can try again later in case an owned child mounts later.
  		      // TODO: We won't have any information here if the child is filtered.
  		      return null;
  		    }

  		    if (instance.kind === VIRTUAL_INSTANCE) {
  		      // We might have found one on the virtual instance.
  		      const debugLocation = instance.data.debugLocation;

  		      if (debugLocation != null) {
  		        unresolvedSource = debugLocation;
  		      }
  		    } // If we have the debug stack (the creation stack of the JSX) for any owned child of this
  		    // component, then at the bottom of that stack will be a stack frame that is somewhere within
  		    // the component's function body. Typically it would be the callsite of the JSX unless there's
  		    // any intermediate utility functions. This won't point to the top of the component function
  		    // but it's at least somewhere within it.


  		    if (renderer_isError(unresolvedSource)) {
  		      return instance.source = parseSourceFromOwnerStack(unresolvedSource);
  		    }

  		    if (typeof unresolvedSource === 'string') {
  		      const idx = unresolvedSource.lastIndexOf('\n');
  		      const lastLine = idx === -1 ? unresolvedSource : unresolvedSource.slice(idx + 1);
  		      return instance.source = parseSourceFromComponentStack(lastLine);
  		    } // $FlowFixMe: refined.


  		    return unresolvedSource;
  		  }

  		  const internalMcpFunctions = {};

  		  return {
  		    cleanup,
  		    clearErrorsAndWarnings,
  		    clearErrorsForElementID,
  		    clearWarningsForElementID,
  		    getSerializedElementValueByPath,
  		    deletePath,
  		    findHostInstancesForElementID,
  		    flushInitialOperations,
  		    getBestMatchForTrackedPath,
  		    getDisplayNameForElementID,
  		    getNearestMountedDOMNode,
  		    getElementIDForHostInstance,
  		    getInstanceAndStyle,
  		    getOwnersList,
  		    getPathForElement,
  		    getProfilingData,
  		    handleCommitFiberRoot,
  		    handleCommitFiberUnmount,
  		    handlePostCommitFiberRoot,
  		    hasElementWithId,
  		    inspectElement,
  		    logElementToConsole,
  		    getComponentStack,
  		    getElementAttributeByPath,
  		    getElementSourceFunctionById,
  		    onErrorOrWarning,
  		    overrideError,
  		    overrideSuspense,
  		    overrideValueAtPath,
  		    renamePath,
  		    renderer,
  		    setTraceUpdatesEnabled,
  		    setTrackedPath,
  		    startProfiling,
  		    stopProfiling,
  		    storeAsGlobal,
  		    updateComponentFilters,
  		    getEnvironmentNames,
  		    ...internalMcpFunctions
  		  };
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		function decorate(object, attr, fn) {
  		  const old = object[attr]; // $FlowFixMe[missing-this-annot] webpack config needs to be updated to allow `this` type annotations

  		  object[attr] = function (instance) {
  		    return fn.call(this, old, arguments);
  		  };

  		  return old;
  		}
  		function decorateMany(source, fns) {
  		  const olds = {};

  		  for (const name in fns) {
  		    olds[name] = decorate(source, name, fns[name]);
  		  }

  		  return olds;
  		}
  		function restoreMany(source, olds) {
  		  for (const name in olds) {
  		    source[name] = olds[name];
  		  }
  		} // $FlowFixMe[missing-this-annot] webpack config needs to be updated to allow `this` type annotations

  		function forceUpdate(instance) {
  		  if (typeof instance.forceUpdate === 'function') {
  		    instance.forceUpdate();
  		  } else if (instance.updater != null && typeof instance.updater.enqueueForceUpdate === 'function') {
  		    instance.updater.enqueueForceUpdate(this, () => {}, 'forceUpdate');
  		  }
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */







  		function getData(internalInstance) {
  		  let displayName = null;
  		  let key = null; // != used deliberately here to catch undefined and null

  		  if (internalInstance._currentElement != null) {
  		    if (internalInstance._currentElement.key) {
  		      key = String(internalInstance._currentElement.key);
  		    }

  		    const elementType = internalInstance._currentElement.type;

  		    if (typeof elementType === 'string') {
  		      displayName = elementType;
  		    } else if (typeof elementType === 'function') {
  		      displayName = getDisplayName(elementType);
  		    }
  		  }

  		  return {
  		    displayName,
  		    key
  		  };
  		}

  		function getElementType(internalInstance) {
  		  // != used deliberately here to catch undefined and null
  		  if (internalInstance._currentElement != null) {
  		    const elementType = internalInstance._currentElement.type;

  		    if (typeof elementType === 'function') {
  		      const publicInstance = internalInstance.getPublicInstance();

  		      if (publicInstance !== null) {
  		        return types_ElementTypeClass;
  		      } else {
  		        return types_ElementTypeFunction;
  		      }
  		    } else if (typeof elementType === 'string') {
  		      return ElementTypeHostComponent;
  		    }
  		  }

  		  return ElementTypeOtherOrUnknown;
  		}

  		function getChildren(internalInstance) {
  		  const children = []; // If the parent is a native node without rendered children, but with
  		  // multiple string children, then the `element` that gets passed in here is
  		  // a plain value -- a string or number.

  		  if (typeof internalInstance !== 'object') ; else if (internalInstance._currentElement === null || internalInstance._currentElement === false) ; else if (internalInstance._renderedComponent) {
  		    const child = internalInstance._renderedComponent;

  		    if (getElementType(child) !== ElementTypeOtherOrUnknown) {
  		      children.push(child);
  		    }
  		  } else if (internalInstance._renderedChildren) {
  		    const renderedChildren = internalInstance._renderedChildren;

  		    for (const name in renderedChildren) {
  		      const child = renderedChildren[name];

  		      if (getElementType(child) !== ElementTypeOtherOrUnknown) {
  		        children.push(child);
  		      }
  		    }
  		  } // Note: we skip the case where children are just strings or numbers
  		  // because the new DevTools skips over host text nodes anyway.


  		  return children;
  		}

  		function legacy_renderer_attach(hook, rendererID, renderer, global) {
  		  const idToInternalInstanceMap = new Map();
  		  const internalInstanceToIDMap = new WeakMap();
  		  const internalInstanceToRootIDMap = new WeakMap();
  		  let getElementIDForHostInstance = null;
  		  let findHostInstanceForInternalID;

  		  let getNearestMountedDOMNode = node => {
  		    // Not implemented.
  		    return null;
  		  };

  		  if (renderer.ComponentTree) {
  		    getElementIDForHostInstance = node => {
  		      const internalInstance = renderer.ComponentTree.getClosestInstanceFromNode(node);
  		      return internalInstanceToIDMap.get(internalInstance) || null;
  		    };

  		    findHostInstanceForInternalID = id => {
  		      const internalInstance = idToInternalInstanceMap.get(id);
  		      return renderer.ComponentTree.getNodeFromInstance(internalInstance);
  		    };

  		    getNearestMountedDOMNode = node => {
  		      const internalInstance = renderer.ComponentTree.getClosestInstanceFromNode(node);

  		      if (internalInstance != null) {
  		        return renderer.ComponentTree.getNodeFromInstance(internalInstance);
  		      }

  		      return null;
  		    };
  		  } else if (renderer.Mount.getID && renderer.Mount.getNode) {
  		    getElementIDForHostInstance = node => {
  		      // Not implemented.
  		      return null;
  		    };

  		    findHostInstanceForInternalID = id => {
  		      // Not implemented.
  		      return null;
  		    };
  		  }

  		  function getDisplayNameForElementID(id) {
  		    const internalInstance = idToInternalInstanceMap.get(id);
  		    return internalInstance ? getData(internalInstance).displayName : null;
  		  }

  		  function getID(internalInstance) {
  		    if (typeof internalInstance !== 'object' || internalInstance === null) {
  		      throw new Error('Invalid internal instance: ' + internalInstance);
  		    }

  		    if (!internalInstanceToIDMap.has(internalInstance)) {
  		      const id = getUID();
  		      internalInstanceToIDMap.set(internalInstance, id);
  		      idToInternalInstanceMap.set(id, internalInstance);
  		    }

  		    return internalInstanceToIDMap.get(internalInstance);
  		  }

  		  function areEqualArrays(a, b) {
  		    if (a.length !== b.length) {
  		      return false;
  		    }

  		    for (let i = 0; i < a.length; i++) {
  		      if (a[i] !== b[i]) {
  		        return false;
  		      }
  		    }

  		    return true;
  		  } // This is shared mutable state that lets us keep track of where we are.


  		  let parentIDStack = [];
  		  let oldReconcilerMethods = null;

  		  if (renderer.Reconciler) {
  		    // React 15
  		    oldReconcilerMethods = decorateMany(renderer.Reconciler, {
  		      mountComponent(fn, args) {
  		        const internalInstance = args[0];
  		        const hostContainerInfo = args[3];

  		        if (getElementType(internalInstance) === ElementTypeOtherOrUnknown) {
  		          // $FlowFixMe[object-this-reference] found when upgrading Flow
  		          return fn.apply(this, args);
  		        }

  		        if (hostContainerInfo._topLevelWrapper === undefined) {
  		          // SSR
  		          // $FlowFixMe[object-this-reference] found when upgrading Flow
  		          return fn.apply(this, args);
  		        }

  		        const id = getID(internalInstance); // Push the operation.

  		        const parentID = parentIDStack.length > 0 ? parentIDStack[parentIDStack.length - 1] : 0;
  		        recordMount(internalInstance, id, parentID);
  		        parentIDStack.push(id); // Remember the root.

  		        internalInstanceToRootIDMap.set(internalInstance, getID(hostContainerInfo._topLevelWrapper));

  		        try {
  		          // $FlowFixMe[object-this-reference] found when upgrading Flow
  		          const result = fn.apply(this, args);
  		          parentIDStack.pop();
  		          return result;
  		        } catch (err) {
  		          parentIDStack = [];
  		          throw err;
  		        } finally {
  		          if (parentIDStack.length === 0) {
  		            const rootID = internalInstanceToRootIDMap.get(internalInstance);

  		            if (rootID === undefined) {
  		              throw new Error('Expected to find root ID.');
  		            }

  		            flushPendingEvents(rootID);
  		          }
  		        }
  		      },

  		      performUpdateIfNecessary(fn, args) {
  		        const internalInstance = args[0];

  		        if (getElementType(internalInstance) === ElementTypeOtherOrUnknown) {
  		          // $FlowFixMe[object-this-reference] found when upgrading Flow
  		          return fn.apply(this, args);
  		        }

  		        const id = getID(internalInstance);
  		        parentIDStack.push(id);
  		        const prevChildren = getChildren(internalInstance);

  		        try {
  		          // $FlowFixMe[object-this-reference] found when upgrading Flow
  		          const result = fn.apply(this, args);
  		          const nextChildren = getChildren(internalInstance);

  		          if (!areEqualArrays(prevChildren, nextChildren)) {
  		            // Push the operation
  		            recordReorder(internalInstance, id, nextChildren);
  		          }

  		          parentIDStack.pop();
  		          return result;
  		        } catch (err) {
  		          parentIDStack = [];
  		          throw err;
  		        } finally {
  		          if (parentIDStack.length === 0) {
  		            const rootID = internalInstanceToRootIDMap.get(internalInstance);

  		            if (rootID === undefined) {
  		              throw new Error('Expected to find root ID.');
  		            }

  		            flushPendingEvents(rootID);
  		          }
  		        }
  		      },

  		      receiveComponent(fn, args) {
  		        const internalInstance = args[0];

  		        if (getElementType(internalInstance) === ElementTypeOtherOrUnknown) {
  		          // $FlowFixMe[object-this-reference] found when upgrading Flow
  		          return fn.apply(this, args);
  		        }

  		        const id = getID(internalInstance);
  		        parentIDStack.push(id);
  		        const prevChildren = getChildren(internalInstance);

  		        try {
  		          // $FlowFixMe[object-this-reference] found when upgrading Flow
  		          const result = fn.apply(this, args);
  		          const nextChildren = getChildren(internalInstance);

  		          if (!areEqualArrays(prevChildren, nextChildren)) {
  		            // Push the operation
  		            recordReorder(internalInstance, id, nextChildren);
  		          }

  		          parentIDStack.pop();
  		          return result;
  		        } catch (err) {
  		          parentIDStack = [];
  		          throw err;
  		        } finally {
  		          if (parentIDStack.length === 0) {
  		            const rootID = internalInstanceToRootIDMap.get(internalInstance);

  		            if (rootID === undefined) {
  		              throw new Error('Expected to find root ID.');
  		            }

  		            flushPendingEvents(rootID);
  		          }
  		        }
  		      },

  		      unmountComponent(fn, args) {
  		        const internalInstance = args[0];

  		        if (getElementType(internalInstance) === ElementTypeOtherOrUnknown) {
  		          // $FlowFixMe[object-this-reference] found when upgrading Flow
  		          return fn.apply(this, args);
  		        }

  		        const id = getID(internalInstance);
  		        parentIDStack.push(id);

  		        try {
  		          // $FlowFixMe[object-this-reference] found when upgrading Flow
  		          const result = fn.apply(this, args);
  		          parentIDStack.pop(); // Push the operation.

  		          recordUnmount(internalInstance, id);
  		          return result;
  		        } catch (err) {
  		          parentIDStack = [];
  		          throw err;
  		        } finally {
  		          if (parentIDStack.length === 0) {
  		            const rootID = internalInstanceToRootIDMap.get(internalInstance);

  		            if (rootID === undefined) {
  		              throw new Error('Expected to find root ID.');
  		            }

  		            flushPendingEvents(rootID);
  		          }
  		        }
  		      }

  		    });
  		  }

  		  function cleanup() {
  		    if (oldReconcilerMethods !== null) {
  		      if (renderer.Component) {
  		        restoreMany(renderer.Component.Mixin, oldReconcilerMethods);
  		      } else {
  		        restoreMany(renderer.Reconciler, oldReconcilerMethods);
  		      }
  		    }

  		    oldReconcilerMethods = null;
  		  }

  		  function recordMount(internalInstance, id, parentID) {
  		    const isRoot = parentID === 0;

  		    if (isRoot) {
  		      // TODO Is this right? For all versions?
  		      const hasOwnerMetadata = internalInstance._currentElement != null && internalInstance._currentElement._owner != null;
  		      pushOperation(TREE_OPERATION_ADD);
  		      pushOperation(id);
  		      pushOperation(ElementTypeRoot);
  		      pushOperation(0); // StrictMode compliant?

  		      pushOperation(0); // Profiling flag

  		      pushOperation(0); // StrictMode supported?

  		      pushOperation(hasOwnerMetadata ? 1 : 0);
  		    } else {
  		      const type = getElementType(internalInstance);
  		      const {
  		        displayName,
  		        key
  		      } = getData(internalInstance);
  		      const ownerID = internalInstance._currentElement != null && internalInstance._currentElement._owner != null ? getID(internalInstance._currentElement._owner) : 0;
  		      const displayNameStringID = getStringID(displayName);
  		      const keyStringID = getStringID(key);
  		      pushOperation(TREE_OPERATION_ADD);
  		      pushOperation(id);
  		      pushOperation(type);
  		      pushOperation(parentID);
  		      pushOperation(ownerID);
  		      pushOperation(displayNameStringID);
  		      pushOperation(keyStringID);
  		    }
  		  }

  		  function recordReorder(internalInstance, id, nextChildren) {
  		    pushOperation(TREE_OPERATION_REORDER_CHILDREN);
  		    pushOperation(id);
  		    const nextChildIDs = nextChildren.map(getID);
  		    pushOperation(nextChildIDs.length);

  		    for (let i = 0; i < nextChildIDs.length; i++) {
  		      pushOperation(nextChildIDs[i]);
  		    }
  		  }

  		  function recordUnmount(internalInstance, id) {
  		    pendingUnmountedIDs.push(id);
  		    idToInternalInstanceMap.delete(id);
  		  }

  		  function crawlAndRecordInitialMounts(id, parentID, rootID) {

  		    const internalInstance = idToInternalInstanceMap.get(id);

  		    if (internalInstance != null) {
  		      internalInstanceToRootIDMap.set(internalInstance, rootID);
  		      recordMount(internalInstance, id, parentID);
  		      getChildren(internalInstance).forEach(child => crawlAndRecordInitialMounts(getID(child), id, rootID));
  		    }
  		  }

  		  function flushInitialOperations() {
  		    // Crawl roots though and register any nodes that mounted before we were injected.
  		    const roots = renderer.Mount._instancesByReactRootID || renderer.Mount._instancesByContainerID;

  		    for (const key in roots) {
  		      const internalInstance = roots[key];
  		      const id = getID(internalInstance);
  		      crawlAndRecordInitialMounts(id, 0, id);
  		      flushPendingEvents(id);
  		    }
  		  }

  		  const pendingOperations = [];
  		  const pendingStringTable = new Map();
  		  let pendingUnmountedIDs = [];
  		  let pendingStringTableLength = 0;
  		  let pendingUnmountedRootID = null;

  		  function flushPendingEvents(rootID) {
  		    if (pendingOperations.length === 0 && pendingUnmountedIDs.length === 0 && pendingUnmountedRootID === null) {
  		      return;
  		    }

  		    const numUnmountIDs = pendingUnmountedIDs.length + (pendingUnmountedRootID === null ? 0 : 1);
  		    const operations = new Array( // Identify which renderer this update is coming from.
  		    2 + // [rendererID, rootFiberID]
  		    // How big is the string table?
  		    1 + // [stringTableLength]
  		    // Then goes the actual string table.
  		    pendingStringTableLength + ( // All unmounts are batched in a single message.
  		    // [TREE_OPERATION_REMOVE, removedIDLength, ...ids]
  		    numUnmountIDs > 0 ? 2 + numUnmountIDs : 0) + // Mount operations
  		    pendingOperations.length); // Identify which renderer this update is coming from.
  		    // This enables roots to be mapped to renderers,
  		    // Which in turn enables fiber properations, states, and hooks to be inspected.

  		    let i = 0;
  		    operations[i++] = rendererID;
  		    operations[i++] = rootID; // Now fill in the string table.
  		    // [stringTableLength, str1Length, ...str1, str2Length, ...str2, ...]

  		    operations[i++] = pendingStringTableLength;
  		    pendingStringTable.forEach((value, key) => {
  		      operations[i++] = key.length;
  		      const encodedKey = utfEncodeString(key);

  		      for (let j = 0; j < encodedKey.length; j++) {
  		        operations[i + j] = encodedKey[j];
  		      }

  		      i += key.length;
  		    });

  		    if (numUnmountIDs > 0) {
  		      // All unmounts except roots are batched in a single message.
  		      operations[i++] = TREE_OPERATION_REMOVE; // The first number is how many unmounted IDs we're gonna send.

  		      operations[i++] = numUnmountIDs; // Fill in the unmounts

  		      for (let j = 0; j < pendingUnmountedIDs.length; j++) {
  		        operations[i++] = pendingUnmountedIDs[j];
  		      } // The root ID should always be unmounted last.


  		      if (pendingUnmountedRootID !== null) {
  		        operations[i] = pendingUnmountedRootID;
  		        i++;
  		      }
  		    } // Fill in the rest of the operations.


  		    for (let j = 0; j < pendingOperations.length; j++) {
  		      operations[i + j] = pendingOperations[j];
  		    }

  		    i += pendingOperations.length;


  		    hook.emit('operations', operations);
  		    pendingOperations.length = 0;
  		    pendingUnmountedIDs = [];
  		    pendingUnmountedRootID = null;
  		    pendingStringTable.clear();
  		    pendingStringTableLength = 0;
  		  }

  		  function pushOperation(op) {

  		    pendingOperations.push(op);
  		  }

  		  function getStringID(str) {
  		    if (str === null) {
  		      return 0;
  		    }

  		    const existingID = pendingStringTable.get(str);

  		    if (existingID !== undefined) {
  		      return existingID;
  		    }

  		    const stringID = pendingStringTable.size + 1;
  		    pendingStringTable.set(str, stringID); // The string table total length needs to account
  		    // both for the string length, and for the array item
  		    // that contains the length itself. Hence + 1.

  		    pendingStringTableLength += str.length + 1;
  		    return stringID;
  		  }

  		  let currentlyInspectedElementID = null;
  		  let currentlyInspectedPaths = {}; // Track the intersection of currently inspected paths,
  		  // so that we can send their data along if the element is re-rendered.

  		  function mergeInspectedPaths(path) {
  		    let current = currentlyInspectedPaths;
  		    path.forEach(key => {
  		      if (!current[key]) {
  		        current[key] = {};
  		      }

  		      current = current[key];
  		    });
  		  }

  		  function createIsPathAllowed(key) {
  		    // This function helps prevent previously-inspected paths from being dehydrated in updates.
  		    // This is important to avoid a bad user experience where expanded toggles collapse on update.
  		    return function isPathAllowed(path) {
  		      let current = currentlyInspectedPaths[key];

  		      if (!current) {
  		        return false;
  		      }

  		      for (let i = 0; i < path.length; i++) {
  		        current = current[path[i]];

  		        if (!current) {
  		          return false;
  		        }
  		      }

  		      return true;
  		    };
  		  } // Fast path props lookup for React Native style editor.


  		  function getInstanceAndStyle(id) {
  		    let instance = null;
  		    let style = null;
  		    const internalInstance = idToInternalInstanceMap.get(id);

  		    if (internalInstance != null) {
  		      instance = internalInstance._instance || null;
  		      const element = internalInstance._currentElement;

  		      if (element != null && element.props != null) {
  		        style = element.props.style || null;
  		      }
  		    }

  		    return {
  		      instance,
  		      style
  		    };
  		  }

  		  function updateSelectedElement(id) {
  		    const internalInstance = idToInternalInstanceMap.get(id);

  		    if (internalInstance == null) {
  		      console.warn(`Could not find instance with id "${id}"`);
  		      return;
  		    }

  		    switch (getElementType(internalInstance)) {
  		      case types_ElementTypeClass:
  		        global.$r = internalInstance._instance;
  		        break;

  		      case types_ElementTypeFunction:
  		        const element = internalInstance._currentElement;

  		        if (element == null) {
  		          console.warn(`Could not find element with id "${id}"`);
  		          return;
  		        }

  		        global.$r = {
  		          props: element.props,
  		          type: element.type
  		        };
  		        break;

  		      default:
  		        global.$r = null;
  		        break;
  		    }
  		  }

  		  function storeAsGlobal(id, path, count) {
  		    const inspectedElement = inspectElementRaw(id);

  		    if (inspectedElement !== null) {
  		      const value = utils_getInObject(inspectedElement, path);
  		      const key = `$reactTemp${count}`;
  		      window[key] = value;
  		      console.log(key);
  		      console.log(value);
  		    }
  		  }

  		  function getSerializedElementValueByPath(id, path) {
  		    const inspectedElement = inspectElementRaw(id);

  		    if (inspectedElement !== null) {
  		      const valueToCopy = utils_getInObject(inspectedElement, path);
  		      return serializeToString(valueToCopy);
  		    }
  		  }

  		  function inspectElement(requestID, id, path, forceFullData) {
  		    if (forceFullData || currentlyInspectedElementID !== id) {
  		      currentlyInspectedElementID = id;
  		      currentlyInspectedPaths = {};
  		    }

  		    const inspectedElement = inspectElementRaw(id);

  		    if (inspectedElement === null) {
  		      return {
  		        id,
  		        responseID: requestID,
  		        type: 'not-found'
  		      };
  		    }

  		    if (path !== null) {
  		      mergeInspectedPaths(path);
  		    } // Any time an inspected element has an update,
  		    // we should update the selected $r value as wel.
  		    // Do this before dehydration (cleanForBridge).


  		    updateSelectedElement(id);
  		    inspectedElement.context = cleanForBridge(inspectedElement.context, createIsPathAllowed('context'));
  		    inspectedElement.props = cleanForBridge(inspectedElement.props, createIsPathAllowed('props'));
  		    inspectedElement.state = cleanForBridge(inspectedElement.state, createIsPathAllowed('state'));
  		    return {
  		      id,
  		      responseID: requestID,
  		      type: 'full-data',
  		      value: inspectedElement
  		    };
  		  }

  		  function inspectElementRaw(id) {
  		    const internalInstance = idToInternalInstanceMap.get(id);

  		    if (internalInstance == null) {
  		      return null;
  		    }

  		    const {
  		      key
  		    } = getData(internalInstance);
  		    const type = getElementType(internalInstance);
  		    let context = null;
  		    let owners = null;
  		    let props = null;
  		    let state = null;
  		    const element = internalInstance._currentElement;

  		    if (element !== null) {
  		      props = element.props;
  		      let owner = element._owner;

  		      if (owner) {
  		        owners = [];

  		        while (owner != null) {
  		          owners.push({
  		            displayName: getData(owner).displayName || 'Unknown',
  		            id: getID(owner),
  		            key: element.key,
  		            type: getElementType(owner)
  		          });

  		          if (owner._currentElement) {
  		            owner = owner._currentElement._owner;
  		          }
  		        }
  		      }
  		    }

  		    const publicInstance = internalInstance._instance;

  		    if (publicInstance != null) {
  		      context = publicInstance.context || null;
  		      state = publicInstance.state || null;
  		    } // Not implemented


  		    const errors = [];
  		    const warnings = [];
  		    return {
  		      id,
  		      // Does the current renderer support editable hooks and function props?
  		      canEditHooks: false,
  		      canEditFunctionProps: false,
  		      // Does the current renderer support advanced editing interface?
  		      canEditHooksAndDeletePaths: false,
  		      canEditHooksAndRenamePaths: false,
  		      canEditFunctionPropsDeletePaths: false,
  		      canEditFunctionPropsRenamePaths: false,
  		      // Toggle error boundary did not exist in legacy versions
  		      canToggleError: false,
  		      isErrored: false,
  		      // Suspense did not exist in legacy versions
  		      canToggleSuspense: false,
  		      // Can view component source location.
  		      canViewSource: type === types_ElementTypeClass || type === types_ElementTypeFunction,
  		      source: null,
  		      // Only legacy context exists in legacy versions.
  		      hasLegacyContext: true,
  		      type: type,
  		      key: key != null ? key : null,
  		      // Inspectable properties.
  		      context,
  		      hooks: null,
  		      props,
  		      state,
  		      errors,
  		      warnings,
  		      // List of owners
  		      owners,
  		      rootType: null,
  		      rendererPackageName: null,
  		      rendererVersion: null,
  		      plugins: {
  		        stylex: null
  		      },
  		      nativeTag: null
  		    };
  		  }

  		  function logElementToConsole(id) {
  		    const result = inspectElementRaw(id);

  		    if (result === null) {
  		      console.warn(`Could not find element with id "${id}"`);
  		      return;
  		    }

  		    const displayName = getDisplayNameForElementID(id);
  		    const supportsGroup = typeof console.groupCollapsed === 'function';

  		    if (supportsGroup) {
  		      console.groupCollapsed(`[Click to expand] %c<${displayName || 'Component'} />`, // --dom-tag-name-color is the CSS variable Chrome styles HTML elements with in the console.
  		      'color: var(--dom-tag-name-color); font-weight: normal;');
  		    }

  		    if (result.props !== null) {
  		      console.log('Props:', result.props);
  		    }

  		    if (result.state !== null) {
  		      console.log('State:', result.state);
  		    }

  		    if (result.context !== null) {
  		      console.log('Context:', result.context);
  		    }

  		    const hostInstance = findHostInstanceForInternalID(id);

  		    if (hostInstance !== null) {
  		      console.log('Node:', hostInstance);
  		    }

  		    if (window.chrome || /firefox/i.test(navigator.userAgent)) {
  		      console.log('Right-click any value to save it as a global variable for further inspection.');
  		    }

  		    if (supportsGroup) {
  		      console.groupEnd();
  		    }
  		  }

  		  function getElementAttributeByPath(id, path) {
  		    const inspectedElement = inspectElementRaw(id);

  		    if (inspectedElement !== null) {
  		      return utils_getInObject(inspectedElement, path);
  		    }

  		    return undefined;
  		  }

  		  function getElementSourceFunctionById(id) {
  		    const internalInstance = idToInternalInstanceMap.get(id);

  		    if (internalInstance == null) {
  		      console.warn(`Could not find instance with id "${id}"`);
  		      return null;
  		    }

  		    const element = internalInstance._currentElement;

  		    if (element == null) {
  		      console.warn(`Could not find element with id "${id}"`);
  		      return null;
  		    }

  		    return element.type;
  		  }

  		  function deletePath(type, id, hookID, path) {
  		    const internalInstance = idToInternalInstanceMap.get(id);

  		    if (internalInstance != null) {
  		      const publicInstance = internalInstance._instance;

  		      if (publicInstance != null) {
  		        switch (type) {
  		          case 'context':
  		            deletePathInObject(publicInstance.context, path);
  		            forceUpdate(publicInstance);
  		            break;

  		          case 'hooks':
  		            throw new Error('Hooks not supported by this renderer');

  		          case 'props':
  		            const element = internalInstance._currentElement;
  		            internalInstance._currentElement = { ...element,
  		              props: copyWithDelete(element.props, path)
  		            };
  		            forceUpdate(publicInstance);
  		            break;

  		          case 'state':
  		            deletePathInObject(publicInstance.state, path);
  		            forceUpdate(publicInstance);
  		            break;
  		        }
  		      }
  		    }
  		  }

  		  function renamePath(type, id, hookID, oldPath, newPath) {
  		    const internalInstance = idToInternalInstanceMap.get(id);

  		    if (internalInstance != null) {
  		      const publicInstance = internalInstance._instance;

  		      if (publicInstance != null) {
  		        switch (type) {
  		          case 'context':
  		            renamePathInObject(publicInstance.context, oldPath, newPath);
  		            forceUpdate(publicInstance);
  		            break;

  		          case 'hooks':
  		            throw new Error('Hooks not supported by this renderer');

  		          case 'props':
  		            const element = internalInstance._currentElement;
  		            internalInstance._currentElement = { ...element,
  		              props: copyWithRename(element.props, oldPath, newPath)
  		            };
  		            forceUpdate(publicInstance);
  		            break;

  		          case 'state':
  		            renamePathInObject(publicInstance.state, oldPath, newPath);
  		            forceUpdate(publicInstance);
  		            break;
  		        }
  		      }
  		    }
  		  }

  		  function overrideValueAtPath(type, id, hookID, path, value) {
  		    const internalInstance = idToInternalInstanceMap.get(id);

  		    if (internalInstance != null) {
  		      const publicInstance = internalInstance._instance;

  		      if (publicInstance != null) {
  		        switch (type) {
  		          case 'context':
  		            utils_setInObject(publicInstance.context, path, value);
  		            forceUpdate(publicInstance);
  		            break;

  		          case 'hooks':
  		            throw new Error('Hooks not supported by this renderer');

  		          case 'props':
  		            const element = internalInstance._currentElement;
  		            internalInstance._currentElement = { ...element,
  		              props: copyWithSet(element.props, path, value)
  		            };
  		            forceUpdate(publicInstance);
  		            break;

  		          case 'state':
  		            utils_setInObject(publicInstance.state, path, value);
  		            forceUpdate(publicInstance);
  		            break;
  		        }
  		      }
  		    }
  		  } // v16+ only features


  		  const getProfilingData = () => {
  		    throw new Error('getProfilingData not supported by this renderer');
  		  };

  		  const handleCommitFiberRoot = () => {
  		    throw new Error('handleCommitFiberRoot not supported by this renderer');
  		  };

  		  const handleCommitFiberUnmount = () => {
  		    throw new Error('handleCommitFiberUnmount not supported by this renderer');
  		  };

  		  const handlePostCommitFiberRoot = () => {
  		    throw new Error('handlePostCommitFiberRoot not supported by this renderer');
  		  };

  		  const overrideError = () => {
  		    throw new Error('overrideError not supported by this renderer');
  		  };

  		  const overrideSuspense = () => {
  		    throw new Error('overrideSuspense not supported by this renderer');
  		  };

  		  const startProfiling = () => {// Do not throw, since this would break a multi-root scenario where v15 and v16 were both present.
  		  };

  		  const stopProfiling = () => {// Do not throw, since this would break a multi-root scenario where v15 and v16 were both present.
  		  };

  		  function getBestMatchForTrackedPath() {
  		    // Not implemented.
  		    return null;
  		  }

  		  function getPathForElement(id) {
  		    // Not implemented.
  		    return null;
  		  }

  		  function updateComponentFilters(componentFilters) {// Not implemented.
  		  }

  		  function getEnvironmentNames() {
  		    // No RSC support.
  		    return [];
  		  }

  		  function setTraceUpdatesEnabled(enabled) {// Not implemented.
  		  }

  		  function setTrackedPath(path) {// Not implemented.
  		  }

  		  function getOwnersList(id) {
  		    // Not implemented.
  		    return null;
  		  }

  		  function clearErrorsAndWarnings() {// Not implemented
  		  }

  		  function clearErrorsForElementID(id) {// Not implemented
  		  }

  		  function clearWarningsForElementID(id) {// Not implemented
  		  }

  		  function hasElementWithId(id) {
  		    return idToInternalInstanceMap.has(id);
  		  }

  		  return {
  		    clearErrorsAndWarnings,
  		    clearErrorsForElementID,
  		    clearWarningsForElementID,
  		    cleanup,
  		    getSerializedElementValueByPath,
  		    deletePath,
  		    flushInitialOperations,
  		    getBestMatchForTrackedPath,
  		    getDisplayNameForElementID,
  		    getNearestMountedDOMNode,
  		    getElementIDForHostInstance,
  		    getInstanceAndStyle,
  		    findHostInstancesForElementID: id => {
  		      const hostInstance = findHostInstanceForInternalID(id);
  		      return hostInstance == null ? null : [hostInstance];
  		    },
  		    getOwnersList,
  		    getPathForElement,
  		    getProfilingData,
  		    handleCommitFiberRoot,
  		    handleCommitFiberUnmount,
  		    handlePostCommitFiberRoot,
  		    hasElementWithId,
  		    inspectElement,
  		    logElementToConsole,
  		    overrideError,
  		    overrideSuspense,
  		    overrideValueAtPath,
  		    renamePath,
  		    getElementAttributeByPath,
  		    getElementSourceFunctionById,
  		    renderer,
  		    setTraceUpdatesEnabled,
  		    setTrackedPath,
  		    startProfiling,
  		    stopProfiling,
  		    storeAsGlobal,
  		    updateComponentFilters,
  		    getEnvironmentNames
  		  };
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */



  		 // this is the backend that is compatible with all older React versions

  		function isMatchingRender(version) {
  		  return !hasAssignedBackend(version);
  		}

  		function attachRenderer(hook, id, renderer, global, shouldStartProfilingNow, profilingSettings) {
  		  // only attach if the renderer is compatible with the current version of the backend
  		  if (!isMatchingRender(renderer.reconcilerVersion || renderer.version)) {
  		    return;
  		  }

  		  let rendererInterface = hook.rendererInterfaces.get(id); // Inject any not-yet-injected renderers (if we didn't reload-and-profile)

  		  if (rendererInterface == null) {
  		    if (typeof renderer.getCurrentComponentInfo === 'function') {
  		      // react-flight/client
  		      rendererInterface = attach(hook, id, renderer);
  		    } else if ( // v16-19
  		    typeof renderer.findFiberByHostInstance === 'function' || // v16.8+
  		    renderer.currentDispatcherRef != null) {
  		      // react-reconciler v16+
  		      rendererInterface = renderer_attach(hook, id, renderer, global, shouldStartProfilingNow, profilingSettings);
  		    } else if (renderer.ComponentTree) {
  		      // react-dom v15
  		      rendererInterface = legacy_renderer_attach(hook, id, renderer, global);
  		    } else ;
  		  }

  		  return rendererInterface;
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */
  		// Do not add / import anything to this file.
  		// This function could be used from multiple places, including hook.
  		// Skips CSS and object arguments, inlines other in the first argument as a template string
  		function formatConsoleArguments(maybeMessage, ...inputArgs) {
  		  if (inputArgs.length === 0 || typeof maybeMessage !== 'string') {
  		    return [maybeMessage, ...inputArgs];
  		  }

  		  const args = inputArgs.slice();
  		  let template = '';
  		  let argumentsPointer = 0;

  		  for (let i = 0; i < maybeMessage.length; ++i) {
  		    const currentChar = maybeMessage[i];

  		    if (currentChar !== '%') {
  		      template += currentChar;
  		      continue;
  		    }

  		    const nextChar = maybeMessage[i + 1];
  		    ++i; // Only keep CSS and objects, inline other arguments

  		    switch (nextChar) {
  		      case 'c':
  		      case 'O':
  		      case 'o':
  		        {
  		          ++argumentsPointer;
  		          template += `%${nextChar}`;
  		          break;
  		        }

  		      case 'd':
  		      case 'i':
  		        {
  		          const [arg] = args.splice(argumentsPointer, 1);
  		          template += parseInt(arg, 10).toString();
  		          break;
  		        }

  		      case 'f':
  		        {
  		          const [arg] = args.splice(argumentsPointer, 1);
  		          template += parseFloat(arg).toString();
  		          break;
  		        }

  		      case 's':
  		        {
  		          const [arg] = args.splice(argumentsPointer, 1);
  		          template += String(arg);
  		          break;
  		        }

  		      default:
  		        template += `%${nextChar}`;
  		    }
  		  }

  		  return [template, ...args];
  		}
  		/**
  		 * Install the hook on window, which is an event emitter.
  		 * Note: this global hook __REACT_DEVTOOLS_GLOBAL_HOOK__ is a de facto public API.
  		 * It's especially important to avoid creating direct dependency on the DevTools Backend.
  		 * That's why we still inline the whole event emitter implementation,
  		 * the string format implementation, and part of the console implementation here.
  		 *
  		 * 
  		 */



  		 // React's custom built component stack strings match "\s{4}in"
  		// Chrome's prefix matches "\s{4}at"

  		const PREFIX_REGEX = /\s{4}(in|at)\s{1}/; // Firefox and Safari have no prefix ("")
  		// but we can fallback to looking for location info (e.g. "foo.js:12:345")

  		const ROW_COLUMN_NUMBER_REGEX = /:\d+:\d+(\n|$)/;

  		function isStringComponentStack(text) {
  		  return PREFIX_REGEX.test(text) || ROW_COLUMN_NUMBER_REGEX.test(text);
  		} // We add a suffix to some frames that older versions of React didn't do.
  		// To compare if it's equivalent we strip out the suffix to see if they're
  		// still equivalent. Similarly, we sometimes use [] and sometimes () so we
  		// strip them to for the comparison.


  		const frameDiffs = / \(\<anonymous\>\)$|\@unknown\:0\:0$|\(|\)|\[|\]/gm;

  		function areStackTracesEqual(a, b) {
  		  return a.replace(frameDiffs, '') === b.replace(frameDiffs, '');
  		}

  		const targetConsole = console;
  		const defaultProfilingSettings = {
  		  recordChangeDescriptions: false,
  		  recordTimeline: false
  		};
  		function installHook(target, maybeSettingsOrSettingsPromise, shouldStartProfilingNow = false, profilingSettings = defaultProfilingSettings) {
  		  if (target.hasOwnProperty('__REACT_DEVTOOLS_GLOBAL_HOOK__')) {
  		    return null;
  		  }

  		  function detectReactBuildType(renderer) {
  		    try {
  		      if (typeof renderer.version === 'string') {
  		        // React DOM Fiber (16+)
  		        if (renderer.bundleType > 0) {
  		          // This is not a production build.
  		          // We are currently only using 0 (PROD) and 1 (DEV)
  		          // but might add 2 (PROFILE) in the future.
  		          return 'development';
  		        } // React 16 uses flat bundles. If we report the bundle as production
  		        // version, it means we also minified and envified it ourselves.


  		        return 'production'; // Note: There is still a risk that the CommonJS entry point has not
  		        // been envified or uglified. In this case the user would have *both*
  		        // development and production bundle, but only the prod one would run.
  		        // This would be really bad. We have a separate check for this because
  		        // it happens *outside* of the renderer injection. See `checkDCE` below.
  		      } // $FlowFixMe[method-unbinding]


  		      const toString = Function.prototype.toString;

  		      if (renderer.Mount && renderer.Mount._renderNewRootComponent) {
  		        // React DOM Stack
  		        const renderRootCode = toString.call(renderer.Mount._renderNewRootComponent); // Filter out bad results (if that is even possible):

  		        if (renderRootCode.indexOf('function') !== 0) {
  		          // Hope for the best if we're not sure.
  		          return 'production';
  		        } // Check for React DOM Stack < 15.1.0 in development.
  		        // If it contains "storedMeasure" call, it's wrapped in ReactPerf (DEV only).
  		        // This would be true even if it's minified, as method name still matches.


  		        if (renderRootCode.indexOf('storedMeasure') !== -1) {
  		          return 'development';
  		        } // For other versions (and configurations) it's not so easy.
  		        // Let's quickly exclude proper production builds.
  		        // If it contains a warning message, it's either a DEV build,
  		        // or an PROD build without proper dead code elimination.


  		        if (renderRootCode.indexOf('should be a pure function') !== -1) {
  		          // Now how do we tell a DEV build from a bad PROD build?
  		          // If we see NODE_ENV, we're going to assume this is a dev build
  		          // because most likely it is referring to an empty shim.
  		          if (renderRootCode.indexOf('NODE_ENV') !== -1) {
  		            return 'development';
  		          } // If we see "development", we're dealing with an envified DEV build
  		          // (such as the official React DEV UMD).


  		          if (renderRootCode.indexOf('development') !== -1) {
  		            return 'development';
  		          } // I've seen process.env.NODE_ENV !== 'production' being smartly
  		          // replaced by `true` in DEV by Webpack. I don't know how that
  		          // works but we can safely guard against it because `true` was
  		          // never used in the function source since it was written.


  		          if (renderRootCode.indexOf('true') !== -1) {
  		            return 'development';
  		          } // By now either it is a production build that has not been minified,
  		          // or (worse) this is a minified development build using non-standard
  		          // environment (e.g. "staging"). We're going to look at whether
  		          // the function argument name is mangled:


  		          if ( // 0.13 to 15
  		          renderRootCode.indexOf('nextElement') !== -1 || // 0.12
  		          renderRootCode.indexOf('nextComponent') !== -1) {
  		            // We can't be certain whether this is a development build or not,
  		            // but it is definitely unminified.
  		            return 'unminified';
  		          } else {
  		            // This is likely a minified development build.
  		            return 'development';
  		          }
  		        } // By now we know that it's envified and dead code elimination worked,
  		        // but what if it's still not minified? (Is this even possible?)
  		        // Let's check matches for the first argument name.


  		        if ( // 0.13 to 15
  		        renderRootCode.indexOf('nextElement') !== -1 || // 0.12
  		        renderRootCode.indexOf('nextComponent') !== -1) {
  		          return 'unminified';
  		        } // Seems like we're using the production version.
  		        // However, the branch above is Stack-only so this is 15 or earlier.


  		        return 'outdated';
  		      }
  		    } catch (err) {// Weird environments may exist.
  		      // This code needs a higher fault tolerance
  		      // because it runs even with closed DevTools.
  		      // TODO: should we catch errors in all injected code, and not just this part?
  		    }

  		    return 'production';
  		  }

  		  function checkDCE(fn) {
  		    // This runs for production versions of React.
  		    // Needs to be super safe.
  		    try {
  		      // $FlowFixMe[method-unbinding]
  		      const toString = Function.prototype.toString;
  		      const code = toString.call(fn); // This is a string embedded in the passed function under DEV-only
  		      // condition. However the function executes only in PROD. Therefore,
  		      // if we see it, dead code elimination did not work.

  		      if (code.indexOf('^_^') > -1) {
  		        // Remember to report during next injection.
  		        hasDetectedBadDCE = true; // Bonus: throw an exception hoping that it gets picked up by a reporting system.
  		        // Not synchronously so that it doesn't break the calling code.

  		        setTimeout(function () {
  		          throw new Error('React is running in production mode, but dead code ' + 'elimination has not been applied. Read how to correctly ' + 'configure React for production: ' + 'https://react.dev/link/perf-use-production-build');
  		        });
  		      }
  		    } catch (err) {}
  		  } // TODO: isProfiling should be stateful, and we should update it once profiling is finished


  		  const isProfiling = shouldStartProfilingNow;
  		  let uidCounter = 0;

  		  function inject(renderer) {
  		    const id = ++uidCounter;
  		    renderers.set(id, renderer);
  		    const reactBuildType = hasDetectedBadDCE ? 'deadcode' : detectReactBuildType(renderer);
  		    hook.emit('renderer', {
  		      id,
  		      renderer,
  		      reactBuildType
  		    });
  		    const rendererInterface = attachRenderer(hook, id, renderer, target, isProfiling, profilingSettings);

  		    if (rendererInterface != null) {
  		      hook.rendererInterfaces.set(id, rendererInterface);
  		      hook.emit('renderer-attached', {
  		        id,
  		        rendererInterface
  		      });
  		    } else {
  		      hook.hasUnsupportedRendererAttached = true;
  		      hook.emit('unsupported-renderer-version');
  		    }

  		    return id;
  		  }

  		  let hasDetectedBadDCE = false;

  		  function sub(event, fn) {
  		    hook.on(event, fn);
  		    return () => hook.off(event, fn);
  		  }

  		  function on(event, fn) {
  		    if (!listeners[event]) {
  		      listeners[event] = [];
  		    }

  		    listeners[event].push(fn);
  		  }

  		  function off(event, fn) {
  		    if (!listeners[event]) {
  		      return;
  		    }

  		    const index = listeners[event].indexOf(fn);

  		    if (index !== -1) {
  		      listeners[event].splice(index, 1);
  		    }

  		    if (!listeners[event].length) {
  		      delete listeners[event];
  		    }
  		  }

  		  function emit(event, data) {
  		    if (listeners[event]) {
  		      listeners[event].map(fn => fn(data));
  		    }
  		  }

  		  function getFiberRoots(rendererID) {
  		    const roots = fiberRoots;

  		    if (!roots[rendererID]) {
  		      roots[rendererID] = new Set();
  		    }

  		    return roots[rendererID];
  		  }

  		  function onCommitFiberUnmount(rendererID, fiber) {
  		    const rendererInterface = rendererInterfaces.get(rendererID);

  		    if (rendererInterface != null) {
  		      rendererInterface.handleCommitFiberUnmount(fiber);
  		    }
  		  }

  		  function onCommitFiberRoot(rendererID, root, priorityLevel) {
  		    const mountedRoots = hook.getFiberRoots(rendererID);
  		    const current = root.current;
  		    const isKnownRoot = mountedRoots.has(root);
  		    const isUnmounting = current.memoizedState == null || current.memoizedState.element == null; // Keep track of mounted roots so we can hydrate when DevTools connect.

  		    if (!isKnownRoot && !isUnmounting) {
  		      mountedRoots.add(root);
  		    } else if (isKnownRoot && isUnmounting) {
  		      mountedRoots.delete(root);
  		    }

  		    const rendererInterface = rendererInterfaces.get(rendererID);

  		    if (rendererInterface != null) {
  		      rendererInterface.handleCommitFiberRoot(root, priorityLevel);
  		    }
  		  }

  		  function onPostCommitFiberRoot(rendererID, root) {
  		    const rendererInterface = rendererInterfaces.get(rendererID);

  		    if (rendererInterface != null) {
  		      rendererInterface.handlePostCommitFiberRoot(root);
  		    }
  		  }

  		  let isRunningDuringStrictModeInvocation = false;

  		  function setStrictMode(rendererID, isStrictMode) {
  		    isRunningDuringStrictModeInvocation = isStrictMode;

  		    if (isStrictMode) {
  		      patchConsoleForStrictMode();
  		    } else {
  		      unpatchConsoleForStrictMode();
  		    }
  		  }

  		  const unpatchConsoleCallbacks = []; // For StrictMode we patch console once we are running in StrictMode and unpatch right after it
  		  // So patching could happen multiple times during the runtime
  		  // Notice how we don't patch error or warn methods, because they are already patched in patchConsoleForErrorsAndWarnings
  		  // This will only happen once, when hook is installed

  		  function patchConsoleForStrictMode() {
  		    // Don't patch console in case settings were not injected
  		    if (!hook.settings) {
  		      return;
  		    } // Don't patch twice


  		    if (unpatchConsoleCallbacks.length > 0) {
  		      return;
  		    } // At this point 'error', 'warn', and 'trace' methods are already patched
  		    // by React DevTools hook to append component stacks and other possible features.


  		    const consoleMethodsToOverrideForStrictMode = ['group', 'groupCollapsed', 'info', 'log']; // eslint-disable-next-line no-for-of-loops/no-for-of-loops

  		    for (const method of consoleMethodsToOverrideForStrictMode) {
  		      const originalMethod = targetConsole[method];

  		      const overrideMethod = (...args) => {
  		        const settings = hook.settings; // Something unexpected happened, fallback to just printing the console message.

  		        if (settings == null) {
  		          originalMethod(...args);
  		          return;
  		        }

  		        if (settings.hideConsoleLogsInStrictMode) {
  		          return;
  		        } // Dim the text color of the double logs if we're not hiding them.
  		        // Firefox doesn't support ANSI escape sequences


  		        {
  		          originalMethod(ANSI_STYLE_DIMMING_TEMPLATE, ...formatConsoleArguments(...args));
  		        }
  		      };

  		      targetConsole[method] = overrideMethod;
  		      unpatchConsoleCallbacks.push(() => {
  		        targetConsole[method] = originalMethod;
  		      });
  		    }
  		  }

  		  function unpatchConsoleForStrictMode() {
  		    unpatchConsoleCallbacks.forEach(callback => callback());
  		    unpatchConsoleCallbacks.length = 0;
  		  }

  		  const openModuleRangesStack = [];
  		  const moduleRanges = [];

  		  function getTopStackFrameString(error) {
  		    const frames = error.stack.split('\n');
  		    const frame = frames.length > 1 ? frames[1] : null;
  		    return frame;
  		  }

  		  function getInternalModuleRanges() {
  		    return moduleRanges;
  		  }

  		  function registerInternalModuleStart(error) {
  		    const startStackFrame = getTopStackFrameString(error);

  		    if (startStackFrame !== null) {
  		      openModuleRangesStack.push(startStackFrame);
  		    }
  		  }

  		  function registerInternalModuleStop(error) {
  		    if (openModuleRangesStack.length > 0) {
  		      const startStackFrame = openModuleRangesStack.pop();
  		      const stopStackFrame = getTopStackFrameString(error);

  		      if (stopStackFrame !== null) {
  		        // $FlowFixMe[incompatible-call]
  		        moduleRanges.push([startStackFrame, stopStackFrame]);
  		      }
  		    }
  		  } // For Errors and Warnings we only patch console once


  		  function patchConsoleForErrorsAndWarnings() {
  		    // Don't patch console in case settings were not injected
  		    if (!hook.settings) {
  		      return;
  		    }

  		    const consoleMethodsToOverrideForErrorsAndWarnings = ['error', 'trace', 'warn']; // eslint-disable-next-line no-for-of-loops/no-for-of-loops

  		    for (const method of consoleMethodsToOverrideForErrorsAndWarnings) {
  		      const originalMethod = targetConsole[method];

  		      const overrideMethod = (...args) => {
  		        const settings = hook.settings; // Something unexpected happened, fallback to just printing the console message.

  		        if (settings == null) {
  		          originalMethod(...args);
  		          return;
  		        }

  		        if (isRunningDuringStrictModeInvocation && settings.hideConsoleLogsInStrictMode) {
  		          return;
  		        }

  		        let injectedComponentStackAsFakeError = false;
  		        let alreadyHasComponentStack = false;

  		        if (settings.appendComponentStack) {
  		          const lastArg = args.length > 0 ? args[args.length - 1] : null;
  		          alreadyHasComponentStack = typeof lastArg === 'string' && isStringComponentStack(lastArg); // The last argument should be a component stack.
  		        }

  		        const shouldShowInlineWarningsAndErrors = settings.showInlineWarningsAndErrors && (method === 'error' || method === 'warn'); // Search for the first renderer that has a current Fiber.
  		        // We don't handle the edge case of stacks for more than one (e.g. interleaved renderers?)
  		        // eslint-disable-next-line no-for-of-loops/no-for-of-loops

  		        for (const rendererInterface of hook.rendererInterfaces.values()) {
  		          const {
  		            onErrorOrWarning,
  		            getComponentStack
  		          } = rendererInterface;

  		          try {
  		            if (shouldShowInlineWarningsAndErrors) {
  		              // patch() is called by two places: (1) the hook and (2) the renderer backend.
  		              // The backend is what implements a message queue, so it's the only one that injects onErrorOrWarning.
  		              if (onErrorOrWarning != null) {
  		                onErrorOrWarning(method, args.slice());
  		              }
  		            }
  		          } catch (error) {
  		            // Don't let a DevTools or React internal error interfere with logging.
  		            setTimeout(() => {
  		              throw error;
  		            }, 0);
  		          }

  		          try {
  		            if (settings.appendComponentStack && getComponentStack != null) {
  		              // This needs to be directly in the wrapper so we can pop exactly one frame.
  		              const topFrame = Error('react-stack-top-frame');
  		              const match = getComponentStack(topFrame);

  		              if (match !== null) {
  		                const {
  		                  enableOwnerStacks,
  		                  componentStack
  		                } = match; // Empty string means we have a match but no component stack.
  		                // We don't need to look in other renderers but we also don't add anything.

  		                if (componentStack !== '') {
  		                  // Create a fake Error so that when we print it we get native source maps. Every
  		                  // browser will print the .stack property of the error and then parse it back for source
  		                  // mapping. Rather than print the internal slot. So it doesn't matter that the internal
  		                  // slot doesn't line up.
  		                  const fakeError = new Error(''); // In Chromium, only the stack property is printed but in Firefox the <name>:<message>
  		                  // gets printed so to make the colon make sense, we name it so we print Stack:
  		                  // and similarly Safari leave an expandable slot.

  		                  if (false) ; else {
  		                    fakeError.name = enableOwnerStacks ? 'Stack' : 'Component Stack'; // This gets printed
  		                  } // In Chromium, the stack property needs to start with ^[\w.]*Error\b to trigger stack
  		                  // formatting. Otherwise it is left alone. So we prefix it. Otherwise we just override it
  		                  // to our own stack.


  		                  fakeError.stack =  false ? 0 : componentStack;

  		                  if (alreadyHasComponentStack) {
  		                    // Only modify the component stack if it matches what we would've added anyway.
  		                    // Otherwise we assume it was a non-React stack.
  		                    if (areStackTracesEqual(args[args.length - 1], componentStack)) {
  		                      const firstArg = args[0];

  		                      if (args.length > 1 && typeof firstArg === 'string' && firstArg.endsWith('%s')) {
  		                        args[0] = firstArg.slice(0, firstArg.length - 2); // Strip the %s param
  		                      }

  		                      args[args.length - 1] = fakeError;
  		                      injectedComponentStackAsFakeError = true;
  		                    }
  		                  } else {
  		                    args.push(fakeError);
  		                    injectedComponentStackAsFakeError = true;
  		                  }
  		                } // Don't add stacks from other renderers.


  		                break;
  		              }
  		            }
  		          } catch (error) {
  		            // Don't let a DevTools or React internal error interfere with logging.
  		            setTimeout(() => {
  		              throw error;
  		            }, 0);
  		          }
  		        }

  		        if (settings.breakOnConsoleErrors) {
  		          // --- Welcome to debugging with React DevTools ---
  		          // This debugger statement means that you've enabled the "break on warnings" feature.
  		          // Use the browser's Call Stack panel to step out of this override function
  		          // to where the original warning or error was logged.
  		          // eslint-disable-next-line no-debugger
  		          debugger;
  		        }

  		        if (isRunningDuringStrictModeInvocation) {
  		          // Dim the text color of the double logs if we're not hiding them.
  		          // Firefox doesn't support ANSI escape sequences
  		          {
  		            originalMethod(injectedComponentStackAsFakeError ? ANSI_STYLE_DIMMING_TEMPLATE_WITH_COMPONENT_STACK : ANSI_STYLE_DIMMING_TEMPLATE, ...formatConsoleArguments(...args));
  		          }
  		        } else {
  		          originalMethod(...args);
  		        }
  		      };

  		      targetConsole[method] = overrideMethod;
  		    }
  		  } // TODO: More meaningful names for "rendererInterfaces" and "renderers".


  		  const fiberRoots = {};
  		  const rendererInterfaces = new Map();
  		  const listeners = {};
  		  const renderers = new Map();
  		  const backends = new Map();
  		  const hook = {
  		    rendererInterfaces,
  		    listeners,
  		    backends,
  		    // Fast Refresh for web relies on this.
  		    renderers,
  		    hasUnsupportedRendererAttached: false,
  		    emit,
  		    getFiberRoots,
  		    inject,
  		    on,
  		    off,
  		    sub,
  		    // This is a legacy flag.
  		    // React v16 checks the hook for this to ensure DevTools is new enough.
  		    supportsFiber: true,
  		    // React Flight Client checks the hook for this to ensure DevTools is new enough.
  		    supportsFlight: true,
  		    // React calls these methods.
  		    checkDCE,
  		    onCommitFiberUnmount,
  		    onCommitFiberRoot,
  		    // React v18.0+
  		    onPostCommitFiberRoot,
  		    setStrictMode,
  		    // Schedule Profiler runtime helpers.
  		    // These internal React modules to report their own boundaries
  		    // which in turn enables the profiler to dim or filter internal frames.
  		    getInternalModuleRanges,
  		    registerInternalModuleStart,
  		    registerInternalModuleStop
  		  };

  		  {
  		    // Set default settings
  		    hook.settings = {
  		      appendComponentStack: true,
  		      breakOnConsoleErrors: false,
  		      showInlineWarningsAndErrors: true,
  		      hideConsoleLogsInStrictMode: false
  		    };
  		    patchConsoleForErrorsAndWarnings();
  		  }

  		  Object.defineProperty(target, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
  		    // This property needs to be configurable for the test environment,
  		    // else we won't be able to delete and recreate it between tests.
  		    configurable: false,
  		    enumerable: false,

  		    get() {
  		      return hook;
  		    }

  		  });
  		  return hook;
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */

  		/**
  		 * This mirrors react-native/Libraries/Inspector/resolveBoxStyle.js (but without RTL support).
  		 *
  		 * Resolve a style property into it's component parts, e.g.
  		 *
  		 * resolveBoxStyle('margin', {margin: 5, marginBottom: 10})
  		 * -> {top: 5, left: 5, right: 5, bottom: 10}
  		 */
  		function resolveBoxStyle(prefix, style) {
  		  let hasParts = false;
  		  const result = {
  		    bottom: 0,
  		    left: 0,
  		    right: 0,
  		    top: 0
  		  };
  		  const styleForAll = style[prefix];

  		  if (styleForAll != null) {
  		    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  		    for (const key of Object.keys(result)) {
  		      result[key] = styleForAll;
  		    }

  		    hasParts = true;
  		  }

  		  const styleForHorizontal = style[prefix + 'Horizontal'];

  		  if (styleForHorizontal != null) {
  		    result.left = styleForHorizontal;
  		    result.right = styleForHorizontal;
  		    hasParts = true;
  		  } else {
  		    const styleForLeft = style[prefix + 'Left'];

  		    if (styleForLeft != null) {
  		      result.left = styleForLeft;
  		      hasParts = true;
  		    }

  		    const styleForRight = style[prefix + 'Right'];

  		    if (styleForRight != null) {
  		      result.right = styleForRight;
  		      hasParts = true;
  		    }

  		    const styleForEnd = style[prefix + 'End'];

  		    if (styleForEnd != null) {
  		      // TODO RTL support
  		      result.right = styleForEnd;
  		      hasParts = true;
  		    }

  		    const styleForStart = style[prefix + 'Start'];

  		    if (styleForStart != null) {
  		      // TODO RTL support
  		      result.left = styleForStart;
  		      hasParts = true;
  		    }
  		  }

  		  const styleForVertical = style[prefix + 'Vertical'];

  		  if (styleForVertical != null) {
  		    result.bottom = styleForVertical;
  		    result.top = styleForVertical;
  		    hasParts = true;
  		  } else {
  		    const styleForBottom = style[prefix + 'Bottom'];

  		    if (styleForBottom != null) {
  		      result.bottom = styleForBottom;
  		      hasParts = true;
  		    }

  		    const styleForTop = style[prefix + 'Top'];

  		    if (styleForTop != null) {
  		      result.top = styleForTop;
  		      hasParts = true;
  		    }
  		  }

  		  return hasParts ? result : null;
  		}
  		/**
  		 * Copyright (c) Meta Platforms, Inc. and affiliates.
  		 *
  		 * This source code is licensed under the MIT license found in the
  		 * LICENSE file in the root directory of this source tree.
  		 *
  		 * 
  		 */



  		function setupNativeStyleEditor(bridge, agent, resolveNativeStyle, validAttributes) {
  		  bridge.addListener('NativeStyleEditor_measure', ({
  		    id,
  		    rendererID
  		  }) => {
  		    measureStyle(agent, bridge, resolveNativeStyle, id, rendererID);
  		  });
  		  bridge.addListener('NativeStyleEditor_renameAttribute', ({
  		    id,
  		    rendererID,
  		    oldName,
  		    newName,
  		    value
  		  }) => {
  		    renameStyle(agent, id, rendererID, oldName, newName, value);
  		    setTimeout(() => measureStyle(agent, bridge, resolveNativeStyle, id, rendererID));
  		  });
  		  bridge.addListener('NativeStyleEditor_setValue', ({
  		    id,
  		    rendererID,
  		    name,
  		    value
  		  }) => {
  		    setStyle(agent, id, rendererID, name, value);
  		    setTimeout(() => measureStyle(agent, bridge, resolveNativeStyle, id, rendererID));
  		  });
  		  bridge.send('isNativeStyleEditorSupported', {
  		    isSupported: true,
  		    validAttributes
  		  });
  		}
  		const EMPTY_BOX_STYLE = {
  		  top: 0,
  		  left: 0,
  		  right: 0,
  		  bottom: 0
  		};
  		const componentIDToStyleOverrides = new Map();

  		function measureStyle(agent, bridge, resolveNativeStyle, id, rendererID) {
  		  const data = agent.getInstanceAndStyle({
  		    id,
  		    rendererID
  		  });

  		  if (!data || !data.style) {
  		    bridge.send('NativeStyleEditor_styleAndLayout', {
  		      id,
  		      layout: null,
  		      style: null
  		    });
  		    return;
  		  }

  		  const {
  		    instance,
  		    style
  		  } = data;
  		  let resolvedStyle = resolveNativeStyle(style); // If it's a host component we edited before, amend styles.

  		  const styleOverrides = componentIDToStyleOverrides.get(id);

  		  if (styleOverrides != null) {
  		    resolvedStyle = Object.assign({}, resolvedStyle, styleOverrides);
  		  }

  		  if (!instance || typeof instance.measure !== 'function') {
  		    bridge.send('NativeStyleEditor_styleAndLayout', {
  		      id,
  		      layout: null,
  		      style: resolvedStyle || null
  		    });
  		    return;
  		  }

  		  instance.measure((x, y, width, height, left, top) => {
  		    // RN Android sometimes returns undefined here. Don't send measurements in this case.
  		    // https://github.com/jhen0409/react-native-debugger/issues/84#issuecomment-304611817
  		    if (typeof x !== 'number') {
  		      bridge.send('NativeStyleEditor_styleAndLayout', {
  		        id,
  		        layout: null,
  		        style: resolvedStyle || null
  		      });
  		      return;
  		    }

  		    const margin = resolvedStyle != null && resolveBoxStyle('margin', resolvedStyle) || EMPTY_BOX_STYLE;
  		    const padding = resolvedStyle != null && resolveBoxStyle('padding', resolvedStyle) || EMPTY_BOX_STYLE;
  		    bridge.send('NativeStyleEditor_styleAndLayout', {
  		      id,
  		      layout: {
  		        x,
  		        y,
  		        width,
  		        height,
  		        left,
  		        top,
  		        margin,
  		        padding
  		      },
  		      style: resolvedStyle || null
  		    });
  		  });
  		}

  		function shallowClone(object) {
  		  const cloned = {};

  		  for (const n in object) {
  		    cloned[n] = object[n];
  		  }

  		  return cloned;
  		}

  		function renameStyle(agent, id, rendererID, oldName, newName, value) {
  		  const data = agent.getInstanceAndStyle({
  		    id,
  		    rendererID
  		  });

  		  if (!data || !data.style) {
  		    return;
  		  }

  		  const {
  		    instance,
  		    style
  		  } = data;
  		  const newStyle = newName ? {
  		    [oldName]: undefined,
  		    [newName]: value
  		  } : {
  		    [oldName]: undefined
  		  };
  		  let customStyle; // TODO It would be nice if the renderer interface abstracted this away somehow.

  		  if (instance !== null && typeof instance.setNativeProps === 'function') {
  		    // In the case of a host component, we need to use setNativeProps().
  		    // Remember to "correct" resolved styles when we read them next time.
  		    const styleOverrides = componentIDToStyleOverrides.get(id);

  		    if (!styleOverrides) {
  		      componentIDToStyleOverrides.set(id, newStyle);
  		    } else {
  		      Object.assign(styleOverrides, newStyle);
  		    } // TODO Fabric does not support setNativeProps; chat with Sebastian or Eli


  		    instance.setNativeProps({
  		      style: newStyle
  		    });
  		  } else if (src_isArray(style)) {
  		    const lastIndex = style.length - 1;

  		    if (typeof style[lastIndex] === 'object' && !src_isArray(style[lastIndex])) {
  		      customStyle = shallowClone(style[lastIndex]);
  		      delete customStyle[oldName];

  		      if (newName) {
  		        customStyle[newName] = value;
  		      } else {
  		        customStyle[oldName] = undefined;
  		      }

  		      agent.overrideValueAtPath({
  		        type: 'props',
  		        id,
  		        rendererID,
  		        path: ['style', lastIndex],
  		        value: customStyle
  		      });
  		    } else {
  		      agent.overrideValueAtPath({
  		        type: 'props',
  		        id,
  		        rendererID,
  		        path: ['style'],
  		        value: style.concat([newStyle])
  		      });
  		    }
  		  } else if (typeof style === 'object') {
  		    customStyle = shallowClone(style);
  		    delete customStyle[oldName];

  		    if (newName) {
  		      customStyle[newName] = value;
  		    } else {
  		      customStyle[oldName] = undefined;
  		    }

  		    agent.overrideValueAtPath({
  		      type: 'props',
  		      id,
  		      rendererID,
  		      path: ['style'],
  		      value: customStyle
  		    });
  		  } else {
  		    agent.overrideValueAtPath({
  		      type: 'props',
  		      id,
  		      rendererID,
  		      path: ['style'],
  		      value: [style, newStyle]
  		    });
  		  }

  		  agent.emit('hideNativeHighlight');
  		}

  		function setStyle(agent, id, rendererID, name, value) {
  		  const data = agent.getInstanceAndStyle({
  		    id,
  		    rendererID
  		  });

  		  if (!data || !data.style) {
  		    return;
  		  }

  		  const {
  		    instance,
  		    style
  		  } = data;
  		  const newStyle = {
  		    [name]: value
  		  }; // TODO It would be nice if the renderer interface abstracted this away somehow.

  		  if (instance !== null && typeof instance.setNativeProps === 'function') {
  		    // In the case of a host component, we need to use setNativeProps().
  		    // Remember to "correct" resolved styles when we read them next time.
  		    const styleOverrides = componentIDToStyleOverrides.get(id);

  		    if (!styleOverrides) {
  		      componentIDToStyleOverrides.set(id, newStyle);
  		    } else {
  		      Object.assign(styleOverrides, newStyle);
  		    } // TODO Fabric does not support setNativeProps; chat with Sebastian or Eli


  		    instance.setNativeProps({
  		      style: newStyle
  		    });
  		  } else if (src_isArray(style)) {
  		    const lastLength = style.length - 1;

  		    if (typeof style[lastLength] === 'object' && !src_isArray(style[lastLength])) {
  		      agent.overrideValueAtPath({
  		        type: 'props',
  		        id,
  		        rendererID,
  		        path: ['style', lastLength, name],
  		        value
  		      });
  		    } else {
  		      agent.overrideValueAtPath({
  		        type: 'props',
  		        id,
  		        rendererID,
  		        path: ['style'],
  		        value: style.concat([newStyle])
  		      });
  		    }
  		  } else {
  		    agent.overrideValueAtPath({
  		      type: 'props',
  		      id,
  		      rendererID,
  		      path: ['style'],
  		      value: [style, newStyle]
  		    });
  		  }

  		  agent.emit('hideNativeHighlight');
  		}







  		function startActivation(contentWindow, bridge) {
  		  const onSavedPreferences = data => {
  		    // This is the only message we're listening for,
  		    // so it's safe to cleanup after we've received it.
  		    bridge.removeListener('savedPreferences', onSavedPreferences);
  		    const {
  		      appendComponentStack,
  		      breakOnConsoleErrors,
  		      componentFilters,
  		      showInlineWarningsAndErrors,
  		      hideConsoleLogsInStrictMode
  		    } = data;
  		    contentWindow.__REACT_DEVTOOLS_APPEND_COMPONENT_STACK__ = appendComponentStack;
  		    contentWindow.__REACT_DEVTOOLS_BREAK_ON_CONSOLE_ERRORS__ = breakOnConsoleErrors;
  		    contentWindow.__REACT_DEVTOOLS_COMPONENT_FILTERS__ = componentFilters;
  		    contentWindow.__REACT_DEVTOOLS_SHOW_INLINE_WARNINGS_AND_ERRORS__ = showInlineWarningsAndErrors;
  		    contentWindow.__REACT_DEVTOOLS_HIDE_CONSOLE_LOGS_IN_STRICT_MODE__ = hideConsoleLogsInStrictMode; // TRICKY
  		    // The backend entry point may be required in the context of an iframe or the parent window.
  		    // If it's required within the parent window, store the saved values on it as well,
  		    // since the injected renderer interface will read from window.
  		    // Technically we don't need to store them on the contentWindow in this case,
  		    // but it doesn't really hurt anything to store them there too.

  		    if (contentWindow !== window) {
  		      window.__REACT_DEVTOOLS_APPEND_COMPONENT_STACK__ = appendComponentStack;
  		      window.__REACT_DEVTOOLS_BREAK_ON_CONSOLE_ERRORS__ = breakOnConsoleErrors;
  		      window.__REACT_DEVTOOLS_COMPONENT_FILTERS__ = componentFilters;
  		      window.__REACT_DEVTOOLS_SHOW_INLINE_WARNINGS_AND_ERRORS__ = showInlineWarningsAndErrors;
  		      window.__REACT_DEVTOOLS_HIDE_CONSOLE_LOGS_IN_STRICT_MODE__ = hideConsoleLogsInStrictMode;
  		    }

  		    finishActivation(contentWindow, bridge);
  		  };

  		  bridge.addListener('savedPreferences', onSavedPreferences); // The backend may be unable to read saved preferences directly,
  		  // because they are stored in localStorage within the context of the extension (on the frontend).
  		  // Instead it relies on the extension to pass preferences through.
  		  // Because we might be in a sandboxed iframe, we have to ask for them by way of postMessage().

  		  bridge.send('getSavedPreferences');
  		}

  		function finishActivation(contentWindow, bridge) {
  		  const agent = new Agent(bridge, getIfReloadedAndProfiling(), onReloadAndProfile);
  		  onReloadAndProfileFlagsReset();
  		  const hook = contentWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__;

  		  if (hook) {
  		    initBackend(hook, agent, contentWindow, getIsReloadAndProfileSupported()); // Setup React Native style editor if a renderer like react-native-web has injected it.

  		    if (hook.resolveRNStyle) {
  		      setupNativeStyleEditor(bridge, agent, hook.resolveRNStyle, hook.nativeStyleEditorValidAttributes);
  		    }
  		  }
  		}

  		function activate(contentWindow, {
  		  bridge
  		} = {}) {
  		  if (bridge == null) {
  		    bridge = createBridge(contentWindow);
  		  }

  		  startActivation(contentWindow, bridge);
  		}
  		function createBridge(contentWindow, wall) {
  		  const {
  		    parent
  		  } = contentWindow;

  		  if (wall == null) {
  		    wall = {
  		      listen(fn) {
  		        const onMessage = ({
  		          data
  		        }) => {
  		          fn(data);
  		        };

  		        contentWindow.addEventListener('message', onMessage);
  		        return () => {
  		          contentWindow.removeEventListener('message', onMessage);
  		        };
  		      },

  		      send(event, payload, transferable) {
  		        parent.postMessage({
  		          event,
  		          payload
  		        }, '*', transferable);
  		      }

  		    };
  		  }

  		  return new bridge(wall);
  		}
  		function backend_initialize(contentWindow) {
  		  installHook(contentWindow);
  		}
  		})();

  		module.exports = __webpack_exports__;
  		/******/ })()
  		;
  		
  	} (backend));
  	return backend.exports;
  }

  var backendExports = requireBackend();

  async function initializeReactDevToolsLatest() {
      if (!window.opener) {
          // const uid = uuid.v1();
          // The dispatch needs to happen before initializing, so that the backend can already listen
          // dispatch({ type: 'activate-react-devtools', uid });
          // @ts-ignore
          if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined") {
              try {
                  // @ts-ignore We need to make sure that the existing chrome extension doesn't interfere
                  delete window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
              }
              catch (e) {
                  /* ignore */
              }
          }
          // Call this before importing React (or any other packages that might import React).
          backendExports.initialize(window);
          backendExports.activate(window);
      }
  }
  // Initialize when DOM is ready
  if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initializeReactDevToolsLatest);
  }
  else {
      initializeReactDevToolsLatest();
  }

  exports.initializeReactDevToolsLatest = initializeReactDevToolsLatest;

}));
//# sourceMappingURL=devtools.js.map
