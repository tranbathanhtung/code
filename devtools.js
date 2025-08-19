(function (factory) {
    typeof define === 'function' && define.amd ? define(factory) :
    factory();
})((function () { 'use strict';

    /**
     * @license
     * Copyright 2019 Google LLC
     * SPDX-License-Identifier: Apache-2.0
     */
    const proxyMarker = Symbol("Comlink.proxy");
    const createEndpoint = Symbol("Comlink.endpoint");
    const releaseProxy = Symbol("Comlink.releaseProxy");
    const finalizer = Symbol("Comlink.finalizer");
    const throwMarker = Symbol("Comlink.thrown");
    const isObject = (val) => (typeof val === "object" && val !== null) || typeof val === "function";
    /**
     * Internal transfer handle to handle objects marked to proxy.
     */
    const proxyTransferHandler = {
        canHandle: (val) => isObject(val) && val[proxyMarker],
        serialize(obj) {
            const { port1, port2 } = new MessageChannel();
            expose$1(obj, port1);
            return [port2, [port2]];
        },
        deserialize(port) {
            port.start();
            return wrap(port);
        },
    };
    /**
     * Internal transfer handler to handle thrown exceptions.
     */
    const throwTransferHandler = {
        canHandle: (value) => isObject(value) && throwMarker in value,
        serialize({ value }) {
            let serialized;
            if (value instanceof Error) {
                serialized = {
                    isError: true,
                    value: {
                        message: value.message,
                        name: value.name,
                        stack: value.stack,
                    },
                };
            }
            else {
                serialized = { isError: false, value };
            }
            return [serialized, []];
        },
        deserialize(serialized) {
            if (serialized.isError) {
                throw Object.assign(new Error(serialized.value.message), serialized.value);
            }
            throw serialized.value;
        },
    };
    /**
     * Allows customizing the serialization of certain values.
     */
    const transferHandlers = new Map([
        ["proxy", proxyTransferHandler],
        ["throw", throwTransferHandler],
    ]);
    function isAllowedOrigin(allowedOrigins, origin) {
        for (const allowedOrigin of allowedOrigins) {
            if (origin === allowedOrigin || allowedOrigin === "*") {
                return true;
            }
            if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) {
                return true;
            }
        }
        return false;
    }
    function expose$1(obj, ep = globalThis, allowedOrigins = ["*"]) {
        ep.addEventListener("message", function callback(ev) {
            if (!ev || !ev.data) {
                return;
            }
            if (!isAllowedOrigin(allowedOrigins, ev.origin)) {
                console.warn(`Invalid origin '${ev.origin}' for comlink proxy`);
                return;
            }
            const { id, type, path } = Object.assign({ path: [] }, ev.data);
            const argumentList = (ev.data.argumentList || []).map(fromWireValue);
            let returnValue;
            try {
                const parent = path.slice(0, -1).reduce((obj, prop) => obj[prop], obj);
                const rawValue = path.reduce((obj, prop) => obj[prop], obj);
                switch (type) {
                    case "GET" /* MessageType.GET */:
                        {
                            returnValue = rawValue;
                        }
                        break;
                    case "SET" /* MessageType.SET */:
                        {
                            parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
                            returnValue = true;
                        }
                        break;
                    case "APPLY" /* MessageType.APPLY */:
                        {
                            returnValue = rawValue.apply(parent, argumentList);
                        }
                        break;
                    case "CONSTRUCT" /* MessageType.CONSTRUCT */:
                        {
                            const value = new rawValue(...argumentList);
                            returnValue = proxy(value);
                        }
                        break;
                    case "ENDPOINT" /* MessageType.ENDPOINT */:
                        {
                            const { port1, port2 } = new MessageChannel();
                            expose$1(obj, port2);
                            returnValue = transfer(port1, [port1]);
                        }
                        break;
                    case "RELEASE" /* MessageType.RELEASE */:
                        {
                            returnValue = undefined;
                        }
                        break;
                    default:
                        return;
                }
            }
            catch (value) {
                returnValue = { value, [throwMarker]: 0 };
            }
            Promise.resolve(returnValue)
                .catch((value) => {
                return { value, [throwMarker]: 0 };
            })
                .then((returnValue) => {
                const [wireValue, transferables] = toWireValue(returnValue);
                ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
                if (type === "RELEASE" /* MessageType.RELEASE */) {
                    // detach and deactive after sending release response above.
                    ep.removeEventListener("message", callback);
                    closeEndPoint(ep);
                    if (finalizer in obj && typeof obj[finalizer] === "function") {
                        obj[finalizer]();
                    }
                }
            })
                .catch((error) => {
                // Send Serialization Error To Caller
                const [wireValue, transferables] = toWireValue({
                    value: new TypeError("Unserializable return value"),
                    [throwMarker]: 0,
                });
                ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
            });
        });
        if (ep.start) {
            ep.start();
        }
    }
    function isMessagePort(endpoint) {
        return endpoint.constructor.name === "MessagePort";
    }
    function closeEndPoint(endpoint) {
        if (isMessagePort(endpoint))
            endpoint.close();
    }
    function wrap(ep, target) {
        const pendingListeners = new Map();
        ep.addEventListener("message", function handleMessage(ev) {
            const { data } = ev;
            if (!data || !data.id) {
                return;
            }
            const resolver = pendingListeners.get(data.id);
            if (!resolver) {
                return;
            }
            try {
                resolver(data);
            }
            finally {
                pendingListeners.delete(data.id);
            }
        });
        return createProxy(ep, pendingListeners, [], target);
    }
    function throwIfProxyReleased(isReleased) {
        if (isReleased) {
            throw new Error("Proxy has been released and is not useable");
        }
    }
    function releaseEndpoint(ep) {
        return requestResponseMessage(ep, new Map(), {
            type: "RELEASE" /* MessageType.RELEASE */,
        }).then(() => {
            closeEndPoint(ep);
        });
    }
    const proxyCounter = new WeakMap();
    const proxyFinalizers = "FinalizationRegistry" in globalThis &&
        new FinalizationRegistry((ep) => {
            const newCount = (proxyCounter.get(ep) || 0) - 1;
            proxyCounter.set(ep, newCount);
            if (newCount === 0) {
                releaseEndpoint(ep);
            }
        });
    function registerProxy(proxy, ep) {
        const newCount = (proxyCounter.get(ep) || 0) + 1;
        proxyCounter.set(ep, newCount);
        if (proxyFinalizers) {
            proxyFinalizers.register(proxy, ep, proxy);
        }
    }
    function unregisterProxy(proxy) {
        if (proxyFinalizers) {
            proxyFinalizers.unregister(proxy);
        }
    }
    function createProxy(ep, pendingListeners, path = [], target = function () { }) {
        let isProxyReleased = false;
        const proxy = new Proxy(target, {
            get(_target, prop) {
                throwIfProxyReleased(isProxyReleased);
                if (prop === releaseProxy) {
                    return () => {
                        unregisterProxy(proxy);
                        releaseEndpoint(ep);
                        pendingListeners.clear();
                        isProxyReleased = true;
                    };
                }
                if (prop === "then") {
                    if (path.length === 0) {
                        return { then: () => proxy };
                    }
                    const r = requestResponseMessage(ep, pendingListeners, {
                        type: "GET" /* MessageType.GET */,
                        path: path.map((p) => p.toString()),
                    }).then(fromWireValue);
                    return r.then.bind(r);
                }
                return createProxy(ep, pendingListeners, [...path, prop]);
            },
            set(_target, prop, rawValue) {
                throwIfProxyReleased(isProxyReleased);
                // FIXME: ES6 Proxy Handler `set` methods are supposed to return a
                // boolean. To show good will, we return true asynchronously ¯\_(ツ)_/¯
                const [value, transferables] = toWireValue(rawValue);
                return requestResponseMessage(ep, pendingListeners, {
                    type: "SET" /* MessageType.SET */,
                    path: [...path, prop].map((p) => p.toString()),
                    value,
                }, transferables).then(fromWireValue);
            },
            apply(_target, _thisArg, rawArgumentList) {
                throwIfProxyReleased(isProxyReleased);
                const last = path[path.length - 1];
                if (last === createEndpoint) {
                    return requestResponseMessage(ep, pendingListeners, {
                        type: "ENDPOINT" /* MessageType.ENDPOINT */,
                    }).then(fromWireValue);
                }
                // We just pretend that `bind()` didn’t happen.
                if (last === "bind") {
                    return createProxy(ep, pendingListeners, path.slice(0, -1));
                }
                const [argumentList, transferables] = processArguments(rawArgumentList);
                return requestResponseMessage(ep, pendingListeners, {
                    type: "APPLY" /* MessageType.APPLY */,
                    path: path.map((p) => p.toString()),
                    argumentList,
                }, transferables).then(fromWireValue);
            },
            construct(_target, rawArgumentList) {
                throwIfProxyReleased(isProxyReleased);
                const [argumentList, transferables] = processArguments(rawArgumentList);
                return requestResponseMessage(ep, pendingListeners, {
                    type: "CONSTRUCT" /* MessageType.CONSTRUCT */,
                    path: path.map((p) => p.toString()),
                    argumentList,
                }, transferables).then(fromWireValue);
            },
        });
        registerProxy(proxy, ep);
        return proxy;
    }
    function myFlat(arr) {
        return Array.prototype.concat.apply([], arr);
    }
    function processArguments(argumentList) {
        const processed = argumentList.map(toWireValue);
        return [processed.map((v) => v[0]), myFlat(processed.map((v) => v[1]))];
    }
    const transferCache = new WeakMap();
    function transfer(obj, transfers) {
        transferCache.set(obj, transfers);
        return obj;
    }
    function proxy(obj) {
        return Object.assign(obj, { [proxyMarker]: true });
    }
    function windowEndpoint(w, context = globalThis, targetOrigin = "*") {
        return {
            postMessage: (msg, transferables) => w.postMessage(msg, targetOrigin, transferables),
            addEventListener: context.addEventListener.bind(context),
            removeEventListener: context.removeEventListener.bind(context),
        };
    }
    function toWireValue(value) {
        for (const [name, handler] of transferHandlers) {
            if (handler.canHandle(value)) {
                const [serializedValue, transferables] = handler.serialize(value);
                return [
                    {
                        type: "HANDLER" /* WireValueType.HANDLER */,
                        name,
                        value: serializedValue,
                    },
                    transferables,
                ];
            }
        }
        return [
            {
                type: "RAW" /* WireValueType.RAW */,
                value,
            },
            transferCache.get(value) || [],
        ];
    }
    function fromWireValue(value) {
        switch (value.type) {
            case "HANDLER" /* WireValueType.HANDLER */:
                return transferHandlers.get(value.name).deserialize(value.value);
            case "RAW" /* WireValueType.RAW */:
                return value.value;
        }
    }
    function requestResponseMessage(ep, pendingListeners, msg, transfers) {
        return new Promise((resolve) => {
            const id = generateUUID();
            pendingListeners.set(id, resolve);
            if (ep.start) {
                ep.start();
            }
            ep.postMessage(Object.assign({ id }, msg), transfers);
        });
    }
    function generateUUID() {
        return new Array(4)
            .fill(0)
            .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
            .join("-");
    }

    // export const api = {
    //   ui: {
    //     onmessage: () => {},
    //     postMessage: () => {},
    //   },
    // };
    const expose = (api, app, context) => {
        return expose$1(api, windowEndpoint(app, context));
    };
    const connect = (app, context) => {
        return wrap(windowEndpoint(app, context));
    };

    /**
     * @license bippy
     *
     * Copyright (c) Aiden Bai
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     */
    //#region src/rdt-hook.ts
    const version = "0.3.18";
    const BIPPY_INSTRUMENTATION_STRING = `bippy-${version}`;
    const objectDefineProperty = Object.defineProperty;
    const objectHasOwnProperty = Object.prototype.hasOwnProperty;
    const NO_OP = () => {};
    const checkDCE = (fn) => {
    	try {
    		const code = Function.prototype.toString.call(fn);
    		if (code.indexOf("^_^") > -1) setTimeout(() => {
    			throw new Error("React is running in production mode, but dead code elimination has not been applied. Read how to correctly configure React for production: https://reactjs.org/link/perf-use-production-build");
    		});
    	} catch {}
    };
    const isRealReactDevtools = (rdtHook = getRDTHook()) => {
    	return "getFiberRoots" in rdtHook;
    };
    let isReactRefreshOverride = false;
    let injectFnStr = void 0;
    const isReactRefresh = (rdtHook = getRDTHook()) => {
    	if (isReactRefreshOverride) return true;
    	if (typeof rdtHook.inject === "function") injectFnStr = rdtHook.inject.toString();
    	return Boolean(injectFnStr?.includes("(injected)"));
    };
    const onActiveListeners = new Set();
    const _renderers = new Set();
    const installRDTHook = (onActive) => {
    	const renderers = new Map();
    	let i = 0;
    	let rdtHook = {
    		checkDCE,
    		supportsFiber: true,
    		supportsFlight: true,
    		hasUnsupportedRendererAttached: false,
    		renderers,
    		onCommitFiberRoot: NO_OP,
    		onCommitFiberUnmount: NO_OP,
    		onPostCommitFiberRoot: NO_OP,
    		on: NO_OP,
    		inject(renderer) {
    			const nextID = ++i;
    			renderers.set(nextID, renderer);
    			_renderers.add(renderer);
    			if (!rdtHook._instrumentationIsActive) {
    				rdtHook._instrumentationIsActive = true;
    				onActiveListeners.forEach((listener) => listener());
    			}
    			return nextID;
    		},
    		_instrumentationSource: BIPPY_INSTRUMENTATION_STRING,
    		_instrumentationIsActive: false
    	};
    	try {
    		objectDefineProperty(globalThis, "__REACT_DEVTOOLS_GLOBAL_HOOK__", {
    			get() {
    				return rdtHook;
    			},
    			set(newHook) {
    				if (newHook && typeof newHook === "object") {
    					const ourRenderers = rdtHook.renderers;
    					rdtHook = newHook;
    					if (ourRenderers.size > 0) {
    						ourRenderers.forEach((renderer, id) => {
    							_renderers.add(renderer);
    							newHook.renderers.set(id, renderer);
    						});
    						patchRDTHook(onActive);
    					}
    				}
    			},
    			configurable: true,
    			enumerable: true
    		});
    		const originalWindowHasOwnProperty = window.hasOwnProperty;
    		let hasRanHack = false;
    		objectDefineProperty(window, "hasOwnProperty", {
    			value: function() {
    				try {
    					if (!hasRanHack && arguments[0] === "__REACT_DEVTOOLS_GLOBAL_HOOK__") {
    						globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = void 0;
    						hasRanHack = true;
    						return -0;
    					}
    				} catch {}
    				return originalWindowHasOwnProperty.apply(this, arguments);
    			},
    			configurable: true,
    			writable: true
    		});
    	} catch {
    		patchRDTHook(onActive);
    	}
    	return rdtHook;
    };
    const patchRDTHook = (onActive) => {
    	try {
    		const rdtHook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    		if (!rdtHook) return;
    		if (!rdtHook._instrumentationSource) {
    			rdtHook.checkDCE = checkDCE;
    			rdtHook.supportsFiber = true;
    			rdtHook.supportsFlight = true;
    			rdtHook.hasUnsupportedRendererAttached = false;
    			rdtHook._instrumentationSource = BIPPY_INSTRUMENTATION_STRING;
    			rdtHook._instrumentationIsActive = false;
    			rdtHook.on = NO_OP;
    			if (rdtHook.renderers.size) {
    				rdtHook._instrumentationIsActive = true;
    				onActiveListeners.forEach((listener) => listener());
    				return;
    			}
    			const prevInject = rdtHook.inject;
    			if (isReactRefresh(rdtHook) && !isRealReactDevtools()) {
    				isReactRefreshOverride = true;
    				const nextID = rdtHook.inject({ scheduleRefresh() {} });
    				if (nextID) rdtHook._instrumentationIsActive = true;
    			}
    			rdtHook.inject = (renderer) => {
    				const id = prevInject(renderer);
    				_renderers.add(renderer);
    				rdtHook._instrumentationIsActive = true;
    				onActiveListeners.forEach((listener) => listener());
    				return id;
    			};
    		}
    		if (rdtHook.renderers.size || rdtHook._instrumentationIsActive || isReactRefresh()) onActive?.();
    	} catch {}
    };
    const hasRDTHook = () => {
    	return objectHasOwnProperty.call(globalThis, "__REACT_DEVTOOLS_GLOBAL_HOOK__");
    };
    /**
    * Returns the current React DevTools global hook.
    */
    const getRDTHook = (onActive) => {
    	if (!hasRDTHook()) return installRDTHook(onActive);
    	patchRDTHook(onActive);
    	return globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    };
    const isClientEnvironment = () => {
    	return Boolean(typeof window !== "undefined" && (window.document?.createElement || window.navigator?.product === "ReactNative"));
    };
    /**
    * Usually used purely for side effect
    */
    const safelyInstallRDTHook = () => {
    	try {
    		if (isClientEnvironment()) getRDTHook();
    	} catch {}
    };

    /**
     * @license bippy
     *
     * Copyright (c) Aiden Bai
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     */

    //#endregion
    //#region src/core.ts
    const FunctionComponentTag = 0;
    const ClassComponentTag = 1;
    const HostComponentTag = 5;
    const ForwardRefTag = 11;
    const MemoComponentTag = 14;
    const SimpleMemoComponentTag = 15;
    const HostHoistableTag = 26;
    const HostSingletonTag = 27;
    /**
    * Returns `true` if fiber is a host fiber. Host fibers are DOM nodes in react-dom, `View` in react-native, etc.
    *
    * @see https://reactnative.dev/architecture/glossary#host-view-tree-and-host-view
    */
    const isHostFiber = (fiber) => {
    	switch (fiber.tag) {
    		case HostComponentTag:
    		case HostHoistableTag:
    		case HostSingletonTag: return true;
    		default: return typeof fiber.type === "string";
    	}
    };
    /**
    * Returns `true` if fiber is a composite fiber. Composite fibers are fibers that can render (like functional components, class components, etc.)
    *
    * @see https://reactnative.dev/architecture/glossary#react-composite-components
    */
    const isCompositeFiber = (fiber) => {
    	switch (fiber.tag) {
    		case FunctionComponentTag:
    		case ClassComponentTag:
    		case SimpleMemoComponentTag:
    		case MemoComponentTag:
    		case ForwardRefTag: return true;
    		default: return false;
    	}
    };
    /**
    * Traverses up or down a {@link Fiber}, return `true` to stop and select a node.
    */
    const traverseFiber = (fiber, selector, ascending = false) => {
    	if (!fiber) return null;
    	if (selector(fiber) === true) return fiber;
    	let child = ascending ? fiber.return : fiber.child;
    	while (child) {
    		const match = traverseFiber(child, selector, ascending);
    		if (match) return match;
    		child = ascending ? null : child.sibling;
    	}
    	return null;
    };
    /**
    * Returns the type (e.g. component definition) of the {@link Fiber}
    */
    const getType = (type) => {
    	const currentType = type;
    	if (typeof currentType === "function") return currentType;
    	if (typeof currentType === "object" && currentType) return getType(currentType.type || currentType.render);
    	return null;
    };
    /**
    * Returns the display name of the {@link Fiber} type.
    */
    const getDisplayName = (type) => {
    	const currentType = type;
    	if (typeof currentType === "string") return currentType;
    	if (typeof currentType !== "function" && !(typeof currentType === "object" && currentType)) return null;
    	const name = currentType.displayName || currentType.name || null;
    	if (name) return name;
    	const unwrappedType = getType(currentType);
    	if (!unwrappedType) return null;
    	return unwrappedType.displayName || unwrappedType.name || null;
    };
    const getFiberFromHostInstance = (hostInstance) => {
    	const rdtHook = getRDTHook();
    	for (const renderer of rdtHook.renderers.values()) try {
    		const fiber = renderer.findFiberByHostInstance?.(hostInstance);
    		if (fiber) return fiber;
    	} catch {}
    	if (typeof hostInstance === "object" && hostInstance != null) {
    		if ("_reactRootContainer" in hostInstance) return hostInstance._reactRootContainer?._internalRoot?.current?.child;
    		for (const key in hostInstance) if (key.startsWith("__reactInternalInstance$") || key.startsWith("__reactFiber")) return hostInstance[key] || null;
    	}
    	return null;
    };

    /**
     * @license bippy
     *
     * Copyright (c) Aiden Bai
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     */

    //#region src/index.ts
    safelyInstallRDTHook();

    //#endregion

    /**
     * @license bippy
     *
     * Copyright (c) Aiden Bai
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     */

    //#region rolldown:runtime
    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __commonJS = (cb, mod) => function() {
    	return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    };
    var __copyProps = (to, from, except, desc) => {
    	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
    		key = keys[i];
    		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
    			get: ((k) => from[k]).bind(null, key),
    			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    		});
    	}
    	return to;
    };
    var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(__defProp(target, "default", {
    	value: mod,
    	enumerable: true
    }) , mod));

    //#endregion
    //#region ../../node_modules/.pnpm/error-stack-parser-es@1.0.5/node_modules/error-stack-parser-es/dist/lite.mjs
    const CHROME_IE_STACK_REGEXP = /^\s*at .*(\S+:\d+|\(native\))/m;
    const SAFARI_NATIVE_CODE_REGEXP = /^(eval@)?(\[native code\])?$/;
    function parseStack(stackString, options) {
    	if (stackString.match(CHROME_IE_STACK_REGEXP)) return parseV8OrIeString(stackString);
    	else return parseFFOrSafariString(stackString);
    }
    function extractLocation(urlLike) {
    	if (!urlLike.includes(":")) return [
    		urlLike,
    		void 0,
    		void 0
    	];
    	const regExp = /(.+?)(?::(\d+))?(?::(\d+))?$/;
    	const parts = regExp.exec(urlLike.replace(/[()]/g, ""));
    	return [
    		parts[1],
    		parts[2] || void 0,
    		parts[3] || void 0
    	];
    }
    function applySlice(lines, options) {
    	return lines;
    }
    function parseV8OrIeString(stack, options) {
    	const filtered = applySlice(stack.split("\n").filter((line) => {
    		return !!line.match(CHROME_IE_STACK_REGEXP);
    	}));
    	return filtered.map((line) => {
    		if (line.includes("(eval ")) line = line.replace(/eval code/g, "eval").replace(/(\(eval at [^()]*)|(,.*$)/g, "");
    		let sanitizedLine = line.replace(/^\s+/, "").replace(/\(eval code/g, "(").replace(/^.*?\s+/, "");
    		const location = sanitizedLine.match(/ (\(.+\)$)/);
    		sanitizedLine = location ? sanitizedLine.replace(location[0], "") : sanitizedLine;
    		const locationParts = extractLocation(location ? location[1] : sanitizedLine);
    		const functionName = location && sanitizedLine || void 0;
    		const fileName = ["eval", "<anonymous>"].includes(locationParts[0]) ? void 0 : locationParts[0];
    		return {
    			function: functionName,
    			file: fileName,
    			line: locationParts[1] ? +locationParts[1] : void 0,
    			col: locationParts[2] ? +locationParts[2] : void 0,
    			raw: line
    		};
    	});
    }
    function parseFFOrSafariString(stack, options) {
    	const filtered = applySlice(stack.split("\n").filter((line) => {
    		return !line.match(SAFARI_NATIVE_CODE_REGEXP);
    	}));
    	return filtered.map((line) => {
    		if (line.includes(" > eval")) line = line.replace(/ line (\d+)(?: > eval line \d+)* > eval:\d+:\d+/g, ":$1");
    		if (!line.includes("@") && !line.includes(":")) return { function: line };
    		else {
    			const functionNameRegex = /(([^\n\r"\u2028\u2029]*".[^\n\r"\u2028\u2029]*"[^\n\r@\u2028\u2029]*(?:@[^\n\r"\u2028\u2029]*"[^\n\r@\u2028\u2029]*)*(?:[\n\r\u2028\u2029][^@]*)?)?[^@]*)@/;
    			const matches = line.match(functionNameRegex);
    			const functionName = matches && matches[1] ? matches[1] : void 0;
    			const locationParts = extractLocation(line.replace(functionNameRegex, ""));
    			return {
    				function: functionName,
    				file: locationParts[0],
    				line: locationParts[1] ? +locationParts[1] : void 0,
    				col: locationParts[2] ? +locationParts[2] : void 0,
    				raw: line
    			};
    		}
    	});
    }

    //#endregion
    //#region ../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/base64.js
    var require_base64 = __commonJS({ "../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/base64.js"(exports) {
    	var intToCharMap = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
    	/**
    	* Encode an integer in the range of 0 to 63 to a single base 64 digit.
    	*/
    	exports.encode = function(number) {
    		if (0 <= number && number < intToCharMap.length) return intToCharMap[number];
    		throw new TypeError("Must be between 0 and 63: " + number);
    	};
    	/**
    	* Decode a single base 64 character code digit to an integer. Returns -1 on
    	* failure.
    	*/
    	exports.decode = function(charCode) {
    		var bigA = 65;
    		var bigZ = 90;
    		var littleA = 97;
    		var littleZ = 122;
    		var zero = 48;
    		var nine = 57;
    		var plus = 43;
    		var slash = 47;
    		var littleOffset = 26;
    		var numberOffset = 52;
    		if (bigA <= charCode && charCode <= bigZ) return charCode - bigA;
    		if (littleA <= charCode && charCode <= littleZ) return charCode - littleA + littleOffset;
    		if (zero <= charCode && charCode <= nine) return charCode - zero + numberOffset;
    		if (charCode == plus) return 62;
    		if (charCode == slash) return 63;
    		return -1;
    	};
    } });

    //#endregion
    //#region ../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/base64-vlq.js
    var require_base64_vlq = __commonJS({ "../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/base64-vlq.js"(exports) {
    	var base64 = require_base64();
    	var VLQ_BASE_SHIFT = 5;
    	var VLQ_BASE = 1 << VLQ_BASE_SHIFT;
    	var VLQ_BASE_MASK = VLQ_BASE - 1;
    	var VLQ_CONTINUATION_BIT = VLQ_BASE;
    	/**
    	* Converts from a two-complement value to a value where the sign bit is
    	* placed in the least significant bit.  For example, as decimals:
    	*   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
    	*   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
    	*/
    	function toVLQSigned(aValue) {
    		return aValue < 0 ? (-aValue << 1) + 1 : (aValue << 1) + 0;
    	}
    	/**
    	* Converts to a two-complement value from a value where the sign bit is
    	* placed in the least significant bit.  For example, as decimals:
    	*   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
    	*   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
    	*/
    	function fromVLQSigned(aValue) {
    		var isNegative = (aValue & 1) === 1;
    		var shifted = aValue >> 1;
    		return isNegative ? -shifted : shifted;
    	}
    	/**
    	* Returns the base 64 VLQ encoded value.
    	*/
    	exports.encode = function base64VLQ_encode(aValue) {
    		var encoded = "";
    		var digit;
    		var vlq = toVLQSigned(aValue);
    		do {
    			digit = vlq & VLQ_BASE_MASK;
    			vlq >>>= VLQ_BASE_SHIFT;
    			if (vlq > 0) digit |= VLQ_CONTINUATION_BIT;
    			encoded += base64.encode(digit);
    		} while (vlq > 0);
    		return encoded;
    	};
    	/**
    	* Decodes the next base 64 VLQ value from the given string and returns the
    	* value and the rest of the string via the out parameter.
    	*/
    	exports.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
    		var strLen = aStr.length;
    		var result = 0;
    		var shift = 0;
    		var continuation, digit;
    		do {
    			if (aIndex >= strLen) throw new Error("Expected more digits in base 64 VLQ value.");
    			digit = base64.decode(aStr.charCodeAt(aIndex++));
    			if (digit === -1) throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
    			continuation = !!(digit & VLQ_CONTINUATION_BIT);
    			digit &= VLQ_BASE_MASK;
    			result = result + (digit << shift);
    			shift += VLQ_BASE_SHIFT;
    		} while (continuation);
    		aOutParam.value = fromVLQSigned(result);
    		aOutParam.rest = aIndex;
    	};
    } });

    //#endregion
    //#region ../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/util.js
    var require_util = __commonJS({ "../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/util.js"(exports) {
    	/**
    	* This is a helper function for getting values from parameter/options
    	* objects.
    	*
    	* @param args The object we are extracting values from
    	* @param name The name of the property we are getting.
    	* @param defaultValue An optional value to return if the property is missing
    	* from the object. If this is not specified and the property is missing, an
    	* error will be thrown.
    	*/
    	function getArg(aArgs, aName, aDefaultValue) {
    		if (aName in aArgs) return aArgs[aName];
    		else if (arguments.length === 3) return aDefaultValue;
    		else throw new Error("\"" + aName + "\" is a required argument.");
    	}
    	exports.getArg = getArg;
    	var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
    	var dataUrlRegexp = /^data:.+\,.+$/;
    	function urlParse(aUrl) {
    		var match = aUrl.match(urlRegexp);
    		if (!match) return null;
    		return {
    			scheme: match[1],
    			auth: match[2],
    			host: match[3],
    			port: match[4],
    			path: match[5]
    		};
    	}
    	exports.urlParse = urlParse;
    	function urlGenerate(aParsedUrl) {
    		var url = "";
    		if (aParsedUrl.scheme) url += aParsedUrl.scheme + ":";
    		url += "//";
    		if (aParsedUrl.auth) url += aParsedUrl.auth + "@";
    		if (aParsedUrl.host) url += aParsedUrl.host;
    		if (aParsedUrl.port) url += ":" + aParsedUrl.port;
    		if (aParsedUrl.path) url += aParsedUrl.path;
    		return url;
    	}
    	exports.urlGenerate = urlGenerate;
    	var MAX_CACHED_INPUTS = 32;
    	/**
    	* Takes some function `f(input) -> result` and returns a memoized version of
    	* `f`.
    	*
    	* We keep at most `MAX_CACHED_INPUTS` memoized results of `f` alive. The
    	* memoization is a dumb-simple, linear least-recently-used cache.
    	*/
    	function lruMemoize(f) {
    		var cache = [];
    		return function(input) {
    			for (var i = 0; i < cache.length; i++) if (cache[i].input === input) {
    				var temp = cache[0];
    				cache[0] = cache[i];
    				cache[i] = temp;
    				return cache[0].result;
    			}
    			var result = f(input);
    			cache.unshift({
    				input,
    				result
    			});
    			if (cache.length > MAX_CACHED_INPUTS) cache.pop();
    			return result;
    		};
    	}
    	/**
    	* Normalizes a path, or the path portion of a URL:
    	*
    	* - Replaces consecutive slashes with one slash.
    	* - Removes unnecessary '.' parts.
    	* - Removes unnecessary '<dir>/..' parts.
    	*
    	* Based on code in the Node.js 'path' core module.
    	*
    	* @param aPath The path or url to normalize.
    	*/
    	var normalize = lruMemoize(function normalize$1(aPath) {
    		var path = aPath;
    		var url = urlParse(aPath);
    		if (url) {
    			if (!url.path) return aPath;
    			path = url.path;
    		}
    		var isAbsolute = exports.isAbsolute(path);
    		var parts = [];
    		var start = 0;
    		var i = 0;
    		while (true) {
    			start = i;
    			i = path.indexOf("/", start);
    			if (i === -1) {
    				parts.push(path.slice(start));
    				break;
    			} else {
    				parts.push(path.slice(start, i));
    				while (i < path.length && path[i] === "/") i++;
    			}
    		}
    		for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
    			part = parts[i];
    			if (part === ".") parts.splice(i, 1);
    			else if (part === "..") up++;
    			else if (up > 0) if (part === "") {
    				parts.splice(i + 1, up);
    				up = 0;
    			} else {
    				parts.splice(i, 2);
    				up--;
    			}
    		}
    		path = parts.join("/");
    		if (path === "") path = isAbsolute ? "/" : ".";
    		if (url) {
    			url.path = path;
    			return urlGenerate(url);
    		}
    		return path;
    	});
    	exports.normalize = normalize;
    	/**
    	* Joins two paths/URLs.
    	*
    	* @param aRoot The root path or URL.
    	* @param aPath The path or URL to be joined with the root.
    	*
    	* - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
    	*   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
    	*   first.
    	* - Otherwise aPath is a path. If aRoot is a URL, then its path portion
    	*   is updated with the result and aRoot is returned. Otherwise the result
    	*   is returned.
    	*   - If aPath is absolute, the result is aPath.
    	*   - Otherwise the two paths are joined with a slash.
    	* - Joining for example 'http://' and 'www.example.com' is also supported.
    	*/
    	function join(aRoot, aPath) {
    		if (aRoot === "") aRoot = ".";
    		if (aPath === "") aPath = ".";
    		var aPathUrl = urlParse(aPath);
    		var aRootUrl = urlParse(aRoot);
    		if (aRootUrl) aRoot = aRootUrl.path || "/";
    		if (aPathUrl && !aPathUrl.scheme) {
    			if (aRootUrl) aPathUrl.scheme = aRootUrl.scheme;
    			return urlGenerate(aPathUrl);
    		}
    		if (aPathUrl || aPath.match(dataUrlRegexp)) return aPath;
    		if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
    			aRootUrl.host = aPath;
    			return urlGenerate(aRootUrl);
    		}
    		var joined = aPath.charAt(0) === "/" ? aPath : normalize(aRoot.replace(/\/+$/, "") + "/" + aPath);
    		if (aRootUrl) {
    			aRootUrl.path = joined;
    			return urlGenerate(aRootUrl);
    		}
    		return joined;
    	}
    	exports.join = join;
    	exports.isAbsolute = function(aPath) {
    		return aPath.charAt(0) === "/" || urlRegexp.test(aPath);
    	};
    	/**
    	* Make a path relative to a URL or another path.
    	*
    	* @param aRoot The root path or URL.
    	* @param aPath The path or URL to be made relative to aRoot.
    	*/
    	function relative(aRoot, aPath) {
    		if (aRoot === "") aRoot = ".";
    		aRoot = aRoot.replace(/\/$/, "");
    		var level = 0;
    		while (aPath.indexOf(aRoot + "/") !== 0) {
    			var index = aRoot.lastIndexOf("/");
    			if (index < 0) return aPath;
    			aRoot = aRoot.slice(0, index);
    			if (aRoot.match(/^([^\/]+:\/)?\/*$/)) return aPath;
    			++level;
    		}
    		return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
    	}
    	exports.relative = relative;
    	var supportsNullProto = function() {
    		var obj = Object.create(null);
    		return !("__proto__" in obj);
    	}();
    	function identity(s) {
    		return s;
    	}
    	/**
    	* Because behavior goes wacky when you set `__proto__` on objects, we
    	* have to prefix all the strings in our set with an arbitrary character.
    	*
    	* See https://github.com/mozilla/source-map/pull/31 and
    	* https://github.com/mozilla/source-map/issues/30
    	*
    	* @param String aStr
    	*/
    	function toSetString(aStr) {
    		if (isProtoString(aStr)) return "$" + aStr;
    		return aStr;
    	}
    	exports.toSetString = supportsNullProto ? identity : toSetString;
    	function fromSetString(aStr) {
    		if (isProtoString(aStr)) return aStr.slice(1);
    		return aStr;
    	}
    	exports.fromSetString = supportsNullProto ? identity : fromSetString;
    	function isProtoString(s) {
    		if (!s) return false;
    		var length = s.length;
    		if (length < 9) return false;
    		if (s.charCodeAt(length - 1) !== 95 || s.charCodeAt(length - 2) !== 95 || s.charCodeAt(length - 3) !== 111 || s.charCodeAt(length - 4) !== 116 || s.charCodeAt(length - 5) !== 111 || s.charCodeAt(length - 6) !== 114 || s.charCodeAt(length - 7) !== 112 || s.charCodeAt(length - 8) !== 95 || s.charCodeAt(length - 9) !== 95) return false;
    		for (var i = length - 10; i >= 0; i--) if (s.charCodeAt(i) !== 36) return false;
    		return true;
    	}
    	/**
    	* Comparator between two mappings where the original positions are compared.
    	*
    	* Optionally pass in `true` as `onlyCompareGenerated` to consider two
    	* mappings with the same original source/line/column, but different generated
    	* line and column the same. Useful when searching for a mapping with a
    	* stubbed out mapping.
    	*/
    	function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
    		var cmp = strcmp(mappingA.source, mappingB.source);
    		if (cmp !== 0) return cmp;
    		cmp = mappingA.originalLine - mappingB.originalLine;
    		if (cmp !== 0) return cmp;
    		cmp = mappingA.originalColumn - mappingB.originalColumn;
    		if (cmp !== 0 || onlyCompareOriginal) return cmp;
    		cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    		if (cmp !== 0) return cmp;
    		cmp = mappingA.generatedLine - mappingB.generatedLine;
    		if (cmp !== 0) return cmp;
    		return strcmp(mappingA.name, mappingB.name);
    	}
    	exports.compareByOriginalPositions = compareByOriginalPositions;
    	function compareByOriginalPositionsNoSource(mappingA, mappingB, onlyCompareOriginal) {
    		var cmp;
    		cmp = mappingA.originalLine - mappingB.originalLine;
    		if (cmp !== 0) return cmp;
    		cmp = mappingA.originalColumn - mappingB.originalColumn;
    		if (cmp !== 0 || onlyCompareOriginal) return cmp;
    		cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    		if (cmp !== 0) return cmp;
    		cmp = mappingA.generatedLine - mappingB.generatedLine;
    		if (cmp !== 0) return cmp;
    		return strcmp(mappingA.name, mappingB.name);
    	}
    	exports.compareByOriginalPositionsNoSource = compareByOriginalPositionsNoSource;
    	/**
    	* Comparator between two mappings with deflated source and name indices where
    	* the generated positions are compared.
    	*
    	* Optionally pass in `true` as `onlyCompareGenerated` to consider two
    	* mappings with the same generated line and column, but different
    	* source/name/original line and column the same. Useful when searching for a
    	* mapping with a stubbed out mapping.
    	*/
    	function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
    		var cmp = mappingA.generatedLine - mappingB.generatedLine;
    		if (cmp !== 0) return cmp;
    		cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    		if (cmp !== 0 || onlyCompareGenerated) return cmp;
    		cmp = strcmp(mappingA.source, mappingB.source);
    		if (cmp !== 0) return cmp;
    		cmp = mappingA.originalLine - mappingB.originalLine;
    		if (cmp !== 0) return cmp;
    		cmp = mappingA.originalColumn - mappingB.originalColumn;
    		if (cmp !== 0) return cmp;
    		return strcmp(mappingA.name, mappingB.name);
    	}
    	exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;
    	function compareByGeneratedPositionsDeflatedNoLine(mappingA, mappingB, onlyCompareGenerated) {
    		var cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    		if (cmp !== 0 || onlyCompareGenerated) return cmp;
    		cmp = strcmp(mappingA.source, mappingB.source);
    		if (cmp !== 0) return cmp;
    		cmp = mappingA.originalLine - mappingB.originalLine;
    		if (cmp !== 0) return cmp;
    		cmp = mappingA.originalColumn - mappingB.originalColumn;
    		if (cmp !== 0) return cmp;
    		return strcmp(mappingA.name, mappingB.name);
    	}
    	exports.compareByGeneratedPositionsDeflatedNoLine = compareByGeneratedPositionsDeflatedNoLine;
    	function strcmp(aStr1, aStr2) {
    		if (aStr1 === aStr2) return 0;
    		if (aStr1 === null) return 1;
    		if (aStr2 === null) return -1;
    		if (aStr1 > aStr2) return 1;
    		return -1;
    	}
    	/**
    	* Comparator between two mappings with inflated source and name strings where
    	* the generated positions are compared.
    	*/
    	function compareByGeneratedPositionsInflated(mappingA, mappingB) {
    		var cmp = mappingA.generatedLine - mappingB.generatedLine;
    		if (cmp !== 0) return cmp;
    		cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    		if (cmp !== 0) return cmp;
    		cmp = strcmp(mappingA.source, mappingB.source);
    		if (cmp !== 0) return cmp;
    		cmp = mappingA.originalLine - mappingB.originalLine;
    		if (cmp !== 0) return cmp;
    		cmp = mappingA.originalColumn - mappingB.originalColumn;
    		if (cmp !== 0) return cmp;
    		return strcmp(mappingA.name, mappingB.name);
    	}
    	exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;
    	/**
    	* Strip any JSON XSSI avoidance prefix from the string (as documented
    	* in the source maps specification), and then parse the string as
    	* JSON.
    	*/
    	function parseSourceMapInput(str) {
    		return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ""));
    	}
    	exports.parseSourceMapInput = parseSourceMapInput;
    	/**
    	* Compute the URL of a source given the the source root, the source's
    	* URL, and the source map's URL.
    	*/
    	function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
    		sourceURL = sourceURL || "";
    		if (sourceRoot) {
    			if (sourceRoot[sourceRoot.length - 1] !== "/" && sourceURL[0] !== "/") sourceRoot += "/";
    			sourceURL = sourceRoot + sourceURL;
    		}
    		if (sourceMapURL) {
    			var parsed = urlParse(sourceMapURL);
    			if (!parsed) throw new Error("sourceMapURL could not be parsed");
    			if (parsed.path) {
    				var index = parsed.path.lastIndexOf("/");
    				if (index >= 0) parsed.path = parsed.path.substring(0, index + 1);
    			}
    			sourceURL = join(urlGenerate(parsed), sourceURL);
    		}
    		return normalize(sourceURL);
    	}
    	exports.computeSourceURL = computeSourceURL;
    } });

    //#endregion
    //#region ../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/array-set.js
    var require_array_set = __commonJS({ "../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/array-set.js"(exports) {
    	var util$4 = require_util();
    	var has = Object.prototype.hasOwnProperty;
    	var hasNativeMap = typeof Map !== "undefined";
    	/**
    	* A data structure which is a combination of an array and a set. Adding a new
    	* member is O(1), testing for membership is O(1), and finding the index of an
    	* element is O(1). Removing elements from the set is not supported. Only
    	* strings are supported for membership.
    	*/
    	function ArraySet$2() {
    		this._array = [];
    		this._set = hasNativeMap ? new Map() : Object.create(null);
    	}
    	/**
    	* Static method for creating ArraySet instances from an existing array.
    	*/
    	ArraySet$2.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
    		var set = new ArraySet$2();
    		for (var i = 0, len = aArray.length; i < len; i++) set.add(aArray[i], aAllowDuplicates);
    		return set;
    	};
    	/**
    	* Return how many unique items are in this ArraySet. If duplicates have been
    	* added, than those do not count towards the size.
    	*
    	* @returns Number
    	*/
    	ArraySet$2.prototype.size = function ArraySet_size() {
    		return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
    	};
    	/**
    	* Add the given string to this set.
    	*
    	* @param String aStr
    	*/
    	ArraySet$2.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
    		var sStr = hasNativeMap ? aStr : util$4.toSetString(aStr);
    		var isDuplicate = hasNativeMap ? this.has(aStr) : has.call(this._set, sStr);
    		var idx = this._array.length;
    		if (!isDuplicate || aAllowDuplicates) this._array.push(aStr);
    		if (!isDuplicate) if (hasNativeMap) this._set.set(aStr, idx);
    		else this._set[sStr] = idx;
    	};
    	/**
    	* Is the given string a member of this set?
    	*
    	* @param String aStr
    	*/
    	ArraySet$2.prototype.has = function ArraySet_has(aStr) {
    		if (hasNativeMap) return this._set.has(aStr);
    		else {
    			var sStr = util$4.toSetString(aStr);
    			return has.call(this._set, sStr);
    		}
    	};
    	/**
    	* What is the index of the given string in the array?
    	*
    	* @param String aStr
    	*/
    	ArraySet$2.prototype.indexOf = function ArraySet_indexOf(aStr) {
    		if (hasNativeMap) {
    			var idx = this._set.get(aStr);
    			if (idx >= 0) return idx;
    		} else {
    			var sStr = util$4.toSetString(aStr);
    			if (has.call(this._set, sStr)) return this._set[sStr];
    		}
    		throw new Error("\"" + aStr + "\" is not in the set.");
    	};
    	/**
    	* What is the element at the given index?
    	*
    	* @param Number aIdx
    	*/
    	ArraySet$2.prototype.at = function ArraySet_at(aIdx) {
    		if (aIdx >= 0 && aIdx < this._array.length) return this._array[aIdx];
    		throw new Error("No element indexed by " + aIdx);
    	};
    	/**
    	* Returns the array representation of this set (which has the proper indices
    	* indicated by indexOf). Note that this is a copy of the internal array used
    	* for storing the members so that no one can mess with internal state.
    	*/
    	ArraySet$2.prototype.toArray = function ArraySet_toArray() {
    		return this._array.slice();
    	};
    	exports.ArraySet = ArraySet$2;
    } });

    //#endregion
    //#region ../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/mapping-list.js
    var require_mapping_list = __commonJS({ "../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/mapping-list.js"(exports) {
    	var util$3 = require_util();
    	/**
    	* Determine whether mappingB is after mappingA with respect to generated
    	* position.
    	*/
    	function generatedPositionAfter(mappingA, mappingB) {
    		var lineA = mappingA.generatedLine;
    		var lineB = mappingB.generatedLine;
    		var columnA = mappingA.generatedColumn;
    		var columnB = mappingB.generatedColumn;
    		return lineB > lineA || lineB == lineA && columnB >= columnA || util$3.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
    	}
    	/**
    	* A data structure to provide a sorted view of accumulated mappings in a
    	* performance conscious manner. It trades a neglibable overhead in general
    	* case for a large speedup in case of mappings being added in order.
    	*/
    	function MappingList$1() {
    		this._array = [];
    		this._sorted = true;
    		this._last = {
    			generatedLine: -1,
    			generatedColumn: 0
    		};
    	}
    	/**
    	* Iterate through internal items. This method takes the same arguments that
    	* `Array.prototype.forEach` takes.
    	*
    	* NOTE: The order of the mappings is NOT guaranteed.
    	*/
    	MappingList$1.prototype.unsortedForEach = function MappingList_forEach(aCallback, aThisArg) {
    		this._array.forEach(aCallback, aThisArg);
    	};
    	/**
    	* Add the given source mapping.
    	*
    	* @param Object aMapping
    	*/
    	MappingList$1.prototype.add = function MappingList_add(aMapping) {
    		if (generatedPositionAfter(this._last, aMapping)) {
    			this._last = aMapping;
    			this._array.push(aMapping);
    		} else {
    			this._sorted = false;
    			this._array.push(aMapping);
    		}
    	};
    	/**
    	* Returns the flat, sorted array of mappings. The mappings are sorted by
    	* generated position.
    	*
    	* WARNING: This method returns internal data without copying, for
    	* performance. The return value must NOT be mutated, and should be treated as
    	* an immutable borrow. If you want to take ownership, you must make your own
    	* copy.
    	*/
    	MappingList$1.prototype.toArray = function MappingList_toArray() {
    		if (!this._sorted) {
    			this._array.sort(util$3.compareByGeneratedPositionsInflated);
    			this._sorted = true;
    		}
    		return this._array;
    	};
    	exports.MappingList = MappingList$1;
    } });

    //#endregion
    //#region ../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-map-generator.js
    var require_source_map_generator = __commonJS({ "../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-map-generator.js"(exports) {
    	var base64VLQ$1 = require_base64_vlq();
    	var util$2 = require_util();
    	var ArraySet$1 = require_array_set().ArraySet;
    	var MappingList = require_mapping_list().MappingList;
    	/**
    	* An instance of the SourceMapGenerator represents a source map which is
    	* being built incrementally. You may pass an object with the following
    	* properties:
    	*
    	*   - file: The filename of the generated source.
    	*   - sourceRoot: A root for all relative URLs in this source map.
    	*/
    	function SourceMapGenerator$1(aArgs) {
    		if (!aArgs) aArgs = {};
    		this._file = util$2.getArg(aArgs, "file", null);
    		this._sourceRoot = util$2.getArg(aArgs, "sourceRoot", null);
    		this._skipValidation = util$2.getArg(aArgs, "skipValidation", false);
    		this._ignoreInvalidMapping = util$2.getArg(aArgs, "ignoreInvalidMapping", false);
    		this._sources = new ArraySet$1();
    		this._names = new ArraySet$1();
    		this._mappings = new MappingList();
    		this._sourcesContents = null;
    	}
    	SourceMapGenerator$1.prototype._version = 3;
    	/**
    	* Creates a new SourceMapGenerator based on a SourceMapConsumer
    	*
    	* @param aSourceMapConsumer The SourceMap.
    	*/
    	SourceMapGenerator$1.fromSourceMap = function SourceMapGenerator_fromSourceMap(aSourceMapConsumer, generatorOps) {
    		var sourceRoot = aSourceMapConsumer.sourceRoot;
    		var generator = new SourceMapGenerator$1(Object.assign(generatorOps || {}, {
    			file: aSourceMapConsumer.file,
    			sourceRoot
    		}));
    		aSourceMapConsumer.eachMapping(function(mapping) {
    			var newMapping = { generated: {
    				line: mapping.generatedLine,
    				column: mapping.generatedColumn
    			} };
    			if (mapping.source != null) {
    				newMapping.source = mapping.source;
    				if (sourceRoot != null) newMapping.source = util$2.relative(sourceRoot, newMapping.source);
    				newMapping.original = {
    					line: mapping.originalLine,
    					column: mapping.originalColumn
    				};
    				if (mapping.name != null) newMapping.name = mapping.name;
    			}
    			generator.addMapping(newMapping);
    		});
    		aSourceMapConsumer.sources.forEach(function(sourceFile) {
    			var sourceRelative = sourceFile;
    			if (sourceRoot !== null) sourceRelative = util$2.relative(sourceRoot, sourceFile);
    			if (!generator._sources.has(sourceRelative)) generator._sources.add(sourceRelative);
    			var content = aSourceMapConsumer.sourceContentFor(sourceFile);
    			if (content != null) generator.setSourceContent(sourceFile, content);
    		});
    		return generator;
    	};
    	/**
    	* Add a single mapping from original source line and column to the generated
    	* source's line and column for this source map being created. The mapping
    	* object should have the following properties:
    	*
    	*   - generated: An object with the generated line and column positions.
    	*   - original: An object with the original line and column positions.
    	*   - source: The original source file (relative to the sourceRoot).
    	*   - name: An optional original token name for this mapping.
    	*/
    	SourceMapGenerator$1.prototype.addMapping = function SourceMapGenerator_addMapping(aArgs) {
    		var generated = util$2.getArg(aArgs, "generated");
    		var original = util$2.getArg(aArgs, "original", null);
    		var source = util$2.getArg(aArgs, "source", null);
    		var name = util$2.getArg(aArgs, "name", null);
    		if (!this._skipValidation) {
    			if (this._validateMapping(generated, original, source, name) === false) return;
    		}
    		if (source != null) {
    			source = String(source);
    			if (!this._sources.has(source)) this._sources.add(source);
    		}
    		if (name != null) {
    			name = String(name);
    			if (!this._names.has(name)) this._names.add(name);
    		}
    		this._mappings.add({
    			generatedLine: generated.line,
    			generatedColumn: generated.column,
    			originalLine: original != null && original.line,
    			originalColumn: original != null && original.column,
    			source,
    			name
    		});
    	};
    	/**
    	* Set the source content for a source file.
    	*/
    	SourceMapGenerator$1.prototype.setSourceContent = function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
    		var source = aSourceFile;
    		if (this._sourceRoot != null) source = util$2.relative(this._sourceRoot, source);
    		if (aSourceContent != null) {
    			if (!this._sourcesContents) this._sourcesContents = Object.create(null);
    			this._sourcesContents[util$2.toSetString(source)] = aSourceContent;
    		} else if (this._sourcesContents) {
    			delete this._sourcesContents[util$2.toSetString(source)];
    			if (Object.keys(this._sourcesContents).length === 0) this._sourcesContents = null;
    		}
    	};
    	/**
    	* Applies the mappings of a sub-source-map for a specific source file to the
    	* source map being generated. Each mapping to the supplied source file is
    	* rewritten using the supplied source map. Note: The resolution for the
    	* resulting mappings is the minimium of this map and the supplied map.
    	*
    	* @param aSourceMapConsumer The source map to be applied.
    	* @param aSourceFile Optional. The filename of the source file.
    	*        If omitted, SourceMapConsumer's file property will be used.
    	* @param aSourceMapPath Optional. The dirname of the path to the source map
    	*        to be applied. If relative, it is relative to the SourceMapConsumer.
    	*        This parameter is needed when the two source maps aren't in the same
    	*        directory, and the source map to be applied contains relative source
    	*        paths. If so, those relative source paths need to be rewritten
    	*        relative to the SourceMapGenerator.
    	*/
    	SourceMapGenerator$1.prototype.applySourceMap = function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
    		var sourceFile = aSourceFile;
    		if (aSourceFile == null) {
    			if (aSourceMapConsumer.file == null) throw new Error("SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, or the source map's \"file\" property. Both were omitted.");
    			sourceFile = aSourceMapConsumer.file;
    		}
    		var sourceRoot = this._sourceRoot;
    		if (sourceRoot != null) sourceFile = util$2.relative(sourceRoot, sourceFile);
    		var newSources = new ArraySet$1();
    		var newNames = new ArraySet$1();
    		this._mappings.unsortedForEach(function(mapping) {
    			if (mapping.source === sourceFile && mapping.originalLine != null) {
    				var original = aSourceMapConsumer.originalPositionFor({
    					line: mapping.originalLine,
    					column: mapping.originalColumn
    				});
    				if (original.source != null) {
    					mapping.source = original.source;
    					if (aSourceMapPath != null) mapping.source = util$2.join(aSourceMapPath, mapping.source);
    					if (sourceRoot != null) mapping.source = util$2.relative(sourceRoot, mapping.source);
    					mapping.originalLine = original.line;
    					mapping.originalColumn = original.column;
    					if (original.name != null) mapping.name = original.name;
    				}
    			}
    			var source = mapping.source;
    			if (source != null && !newSources.has(source)) newSources.add(source);
    			var name = mapping.name;
    			if (name != null && !newNames.has(name)) newNames.add(name);
    		}, this);
    		this._sources = newSources;
    		this._names = newNames;
    		aSourceMapConsumer.sources.forEach(function(sourceFile$1) {
    			var content = aSourceMapConsumer.sourceContentFor(sourceFile$1);
    			if (content != null) {
    				if (aSourceMapPath != null) sourceFile$1 = util$2.join(aSourceMapPath, sourceFile$1);
    				if (sourceRoot != null) sourceFile$1 = util$2.relative(sourceRoot, sourceFile$1);
    				this.setSourceContent(sourceFile$1, content);
    			}
    		}, this);
    	};
    	/**
    	* A mapping can have one of the three levels of data:
    	*
    	*   1. Just the generated position.
    	*   2. The Generated position, original position, and original source.
    	*   3. Generated and original position, original source, as well as a name
    	*      token.
    	*
    	* To maintain consistency, we validate that any new mapping being added falls
    	* in to one of these categories.
    	*/
    	SourceMapGenerator$1.prototype._validateMapping = function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource, aName) {
    		if (aOriginal && typeof aOriginal.line !== "number" && typeof aOriginal.column !== "number") {
    			var message = "original.line and original.column are not numbers -- you probably meant to omit the original mapping entirely and only map the generated position. If so, pass null for the original mapping instead of an object with empty or null values.";
    			if (this._ignoreInvalidMapping) {
    				if (typeof console !== "undefined" && console.warn) console.warn(message);
    				return false;
    			} else throw new Error(message);
    		}
    		if (aGenerated && "line" in aGenerated && "column" in aGenerated && aGenerated.line > 0 && aGenerated.column >= 0 && !aOriginal && !aSource && !aName) return;
    		else if (aGenerated && "line" in aGenerated && "column" in aGenerated && aOriginal && "line" in aOriginal && "column" in aOriginal && aGenerated.line > 0 && aGenerated.column >= 0 && aOriginal.line > 0 && aOriginal.column >= 0 && aSource) return;
    		else {
    			var message = "Invalid mapping: " + JSON.stringify({
    				generated: aGenerated,
    				source: aSource,
    				original: aOriginal,
    				name: aName
    			});
    			if (this._ignoreInvalidMapping) {
    				if (typeof console !== "undefined" && console.warn) console.warn(message);
    				return false;
    			} else throw new Error(message);
    		}
    	};
    	/**
    	* Serialize the accumulated mappings in to the stream of base 64 VLQs
    	* specified by the source map format.
    	*/
    	SourceMapGenerator$1.prototype._serializeMappings = function SourceMapGenerator_serializeMappings() {
    		var previousGeneratedColumn = 0;
    		var previousGeneratedLine = 1;
    		var previousOriginalColumn = 0;
    		var previousOriginalLine = 0;
    		var previousName = 0;
    		var previousSource = 0;
    		var result = "";
    		var next;
    		var mapping;
    		var nameIdx;
    		var sourceIdx;
    		var mappings = this._mappings.toArray();
    		for (var i = 0, len = mappings.length; i < len; i++) {
    			mapping = mappings[i];
    			next = "";
    			if (mapping.generatedLine !== previousGeneratedLine) {
    				previousGeneratedColumn = 0;
    				while (mapping.generatedLine !== previousGeneratedLine) {
    					next += ";";
    					previousGeneratedLine++;
    				}
    			} else if (i > 0) {
    				if (!util$2.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) continue;
    				next += ",";
    			}
    			next += base64VLQ$1.encode(mapping.generatedColumn - previousGeneratedColumn);
    			previousGeneratedColumn = mapping.generatedColumn;
    			if (mapping.source != null) {
    				sourceIdx = this._sources.indexOf(mapping.source);
    				next += base64VLQ$1.encode(sourceIdx - previousSource);
    				previousSource = sourceIdx;
    				next += base64VLQ$1.encode(mapping.originalLine - 1 - previousOriginalLine);
    				previousOriginalLine = mapping.originalLine - 1;
    				next += base64VLQ$1.encode(mapping.originalColumn - previousOriginalColumn);
    				previousOriginalColumn = mapping.originalColumn;
    				if (mapping.name != null) {
    					nameIdx = this._names.indexOf(mapping.name);
    					next += base64VLQ$1.encode(nameIdx - previousName);
    					previousName = nameIdx;
    				}
    			}
    			result += next;
    		}
    		return result;
    	};
    	SourceMapGenerator$1.prototype._generateSourcesContent = function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
    		return aSources.map(function(source) {
    			if (!this._sourcesContents) return null;
    			if (aSourceRoot != null) source = util$2.relative(aSourceRoot, source);
    			var key = util$2.toSetString(source);
    			return Object.prototype.hasOwnProperty.call(this._sourcesContents, key) ? this._sourcesContents[key] : null;
    		}, this);
    	};
    	/**
    	* Externalize the source map.
    	*/
    	SourceMapGenerator$1.prototype.toJSON = function SourceMapGenerator_toJSON() {
    		var map = {
    			version: this._version,
    			sources: this._sources.toArray(),
    			names: this._names.toArray(),
    			mappings: this._serializeMappings()
    		};
    		if (this._file != null) map.file = this._file;
    		if (this._sourceRoot != null) map.sourceRoot = this._sourceRoot;
    		if (this._sourcesContents) map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
    		return map;
    	};
    	/**
    	* Render the source map being generated to a string.
    	*/
    	SourceMapGenerator$1.prototype.toString = function SourceMapGenerator_toString() {
    		return JSON.stringify(this.toJSON());
    	};
    	exports.SourceMapGenerator = SourceMapGenerator$1;
    } });

    //#endregion
    //#region ../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/binary-search.js
    var require_binary_search = __commonJS({ "../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/binary-search.js"(exports) {
    	exports.GREATEST_LOWER_BOUND = 1;
    	exports.LEAST_UPPER_BOUND = 2;
    	/**
    	* Recursive implementation of binary search.
    	*
    	* @param aLow Indices here and lower do not contain the needle.
    	* @param aHigh Indices here and higher do not contain the needle.
    	* @param aNeedle The element being searched for.
    	* @param aHaystack The non-empty array being searched.
    	* @param aCompare Function which takes two elements and returns -1, 0, or 1.
    	* @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
    	*     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
    	*     closest element that is smaller than or greater than the one we are
    	*     searching for, respectively, if the exact element cannot be found.
    	*/
    	function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
    		var mid = Math.floor((aHigh - aLow) / 2) + aLow;
    		var cmp = aCompare(aNeedle, aHaystack[mid], true);
    		if (cmp === 0) return mid;
    		else if (cmp > 0) {
    			if (aHigh - mid > 1) return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
    			if (aBias == exports.LEAST_UPPER_BOUND) return aHigh < aHaystack.length ? aHigh : -1;
    			else return mid;
    		} else {
    			if (mid - aLow > 1) return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
    			if (aBias == exports.LEAST_UPPER_BOUND) return mid;
    			else return aLow < 0 ? -1 : aLow;
    		}
    	}
    	/**
    	* This is an implementation of binary search which will always try and return
    	* the index of the closest element if there is no exact hit. This is because
    	* mappings between original and generated line/col pairs are single points,
    	* and there is an implicit region between each of them, so a miss just means
    	* that you aren't on the very start of a region.
    	*
    	* @param aNeedle The element you are looking for.
    	* @param aHaystack The array that is being searched.
    	* @param aCompare A function which takes the needle and an element in the
    	*     array and returns -1, 0, or 1 depending on whether the needle is less
    	*     than, equal to, or greater than the element, respectively.
    	* @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
    	*     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
    	*     closest element that is smaller than or greater than the one we are
    	*     searching for, respectively, if the exact element cannot be found.
    	*     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
    	*/
    	exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
    		if (aHaystack.length === 0) return -1;
    		var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack, aCompare, aBias || exports.GREATEST_LOWER_BOUND);
    		if (index < 0) return -1;
    		while (index - 1 >= 0) {
    			if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) break;
    			--index;
    		}
    		return index;
    	};
    } });

    //#endregion
    //#region ../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/quick-sort.js
    var require_quick_sort = __commonJS({ "../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/quick-sort.js"(exports) {
    	function SortTemplate(comparator) {
    		/**
    		* Swap the elements indexed by `x` and `y` in the array `ary`.
    		*
    		* @param {Array} ary
    		*        The array.
    		* @param {Number} x
    		*        The index of the first item.
    		* @param {Number} y
    		*        The index of the second item.
    		*/
    		function swap(ary, x, y) {
    			var temp = ary[x];
    			ary[x] = ary[y];
    			ary[y] = temp;
    		}
    		/**
    		* Returns a random integer within the range `low .. high` inclusive.
    		*
    		* @param {Number} low
    		*        The lower bound on the range.
    		* @param {Number} high
    		*        The upper bound on the range.
    		*/
    		function randomIntInRange(low, high) {
    			return Math.round(low + Math.random() * (high - low));
    		}
    		/**
    		* The Quick Sort algorithm.
    		*
    		* @param {Array} ary
    		*        An array to sort.
    		* @param {function} comparator
    		*        Function to use to compare two items.
    		* @param {Number} p
    		*        Start index of the array
    		* @param {Number} r
    		*        End index of the array
    		*/
    		function doQuickSort(ary, comparator$1, p, r) {
    			if (p < r) {
    				var pivotIndex = randomIntInRange(p, r);
    				var i = p - 1;
    				swap(ary, pivotIndex, r);
    				var pivot = ary[r];
    				for (var j = p; j < r; j++) if (comparator$1(ary[j], pivot, false) <= 0) {
    					i += 1;
    					swap(ary, i, j);
    				}
    				swap(ary, i + 1, j);
    				var q = i + 1;
    				doQuickSort(ary, comparator$1, p, q - 1);
    				doQuickSort(ary, comparator$1, q + 1, r);
    			}
    		}
    		return doQuickSort;
    	}
    	function cloneSort(comparator) {
    		let template = SortTemplate.toString();
    		let templateFn = new Function(`return ${template}`)();
    		return templateFn(comparator);
    	}
    	/**
    	* Sort the given array in-place with the given comparator function.
    	*
    	* @param {Array} ary
    	*        An array to sort.
    	* @param {function} comparator
    	*        Function to use to compare two items.
    	*/
    	let sortCache = new WeakMap();
    	exports.quickSort = function(ary, comparator, start = 0) {
    		let doQuickSort = sortCache.get(comparator);
    		if (doQuickSort === void 0) {
    			doQuickSort = cloneSort(comparator);
    			sortCache.set(comparator, doQuickSort);
    		}
    		doQuickSort(ary, comparator, start, ary.length - 1);
    	};
    } });

    //#endregion
    //#region ../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-map-consumer.js
    var require_source_map_consumer = __commonJS({ "../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-map-consumer.js"(exports) {
    	var util$1 = require_util();
    	var binarySearch = require_binary_search();
    	var ArraySet = require_array_set().ArraySet;
    	var base64VLQ = require_base64_vlq();
    	var quickSort = require_quick_sort().quickSort;
    	function SourceMapConsumer$1(aSourceMap, aSourceMapURL) {
    		var sourceMap = aSourceMap;
    		if (typeof aSourceMap === "string") sourceMap = util$1.parseSourceMapInput(aSourceMap);
    		return sourceMap.sections != null ? new IndexedSourceMapConsumer(sourceMap, aSourceMapURL) : new BasicSourceMapConsumer(sourceMap, aSourceMapURL);
    	}
    	SourceMapConsumer$1.fromSourceMap = function(aSourceMap, aSourceMapURL) {
    		return BasicSourceMapConsumer.fromSourceMap(aSourceMap, aSourceMapURL);
    	};
    	/**
    	* The version of the source mapping spec that we are consuming.
    	*/
    	SourceMapConsumer$1.prototype._version = 3;
    	SourceMapConsumer$1.prototype.__generatedMappings = null;
    	Object.defineProperty(SourceMapConsumer$1.prototype, "_generatedMappings", {
    		configurable: true,
    		enumerable: true,
    		get: function() {
    			if (!this.__generatedMappings) this._parseMappings(this._mappings, this.sourceRoot);
    			return this.__generatedMappings;
    		}
    	});
    	SourceMapConsumer$1.prototype.__originalMappings = null;
    	Object.defineProperty(SourceMapConsumer$1.prototype, "_originalMappings", {
    		configurable: true,
    		enumerable: true,
    		get: function() {
    			if (!this.__originalMappings) this._parseMappings(this._mappings, this.sourceRoot);
    			return this.__originalMappings;
    		}
    	});
    	SourceMapConsumer$1.prototype._charIsMappingSeparator = function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
    		var c = aStr.charAt(index);
    		return c === ";" || c === ",";
    	};
    	/**
    	* Parse the mappings in a string in to a data structure which we can easily
    	* query (the ordered arrays in the `this.__generatedMappings` and
    	* `this.__originalMappings` properties).
    	*/
    	SourceMapConsumer$1.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    		throw new Error("Subclasses must implement _parseMappings");
    	};
    	SourceMapConsumer$1.GENERATED_ORDER = 1;
    	SourceMapConsumer$1.ORIGINAL_ORDER = 2;
    	SourceMapConsumer$1.GREATEST_LOWER_BOUND = 1;
    	SourceMapConsumer$1.LEAST_UPPER_BOUND = 2;
    	/**
    	* Iterate over each mapping between an original source/line/column and a
    	* generated line/column in this source map.
    	*
    	* @param Function aCallback
    	*        The function that is called with each mapping.
    	* @param Object aContext
    	*        Optional. If specified, this object will be the value of `this` every
    	*        time that `aCallback` is called.
    	* @param aOrder
    	*        Either `SourceMapConsumer.GENERATED_ORDER` or
    	*        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
    	*        iterate over the mappings sorted by the generated file's line/column
    	*        order or the original's source/line/column order, respectively. Defaults to
    	*        `SourceMapConsumer.GENERATED_ORDER`.
    	*/
    	SourceMapConsumer$1.prototype.eachMapping = function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
    		var context = aContext || null;
    		var order = aOrder || SourceMapConsumer$1.GENERATED_ORDER;
    		var mappings;
    		switch (order) {
    			case SourceMapConsumer$1.GENERATED_ORDER:
    				mappings = this._generatedMappings;
    				break;
    			case SourceMapConsumer$1.ORIGINAL_ORDER:
    				mappings = this._originalMappings;
    				break;
    			default: throw new Error("Unknown order of iteration.");
    		}
    		var sourceRoot = this.sourceRoot;
    		var boundCallback = aCallback.bind(context);
    		var names = this._names;
    		var sources = this._sources;
    		var sourceMapURL = this._sourceMapURL;
    		for (var i = 0, n = mappings.length; i < n; i++) {
    			var mapping = mappings[i];
    			var source = mapping.source === null ? null : sources.at(mapping.source);
    			if (source !== null) source = util$1.computeSourceURL(sourceRoot, source, sourceMapURL);
    			boundCallback({
    				source,
    				generatedLine: mapping.generatedLine,
    				generatedColumn: mapping.generatedColumn,
    				originalLine: mapping.originalLine,
    				originalColumn: mapping.originalColumn,
    				name: mapping.name === null ? null : names.at(mapping.name)
    			});
    		}
    	};
    	/**
    	* Returns all generated line and column information for the original source,
    	* line, and column provided. If no column is provided, returns all mappings
    	* corresponding to a either the line we are searching for or the next
    	* closest line that has any mappings. Otherwise, returns all mappings
    	* corresponding to the given line and either the column we are searching for
    	* or the next closest column that has any offsets.
    	*
    	* The only argument is an object with the following properties:
    	*
    	*   - source: The filename of the original source.
    	*   - line: The line number in the original source.  The line number is 1-based.
    	*   - column: Optional. the column number in the original source.
    	*    The column number is 0-based.
    	*
    	* and an array of objects is returned, each with the following properties:
    	*
    	*   - line: The line number in the generated source, or null.  The
    	*    line number is 1-based.
    	*   - column: The column number in the generated source, or null.
    	*    The column number is 0-based.
    	*/
    	SourceMapConsumer$1.prototype.allGeneratedPositionsFor = function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
    		var line = util$1.getArg(aArgs, "line");
    		var needle = {
    			source: util$1.getArg(aArgs, "source"),
    			originalLine: line,
    			originalColumn: util$1.getArg(aArgs, "column", 0)
    		};
    		needle.source = this._findSourceIndex(needle.source);
    		if (needle.source < 0) return [];
    		var mappings = [];
    		var index = this._findMapping(needle, this._originalMappings, "originalLine", "originalColumn", util$1.compareByOriginalPositions, binarySearch.LEAST_UPPER_BOUND);
    		if (index >= 0) {
    			var mapping = this._originalMappings[index];
    			if (aArgs.column === void 0) {
    				var originalLine = mapping.originalLine;
    				while (mapping && mapping.originalLine === originalLine) {
    					mappings.push({
    						line: util$1.getArg(mapping, "generatedLine", null),
    						column: util$1.getArg(mapping, "generatedColumn", null),
    						lastColumn: util$1.getArg(mapping, "lastGeneratedColumn", null)
    					});
    					mapping = this._originalMappings[++index];
    				}
    			} else {
    				var originalColumn = mapping.originalColumn;
    				while (mapping && mapping.originalLine === line && mapping.originalColumn == originalColumn) {
    					mappings.push({
    						line: util$1.getArg(mapping, "generatedLine", null),
    						column: util$1.getArg(mapping, "generatedColumn", null),
    						lastColumn: util$1.getArg(mapping, "lastGeneratedColumn", null)
    					});
    					mapping = this._originalMappings[++index];
    				}
    			}
    		}
    		return mappings;
    	};
    	exports.SourceMapConsumer = SourceMapConsumer$1;
    	/**
    	* A BasicSourceMapConsumer instance represents a parsed source map which we can
    	* query for information about the original file positions by giving it a file
    	* position in the generated source.
    	*
    	* The first parameter is the raw source map (either as a JSON string, or
    	* already parsed to an object). According to the spec, source maps have the
    	* following attributes:
    	*
    	*   - version: Which version of the source map spec this map is following.
    	*   - sources: An array of URLs to the original source files.
    	*   - names: An array of identifiers which can be referrenced by individual mappings.
    	*   - sourceRoot: Optional. The URL root from which all sources are relative.
    	*   - sourcesContent: Optional. An array of contents of the original source files.
    	*   - mappings: A string of base64 VLQs which contain the actual mappings.
    	*   - file: Optional. The generated file this source map is associated with.
    	*
    	* Here is an example source map, taken from the source map spec[0]:
    	*
    	*     {
    	*       version : 3,
    	*       file: "out.js",
    	*       sourceRoot : "",
    	*       sources: ["foo.js", "bar.js"],
    	*       names: ["src", "maps", "are", "fun"],
    	*       mappings: "AA,AB;;ABCDE;"
    	*     }
    	*
    	* The second parameter, if given, is a string whose value is the URL
    	* at which the source map was found.  This URL is used to compute the
    	* sources array.
    	*
    	* [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
    	*/
    	function BasicSourceMapConsumer(aSourceMap, aSourceMapURL) {
    		var sourceMap = aSourceMap;
    		if (typeof aSourceMap === "string") sourceMap = util$1.parseSourceMapInput(aSourceMap);
    		var version = util$1.getArg(sourceMap, "version");
    		var sources = util$1.getArg(sourceMap, "sources");
    		var names = util$1.getArg(sourceMap, "names", []);
    		var sourceRoot = util$1.getArg(sourceMap, "sourceRoot", null);
    		var sourcesContent = util$1.getArg(sourceMap, "sourcesContent", null);
    		var mappings = util$1.getArg(sourceMap, "mappings");
    		var file = util$1.getArg(sourceMap, "file", null);
    		if (version != this._version) throw new Error("Unsupported version: " + version);
    		if (sourceRoot) sourceRoot = util$1.normalize(sourceRoot);
    		sources = sources.map(String).map(util$1.normalize).map(function(source) {
    			return sourceRoot && util$1.isAbsolute(sourceRoot) && util$1.isAbsolute(source) ? util$1.relative(sourceRoot, source) : source;
    		});
    		this._names = ArraySet.fromArray(names.map(String), true);
    		this._sources = ArraySet.fromArray(sources, true);
    		this._absoluteSources = this._sources.toArray().map(function(s) {
    			return util$1.computeSourceURL(sourceRoot, s, aSourceMapURL);
    		});
    		this.sourceRoot = sourceRoot;
    		this.sourcesContent = sourcesContent;
    		this._mappings = mappings;
    		this._sourceMapURL = aSourceMapURL;
    		this.file = file;
    	}
    	BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer$1.prototype);
    	BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer$1;
    	/**
    	* Utility function to find the index of a source.  Returns -1 if not
    	* found.
    	*/
    	BasicSourceMapConsumer.prototype._findSourceIndex = function(aSource) {
    		var relativeSource = aSource;
    		if (this.sourceRoot != null) relativeSource = util$1.relative(this.sourceRoot, relativeSource);
    		if (this._sources.has(relativeSource)) return this._sources.indexOf(relativeSource);
    		var i;
    		for (i = 0; i < this._absoluteSources.length; ++i) if (this._absoluteSources[i] == aSource) return i;
    		return -1;
    	};
    	/**
    	* Create a BasicSourceMapConsumer from a SourceMapGenerator.
    	*
    	* @param SourceMapGenerator aSourceMap
    	*        The source map that will be consumed.
    	* @param String aSourceMapURL
    	*        The URL at which the source map can be found (optional)
    	* @returns BasicSourceMapConsumer
    	*/
    	BasicSourceMapConsumer.fromSourceMap = function SourceMapConsumer_fromSourceMap(aSourceMap, aSourceMapURL) {
    		var smc = Object.create(BasicSourceMapConsumer.prototype);
    		var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
    		var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
    		smc.sourceRoot = aSourceMap._sourceRoot;
    		smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(), smc.sourceRoot);
    		smc.file = aSourceMap._file;
    		smc._sourceMapURL = aSourceMapURL;
    		smc._absoluteSources = smc._sources.toArray().map(function(s) {
    			return util$1.computeSourceURL(smc.sourceRoot, s, aSourceMapURL);
    		});
    		var generatedMappings = aSourceMap._mappings.toArray().slice();
    		var destGeneratedMappings = smc.__generatedMappings = [];
    		var destOriginalMappings = smc.__originalMappings = [];
    		for (var i = 0, length = generatedMappings.length; i < length; i++) {
    			var srcMapping = generatedMappings[i];
    			var destMapping = new Mapping();
    			destMapping.generatedLine = srcMapping.generatedLine;
    			destMapping.generatedColumn = srcMapping.generatedColumn;
    			if (srcMapping.source) {
    				destMapping.source = sources.indexOf(srcMapping.source);
    				destMapping.originalLine = srcMapping.originalLine;
    				destMapping.originalColumn = srcMapping.originalColumn;
    				if (srcMapping.name) destMapping.name = names.indexOf(srcMapping.name);
    				destOriginalMappings.push(destMapping);
    			}
    			destGeneratedMappings.push(destMapping);
    		}
    		quickSort(smc.__originalMappings, util$1.compareByOriginalPositions);
    		return smc;
    	};
    	/**
    	* The version of the source mapping spec that we are consuming.
    	*/
    	BasicSourceMapConsumer.prototype._version = 3;
    	/**
    	* The list of original sources.
    	*/
    	Object.defineProperty(BasicSourceMapConsumer.prototype, "sources", { get: function() {
    		return this._absoluteSources.slice();
    	} });
    	/**
    	* Provide the JIT with a nice shape / hidden class.
    	*/
    	function Mapping() {
    		this.generatedLine = 0;
    		this.generatedColumn = 0;
    		this.source = null;
    		this.originalLine = null;
    		this.originalColumn = null;
    		this.name = null;
    	}
    	/**
    	* Parse the mappings in a string in to a data structure which we can easily
    	* query (the ordered arrays in the `this.__generatedMappings` and
    	* `this.__originalMappings` properties).
    	*/
    	const compareGenerated = util$1.compareByGeneratedPositionsDeflatedNoLine;
    	function sortGenerated(array, start) {
    		let l = array.length;
    		let n = array.length - start;
    		if (n <= 1) return;
    		else if (n == 2) {
    			let a = array[start];
    			let b = array[start + 1];
    			if (compareGenerated(a, b) > 0) {
    				array[start] = b;
    				array[start + 1] = a;
    			}
    		} else if (n < 20) for (let i = start; i < l; i++) for (let j = i; j > start; j--) {
    			let a = array[j - 1];
    			let b = array[j];
    			if (compareGenerated(a, b) <= 0) break;
    			array[j - 1] = b;
    			array[j] = a;
    		}
    		else quickSort(array, compareGenerated, start);
    	}
    	BasicSourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    		var generatedLine = 1;
    		var previousGeneratedColumn = 0;
    		var previousOriginalLine = 0;
    		var previousOriginalColumn = 0;
    		var previousSource = 0;
    		var previousName = 0;
    		var length = aStr.length;
    		var index = 0;
    		var temp = {};
    		var originalMappings = [];
    		var generatedMappings = [];
    		var mapping, segment, end, value;
    		let subarrayStart = 0;
    		while (index < length) if (aStr.charAt(index) === ";") {
    			generatedLine++;
    			index++;
    			previousGeneratedColumn = 0;
    			sortGenerated(generatedMappings, subarrayStart);
    			subarrayStart = generatedMappings.length;
    		} else if (aStr.charAt(index) === ",") index++;
    		else {
    			mapping = new Mapping();
    			mapping.generatedLine = generatedLine;
    			for (end = index; end < length; end++) if (this._charIsMappingSeparator(aStr, end)) break;
    			aStr.slice(index, end);
    			segment = [];
    			while (index < end) {
    				base64VLQ.decode(aStr, index, temp);
    				value = temp.value;
    				index = temp.rest;
    				segment.push(value);
    			}
    			if (segment.length === 2) throw new Error("Found a source, but no line and column");
    			if (segment.length === 3) throw new Error("Found a source and line, but no column");
    			mapping.generatedColumn = previousGeneratedColumn + segment[0];
    			previousGeneratedColumn = mapping.generatedColumn;
    			if (segment.length > 1) {
    				mapping.source = previousSource + segment[1];
    				previousSource += segment[1];
    				mapping.originalLine = previousOriginalLine + segment[2];
    				previousOriginalLine = mapping.originalLine;
    				mapping.originalLine += 1;
    				mapping.originalColumn = previousOriginalColumn + segment[3];
    				previousOriginalColumn = mapping.originalColumn;
    				if (segment.length > 4) {
    					mapping.name = previousName + segment[4];
    					previousName += segment[4];
    				}
    			}
    			generatedMappings.push(mapping);
    			if (typeof mapping.originalLine === "number") {
    				let currentSource = mapping.source;
    				while (originalMappings.length <= currentSource) originalMappings.push(null);
    				if (originalMappings[currentSource] === null) originalMappings[currentSource] = [];
    				originalMappings[currentSource].push(mapping);
    			}
    		}
    		sortGenerated(generatedMappings, subarrayStart);
    		this.__generatedMappings = generatedMappings;
    		for (var i = 0; i < originalMappings.length; i++) if (originalMappings[i] != null) quickSort(originalMappings[i], util$1.compareByOriginalPositionsNoSource);
    		this.__originalMappings = [].concat(...originalMappings);
    	};
    	/**
    	* Find the mapping that best matches the hypothetical "needle" mapping that
    	* we are searching for in the given "haystack" of mappings.
    	*/
    	BasicSourceMapConsumer.prototype._findMapping = function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName, aColumnName, aComparator, aBias) {
    		if (aNeedle[aLineName] <= 0) throw new TypeError("Line must be greater than or equal to 1, got " + aNeedle[aLineName]);
    		if (aNeedle[aColumnName] < 0) throw new TypeError("Column must be greater than or equal to 0, got " + aNeedle[aColumnName]);
    		return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
    	};
    	/**
    	* Compute the last column for each generated mapping. The last column is
    	* inclusive.
    	*/
    	BasicSourceMapConsumer.prototype.computeColumnSpans = function SourceMapConsumer_computeColumnSpans() {
    		for (var index = 0; index < this._generatedMappings.length; ++index) {
    			var mapping = this._generatedMappings[index];
    			if (index + 1 < this._generatedMappings.length) {
    				var nextMapping = this._generatedMappings[index + 1];
    				if (mapping.generatedLine === nextMapping.generatedLine) {
    					mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
    					continue;
    				}
    			}
    			mapping.lastGeneratedColumn = Infinity;
    		}
    	};
    	/**
    	* Returns the original source, line, and column information for the generated
    	* source's line and column positions provided. The only argument is an object
    	* with the following properties:
    	*
    	*   - line: The line number in the generated source.  The line number
    	*     is 1-based.
    	*   - column: The column number in the generated source.  The column
    	*     number is 0-based.
    	*   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
    	*     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
    	*     closest element that is smaller than or greater than the one we are
    	*     searching for, respectively, if the exact element cannot be found.
    	*     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
    	*
    	* and an object is returned with the following properties:
    	*
    	*   - source: The original source file, or null.
    	*   - line: The line number in the original source, or null.  The
    	*     line number is 1-based.
    	*   - column: The column number in the original source, or null.  The
    	*     column number is 0-based.
    	*   - name: The original identifier, or null.
    	*/
    	BasicSourceMapConsumer.prototype.originalPositionFor = function SourceMapConsumer_originalPositionFor(aArgs) {
    		var needle = {
    			generatedLine: util$1.getArg(aArgs, "line"),
    			generatedColumn: util$1.getArg(aArgs, "column")
    		};
    		var index = this._findMapping(needle, this._generatedMappings, "generatedLine", "generatedColumn", util$1.compareByGeneratedPositionsDeflated, util$1.getArg(aArgs, "bias", SourceMapConsumer$1.GREATEST_LOWER_BOUND));
    		if (index >= 0) {
    			var mapping = this._generatedMappings[index];
    			if (mapping.generatedLine === needle.generatedLine) {
    				var source = util$1.getArg(mapping, "source", null);
    				if (source !== null) {
    					source = this._sources.at(source);
    					source = util$1.computeSourceURL(this.sourceRoot, source, this._sourceMapURL);
    				}
    				var name = util$1.getArg(mapping, "name", null);
    				if (name !== null) name = this._names.at(name);
    				return {
    					source,
    					line: util$1.getArg(mapping, "originalLine", null),
    					column: util$1.getArg(mapping, "originalColumn", null),
    					name
    				};
    			}
    		}
    		return {
    			source: null,
    			line: null,
    			column: null,
    			name: null
    		};
    	};
    	/**
    	* Return true if we have the source content for every source in the source
    	* map, false otherwise.
    	*/
    	BasicSourceMapConsumer.prototype.hasContentsOfAllSources = function BasicSourceMapConsumer_hasContentsOfAllSources() {
    		if (!this.sourcesContent) return false;
    		return this.sourcesContent.length >= this._sources.size() && !this.sourcesContent.some(function(sc) {
    			return sc == null;
    		});
    	};
    	/**
    	* Returns the original source content. The only argument is the url of the
    	* original source file. Returns null if no original source content is
    	* available.
    	*/
    	BasicSourceMapConsumer.prototype.sourceContentFor = function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    		if (!this.sourcesContent) return null;
    		var index = this._findSourceIndex(aSource);
    		if (index >= 0) return this.sourcesContent[index];
    		var relativeSource = aSource;
    		if (this.sourceRoot != null) relativeSource = util$1.relative(this.sourceRoot, relativeSource);
    		var url;
    		if (this.sourceRoot != null && (url = util$1.urlParse(this.sourceRoot))) {
    			var fileUriAbsPath = relativeSource.replace(/^file:\/\//, "");
    			if (url.scheme == "file" && this._sources.has(fileUriAbsPath)) return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)];
    			if ((!url.path || url.path == "/") && this._sources.has("/" + relativeSource)) return this.sourcesContent[this._sources.indexOf("/" + relativeSource)];
    		}
    		if (nullOnMissing) return null;
    		else throw new Error("\"" + relativeSource + "\" is not in the SourceMap.");
    	};
    	/**
    	* Returns the generated line and column information for the original source,
    	* line, and column positions provided. The only argument is an object with
    	* the following properties:
    	*
    	*   - source: The filename of the original source.
    	*   - line: The line number in the original source.  The line number
    	*     is 1-based.
    	*   - column: The column number in the original source.  The column
    	*     number is 0-based.
    	*   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
    	*     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
    	*     closest element that is smaller than or greater than the one we are
    	*     searching for, respectively, if the exact element cannot be found.
    	*     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
    	*
    	* and an object is returned with the following properties:
    	*
    	*   - line: The line number in the generated source, or null.  The
    	*     line number is 1-based.
    	*   - column: The column number in the generated source, or null.
    	*     The column number is 0-based.
    	*/
    	BasicSourceMapConsumer.prototype.generatedPositionFor = function SourceMapConsumer_generatedPositionFor(aArgs) {
    		var source = util$1.getArg(aArgs, "source");
    		source = this._findSourceIndex(source);
    		if (source < 0) return {
    			line: null,
    			column: null,
    			lastColumn: null
    		};
    		var needle = {
    			source,
    			originalLine: util$1.getArg(aArgs, "line"),
    			originalColumn: util$1.getArg(aArgs, "column")
    		};
    		var index = this._findMapping(needle, this._originalMappings, "originalLine", "originalColumn", util$1.compareByOriginalPositions, util$1.getArg(aArgs, "bias", SourceMapConsumer$1.GREATEST_LOWER_BOUND));
    		if (index >= 0) {
    			var mapping = this._originalMappings[index];
    			if (mapping.source === needle.source) return {
    				line: util$1.getArg(mapping, "generatedLine", null),
    				column: util$1.getArg(mapping, "generatedColumn", null),
    				lastColumn: util$1.getArg(mapping, "lastGeneratedColumn", null)
    			};
    		}
    		return {
    			line: null,
    			column: null,
    			lastColumn: null
    		};
    	};
    	exports.BasicSourceMapConsumer = BasicSourceMapConsumer;
    	/**
    	* An IndexedSourceMapConsumer instance represents a parsed source map which
    	* we can query for information. It differs from BasicSourceMapConsumer in
    	* that it takes "indexed" source maps (i.e. ones with a "sections" field) as
    	* input.
    	*
    	* The first parameter is a raw source map (either as a JSON string, or already
    	* parsed to an object). According to the spec for indexed source maps, they
    	* have the following attributes:
    	*
    	*   - version: Which version of the source map spec this map is following.
    	*   - file: Optional. The generated file this source map is associated with.
    	*   - sections: A list of section definitions.
    	*
    	* Each value under the "sections" field has two fields:
    	*   - offset: The offset into the original specified at which this section
    	*       begins to apply, defined as an object with a "line" and "column"
    	*       field.
    	*   - map: A source map definition. This source map could also be indexed,
    	*       but doesn't have to be.
    	*
    	* Instead of the "map" field, it's also possible to have a "url" field
    	* specifying a URL to retrieve a source map from, but that's currently
    	* unsupported.
    	*
    	* Here's an example source map, taken from the source map spec[0], but
    	* modified to omit a section which uses the "url" field.
    	*
    	*  {
    	*    version : 3,
    	*    file: "app.js",
    	*    sections: [{
    	*      offset: {line:100, column:10},
    	*      map: {
    	*        version : 3,
    	*        file: "section.js",
    	*        sources: ["foo.js", "bar.js"],
    	*        names: ["src", "maps", "are", "fun"],
    	*        mappings: "AAAA,E;;ABCDE;"
    	*      }
    	*    }],
    	*  }
    	*
    	* The second parameter, if given, is a string whose value is the URL
    	* at which the source map was found.  This URL is used to compute the
    	* sources array.
    	*
    	* [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
    	*/
    	function IndexedSourceMapConsumer(aSourceMap, aSourceMapURL) {
    		var sourceMap = aSourceMap;
    		if (typeof aSourceMap === "string") sourceMap = util$1.parseSourceMapInput(aSourceMap);
    		var version = util$1.getArg(sourceMap, "version");
    		var sections = util$1.getArg(sourceMap, "sections");
    		if (version != this._version) throw new Error("Unsupported version: " + version);
    		this._sources = new ArraySet();
    		this._names = new ArraySet();
    		var lastOffset = {
    			line: -1,
    			column: 0
    		};
    		this._sections = sections.map(function(s) {
    			if (s.url) throw new Error("Support for url field in sections not implemented.");
    			var offset = util$1.getArg(s, "offset");
    			var offsetLine = util$1.getArg(offset, "line");
    			var offsetColumn = util$1.getArg(offset, "column");
    			if (offsetLine < lastOffset.line || offsetLine === lastOffset.line && offsetColumn < lastOffset.column) throw new Error("Section offsets must be ordered and non-overlapping.");
    			lastOffset = offset;
    			return {
    				generatedOffset: {
    					generatedLine: offsetLine + 1,
    					generatedColumn: offsetColumn + 1
    				},
    				consumer: new SourceMapConsumer$1(util$1.getArg(s, "map"), aSourceMapURL)
    			};
    		});
    	}
    	IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer$1.prototype);
    	IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer$1;
    	/**
    	* The version of the source mapping spec that we are consuming.
    	*/
    	IndexedSourceMapConsumer.prototype._version = 3;
    	/**
    	* The list of original sources.
    	*/
    	Object.defineProperty(IndexedSourceMapConsumer.prototype, "sources", { get: function() {
    		var sources = [];
    		for (var i = 0; i < this._sections.length; i++) for (var j = 0; j < this._sections[i].consumer.sources.length; j++) sources.push(this._sections[i].consumer.sources[j]);
    		return sources;
    	} });
    	/**
    	* Returns the original source, line, and column information for the generated
    	* source's line and column positions provided. The only argument is an object
    	* with the following properties:
    	*
    	*   - line: The line number in the generated source.  The line number
    	*     is 1-based.
    	*   - column: The column number in the generated source.  The column
    	*     number is 0-based.
    	*
    	* and an object is returned with the following properties:
    	*
    	*   - source: The original source file, or null.
    	*   - line: The line number in the original source, or null.  The
    	*     line number is 1-based.
    	*   - column: The column number in the original source, or null.  The
    	*     column number is 0-based.
    	*   - name: The original identifier, or null.
    	*/
    	IndexedSourceMapConsumer.prototype.originalPositionFor = function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
    		var needle = {
    			generatedLine: util$1.getArg(aArgs, "line"),
    			generatedColumn: util$1.getArg(aArgs, "column")
    		};
    		var sectionIndex = binarySearch.search(needle, this._sections, function(needle$1, section$1) {
    			var cmp = needle$1.generatedLine - section$1.generatedOffset.generatedLine;
    			if (cmp) return cmp;
    			return needle$1.generatedColumn - section$1.generatedOffset.generatedColumn;
    		});
    		var section = this._sections[sectionIndex];
    		if (!section) return {
    			source: null,
    			line: null,
    			column: null,
    			name: null
    		};
    		return section.consumer.originalPositionFor({
    			line: needle.generatedLine - (section.generatedOffset.generatedLine - 1),
    			column: needle.generatedColumn - (section.generatedOffset.generatedLine === needle.generatedLine ? section.generatedOffset.generatedColumn - 1 : 0),
    			bias: aArgs.bias
    		});
    	};
    	/**
    	* Return true if we have the source content for every source in the source
    	* map, false otherwise.
    	*/
    	IndexedSourceMapConsumer.prototype.hasContentsOfAllSources = function IndexedSourceMapConsumer_hasContentsOfAllSources() {
    		return this._sections.every(function(s) {
    			return s.consumer.hasContentsOfAllSources();
    		});
    	};
    	/**
    	* Returns the original source content. The only argument is the url of the
    	* original source file. Returns null if no original source content is
    	* available.
    	*/
    	IndexedSourceMapConsumer.prototype.sourceContentFor = function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    		for (var i = 0; i < this._sections.length; i++) {
    			var section = this._sections[i];
    			var content = section.consumer.sourceContentFor(aSource, true);
    			if (content || content === "") return content;
    		}
    		if (nullOnMissing) return null;
    		else throw new Error("\"" + aSource + "\" is not in the SourceMap.");
    	};
    	/**
    	* Returns the generated line and column information for the original source,
    	* line, and column positions provided. The only argument is an object with
    	* the following properties:
    	*
    	*   - source: The filename of the original source.
    	*   - line: The line number in the original source.  The line number
    	*     is 1-based.
    	*   - column: The column number in the original source.  The column
    	*     number is 0-based.
    	*
    	* and an object is returned with the following properties:
    	*
    	*   - line: The line number in the generated source, or null.  The
    	*     line number is 1-based. 
    	*   - column: The column number in the generated source, or null.
    	*     The column number is 0-based.
    	*/
    	IndexedSourceMapConsumer.prototype.generatedPositionFor = function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
    		for (var i = 0; i < this._sections.length; i++) {
    			var section = this._sections[i];
    			if (section.consumer._findSourceIndex(util$1.getArg(aArgs, "source")) === -1) continue;
    			var generatedPosition = section.consumer.generatedPositionFor(aArgs);
    			if (generatedPosition) {
    				var ret = {
    					line: generatedPosition.line + (section.generatedOffset.generatedLine - 1),
    					column: generatedPosition.column + (section.generatedOffset.generatedLine === generatedPosition.line ? section.generatedOffset.generatedColumn - 1 : 0)
    				};
    				return ret;
    			}
    		}
    		return {
    			line: null,
    			column: null
    		};
    	};
    	/**
    	* Parse the mappings in a string in to a data structure which we can easily
    	* query (the ordered arrays in the `this.__generatedMappings` and
    	* `this.__originalMappings` properties).
    	*/
    	IndexedSourceMapConsumer.prototype._parseMappings = function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    		this.__generatedMappings = [];
    		this.__originalMappings = [];
    		for (var i = 0; i < this._sections.length; i++) {
    			var section = this._sections[i];
    			var sectionMappings = section.consumer._generatedMappings;
    			for (var j = 0; j < sectionMappings.length; j++) {
    				var mapping = sectionMappings[j];
    				var source = section.consumer._sources.at(mapping.source);
    				if (source !== null) source = util$1.computeSourceURL(section.consumer.sourceRoot, source, this._sourceMapURL);
    				this._sources.add(source);
    				source = this._sources.indexOf(source);
    				var name = null;
    				if (mapping.name) {
    					name = section.consumer._names.at(mapping.name);
    					this._names.add(name);
    					name = this._names.indexOf(name);
    				}
    				var adjustedMapping = {
    					source,
    					generatedLine: mapping.generatedLine + (section.generatedOffset.generatedLine - 1),
    					generatedColumn: mapping.generatedColumn + (section.generatedOffset.generatedLine === mapping.generatedLine ? section.generatedOffset.generatedColumn - 1 : 0),
    					originalLine: mapping.originalLine,
    					originalColumn: mapping.originalColumn,
    					name
    				};
    				this.__generatedMappings.push(adjustedMapping);
    				if (typeof adjustedMapping.originalLine === "number") this.__originalMappings.push(adjustedMapping);
    			}
    		}
    		quickSort(this.__generatedMappings, util$1.compareByGeneratedPositionsDeflated);
    		quickSort(this.__originalMappings, util$1.compareByOriginalPositions);
    	};
    	exports.IndexedSourceMapConsumer = IndexedSourceMapConsumer;
    } });

    //#endregion
    //#region ../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-node.js
    var require_source_node = __commonJS({ "../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-node.js"(exports) {
    	var SourceMapGenerator = require_source_map_generator().SourceMapGenerator;
    	var util = require_util();
    	var REGEX_NEWLINE = /(\r?\n)/;
    	var NEWLINE_CODE = 10;
    	var isSourceNode = "$$$isSourceNode$$$";
    	/**
    	* SourceNodes provide a way to abstract over interpolating/concatenating
    	* snippets of generated JavaScript source code while maintaining the line and
    	* column information associated with the original source code.
    	*
    	* @param aLine The original line number.
    	* @param aColumn The original column number.
    	* @param aSource The original source's filename.
    	* @param aChunks Optional. An array of strings which are snippets of
    	*        generated JS, or other SourceNodes.
    	* @param aName The original identifier.
    	*/
    	function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
    		this.children = [];
    		this.sourceContents = {};
    		this.line = aLine == null ? null : aLine;
    		this.column = aColumn == null ? null : aColumn;
    		this.source = aSource == null ? null : aSource;
    		this.name = aName == null ? null : aName;
    		this[isSourceNode] = true;
    		if (aChunks != null) this.add(aChunks);
    	}
    	/**
    	* Creates a SourceNode from generated code and a SourceMapConsumer.
    	*
    	* @param aGeneratedCode The generated code
    	* @param aSourceMapConsumer The SourceMap for the generated code
    	* @param aRelativePath Optional. The path that relative sources in the
    	*        SourceMapConsumer should be relative to.
    	*/
    	SourceNode.fromStringWithSourceMap = function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
    		var node = new SourceNode();
    		var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
    		var remainingLinesIndex = 0;
    		var shiftNextLine = function() {
    			var lineContents = getNextLine();
    			var newLine = getNextLine() || "";
    			return lineContents + newLine;
    			function getNextLine() {
    				return remainingLinesIndex < remainingLines.length ? remainingLines[remainingLinesIndex++] : void 0;
    			}
    		};
    		var lastGeneratedLine = 1, lastGeneratedColumn = 0;
    		var lastMapping = null;
    		aSourceMapConsumer.eachMapping(function(mapping) {
    			if (lastMapping !== null) if (lastGeneratedLine < mapping.generatedLine) {
    				addMappingWithCode(lastMapping, shiftNextLine());
    				lastGeneratedLine++;
    				lastGeneratedColumn = 0;
    			} else {
    				var nextLine = remainingLines[remainingLinesIndex] || "";
    				var code = nextLine.substr(0, mapping.generatedColumn - lastGeneratedColumn);
    				remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn - lastGeneratedColumn);
    				lastGeneratedColumn = mapping.generatedColumn;
    				addMappingWithCode(lastMapping, code);
    				lastMapping = mapping;
    				return;
    			}
    			while (lastGeneratedLine < mapping.generatedLine) {
    				node.add(shiftNextLine());
    				lastGeneratedLine++;
    			}
    			if (lastGeneratedColumn < mapping.generatedColumn) {
    				var nextLine = remainingLines[remainingLinesIndex] || "";
    				node.add(nextLine.substr(0, mapping.generatedColumn));
    				remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn);
    				lastGeneratedColumn = mapping.generatedColumn;
    			}
    			lastMapping = mapping;
    		}, this);
    		if (remainingLinesIndex < remainingLines.length) {
    			if (lastMapping) addMappingWithCode(lastMapping, shiftNextLine());
    			node.add(remainingLines.splice(remainingLinesIndex).join(""));
    		}
    		aSourceMapConsumer.sources.forEach(function(sourceFile) {
    			var content = aSourceMapConsumer.sourceContentFor(sourceFile);
    			if (content != null) {
    				if (aRelativePath != null) sourceFile = util.join(aRelativePath, sourceFile);
    				node.setSourceContent(sourceFile, content);
    			}
    		});
    		return node;
    		function addMappingWithCode(mapping, code) {
    			if (mapping === null || mapping.source === void 0) node.add(code);
    			else {
    				var source = aRelativePath ? util.join(aRelativePath, mapping.source) : mapping.source;
    				node.add(new SourceNode(mapping.originalLine, mapping.originalColumn, source, code, mapping.name));
    			}
    		}
    	};
    	/**
    	* Add a chunk of generated JS to this source node.
    	*
    	* @param aChunk A string snippet of generated JS code, another instance of
    	*        SourceNode, or an array where each member is one of those things.
    	*/
    	SourceNode.prototype.add = function SourceNode_add(aChunk) {
    		if (Array.isArray(aChunk)) aChunk.forEach(function(chunk) {
    			this.add(chunk);
    		}, this);
    		else if (aChunk[isSourceNode] || typeof aChunk === "string") {
    			if (aChunk) this.children.push(aChunk);
    		} else throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk);
    		return this;
    	};
    	/**
    	* Add a chunk of generated JS to the beginning of this source node.
    	*
    	* @param aChunk A string snippet of generated JS code, another instance of
    	*        SourceNode, or an array where each member is one of those things.
    	*/
    	SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
    		if (Array.isArray(aChunk)) for (var i = aChunk.length - 1; i >= 0; i--) this.prepend(aChunk[i]);
    		else if (aChunk[isSourceNode] || typeof aChunk === "string") this.children.unshift(aChunk);
    		else throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk);
    		return this;
    	};
    	/**
    	* Walk over the tree of JS snippets in this node and its children. The
    	* walking function is called once for each snippet of JS and is passed that
    	* snippet and the its original associated source's line/column location.
    	*
    	* @param aFn The traversal function.
    	*/
    	SourceNode.prototype.walk = function SourceNode_walk(aFn) {
    		var chunk;
    		for (var i = 0, len = this.children.length; i < len; i++) {
    			chunk = this.children[i];
    			if (chunk[isSourceNode]) chunk.walk(aFn);
    			else if (chunk !== "") aFn(chunk, {
    				source: this.source,
    				line: this.line,
    				column: this.column,
    				name: this.name
    			});
    		}
    	};
    	/**
    	* Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
    	* each of `this.children`.
    	*
    	* @param aSep The separator.
    	*/
    	SourceNode.prototype.join = function SourceNode_join(aSep) {
    		var newChildren;
    		var i;
    		var len = this.children.length;
    		if (len > 0) {
    			newChildren = [];
    			for (i = 0; i < len - 1; i++) {
    				newChildren.push(this.children[i]);
    				newChildren.push(aSep);
    			}
    			newChildren.push(this.children[i]);
    			this.children = newChildren;
    		}
    		return this;
    	};
    	/**
    	* Call String.prototype.replace on the very right-most source snippet. Useful
    	* for trimming whitespace from the end of a source node, etc.
    	*
    	* @param aPattern The pattern to replace.
    	* @param aReplacement The thing to replace the pattern with.
    	*/
    	SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
    		var lastChild = this.children[this.children.length - 1];
    		if (lastChild[isSourceNode]) lastChild.replaceRight(aPattern, aReplacement);
    		else if (typeof lastChild === "string") this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
    		else this.children.push("".replace(aPattern, aReplacement));
    		return this;
    	};
    	/**
    	* Set the source content for a source file. This will be added to the SourceMapGenerator
    	* in the sourcesContent field.
    	*
    	* @param aSourceFile The filename of the source file
    	* @param aSourceContent The content of the source file
    	*/
    	SourceNode.prototype.setSourceContent = function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
    		this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
    	};
    	/**
    	* Walk over the tree of SourceNodes. The walking function is called for each
    	* source file content and is passed the filename and source content.
    	*
    	* @param aFn The traversal function.
    	*/
    	SourceNode.prototype.walkSourceContents = function SourceNode_walkSourceContents(aFn) {
    		for (var i = 0, len = this.children.length; i < len; i++) if (this.children[i][isSourceNode]) this.children[i].walkSourceContents(aFn);
    		var sources = Object.keys(this.sourceContents);
    		for (var i = 0, len = sources.length; i < len; i++) aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
    	};
    	/**
    	* Return the string representation of this source node. Walks over the tree
    	* and concatenates all the various snippets together to one string.
    	*/
    	SourceNode.prototype.toString = function SourceNode_toString() {
    		var str = "";
    		this.walk(function(chunk) {
    			str += chunk;
    		});
    		return str;
    	};
    	/**
    	* Returns the string representation of this source node along with a source
    	* map.
    	*/
    	SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
    		var generated = {
    			code: "",
    			line: 1,
    			column: 0
    		};
    		var map = new SourceMapGenerator(aArgs);
    		var sourceMappingActive = false;
    		var lastOriginalSource = null;
    		var lastOriginalLine = null;
    		var lastOriginalColumn = null;
    		var lastOriginalName = null;
    		this.walk(function(chunk, original) {
    			generated.code += chunk;
    			if (original.source !== null && original.line !== null && original.column !== null) {
    				if (lastOriginalSource !== original.source || lastOriginalLine !== original.line || lastOriginalColumn !== original.column || lastOriginalName !== original.name) map.addMapping({
    					source: original.source,
    					original: {
    						line: original.line,
    						column: original.column
    					},
    					generated: {
    						line: generated.line,
    						column: generated.column
    					},
    					name: original.name
    				});
    				lastOriginalSource = original.source;
    				lastOriginalLine = original.line;
    				lastOriginalColumn = original.column;
    				lastOriginalName = original.name;
    				sourceMappingActive = true;
    			} else if (sourceMappingActive) {
    				map.addMapping({ generated: {
    					line: generated.line,
    					column: generated.column
    				} });
    				lastOriginalSource = null;
    				sourceMappingActive = false;
    			}
    			for (var idx = 0, length = chunk.length; idx < length; idx++) if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
    				generated.line++;
    				generated.column = 0;
    				if (idx + 1 === length) {
    					lastOriginalSource = null;
    					sourceMappingActive = false;
    				} else if (sourceMappingActive) map.addMapping({
    					source: original.source,
    					original: {
    						line: original.line,
    						column: original.column
    					},
    					generated: {
    						line: generated.line,
    						column: generated.column
    					},
    					name: original.name
    				});
    			} else generated.column++;
    		});
    		this.walkSourceContents(function(sourceFile, sourceContent) {
    			map.setSourceContent(sourceFile, sourceContent);
    		});
    		return {
    			code: generated.code,
    			map
    		};
    	};
    	exports.SourceNode = SourceNode;
    } });

    //#endregion
    //#region ../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/source-map.js
    var require_source_map = __commonJS({ "../../node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/source-map.js"(exports) {
    	exports.SourceMapGenerator = require_source_map_generator().SourceMapGenerator;
    	exports.SourceMapConsumer = require_source_map_consumer().SourceMapConsumer;
    	exports.SourceNode = require_source_node().SourceNode;
    } });

    //#endregion
    //#region src/source.ts
    var import_source_map = __toESM(require_source_map());
    let reentry = false;
    const describeBuiltInComponentFrame = (name) => {
    	return `\n    in ${name}`;
    };
    const disableLogs = () => {
    	const prev = {
    		error: console.error,
    		warn: console.warn
    	};
    	console.error = () => {};
    	console.warn = () => {};
    	return prev;
    };
    const reenableLogs = (prev) => {
    	console.error = prev.error;
    	console.warn = prev.warn;
    };
    const INLINE_SOURCEMAP_REGEX = /^data:application\/json[^,]+base64,/;
    const SOURCEMAP_REGEX = /(?:\/\/[@#][ \t]+sourceMappingURL=([^\s'"]+?)[ \t]*$)|(?:\/\*[@#][ \t]+sourceMappingURL=([^*]+?)[ \t]*(?:\*\/)[ \t]*$)/;
    const getSourceMap = async (url, content) => {
    	const lines = content.split("\n");
    	let sourceMapUrl;
    	for (let i = lines.length - 1; i >= 0 && !sourceMapUrl; i--) {
    		const result = lines[i].match(SOURCEMAP_REGEX);
    		if (result) sourceMapUrl = result[1];
    	}
    	if (!sourceMapUrl) return null;
    	if (!(INLINE_SOURCEMAP_REGEX.test(sourceMapUrl) || sourceMapUrl.startsWith("/"))) {
    		const parsedURL = url.split("/");
    		parsedURL[parsedURL.length - 1] = sourceMapUrl;
    		sourceMapUrl = parsedURL.join("/");
    	}
    	const response = await fetch(sourceMapUrl);
    	const rawSourceMap = await response.json();
    	return new import_source_map.SourceMapConsumer(rawSourceMap);
    };
    const getRemovedFileProtocolPath = (path) => {
    	const protocol = "file://";
    	if (path.startsWith(protocol)) return path.substring(protocol.length);
    	return path;
    };
    const parseStackFrame = async (frame) => {
    	const source = parseStack(frame);
    	if (!source.length) return null;
    	const { file: fileName, line: lineNumber, col: columnNumber = 0 } = source[0];
    	if (!fileName || !lineNumber) return null;
    	try {
    		const response = await fetch(fileName);
    		if (response.ok) {
    			const content = await response.text();
    			const sourcemap = await getSourceMap(fileName, content);
    			if (sourcemap) {
    				const result = sourcemap.originalPositionFor({
    					line: lineNumber,
    					column: columnNumber
    				});
    				return {
    					fileName: getRemovedFileProtocolPath(sourcemap.file || result.source),
    					lineNumber: result.line,
    					columnNumber: result.column
    				};
    			}
    		}
    	} catch {}
    	return {
    		fileName: getRemovedFileProtocolPath(fileName),
    		lineNumber,
    		columnNumber
    	};
    };
    const describeNativeComponentFrame = (fn, construct) => {
    	if (!fn || reentry) return "";
    	const previousPrepareStackTrace = Error.prepareStackTrace;
    	Error.prepareStackTrace = void 0;
    	reentry = true;
    	const previousDispatcher = getCurrentDispatcher();
    	setCurrentDispatcher(null);
    	const prevLogs = disableLogs();
    	try {
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
    		const RunInRootFrame = { DetermineComponentFrameRoot() {
    			let control;
    			try {
    				if (construct) {
    					const Fake = function() {
    						throw Error();
    					};
    					Object.defineProperty(Fake.prototype, "props", { set: function() {
    						throw Error();
    					} });
    					if (typeof Reflect === "object" && Reflect.construct) {
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
    						}
    						fn.call(Fake.prototype);
    					}
    				} else {
    					try {
    						throw Error();
    					} catch (x) {
    						control = x;
    					}
    					const maybePromise = fn();
    					if (maybePromise && typeof maybePromise.catch === "function") maybePromise.catch(() => {});
    				}
    			} catch (sample) {
    				if (sample && control && typeof sample.stack === "string") return [sample.stack, control.stack];
    			}
    			return [null, null];
    		} };
    		RunInRootFrame.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
    		const namePropDescriptor = Object.getOwnPropertyDescriptor(RunInRootFrame.DetermineComponentFrameRoot, "name");
    		if (namePropDescriptor?.configurable) Object.defineProperty(RunInRootFrame.DetermineComponentFrameRoot, "name", { value: "DetermineComponentFrameRoot" });
    		const [sampleStack, controlStack] = RunInRootFrame.DetermineComponentFrameRoot();
    		if (sampleStack && controlStack) {
    			const sampleLines = sampleStack.split("\n");
    			const controlLines = controlStack.split("\n");
    			let s = 0;
    			let c = 0;
    			while (s < sampleLines.length && !sampleLines[s].includes("DetermineComponentFrameRoot")) s++;
    			while (c < controlLines.length && !controlLines[c].includes("DetermineComponentFrameRoot")) c++;
    			if (s === sampleLines.length || c === controlLines.length) {
    				s = sampleLines.length - 1;
    				c = controlLines.length - 1;
    				while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) c--;
    			}
    			for (; s >= 1 && c >= 0; s--, c--) if (sampleLines[s] !== controlLines[c]) {
    				if (s !== 1 || c !== 1) do {
    					s--;
    					c--;
    					if (c < 0 || sampleLines[s] !== controlLines[c]) {
    						let frame = `\n${sampleLines[s].replace(" at new ", " at ")}`;
    						const displayName = getDisplayName(fn);
    						if (displayName && frame.includes("<anonymous>")) frame = frame.replace("<anonymous>", displayName);
    						return frame;
    					}
    				} while (s >= 1 && c >= 0);
    				break;
    			}
    		}
    	} finally {
    		reentry = false;
    		Error.prepareStackTrace = previousPrepareStackTrace;
    		setCurrentDispatcher(previousDispatcher);
    		reenableLogs(prevLogs);
    	}
    	const name = fn ? getDisplayName(fn) : "";
    	const syntheticFrame = name ? describeBuiltInComponentFrame(name) : "";
    	return syntheticFrame;
    };
    const getCurrentDispatcher = () => {
    	const rdtHook = getRDTHook();
    	for (const renderer of [...Array.from(_renderers), ...Array.from(rdtHook.renderers.values())]) {
    		const currentDispatcherRef = renderer.currentDispatcherRef;
    		if (currentDispatcherRef) return currentDispatcherRef.H || currentDispatcherRef.current;
    	}
    	return null;
    };
    const setCurrentDispatcher = (value) => {
    	for (const renderer of _renderers) {
    		const currentDispatcherRef = renderer.currentDispatcherRef;
    		if (currentDispatcherRef) if ("H" in currentDispatcherRef) currentDispatcherRef.H = value;
    		else currentDispatcherRef.current = value;
    	}
    };
    const getFiberSource = async (fiber) => {
    	const debugSource = fiber._debugSource;
    	if (debugSource) {
    		const { fileName, lineNumber } = debugSource;
    		return {
    			fileName,
    			lineNumber,
    			columnNumber: "columnNumber" in debugSource && typeof debugSource.columnNumber === "number" ? debugSource.columnNumber : 0
    		};
    	}
    	const dataReactSource = fiber.memoizedProps?.["data-react-source"];
    	if (typeof dataReactSource === "string") {
    		const [fileName, lineNumber, columnNumber] = dataReactSource.split(":");
    		return {
    			fileName,
    			lineNumber: Number.parseInt(lineNumber),
    			columnNumber: Number.parseInt(columnNumber)
    		};
    	}
    	const currentDispatcherRef = getCurrentDispatcher();
    	if (!currentDispatcherRef) return null;
    	const componentFunction = isHostFiber(fiber) ? getType(traverseFiber(fiber, (f) => {
    		if (isCompositeFiber(f)) return true;
    	}, true)?.type) : getType(fiber.type);
    	if (!componentFunction || reentry) return null;
    	const frame = describeNativeComponentFrame(componentFunction, fiber.tag === ClassComponentTag);
    	return parseStackFrame(frame);
    };

    function getOwnerWindow(node) {
        if (!node.ownerDocument) {
            return null;
        }
        return node.ownerDocument.defaultView;
    }
    function getOwnerIframe(node) {
        const nodeWindow = getOwnerWindow(node);
        if (nodeWindow) {
            return nodeWindow.frameElement;
        }
        return null;
    }
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
                right: previousRect.right + rect.right,
            };
        });
    }
    function getBoundingClientRectWithBorderOffset(node) {
        const dimensions = getElementDimensions(node);
        return mergeRectOffsets([
            node.getBoundingClientRect(),
            {
                top: dimensions.borderTop,
                left: dimensions.borderLeft,
                bottom: dimensions.borderBottom,
                right: dimensions.borderRight,
                // This width and height won't get used by mergeRectOffsets (since this
                // is not the first rect in the array), but we set them so that this
                // object type checks as a ClientRect.
                width: 0,
                height: 0,
            },
        ]);
    }
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
                }
                // We don't want to calculate iframe offsets upwards beyond
                // the iframe containing the boundaryWindow, but we
                // need to calculate the offset relative to the boundaryWindow.
                if (currentIframe && getOwnerWindow(currentIframe) === boundaryWindow) {
                    onlyOneMore = true;
                }
            }
            return mergeRectOffsets(rects);
        }
        else {
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
            paddingBottom: parseInt(calculatedStyle.paddingBottom, 10),
        };
    }
    function findTipPos(dims, bounds, tipSize) {
        const tipHeight = Math.max(tipSize.height, 20);
        const tipWidth = Math.max(tipSize.width, 60);
        const margin = 5;
        let top;
        if (dims.top + dims.height + tipHeight <= bounds.top + bounds.height) {
            if (dims.top + dims.height < bounds.top + 0) {
                top = bounds.top + margin;
            }
            else {
                top = dims.top + dims.height + margin;
            }
        }
        else if (dims.top - tipHeight <= bounds.top + bounds.height) {
            if (dims.top - tipHeight - margin < bounds.top + margin) {
                top = bounds.top + margin;
            }
            else {
                top = dims.top - tipHeight - margin;
            }
        }
        else {
            top = bounds.top + bounds.height - tipHeight - margin;
        }
        let left = dims.left + margin;
        if (dims.left < bounds.left) {
            left = bounds.left + margin;
        }
        if (dims.left + tipWidth > bounds.left + bounds.width) {
            left = bounds.left + bounds.width - tipWidth - margin;
        }
        return {
            style: { top: top + "px", left: left + "px" },
        };
    }
    function boxWrap(dims, what, node) {
        assign(node.style, {
            borderTopWidth: dims[what + "Top"] + "px",
            borderLeftWidth: dims[what + "Left"] + "px",
            borderRightWidth: dims[what + "Right"] + "px",
            borderBottomWidth: dims[what + "Bottom"] + "px",
            borderStyle: "solid",
        });
    }
    const overlayStyles = {
        background: "rgba(120, 170, 210, 0.7)",
        padding: "rgba(77, 200, 0, 0.3)",
        margin: "rgba(255, 155, 0, 0.3)",
        border: "rgba(255, 200, 50, 0.3)",
    };
    const assign = Object.assign;
    // Note that the Overlay components are not affected by the active Theme,
    // because they highlight elements in the main Chrome window (outside of devtools).
    // The colors below were chosen to roughly match those used by Chrome devtools.
    class OverlayRect {
        node;
        border;
        padding;
        content;
        constructor(doc, container) {
            this.node = doc.createElement("div");
            this.border = doc.createElement("div");
            this.padding = doc.createElement("div");
            this.content = doc.createElement("div");
            this.border.style.borderColor = overlayStyles.border;
            this.padding.style.borderColor = overlayStyles.padding;
            this.content.style.backgroundColor = overlayStyles.background;
            assign(this.node.style, {
                borderColor: overlayStyles.margin,
                pointerEvents: "none",
                position: "fixed",
            });
            this.node.style.zIndex = "10000000";
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
            boxWrap(dims, "margin", this.node);
            boxWrap(dims, "border", this.border);
            boxWrap(dims, "padding", this.padding);
            assign(this.content.style, {
                height: box.height -
                    dims.borderTop -
                    dims.borderBottom -
                    dims.paddingTop -
                    dims.paddingBottom +
                    "px",
                width: box.width -
                    dims.borderLeft -
                    dims.borderRight -
                    dims.paddingLeft -
                    dims.paddingRight +
                    "px",
            });
            assign(this.node.style, {
                top: box.top - dims.marginTop + "px",
                left: box.left - dims.marginLeft + "px",
            });
        }
    }
    class OverlayTip {
        tip;
        nameSpan;
        dimSpan;
        constructor(doc, container) {
            this.tip = doc.createElement("div");
            assign(this.tip.style, {
                display: "flex",
                flexFlow: "row nowrap",
                backgroundColor: "#333740",
                borderRadius: "2px",
                fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',
                fontWeight: "bold",
                padding: "3px 5px",
                pointerEvents: "none",
                position: "fixed",
                fontSize: "12px",
                whiteSpace: "nowrap",
            });
            this.nameSpan = doc.createElement("span");
            this.tip.appendChild(this.nameSpan);
            assign(this.nameSpan.style, {
                color: "#ee78e6",
                borderRight: "1px solid #aaaaaa",
                paddingRight: "0.5rem",
                marginRight: "0.5rem",
            });
            this.dimSpan = doc.createElement("span");
            this.tip.appendChild(this.dimSpan);
            assign(this.dimSpan.style, {
                color: "#d7d7d7",
            });
            this.tip.style.zIndex = "10000000";
            container.appendChild(this.tip);
        }
        remove() {
            if (this.tip.parentNode) {
                this.tip.parentNode.removeChild(this.tip);
            }
        }
        updateText(name, width, height) {
            this.nameSpan.textContent = name;
            this.dimSpan.textContent =
                Math.round(width) + "px × " + Math.round(height) + "px";
        }
        updatePosition(dims, bounds) {
            const tipRect = this.tip.getBoundingClientRect();
            const tipPos = findTipPos(dims, bounds, {
                top: tipRect.top,
                left: tipRect.left,
                width: tipRect.width,
                height: tipRect.height,
            });
            assign(this.tip.style, tipPos.style);
        }
    }
    class Overlay {
        window;
        tipBoundsWindow;
        container;
        tip;
        rects;
        constructor() {
            // Find the root window, because overlays are positioned relative to it.
            const currentWindow = window.__REACT_DEVTOOLS_TARGET_WINDOW__ || window;
            this.window = currentWindow;
            // When opened in shells/dev, the tooltip should be bound by the app iframe, not by the topmost window.
            const tipBoundsWindow = window.__REACT_DEVTOOLS_TARGET_WINDOW__ || window;
            this.tipBoundsWindow = tipBoundsWindow;
            const doc = currentWindow.document;
            this.container = doc.createElement("div");
            this.container.style.zIndex = "10000000";
            this.tip = new OverlayTip(doc, this.container);
            this.rects = [];
            doc.body.appendChild(this.container);
        }
        remove() {
            this.tip.remove();
            this.rects.forEach((rect) => {
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
            const elements = nodes.filter((node) => node.nodeType === Node.ELEMENT_NODE);
            while (this.rects.length > elements.length) {
                const rect = this.rects.pop();
                rect?.remove();
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
                left: Number.POSITIVE_INFINITY,
            };
            elements.forEach((element, index) => {
                const box = getNestedBoundingClientRect(element, this.window);
                const dims = getElementDimensions(element);
                outerBox.top = Math.min(outerBox.top, box.top - dims.marginTop);
                outerBox.right = Math.max(outerBox.right, box.left + box.width + dims.marginRight);
                outerBox.bottom = Math.max(outerBox.bottom, box.top + box.height + dims.marginBottom);
                outerBox.left = Math.min(outerBox.left, box.left - dims.marginLeft);
                const rect = this.rects[index];
                rect?.update(box, dims);
            });
            this.tip.updateText(name, outerBox.right - outerBox.left, outerBox.bottom - outerBox.top);
            const tipBounds = getNestedBoundingClientRect(this.tipBoundsWindow.document.documentElement, this.window);
            this.tip.updatePosition({
                top: outerBox.top,
                left: outerBox.left,
                height: outerBox.bottom - outerBox.top,
                width: outerBox.right - outerBox.left,
            }, {
                top: tipBounds.top + this.tipBoundsWindow.scrollY,
                left: tipBounds.left + this.tipBoundsWindow.scrollX,
                height: this.tipBoundsWindow.innerHeight,
                width: this.tipBoundsWindow.innerWidth,
            });
        }
    }

    let overlay = null;
    const mousePos = { x: 0, y: 0 };
    const getInspectName = (element) => {
        return element.nodeName;
    };
    function initializeDevToolsLatest() {
        const connection = connect(window.parent);
        const api = {
            startInspectingHost: () => {
                if (!overlay) {
                    overlay = new Overlay();
                }
                const element = document.elementFromPoint(mousePos.x, mousePos.y);
                if (element) {
                    // highlight the initial point.
                    overlay.inspect([element], getInspectName(element));
                }
                window.addEventListener("pointerover", handleElementPointerOver, true);
                window.addEventListener("click", handleInspectorClick, true);
            },
            stopInspectingHost: () => {
                if (overlay) {
                    overlay.remove();
                    overlay = null;
                }
                window.removeEventListener("pointerover", handleElementPointerOver, true);
                window.removeEventListener("click", handleInspectorClick, true);
            },
        };
        expose(api, window.parent, window);
        const handleElementPointerOver = (e) => {
            const target = e.target;
            if (!target || !overlay)
                return;
            overlay.inspect([target], getInspectName(target));
        };
        const handleInspectorClick = async (e) => {
            e.preventDefault();
            api.stopInspectingHost();
            const target = e.target;
            if (!target)
                return;
            const fiber = getFiberFromHostInstance(target);
            if (!fiber)
                return;
            const source = await getFiberSource(fiber);
            // const path = target.getAttribute("data-insp-path") || "";
            const props = fiber.memoizedProps;
            connection.selectElement({ props, source });
        };
    }
    // Initialize when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeDevToolsLatest);
    }
    else {
        initializeDevToolsLatest();
    }

}));
//# sourceMappingURL=devtools.js.map
