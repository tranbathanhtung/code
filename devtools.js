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
    const isObject$1 = (val) => (typeof val === "object" && val !== null) || typeof val === "function";
    /**
     * Internal transfer handle to handle objects marked to proxy.
     */
    const proxyTransferHandler = {
        canHandle: (val) => isObject$1(val) && val[proxyMarker],
        serialize(obj) {
            const { port1, port2 } = new MessageChannel();
            expose(obj, port1);
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
        canHandle: (value) => isObject$1(value) && throwMarker in value,
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
    function expose(obj, ep = globalThis, allowedOrigins = ["*"]) {
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
                            expose(obj, port2);
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

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function getAugmentedNamespace(n) {
      if (Object.prototype.hasOwnProperty.call(n, '__esModule')) return n;
      var f = n.default;
    	if (typeof f == "function") {
    		var a = function a () {
    			var isInstance = false;
          try {
            isInstance = this instanceof a;
          } catch {}
    			if (isInstance) {
            return Reflect.construct(f, arguments, this.constructor);
    			}
    			return f.apply(this, arguments);
    		};
    		a.prototype = f.prototype;
      } else a = {};
      Object.defineProperty(a, '__esModule', {value: true});
    	Object.keys(n).forEach(function (k) {
    		var d = Object.getOwnPropertyDescriptor(n, k);
    		Object.defineProperty(a, k, d.get ? d : {
    			enumerable: true,
    			get: function () {
    				return n[k];
    			}
    		});
    	});
    	return a;
    }

    var lib = {};

    var Component = {};

    var react$1 = {exports: {}};

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
    		((function () {
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
    		        return type.$$typeof === REACT_CLIENT_REFERENCE
    		          ? null
    		          : type.displayName || type.name || null;
    		      if ("string" === typeof type) return type;
    		      switch (type) {
    		        case REACT_FRAGMENT_TYPE:
    		          return "Fragment";
    		        case REACT_PROFILER_TYPE:
    		          return "Profiler";
    		        case REACT_STRICT_MODE_TYPE:
    		          return "StrictMode";
    		        case REACT_SUSPENSE_TYPE:
    		          return "Suspense";
    		        case REACT_SUSPENSE_LIST_TYPE:
    		          return "SuspenseList";
    		        case REACT_ACTIVITY_TYPE:
    		          return "Activity";
    		      }
    		      if ("object" === typeof type)
    		        switch (
    		          ("number" === typeof type.tag &&
    		            console.error(
    		              "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
    		            ),
    		          type.$$typeof)
    		        ) {
    		          case REACT_PORTAL_TYPE:
    		            return "Portal";
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
    		    function getTaskName(type) {
    		      if (type === REACT_FRAGMENT_TYPE) return "<>";
    		      if (
    		        "object" === typeof type &&
    		        null !== type &&
    		        type.$$typeof === REACT_LAZY_TYPE
    		      )
    		        return "<...>";
    		      try {
    		        var name = getComponentNameFromType(type);
    		        return name ? "<" + name + ">" : "<...>";
    		      } catch (x) {
    		        return "<...>";
    		      }
    		    }
    		    function getOwner() {
    		      var dispatcher = ReactSharedInternals.A;
    		      return null === dispatcher ? null : dispatcher.getOwner();
    		    }
    		    function UnknownOwner() {
    		      return Error("react-stack-top-frame");
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
    		    function ReactElement(
    		      type,
    		      key,
    		      self,
    		      source,
    		      owner,
    		      props,
    		      debugStack,
    		      debugTask
    		    ) {
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
    		      Object.defineProperty(type, "_debugStack", {
    		        configurable: false,
    		        enumerable: false,
    		        writable: true,
    		        value: debugStack
    		      });
    		      Object.defineProperty(type, "_debugTask", {
    		        configurable: false,
    		        enumerable: false,
    		        writable: true,
    		        value: debugTask
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
    		        oldElement.props,
    		        oldElement._debugStack,
    		        oldElement._debugTask
    		      );
    		      oldElement._store &&
    		        (newKey._store.validated = oldElement._store.validated);
    		      return newKey;
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
    		      REACT_ACTIVITY_TYPE = Symbol.for("react.activity"),
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
    		      REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"),
    		      ReactSharedInternals = {
    		        H: null,
    		        A: null,
    		        T: null,
    		        S: null,
    		        V: null,
    		        actQueue: null,
    		        isBatchingLegacy: false,
    		        didScheduleLegacyUpdate: false,
    		        didUsePromise: false,
    		        thrownErrors: [],
    		        getCurrentStack: null,
    		        recentlyCreatedOwnerStacks: 0
    		      },
    		      hasOwnProperty = Object.prototype.hasOwnProperty,
    		      createTask = console.createTask
    		        ? console.createTask
    		        : function () {
    		            return null;
    		          };
    		    deprecatedAPIs = {
    		      react_stack_bottom_frame: function (callStackForError) {
    		        return callStackForError();
    		      }
    		    };
    		    var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
    		    var didWarnAboutElementRef = {};
    		    var unknownOwnerDebugStack = deprecatedAPIs.react_stack_bottom_frame.bind(
    		      deprecatedAPIs,
    		      UnknownOwner
    		    )();
    		    var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
    		    var didWarnAboutMaps = false,
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
    		    deprecatedAPIs = Object.freeze({
    		      __proto__: null,
    		      c: function (size) {
    		        return resolveDispatcher().useMemoCache(size);
    		      }
    		    });
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
    		    exports.__COMPILER_RUNTIME = deprecatedAPIs;
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
    		                  } catch (error$0) {
    		                    ReactSharedInternals.thrownErrors.push(error$0);
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
    		    exports.captureOwnerStack = function () {
    		      var getCurrentStack = ReactSharedInternals.getCurrentStack;
    		      return null === getCurrentStack ? null : getCurrentStack();
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
    		      props = ReactElement(
    		        element.type,
    		        key,
    		        void 0,
    		        void 0,
    		        owner,
    		        props,
    		        element._debugStack,
    		        element._debugTask
    		      );
    		      for (key = 2; key < arguments.length; key++)
    		        (owner = arguments[key]),
    		          isValidElement(owner) && owner._store && (owner._store.validated = 1);
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
    		      for (var i = 2; i < arguments.length; i++) {
    		        var node = arguments[i];
    		        isValidElement(node) && node._store && (node._store.validated = 1);
    		      }
    		      i = {};
    		      node = null;
    		      if (null != config)
    		        for (propName in (didWarnAboutOldJSXRuntime ||
    		          !("__self" in config) ||
    		          "key" in config ||
    		          ((didWarnAboutOldJSXRuntime = true),
    		          console.warn(
    		            "Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform"
    		          )),
    		        hasValidKey(config) &&
    		          (checkKeyStringCoercion(config.key), (node = "" + config.key)),
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
    		      node &&
    		        defineKeyPropWarningGetter(
    		          i,
    		          "function" === typeof type
    		            ? type.displayName || type.name || "Unknown"
    		            : type
    		        );
    		      var propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
    		      return ReactElement(
    		        type,
    		        node,
    		        void 0,
    		        void 0,
    		        getOwner(),
    		        i,
    		        propName ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
    		        propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask
    		      );
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
    		      null == type &&
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
    		    exports.useEffect = function (create, createDeps, update) {
    		      null == create &&
    		        console.warn(
    		          "React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?"
    		        );
    		      var dispatcher = resolveDispatcher();
    		      if ("function" === typeof update)
    		        throw Error(
    		          "useEffect CRUD overload is not enabled in this build of React."
    		        );
    		      return dispatcher.useEffect(create, createDeps);
    		    };
    		    exports.useId = function () {
    		      return resolveDispatcher().useId();
    		    };
    		    exports.useImperativeHandle = function (ref, create, deps) {
    		      return resolveDispatcher().useImperativeHandle(ref, create, deps);
    		    };
    		    exports.useInsertionEffect = function (create, deps) {
    		      null == create &&
    		        console.warn(
    		          "React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?"
    		        );
    		      return resolveDispatcher().useInsertionEffect(create, deps);
    		    };
    		    exports.useLayoutEffect = function (create, deps) {
    		      null == create &&
    		        console.warn(
    		          "React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?"
    		        );
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
    		    exports.version = "19.1.1";
    		    "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ &&
    		      "function" ===
    		        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop &&
    		      __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    		  }))(); 
    	} (react_development, react_development.exports));
    	return react_development.exports;
    }

    var hasRequiredReact$1;

    function requireReact$1 () {
    	if (hasRequiredReact$1) return react$1.exports;
    	hasRequiredReact$1 = 1;

    	{
    	  react$1.exports = requireReact_development();
    	}
    	return react$1.exports;
    }

    function _typeof$1(o) {
      "@babel/helpers - typeof";

      return _typeof$1 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) {
        return typeof o;
      } : function (o) {
        return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
      }, _typeof$1(o);
    }

    function toPrimitive(t, r) {
      if ("object" != _typeof$1(t) || !t) return t;
      var e = t[Symbol.toPrimitive];
      if (void 0 !== e) {
        var i = e.call(t, r);
        if ("object" != _typeof$1(i)) return i;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return ("string" === r ? String : Number)(t);
    }

    function toPropertyKey(t) {
      var i = toPrimitive(t, "string");
      return "symbol" == _typeof$1(i) ? i : i + "";
    }

    function _defineProperty$1(e, r, t) {
      return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
        value: t,
        enumerable: true,
        configurable: true,
        writable: true
      }) : e[r] = t, e;
    }

    var reactExports = requireReact$1();
    var React = /*@__PURE__*/getDefaultExportFromCjs(reactExports);

    /*

    Based off glamor's StyleSheet, thanks Sunil ❤️

    high performance StyleSheet for css-in-js systems

    - uses multiple style tags behind the scenes for millions of rules
    - uses `insertRule` for appending in production for *much* faster performance

    // usage

    import { StyleSheet } from '@emotion/sheet'

    let styleSheet = new StyleSheet({ key: '', container: document.head })

    styleSheet.insert('#box { border: 1px solid red; }')
    - appends a css rule into the stylesheet

    styleSheet.flush()
    - empties the stylesheet of all its contents

    */
    // $FlowFixMe
    function sheetForTag(tag) {
      if (tag.sheet) {
        // $FlowFixMe
        return tag.sheet;
      } // this weirdness brought to you by firefox

      /* istanbul ignore next */


      for (var i = 0; i < document.styleSheets.length; i++) {
        if (document.styleSheets[i].ownerNode === tag) {
          // $FlowFixMe
          return document.styleSheets[i];
        }
      }
    }

    function createStyleElement(options) {
      var tag = document.createElement('style');
      tag.setAttribute('data-emotion', options.key);

      if (options.nonce !== undefined) {
        tag.setAttribute('nonce', options.nonce);
      }

      tag.appendChild(document.createTextNode(''));
      return tag;
    }

    var StyleSheet =
    /*#__PURE__*/
    function () {
      function StyleSheet(options) {
        this.isSpeedy = options.speedy === undefined ? "development" === 'production' : options.speedy;
        this.tags = [];
        this.ctr = 0;
        this.nonce = options.nonce; // key is the value of the data-emotion attribute, it's used to identify different sheets

        this.key = options.key;
        this.container = options.container;
        this.before = null;
      }

      var _proto = StyleSheet.prototype;

      _proto.insert = function insert(rule) {
        // the max length is how many rules we have per style tag, it's 65000 in speedy mode
        // it's 1 in dev because we insert source maps that map a single rule to a location
        // and you can only have one source map per style tag
        if (this.ctr % (this.isSpeedy ? 65000 : 1) === 0) {
          var _tag = createStyleElement(this);

          var before;

          if (this.tags.length === 0) {
            before = this.before;
          } else {
            before = this.tags[this.tags.length - 1].nextSibling;
          }

          this.container.insertBefore(_tag, before);
          this.tags.push(_tag);
        }

        var tag = this.tags[this.tags.length - 1];

        if (this.isSpeedy) {
          var sheet = sheetForTag(tag);

          try {
            // this is a really hot path
            // we check the second character first because having "i"
            // as the second character will happen less often than
            // having "@" as the first character
            var isImportRule = rule.charCodeAt(1) === 105 && rule.charCodeAt(0) === 64; // this is the ultrafast version, works across browsers
            // the big drawback is that the css won't be editable in devtools

            sheet.insertRule(rule, // we need to insert @import rules before anything else
            // otherwise there will be an error
            // technically this means that the @import rules will
            // _usually_(not always since there could be multiple style tags)
            // be the first ones in prod and generally later in dev
            // this shouldn't really matter in the real world though
            // @import is generally only used for font faces from google fonts and etc.
            // so while this could be technically correct then it would be slower and larger
            // for a tiny bit of correctness that won't matter in the real world
            isImportRule ? 0 : sheet.cssRules.length);
          } catch (e) {
            {
              console.warn("There was a problem inserting the following rule: \"" + rule + "\"", e);
            }
          }
        } else {
          tag.appendChild(document.createTextNode(rule));
        }

        this.ctr++;
      };

      _proto.flush = function flush() {
        // $FlowFixMe
        this.tags.forEach(function (tag) {
          return tag.parentNode.removeChild(tag);
        });
        this.tags = [];
        this.ctr = 0;
      };

      return StyleSheet;
    }();

    function stylis_min (W) {
      function M(d, c, e, h, a) {
        for (var m = 0, b = 0, v = 0, n = 0, q, g, x = 0, K = 0, k, u = k = q = 0, l = 0, r = 0, I = 0, t = 0, B = e.length, J = B - 1, y, f = '', p = '', F = '', G = '', C; l < B;) {
          g = e.charCodeAt(l);
          l === J && 0 !== b + n + v + m && (0 !== b && (g = 47 === b ? 10 : 47), n = v = m = 0, B++, J++);

          if (0 === b + n + v + m) {
            if (l === J && (0 < r && (f = f.replace(N, '')), 0 < f.trim().length)) {
              switch (g) {
                case 32:
                case 9:
                case 59:
                case 13:
                case 10:
                  break;

                default:
                  f += e.charAt(l);
              }

              g = 59;
            }

            switch (g) {
              case 123:
                f = f.trim();
                q = f.charCodeAt(0);
                k = 1;

                for (t = ++l; l < B;) {
                  switch (g = e.charCodeAt(l)) {
                    case 123:
                      k++;
                      break;

                    case 125:
                      k--;
                      break;

                    case 47:
                      switch (g = e.charCodeAt(l + 1)) {
                        case 42:
                        case 47:
                          a: {
                            for (u = l + 1; u < J; ++u) {
                              switch (e.charCodeAt(u)) {
                                case 47:
                                  if (42 === g && 42 === e.charCodeAt(u - 1) && l + 2 !== u) {
                                    l = u + 1;
                                    break a;
                                  }

                                  break;

                                case 10:
                                  if (47 === g) {
                                    l = u + 1;
                                    break a;
                                  }

                              }
                            }

                            l = u;
                          }

                      }

                      break;

                    case 91:
                      g++;

                    case 40:
                      g++;

                    case 34:
                    case 39:
                      for (; l++ < J && e.charCodeAt(l) !== g;) {
                      }

                  }

                  if (0 === k) break;
                  l++;
                }

                k = e.substring(t, l);
                0 === q && (q = (f = f.replace(ca, '').trim()).charCodeAt(0));

                switch (q) {
                  case 64:
                    0 < r && (f = f.replace(N, ''));
                    g = f.charCodeAt(1);

                    switch (g) {
                      case 100:
                      case 109:
                      case 115:
                      case 45:
                        r = c;
                        break;

                      default:
                        r = O;
                    }

                    k = M(c, r, k, g, a + 1);
                    t = k.length;
                    0 < A && (r = X(O, f, I), C = H(3, k, r, c, D, z, t, g, a, h), f = r.join(''), void 0 !== C && 0 === (t = (k = C.trim()).length) && (g = 0, k = ''));
                    if (0 < t) switch (g) {
                      case 115:
                        f = f.replace(da, ea);

                      case 100:
                      case 109:
                      case 45:
                        k = f + '{' + k + '}';
                        break;

                      case 107:
                        f = f.replace(fa, '$1 $2');
                        k = f + '{' + k + '}';
                        k = 1 === w || 2 === w && L('@' + k, 3) ? '@-webkit-' + k + '@' + k : '@' + k;
                        break;

                      default:
                        k = f + k, 112 === h && (k = (p += k, ''));
                    } else k = '';
                    break;

                  default:
                    k = M(c, X(c, f, I), k, h, a + 1);
                }

                F += k;
                k = I = r = u = q = 0;
                f = '';
                g = e.charCodeAt(++l);
                break;

              case 125:
              case 59:
                f = (0 < r ? f.replace(N, '') : f).trim();
                if (1 < (t = f.length)) switch (0 === u && (q = f.charCodeAt(0), 45 === q || 96 < q && 123 > q) && (t = (f = f.replace(' ', ':')).length), 0 < A && void 0 !== (C = H(1, f, c, d, D, z, p.length, h, a, h)) && 0 === (t = (f = C.trim()).length) && (f = '\x00\x00'), q = f.charCodeAt(0), g = f.charCodeAt(1), q) {
                  case 0:
                    break;

                  case 64:
                    if (105 === g || 99 === g) {
                      G += f + e.charAt(l);
                      break;
                    }

                  default:
                    58 !== f.charCodeAt(t - 1) && (p += P(f, q, g, f.charCodeAt(2)));
                }
                I = r = u = q = 0;
                f = '';
                g = e.charCodeAt(++l);
            }
          }

          switch (g) {
            case 13:
            case 10:
              47 === b ? b = 0 : 0 === 1 + q && 107 !== h && 0 < f.length && (r = 1, f += '\x00');
              0 < A * Y && H(0, f, c, d, D, z, p.length, h, a, h);
              z = 1;
              D++;
              break;

            case 59:
            case 125:
              if (0 === b + n + v + m) {
                z++;
                break;
              }

            default:
              z++;
              y = e.charAt(l);

              switch (g) {
                case 9:
                case 32:
                  if (0 === n + m + b) switch (x) {
                    case 44:
                    case 58:
                    case 9:
                    case 32:
                      y = '';
                      break;

                    default:
                      32 !== g && (y = ' ');
                  }
                  break;

                case 0:
                  y = '\\0';
                  break;

                case 12:
                  y = '\\f';
                  break;

                case 11:
                  y = '\\v';
                  break;

                case 38:
                  0 === n + b + m && (r = I = 1, y = '\f' + y);
                  break;

                case 108:
                  if (0 === n + b + m + E && 0 < u) switch (l - u) {
                    case 2:
                      112 === x && 58 === e.charCodeAt(l - 3) && (E = x);

                    case 8:
                      111 === K && (E = K);
                  }
                  break;

                case 58:
                  0 === n + b + m && (u = l);
                  break;

                case 44:
                  0 === b + v + n + m && (r = 1, y += '\r');
                  break;

                case 34:
                case 39:
                  0 === b && (n = n === g ? 0 : 0 === n ? g : n);
                  break;

                case 91:
                  0 === n + b + v && m++;
                  break;

                case 93:
                  0 === n + b + v && m--;
                  break;

                case 41:
                  0 === n + b + m && v--;
                  break;

                case 40:
                  if (0 === n + b + m) {
                    if (0 === q) switch (2 * x + 3 * K) {
                      case 533:
                        break;

                      default:
                        q = 1;
                    }
                    v++;
                  }

                  break;

                case 64:
                  0 === b + v + n + m + u + k && (k = 1);
                  break;

                case 42:
                case 47:
                  if (!(0 < n + m + v)) switch (b) {
                    case 0:
                      switch (2 * g + 3 * e.charCodeAt(l + 1)) {
                        case 235:
                          b = 47;
                          break;

                        case 220:
                          t = l, b = 42;
                      }

                      break;

                    case 42:
                      47 === g && 42 === x && t + 2 !== l && (33 === e.charCodeAt(t + 2) && (p += e.substring(t, l + 1)), y = '', b = 0);
                  }
              }

              0 === b && (f += y);
          }

          K = x;
          x = g;
          l++;
        }

        t = p.length;

        if (0 < t) {
          r = c;
          if (0 < A && (C = H(2, p, r, d, D, z, t, h, a, h), void 0 !== C && 0 === (p = C).length)) return G + p + F;
          p = r.join(',') + '{' + p + '}';

          if (0 !== w * E) {
            2 !== w || L(p, 2) || (E = 0);

            switch (E) {
              case 111:
                p = p.replace(ha, ':-moz-$1') + p;
                break;

              case 112:
                p = p.replace(Q, '::-webkit-input-$1') + p.replace(Q, '::-moz-$1') + p.replace(Q, ':-ms-input-$1') + p;
            }

            E = 0;
          }
        }

        return G + p + F;
      }

      function X(d, c, e) {
        var h = c.trim().split(ia);
        c = h;
        var a = h.length,
            m = d.length;

        switch (m) {
          case 0:
          case 1:
            var b = 0;

            for (d = 0 === m ? '' : d[0] + ' '; b < a; ++b) {
              c[b] = Z(d, c[b], e).trim();
            }

            break;

          default:
            var v = b = 0;

            for (c = []; b < a; ++b) {
              for (var n = 0; n < m; ++n) {
                c[v++] = Z(d[n] + ' ', h[b], e).trim();
              }
            }

        }

        return c;
      }

      function Z(d, c, e) {
        var h = c.charCodeAt(0);
        33 > h && (h = (c = c.trim()).charCodeAt(0));

        switch (h) {
          case 38:
            return c.replace(F, '$1' + d.trim());

          case 58:
            return d.trim() + c.replace(F, '$1' + d.trim());

          default:
            if (0 < 1 * e && 0 < c.indexOf('\f')) return c.replace(F, (58 === d.charCodeAt(0) ? '' : '$1') + d.trim());
        }

        return d + c;
      }

      function P(d, c, e, h) {
        var a = d + ';',
            m = 2 * c + 3 * e + 4 * h;

        if (944 === m) {
          d = a.indexOf(':', 9) + 1;
          var b = a.substring(d, a.length - 1).trim();
          b = a.substring(0, d).trim() + b + ';';
          return 1 === w || 2 === w && L(b, 1) ? '-webkit-' + b + b : b;
        }

        if (0 === w || 2 === w && !L(a, 1)) return a;

        switch (m) {
          case 1015:
            return 97 === a.charCodeAt(10) ? '-webkit-' + a + a : a;

          case 951:
            return 116 === a.charCodeAt(3) ? '-webkit-' + a + a : a;

          case 963:
            return 110 === a.charCodeAt(5) ? '-webkit-' + a + a : a;

          case 1009:
            if (100 !== a.charCodeAt(4)) break;

          case 969:
          case 942:
            return '-webkit-' + a + a;

          case 978:
            return '-webkit-' + a + '-moz-' + a + a;

          case 1019:
          case 983:
            return '-webkit-' + a + '-moz-' + a + '-ms-' + a + a;

          case 883:
            if (45 === a.charCodeAt(8)) return '-webkit-' + a + a;
            if (0 < a.indexOf('image-set(', 11)) return a.replace(ja, '$1-webkit-$2') + a;
            break;

          case 932:
            if (45 === a.charCodeAt(4)) switch (a.charCodeAt(5)) {
              case 103:
                return '-webkit-box-' + a.replace('-grow', '') + '-webkit-' + a + '-ms-' + a.replace('grow', 'positive') + a;

              case 115:
                return '-webkit-' + a + '-ms-' + a.replace('shrink', 'negative') + a;

              case 98:
                return '-webkit-' + a + '-ms-' + a.replace('basis', 'preferred-size') + a;
            }
            return '-webkit-' + a + '-ms-' + a + a;

          case 964:
            return '-webkit-' + a + '-ms-flex-' + a + a;

          case 1023:
            if (99 !== a.charCodeAt(8)) break;
            b = a.substring(a.indexOf(':', 15)).replace('flex-', '').replace('space-between', 'justify');
            return '-webkit-box-pack' + b + '-webkit-' + a + '-ms-flex-pack' + b + a;

          case 1005:
            return ka.test(a) ? a.replace(aa, ':-webkit-') + a.replace(aa, ':-moz-') + a : a;

          case 1e3:
            b = a.substring(13).trim();
            c = b.indexOf('-') + 1;

            switch (b.charCodeAt(0) + b.charCodeAt(c)) {
              case 226:
                b = a.replace(G, 'tb');
                break;

              case 232:
                b = a.replace(G, 'tb-rl');
                break;

              case 220:
                b = a.replace(G, 'lr');
                break;

              default:
                return a;
            }

            return '-webkit-' + a + '-ms-' + b + a;

          case 1017:
            if (-1 === a.indexOf('sticky', 9)) break;

          case 975:
            c = (a = d).length - 10;
            b = (33 === a.charCodeAt(c) ? a.substring(0, c) : a).substring(d.indexOf(':', 7) + 1).trim();

            switch (m = b.charCodeAt(0) + (b.charCodeAt(7) | 0)) {
              case 203:
                if (111 > b.charCodeAt(8)) break;

              case 115:
                a = a.replace(b, '-webkit-' + b) + ';' + a;
                break;

              case 207:
              case 102:
                a = a.replace(b, '-webkit-' + (102 < m ? 'inline-' : '') + 'box') + ';' + a.replace(b, '-webkit-' + b) + ';' + a.replace(b, '-ms-' + b + 'box') + ';' + a;
            }

            return a + ';';

          case 938:
            if (45 === a.charCodeAt(5)) switch (a.charCodeAt(6)) {
              case 105:
                return b = a.replace('-items', ''), '-webkit-' + a + '-webkit-box-' + b + '-ms-flex-' + b + a;

              case 115:
                return '-webkit-' + a + '-ms-flex-item-' + a.replace(ba, '') + a;

              default:
                return '-webkit-' + a + '-ms-flex-line-pack' + a.replace('align-content', '').replace(ba, '') + a;
            }
            break;

          case 973:
          case 989:
            if (45 !== a.charCodeAt(3) || 122 === a.charCodeAt(4)) break;

          case 931:
          case 953:
            if (true === la.test(d)) return 115 === (b = d.substring(d.indexOf(':') + 1)).charCodeAt(0) ? P(d.replace('stretch', 'fill-available'), c, e, h).replace(':fill-available', ':stretch') : a.replace(b, '-webkit-' + b) + a.replace(b, '-moz-' + b.replace('fill-', '')) + a;
            break;

          case 962:
            if (a = '-webkit-' + a + (102 === a.charCodeAt(5) ? '-ms-' + a : '') + a, 211 === e + h && 105 === a.charCodeAt(13) && 0 < a.indexOf('transform', 10)) return a.substring(0, a.indexOf(';', 27) + 1).replace(ma, '$1-webkit-$2') + a;
        }

        return a;
      }

      function L(d, c) {
        var e = d.indexOf(1 === c ? ':' : '{'),
            h = d.substring(0, 3 !== c ? e : 10);
        e = d.substring(e + 1, d.length - 1);
        return R(2 !== c ? h : h.replace(na, '$1'), e, c);
      }

      function ea(d, c) {
        var e = P(c, c.charCodeAt(0), c.charCodeAt(1), c.charCodeAt(2));
        return e !== c + ';' ? e.replace(oa, ' or ($1)').substring(4) : '(' + c + ')';
      }

      function H(d, c, e, h, a, m, b, v, n, q) {
        for (var g = 0, x = c, w; g < A; ++g) {
          switch (w = S[g].call(B, d, x, e, h, a, m, b, v, n, q)) {
            case void 0:
            case false:
            case true:
            case null:
              break;

            default:
              x = w;
          }
        }

        if (x !== c) return x;
      }

      function T(d) {
        switch (d) {
          case void 0:
          case null:
            A = S.length = 0;
            break;

          default:
            if ('function' === typeof d) S[A++] = d;else if ('object' === typeof d) for (var c = 0, e = d.length; c < e; ++c) {
              T(d[c]);
            } else Y = !!d | 0;
        }

        return T;
      }

      function U(d) {
        d = d.prefix;
        void 0 !== d && (R = null, d ? 'function' !== typeof d ? w = 1 : (w = 2, R = d) : w = 0);
        return U;
      }

      function B(d, c) {
        var e = d;
        33 > e.charCodeAt(0) && (e = e.trim());
        V = e;
        e = [V];

        if (0 < A) {
          var h = H(-1, c, e, e, D, z, 0, 0, 0, 0);
          void 0 !== h && 'string' === typeof h && (c = h);
        }

        var a = M(O, e, c, 0, 0);
        0 < A && (h = H(-2, a, e, e, D, z, a.length, 0, 0, 0), void 0 !== h && (a = h));
        V = '';
        E = 0;
        z = D = 1;
        return a;
      }

      var ca = /^\0+/g,
          N = /[\0\r\f]/g,
          aa = /: */g,
          ka = /zoo|gra/,
          ma = /([,: ])(transform)/g,
          ia = /,\r+?/g,
          F = /([\t\r\n ])*\f?&/g,
          fa = /@(k\w+)\s*(\S*)\s*/,
          Q = /::(place)/g,
          ha = /:(read-only)/g,
          G = /[svh]\w+-[tblr]{2}/,
          da = /\(\s*(.*)\s*\)/g,
          oa = /([\s\S]*?);/g,
          ba = /-self|flex-/g,
          na = /[^]*?(:[rp][el]a[\w-]+)[^]*/,
          la = /stretch|:\s*\w+\-(?:conte|avail)/,
          ja = /([^-])(image-set\()/,
          z = 1,
          D = 1,
          E = 0,
          w = 1,
          O = [],
          S = [],
          A = 0,
          R = null,
          Y = 0,
          V = '';
      B.use = T;
      B.set = U;
      void 0 !== W && U(W);
      return B;
    }

    var weakMemoize = function weakMemoize(func) {
      // $FlowFixMe flow doesn't include all non-primitive types as allowed for weakmaps
      var cache = new WeakMap();
      return function (arg) {
        if (cache.has(arg)) {
          // $FlowFixMe
          return cache.get(arg);
        }

        var ret = func(arg);
        cache.set(arg, ret);
        return ret;
      };
    };

    // https://github.com/thysultan/stylis.js/tree/master/plugins/rule-sheet
    // inlined to avoid umd wrapper and peerDep warnings/installing stylis
    // since we use stylis after closure compiler
    var delimiter = '/*|*/';
    var needle = delimiter + '}';

    function toSheet(block) {
      if (block) {
        Sheet.current.insert(block + '}');
      }
    }

    var Sheet = {
      current: null
    };
    var ruleSheet = function ruleSheet(context, content, selectors, parents, line, column, length, ns, depth, at) {
      switch (context) {
        // property
        case 1:
          {
            switch (content.charCodeAt(0)) {
              case 64:
                {
                  // @import
                  Sheet.current.insert(content + ';');
                  return '';
                }
              // charcode for l

              case 108:
                {
                  // charcode for b
                  // this ignores label
                  if (content.charCodeAt(2) === 98) {
                    return '';
                  }
                }
            }

            break;
          }
        // selector

        case 2:
          {
            if (ns === 0) return content + delimiter;
            break;
          }
        // at-rule

        case 3:
          {
            switch (ns) {
              // @font-face, @page
              case 102:
              case 112:
                {
                  Sheet.current.insert(selectors[0] + content);
                  return '';
                }

              default:
                {
                  return content + (at === 0 ? delimiter : '');
                }
            }
          }

        case -2:
          {
            content.split(needle).forEach(toSheet);
          }
      }
    };

    var createCache = function createCache(options) {
      if (options === undefined) options = {};
      var key = options.key || 'css';
      var stylisOptions;

      if (options.prefix !== undefined) {
        stylisOptions = {
          prefix: options.prefix
        };
      }

      var stylis = new stylis_min(stylisOptions);

      {
        // $FlowFixMe
        if (/[^a-z-]/.test(key)) {
          throw new Error("Emotion key must only contain lower case alphabetical characters and - but \"" + key + "\" was passed");
        }
      }

      var inserted = {}; // $FlowFixMe

      var container;

      {
        container = options.container || document.head;
        var nodes = document.querySelectorAll("style[data-emotion-" + key + "]");
        Array.prototype.forEach.call(nodes, function (node) {
          var attrib = node.getAttribute("data-emotion-" + key); // $FlowFixMe

          attrib.split(' ').forEach(function (id) {
            inserted[id] = true;
          });

          if (node.parentNode !== container) {
            container.appendChild(node);
          }
        });
      }

      var _insert;

      {
        stylis.use(options.stylisPlugins)(ruleSheet);

        _insert = function insert(selector, serialized, sheet, shouldCache) {
          var name = serialized.name;
          Sheet.current = sheet;

          if (serialized.map !== undefined) {
            var map = serialized.map;
            Sheet.current = {
              insert: function insert(rule) {
                sheet.insert(rule + map);
              }
            };
          }

          stylis(selector, serialized.styles);

          if (shouldCache) {
            cache.inserted[name] = true;
          }
        };
      }

      {
        // https://esbench.com/bench/5bf7371a4cd7e6009ef61d0a
        var commentStart = /\/\*/g;
        var commentEnd = /\*\//g;
        stylis.use(function (context, content) {
          switch (context) {
            case -1:
              {
                while (commentStart.test(content)) {
                  commentEnd.lastIndex = commentStart.lastIndex;

                  if (commentEnd.test(content)) {
                    commentStart.lastIndex = commentEnd.lastIndex;
                    continue;
                  }

                  throw new Error('Your styles have an unterminated comment ("/*" without corresponding "*/").');
                }

                commentStart.lastIndex = 0;
                break;
              }
          }
        });
        stylis.use(function (context, content, selectors) {
          switch (context) {
            case -1:
              {
                var flag = 'emotion-disable-server-rendering-unsafe-selector-warning-please-do-not-use-this-the-warning-exists-for-a-reason';
                var unsafePseudoClasses = content.match(/(:first|:nth|:nth-last)-child/g);

                if (unsafePseudoClasses && cache.compat !== true) {
                  unsafePseudoClasses.forEach(function (unsafePseudoClass) {
                    var ignoreRegExp = new RegExp(unsafePseudoClass + ".*\\/\\* " + flag + " \\*\\/");
                    var ignore = ignoreRegExp.test(content);

                    if (unsafePseudoClass && !ignore) {
                      console.error("The pseudo class \"" + unsafePseudoClass + "\" is potentially unsafe when doing server-side rendering. Try changing it to \"" + unsafePseudoClass.split('-child')[0] + "-of-type\".");
                    }
                  });
                }

                break;
              }
          }
        });
      }

      var cache = {
        key: key,
        sheet: new StyleSheet({
          key: key,
          container: container,
          nonce: options.nonce,
          speedy: options.speedy
        }),
        nonce: options.nonce,
        inserted: inserted,
        registered: {},
        insert: _insert
      };
      return cache;
    };

    var isBrowser = "object" !== 'undefined';
    function getRegisteredStyles(registered, registeredStyles, classNames) {
      var rawClassName = '';
      classNames.split(' ').forEach(function (className) {
        if (registered[className] !== undefined) {
          registeredStyles.push(registered[className]);
        } else {
          rawClassName += className + " ";
        }
      });
      return rawClassName;
    }
    var insertStyles = function insertStyles(cache, serialized, isStringTag) {
      var className = cache.key + "-" + serialized.name;

      if ( // we only need to add the styles to the registered cache if the
      // class name could be used further down
      // the tree but if it's a string tag, we know it won't
      // so we don't have to add it to registered cache.
      // this improves memory usage since we can avoid storing the whole style string
      (isStringTag === false || // we need to always store it if we're in compat mode and
      // in node since emotion-server relies on whether a style is in
      // the registered cache to know whether a style is global or not
      // also, note that this check will be dead code eliminated in the browser
      isBrowser === false) && cache.registered[className] === undefined) {
        cache.registered[className] = serialized.styles;
      }

      if (cache.inserted[serialized.name] === undefined) {
        var current = serialized;

        do {
          cache.insert("." + className, current, cache.sheet, true);

          current = current.next;
        } while (current !== undefined);
      }
    };

    /* eslint-disable */
    // Inspired by https://github.com/garycourt/murmurhash-js
    // Ported from https://github.com/aappleby/smhasher/blob/61a0530f28277f2e850bfc39600ce61d02b518de/src/MurmurHash2.cpp#L37-L86
    function murmur2(str) {
      // 'm' and 'r' are mixing constants generated offline.
      // They're not really 'magic', they just happen to work well.
      // const m = 0x5bd1e995;
      // const r = 24;
      // Initialize the hash
      var h = 0; // Mix 4 bytes at a time into the hash

      var k,
          i = 0,
          len = str.length;

      for (; len >= 4; ++i, len -= 4) {
        k = str.charCodeAt(i) & 0xff | (str.charCodeAt(++i) & 0xff) << 8 | (str.charCodeAt(++i) & 0xff) << 16 | (str.charCodeAt(++i) & 0xff) << 24;
        k =
        /* Math.imul(k, m): */
        (k & 0xffff) * 0x5bd1e995 + ((k >>> 16) * 0xe995 << 16);
        k ^=
        /* k >>> r: */
        k >>> 24;
        h =
        /* Math.imul(k, m): */
        (k & 0xffff) * 0x5bd1e995 + ((k >>> 16) * 0xe995 << 16) ^
        /* Math.imul(h, m): */
        (h & 0xffff) * 0x5bd1e995 + ((h >>> 16) * 0xe995 << 16);
      } // Handle the last few bytes of the input array


      switch (len) {
        case 3:
          h ^= (str.charCodeAt(i + 2) & 0xff) << 16;

        case 2:
          h ^= (str.charCodeAt(i + 1) & 0xff) << 8;

        case 1:
          h ^= str.charCodeAt(i) & 0xff;
          h =
          /* Math.imul(h, m): */
          (h & 0xffff) * 0x5bd1e995 + ((h >>> 16) * 0xe995 << 16);
      } // Do a few final mixes of the hash to ensure the last few
      // bytes are well-incorporated.


      h ^= h >>> 13;
      h =
      /* Math.imul(h, m): */
      (h & 0xffff) * 0x5bd1e995 + ((h >>> 16) * 0xe995 << 16);
      return ((h ^ h >>> 15) >>> 0).toString(36);
    }

    var unitlessKeys = {
      animationIterationCount: 1,
      borderImageOutset: 1,
      borderImageSlice: 1,
      borderImageWidth: 1,
      boxFlex: 1,
      boxFlexGroup: 1,
      boxOrdinalGroup: 1,
      columnCount: 1,
      columns: 1,
      flex: 1,
      flexGrow: 1,
      flexPositive: 1,
      flexShrink: 1,
      flexNegative: 1,
      flexOrder: 1,
      gridRow: 1,
      gridRowEnd: 1,
      gridRowSpan: 1,
      gridRowStart: 1,
      gridColumn: 1,
      gridColumnEnd: 1,
      gridColumnSpan: 1,
      gridColumnStart: 1,
      msGridRow: 1,
      msGridRowSpan: 1,
      msGridColumn: 1,
      msGridColumnSpan: 1,
      fontWeight: 1,
      lineHeight: 1,
      opacity: 1,
      order: 1,
      orphans: 1,
      tabSize: 1,
      widows: 1,
      zIndex: 1,
      zoom: 1,
      WebkitLineClamp: 1,
      // SVG-related properties
      fillOpacity: 1,
      floodOpacity: 1,
      stopOpacity: 1,
      strokeDasharray: 1,
      strokeDashoffset: 1,
      strokeMiterlimit: 1,
      strokeOpacity: 1,
      strokeWidth: 1
    };

    function memoize(fn) {
      var cache = {};
      return function (arg) {
        if (cache[arg] === undefined) cache[arg] = fn(arg);
        return cache[arg];
      };
    }

    var ILLEGAL_ESCAPE_SEQUENCE_ERROR$1 = "You have illegal escape sequence in your template literal, most likely inside content's property value.\nBecause you write your CSS inside a JavaScript string you actually have to do double escaping, so for example \"content: '\\00d7';\" should become \"content: '\\\\00d7';\".\nYou can read more about this here:\nhttps://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#ES2018_revision_of_illegal_escape_sequences";
    var UNDEFINED_AS_OBJECT_KEY_ERROR = "You have passed in falsy value as style object's key (can happen when in example you pass unexported component as computed key).";
    var hyphenateRegex = /[A-Z]|^ms/g;
    var animationRegex = /_EMO_([^_]+?)_([^]*?)_EMO_/g;

    var isCustomProperty = function isCustomProperty(property) {
      return property.charCodeAt(1) === 45;
    };

    var isProcessableValue = function isProcessableValue(value) {
      return value != null && typeof value !== 'boolean';
    };

    var processStyleName = memoize(function (styleName) {
      return isCustomProperty(styleName) ? styleName : styleName.replace(hyphenateRegex, '-$&').toLowerCase();
    });

    var processStyleValue = function processStyleValue(key, value) {
      switch (key) {
        case 'animation':
        case 'animationName':
          {
            if (typeof value === 'string') {
              return value.replace(animationRegex, function (match, p1, p2) {
                cursor = {
                  name: p1,
                  styles: p2,
                  next: cursor
                };
                return p1;
              });
            }
          }
      }

      if (unitlessKeys[key] !== 1 && !isCustomProperty(key) && typeof value === 'number' && value !== 0) {
        return value + 'px';
      }

      return value;
    };

    {
      var contentValuePattern = /(attr|calc|counters?|url)\(/;
      var contentValues = ['normal', 'none', 'counter', 'open-quote', 'close-quote', 'no-open-quote', 'no-close-quote', 'initial', 'inherit', 'unset'];
      var oldProcessStyleValue = processStyleValue;
      var msPattern = /^-ms-/;
      var hyphenPattern = /-(.)/g;
      var hyphenatedCache = {};

      processStyleValue = function processStyleValue(key, value) {
        if (key === 'content') {
          if (typeof value !== 'string' || contentValues.indexOf(value) === -1 && !contentValuePattern.test(value) && (value.charAt(0) !== value.charAt(value.length - 1) || value.charAt(0) !== '"' && value.charAt(0) !== "'")) {
            console.error("You seem to be using a value for 'content' without quotes, try replacing it with `content: '\"" + value + "\"'`");
          }
        }

        var processed = oldProcessStyleValue(key, value);

        if (processed !== '' && !isCustomProperty(key) && key.indexOf('-') !== -1 && hyphenatedCache[key] === undefined) {
          hyphenatedCache[key] = true;
          console.error("Using kebab-case for css properties in objects is not supported. Did you mean " + key.replace(msPattern, 'ms-').replace(hyphenPattern, function (str, _char) {
            return _char.toUpperCase();
          }) + "?");
        }

        return processed;
      };
    }

    var shouldWarnAboutInterpolatingClassNameFromCss = true;

    function handleInterpolation(mergedProps, registered, interpolation, couldBeSelectorInterpolation) {
      if (interpolation == null) {
        return '';
      }

      if (interpolation.__emotion_styles !== undefined) {
        if (interpolation.toString() === 'NO_COMPONENT_SELECTOR') {
          throw new Error('Component selectors can only be used in conjunction with babel-plugin-emotion.');
        }

        return interpolation;
      }

      switch (typeof interpolation) {
        case 'boolean':
          {
            return '';
          }

        case 'object':
          {
            if (interpolation.anim === 1) {
              cursor = {
                name: interpolation.name,
                styles: interpolation.styles,
                next: cursor
              };
              return interpolation.name;
            }

            if (interpolation.styles !== undefined) {
              var next = interpolation.next;

              if (next !== undefined) {
                // not the most efficient thing ever but this is a pretty rare case
                // and there will be very few iterations of this generally
                while (next !== undefined) {
                  cursor = {
                    name: next.name,
                    styles: next.styles,
                    next: cursor
                  };
                  next = next.next;
                }
              }

              var styles = interpolation.styles + ";";

              if (interpolation.map !== undefined) {
                styles += interpolation.map;
              }

              return styles;
            }

            return createStringFromObject(mergedProps, registered, interpolation);
          }

        case 'function':
          {
            if (mergedProps !== undefined) {
              var previousCursor = cursor;
              var result = interpolation(mergedProps);
              cursor = previousCursor;
              return handleInterpolation(mergedProps, registered, result, couldBeSelectorInterpolation);
            } else {
              console.error('Functions that are interpolated in css calls will be stringified.\n' + 'If you want to have a css call based on props, create a function that returns a css call like this\n' + 'let dynamicStyle = (props) => css`color: ${props.color}`\n' + 'It can be called directly with props or interpolated in a styled call like this\n' + "let SomeComponent = styled('div')`${dynamicStyle}`");
            }

            break;
          }

        case 'string':
          {
            var matched = [];
            var replaced = interpolation.replace(animationRegex, function (match, p1, p2) {
              var fakeVarName = "animation" + matched.length;
              matched.push("const " + fakeVarName + " = keyframes`" + p2.replace(/^@keyframes animation-\w+/, '') + "`");
              return "${" + fakeVarName + "}";
            });

            if (matched.length) {
              console.error('`keyframes` output got interpolated into plain string, please wrap it with `css`.\n\n' + 'Instead of doing this:\n\n' + [].concat(matched, ["`" + replaced + "`"]).join('\n') + '\n\nYou should wrap it with `css` like this:\n\n' + ("css`" + replaced + "`"));
            }
          }

          break;
      } // finalize string values (regular strings and functions interpolated into css calls)


      if (registered == null) {
        return interpolation;
      }

      var cached = registered[interpolation];

      if (couldBeSelectorInterpolation && shouldWarnAboutInterpolatingClassNameFromCss && cached !== undefined) {
        console.error('Interpolating a className from css`` is not recommended and will cause problems with composition.\n' + 'Interpolating a className from css`` will be completely unsupported in a future major version of Emotion');
        shouldWarnAboutInterpolatingClassNameFromCss = false;
      }

      return cached !== undefined && !couldBeSelectorInterpolation ? cached : interpolation;
    }

    function createStringFromObject(mergedProps, registered, obj) {
      var string = '';

      if (Array.isArray(obj)) {
        for (var i = 0; i < obj.length; i++) {
          string += handleInterpolation(mergedProps, registered, obj[i], false);
        }
      } else {
        for (var _key in obj) {
          var value = obj[_key];

          if (typeof value !== 'object') {
            if (registered != null && registered[value] !== undefined) {
              string += _key + "{" + registered[value] + "}";
            } else if (isProcessableValue(value)) {
              string += processStyleName(_key) + ":" + processStyleValue(_key, value) + ";";
            }
          } else {
            if (_key === 'NO_COMPONENT_SELECTOR' && "development" !== 'production') {
              throw new Error('Component selectors can only be used in conjunction with babel-plugin-emotion.');
            }

            if (Array.isArray(value) && typeof value[0] === 'string' && (registered == null || registered[value[0]] === undefined)) {
              for (var _i = 0; _i < value.length; _i++) {
                if (isProcessableValue(value[_i])) {
                  string += processStyleName(_key) + ":" + processStyleValue(_key, value[_i]) + ";";
                }
              }
            } else {
              var interpolated = handleInterpolation(mergedProps, registered, value, false);

              switch (_key) {
                case 'animation':
                case 'animationName':
                  {
                    string += processStyleName(_key) + ":" + interpolated + ";";
                    break;
                  }

                default:
                  {
                    if (_key === 'undefined') {
                      console.error(UNDEFINED_AS_OBJECT_KEY_ERROR);
                    }

                    string += _key + "{" + interpolated + "}";
                  }
              }
            }
          }
        }
      }

      return string;
    }

    var labelPattern = /label:\s*([^\s;\n{]+)\s*;/g;
    var sourceMapPattern;

    {
      sourceMapPattern = /\/\*#\ssourceMappingURL=data:application\/json;\S+\s+\*\//;
    } // this is the cursor for keyframes
    // keyframes are stored on the SerializedStyles object as a linked list


    var cursor;
    var serializeStyles = function serializeStyles(args, registered, mergedProps) {
      if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && args[0].styles !== undefined) {
        return args[0];
      }

      var stringMode = true;
      var styles = '';
      cursor = undefined;
      var strings = args[0];

      if (strings == null || strings.raw === undefined) {
        stringMode = false;
        styles += handleInterpolation(mergedProps, registered, strings, false);
      } else {
        if (strings[0] === undefined) {
          console.error(ILLEGAL_ESCAPE_SEQUENCE_ERROR$1);
        }

        styles += strings[0];
      } // we start at 1 since we've already handled the first arg


      for (var i = 1; i < args.length; i++) {
        styles += handleInterpolation(mergedProps, registered, args[i], styles.charCodeAt(styles.length - 1) === 46);

        if (stringMode) {
          if (strings[i] === undefined) {
            console.error(ILLEGAL_ESCAPE_SEQUENCE_ERROR$1);
          }

          styles += strings[i];
        }
      }

      var sourceMap;

      {
        styles = styles.replace(sourceMapPattern, function (match) {
          sourceMap = match;
          return '';
        });
      } // using a global regex with .exec is stateful so lastIndex has to be reset each time


      labelPattern.lastIndex = 0;
      var identifierName = '';
      var match; // https://esbench.com/bench/5b809c2cf2949800a0f61fb5

      while ((match = labelPattern.exec(styles)) !== null) {
        identifierName += '-' + // $FlowFixMe we know it's not null
        match[1];
      }

      var name = murmur2(styles) + identifierName;

      {
        // $FlowFixMe SerializedStyles type doesn't have toString property (and we don't want to add it)
        return {
          name: name,
          styles: styles,
          map: sourceMap,
          next: cursor,
          toString: function toString() {
            return "You have tried to stringify object returned from `css` function. It isn't supposed to be used directly (e.g. as value of the `className` prop), but rather handed to emotion so it can handle it (e.g. as value of `css` prop).";
          }
        };
      }
    };

    var hasOwnProperty$1 = Object.prototype.hasOwnProperty;

    var EmotionCacheContext = /*#__PURE__*/reactExports.createContext( // we're doing this to avoid preconstruct's dead code elimination in this one case
    // because this module is primarily intended for the browser and node
    // but it's also required in react native and similar environments sometimes
    // and we could have a special build just for that
    // but this is much easier and the native packages
    // might use a different theme context in the future anyway
    typeof HTMLElement !== 'undefined' ? createCache() : null);
    var ThemeContext$1 = /*#__PURE__*/reactExports.createContext({});
    EmotionCacheContext.Provider;

    var withEmotionCache = function withEmotionCache(func) {
      var render = function render(props, ref) {
        return /*#__PURE__*/reactExports.createElement(EmotionCacheContext.Consumer, null, function (cache) {
          return func(props, cache, ref);
        });
      }; // $FlowFixMe


      return /*#__PURE__*/reactExports.forwardRef(render);
    };

    var typePropName = '__EMOTION_TYPE_PLEASE_DO_NOT_USE__';
    var labelPropName = '__EMOTION_LABEL_PLEASE_DO_NOT_USE__';

    var Noop$1 = function Noop() {
      return null;
    };

    var render = function render(cache, props, theme, ref) {
      var cssProp = theme === null ? props.css : props.css(theme); // so that using `css` from `emotion` and passing the result to the css prop works
      // not passing the registered cache to serializeStyles because it would
      // make certain babel optimisations not possible

      if (typeof cssProp === 'string' && cache.registered[cssProp] !== undefined) {
        cssProp = cache.registered[cssProp];
      }

      var type = props[typePropName];
      var registeredStyles = [cssProp];
      var className = '';

      if (typeof props.className === 'string') {
        className = getRegisteredStyles(cache.registered, registeredStyles, props.className);
      } else if (props.className != null) {
        className = props.className + " ";
      }

      var serialized = serializeStyles(registeredStyles);

      if (serialized.name.indexOf('-') === -1) {
        var labelFromStack = props[labelPropName];

        if (labelFromStack) {
          serialized = serializeStyles([serialized, 'label:' + labelFromStack + ';']);
        }
      }

      insertStyles(cache, serialized, typeof type === 'string');
      className += cache.key + "-" + serialized.name;
      var newProps = {};

      for (var key in props) {
        if (hasOwnProperty$1.call(props, key) && key !== 'css' && key !== typePropName && (key !== labelPropName)) {
          newProps[key] = props[key];
        }
      }

      newProps.ref = ref;
      newProps.className = className;
      var ele = /*#__PURE__*/reactExports.createElement(type, newProps);
      var possiblyStyleElement = /*#__PURE__*/reactExports.createElement(Noop$1, null);


      return /*#__PURE__*/reactExports.createElement(reactExports.Fragment, null, possiblyStyleElement, ele);
    }; // eslint-disable-next-line no-undef


    var Emotion = /* #__PURE__ */withEmotionCache(function (props, cache, ref) {
      if (typeof props.css === 'function') {
        return /*#__PURE__*/reactExports.createElement(ThemeContext$1.Consumer, null, function (theme) {
          return render(cache, props, theme, ref);
        });
      }

      return render(cache, props, null, ref);
    });

    {
      Emotion.displayName = 'EmotionCssPropInternal';
    }

    function _extends$1() {
      return _extends$1 = Object.assign ? Object.assign.bind() : function (n) {
        for (var e = 1; e < arguments.length; e++) {
          var t = arguments[e];
          for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
        }
        return n;
      }, _extends$1.apply(null, arguments);
    }

    var reactIs = {exports: {}};

    var reactIs_development = {};

    /** @license React v16.13.1
     * react-is.development.js
     *
     * Copyright (c) Facebook, Inc. and its affiliates.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     */

    var hasRequiredReactIs_development;

    function requireReactIs_development () {
    	if (hasRequiredReactIs_development) return reactIs_development;
    	hasRequiredReactIs_development = 1;



    	{
    	  (function() {

    	// The Symbol used to tag the ReactElement-like types. If there is no native Symbol
    	// nor polyfill, then a plain number is used for performance.
    	var hasSymbol = typeof Symbol === 'function' && Symbol.for;
    	var REACT_ELEMENT_TYPE = hasSymbol ? Symbol.for('react.element') : 0xeac7;
    	var REACT_PORTAL_TYPE = hasSymbol ? Symbol.for('react.portal') : 0xeaca;
    	var REACT_FRAGMENT_TYPE = hasSymbol ? Symbol.for('react.fragment') : 0xeacb;
    	var REACT_STRICT_MODE_TYPE = hasSymbol ? Symbol.for('react.strict_mode') : 0xeacc;
    	var REACT_PROFILER_TYPE = hasSymbol ? Symbol.for('react.profiler') : 0xead2;
    	var REACT_PROVIDER_TYPE = hasSymbol ? Symbol.for('react.provider') : 0xeacd;
    	var REACT_CONTEXT_TYPE = hasSymbol ? Symbol.for('react.context') : 0xeace; // TODO: We don't use AsyncMode or ConcurrentMode anymore. They were temporary
    	// (unstable) APIs that have been removed. Can we remove the symbols?

    	var REACT_ASYNC_MODE_TYPE = hasSymbol ? Symbol.for('react.async_mode') : 0xeacf;
    	var REACT_CONCURRENT_MODE_TYPE = hasSymbol ? Symbol.for('react.concurrent_mode') : 0xeacf;
    	var REACT_FORWARD_REF_TYPE = hasSymbol ? Symbol.for('react.forward_ref') : 0xead0;
    	var REACT_SUSPENSE_TYPE = hasSymbol ? Symbol.for('react.suspense') : 0xead1;
    	var REACT_SUSPENSE_LIST_TYPE = hasSymbol ? Symbol.for('react.suspense_list') : 0xead8;
    	var REACT_MEMO_TYPE = hasSymbol ? Symbol.for('react.memo') : 0xead3;
    	var REACT_LAZY_TYPE = hasSymbol ? Symbol.for('react.lazy') : 0xead4;
    	var REACT_BLOCK_TYPE = hasSymbol ? Symbol.for('react.block') : 0xead9;
    	var REACT_FUNDAMENTAL_TYPE = hasSymbol ? Symbol.for('react.fundamental') : 0xead5;
    	var REACT_RESPONDER_TYPE = hasSymbol ? Symbol.for('react.responder') : 0xead6;
    	var REACT_SCOPE_TYPE = hasSymbol ? Symbol.for('react.scope') : 0xead7;

    	function isValidElementType(type) {
    	  return typeof type === 'string' || typeof type === 'function' || // Note: its typeof might be other than 'symbol' or 'number' if it's a polyfill.
    	  type === REACT_FRAGMENT_TYPE || type === REACT_CONCURRENT_MODE_TYPE || type === REACT_PROFILER_TYPE || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || typeof type === 'object' && type !== null && (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || type.$$typeof === REACT_FUNDAMENTAL_TYPE || type.$$typeof === REACT_RESPONDER_TYPE || type.$$typeof === REACT_SCOPE_TYPE || type.$$typeof === REACT_BLOCK_TYPE);
    	}

    	function typeOf(object) {
    	  if (typeof object === 'object' && object !== null) {
    	    var $$typeof = object.$$typeof;

    	    switch ($$typeof) {
    	      case REACT_ELEMENT_TYPE:
    	        var type = object.type;

    	        switch (type) {
    	          case REACT_ASYNC_MODE_TYPE:
    	          case REACT_CONCURRENT_MODE_TYPE:
    	          case REACT_FRAGMENT_TYPE:
    	          case REACT_PROFILER_TYPE:
    	          case REACT_STRICT_MODE_TYPE:
    	          case REACT_SUSPENSE_TYPE:
    	            return type;

    	          default:
    	            var $$typeofType = type && type.$$typeof;

    	            switch ($$typeofType) {
    	              case REACT_CONTEXT_TYPE:
    	              case REACT_FORWARD_REF_TYPE:
    	              case REACT_LAZY_TYPE:
    	              case REACT_MEMO_TYPE:
    	              case REACT_PROVIDER_TYPE:
    	                return $$typeofType;

    	              default:
    	                return $$typeof;
    	            }

    	        }

    	      case REACT_PORTAL_TYPE:
    	        return $$typeof;
    	    }
    	  }

    	  return undefined;
    	} // AsyncMode is deprecated along with isAsyncMode

    	var AsyncMode = REACT_ASYNC_MODE_TYPE;
    	var ConcurrentMode = REACT_CONCURRENT_MODE_TYPE;
    	var ContextConsumer = REACT_CONTEXT_TYPE;
    	var ContextProvider = REACT_PROVIDER_TYPE;
    	var Element = REACT_ELEMENT_TYPE;
    	var ForwardRef = REACT_FORWARD_REF_TYPE;
    	var Fragment = REACT_FRAGMENT_TYPE;
    	var Lazy = REACT_LAZY_TYPE;
    	var Memo = REACT_MEMO_TYPE;
    	var Portal = REACT_PORTAL_TYPE;
    	var Profiler = REACT_PROFILER_TYPE;
    	var StrictMode = REACT_STRICT_MODE_TYPE;
    	var Suspense = REACT_SUSPENSE_TYPE;
    	var hasWarnedAboutDeprecatedIsAsyncMode = false; // AsyncMode should be deprecated

    	function isAsyncMode(object) {
    	  {
    	    if (!hasWarnedAboutDeprecatedIsAsyncMode) {
    	      hasWarnedAboutDeprecatedIsAsyncMode = true; // Using console['warn'] to evade Babel and ESLint

    	      console['warn']('The ReactIs.isAsyncMode() alias has been deprecated, ' + 'and will be removed in React 17+. Update your code to use ' + 'ReactIs.isConcurrentMode() instead. It has the exact same API.');
    	    }
    	  }

    	  return isConcurrentMode(object) || typeOf(object) === REACT_ASYNC_MODE_TYPE;
    	}
    	function isConcurrentMode(object) {
    	  return typeOf(object) === REACT_CONCURRENT_MODE_TYPE;
    	}
    	function isContextConsumer(object) {
    	  return typeOf(object) === REACT_CONTEXT_TYPE;
    	}
    	function isContextProvider(object) {
    	  return typeOf(object) === REACT_PROVIDER_TYPE;
    	}
    	function isElement(object) {
    	  return typeof object === 'object' && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
    	}
    	function isForwardRef(object) {
    	  return typeOf(object) === REACT_FORWARD_REF_TYPE;
    	}
    	function isFragment(object) {
    	  return typeOf(object) === REACT_FRAGMENT_TYPE;
    	}
    	function isLazy(object) {
    	  return typeOf(object) === REACT_LAZY_TYPE;
    	}
    	function isMemo(object) {
    	  return typeOf(object) === REACT_MEMO_TYPE;
    	}
    	function isPortal(object) {
    	  return typeOf(object) === REACT_PORTAL_TYPE;
    	}
    	function isProfiler(object) {
    	  return typeOf(object) === REACT_PROFILER_TYPE;
    	}
    	function isStrictMode(object) {
    	  return typeOf(object) === REACT_STRICT_MODE_TYPE;
    	}
    	function isSuspense(object) {
    	  return typeOf(object) === REACT_SUSPENSE_TYPE;
    	}

    	reactIs_development.AsyncMode = AsyncMode;
    	reactIs_development.ConcurrentMode = ConcurrentMode;
    	reactIs_development.ContextConsumer = ContextConsumer;
    	reactIs_development.ContextProvider = ContextProvider;
    	reactIs_development.Element = Element;
    	reactIs_development.ForwardRef = ForwardRef;
    	reactIs_development.Fragment = Fragment;
    	reactIs_development.Lazy = Lazy;
    	reactIs_development.Memo = Memo;
    	reactIs_development.Portal = Portal;
    	reactIs_development.Profiler = Profiler;
    	reactIs_development.StrictMode = StrictMode;
    	reactIs_development.Suspense = Suspense;
    	reactIs_development.isAsyncMode = isAsyncMode;
    	reactIs_development.isConcurrentMode = isConcurrentMode;
    	reactIs_development.isContextConsumer = isContextConsumer;
    	reactIs_development.isContextProvider = isContextProvider;
    	reactIs_development.isElement = isElement;
    	reactIs_development.isForwardRef = isForwardRef;
    	reactIs_development.isFragment = isFragment;
    	reactIs_development.isLazy = isLazy;
    	reactIs_development.isMemo = isMemo;
    	reactIs_development.isPortal = isPortal;
    	reactIs_development.isProfiler = isProfiler;
    	reactIs_development.isStrictMode = isStrictMode;
    	reactIs_development.isSuspense = isSuspense;
    	reactIs_development.isValidElementType = isValidElementType;
    	reactIs_development.typeOf = typeOf;
    	  })();
    	}
    	return reactIs_development;
    }

    var hasRequiredReactIs;

    function requireReactIs () {
    	if (hasRequiredReactIs) return reactIs.exports;
    	hasRequiredReactIs = 1;

    	{
    	  reactIs.exports = requireReactIs_development();
    	}
    	return reactIs.exports;
    }

    var hoistNonReactStatics_cjs;
    var hasRequiredHoistNonReactStatics_cjs;

    function requireHoistNonReactStatics_cjs () {
    	if (hasRequiredHoistNonReactStatics_cjs) return hoistNonReactStatics_cjs;
    	hasRequiredHoistNonReactStatics_cjs = 1;

    	var reactIs = requireReactIs();

    	/**
    	 * Copyright 2015, Yahoo! Inc.
    	 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
    	 */
    	var REACT_STATICS = {
    	  childContextTypes: true,
    	  contextType: true,
    	  contextTypes: true,
    	  defaultProps: true,
    	  displayName: true,
    	  getDefaultProps: true,
    	  getDerivedStateFromError: true,
    	  getDerivedStateFromProps: true,
    	  mixins: true,
    	  propTypes: true,
    	  type: true
    	};
    	var KNOWN_STATICS = {
    	  name: true,
    	  length: true,
    	  prototype: true,
    	  caller: true,
    	  callee: true,
    	  arguments: true,
    	  arity: true
    	};
    	var FORWARD_REF_STATICS = {
    	  '$$typeof': true,
    	  render: true,
    	  defaultProps: true,
    	  displayName: true,
    	  propTypes: true
    	};
    	var MEMO_STATICS = {
    	  '$$typeof': true,
    	  compare: true,
    	  defaultProps: true,
    	  displayName: true,
    	  propTypes: true,
    	  type: true
    	};
    	var TYPE_STATICS = {};
    	TYPE_STATICS[reactIs.ForwardRef] = FORWARD_REF_STATICS;
    	TYPE_STATICS[reactIs.Memo] = MEMO_STATICS;

    	function getStatics(component) {
    	  // React v16.11 and below
    	  if (reactIs.isMemo(component)) {
    	    return MEMO_STATICS;
    	  } // React v16.12 and above


    	  return TYPE_STATICS[component['$$typeof']] || REACT_STATICS;
    	}

    	var defineProperty = Object.defineProperty;
    	var getOwnPropertyNames = Object.getOwnPropertyNames;
    	var getOwnPropertySymbols = Object.getOwnPropertySymbols;
    	var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    	var getPrototypeOf = Object.getPrototypeOf;
    	var objectPrototype = Object.prototype;
    	function hoistNonReactStatics(targetComponent, sourceComponent, blacklist) {
    	  if (typeof sourceComponent !== 'string') {
    	    // don't hoist over string (html) components
    	    if (objectPrototype) {
    	      var inheritedComponent = getPrototypeOf(sourceComponent);

    	      if (inheritedComponent && inheritedComponent !== objectPrototype) {
    	        hoistNonReactStatics(targetComponent, inheritedComponent, blacklist);
    	      }
    	    }

    	    var keys = getOwnPropertyNames(sourceComponent);

    	    if (getOwnPropertySymbols) {
    	      keys = keys.concat(getOwnPropertySymbols(sourceComponent));
    	    }

    	    var targetStatics = getStatics(targetComponent);
    	    var sourceStatics = getStatics(sourceComponent);

    	    for (var i = 0; i < keys.length; ++i) {
    	      var key = keys[i];

    	      if (!KNOWN_STATICS[key] && !(blacklist && blacklist[key]) && !(sourceStatics && sourceStatics[key]) && !(targetStatics && targetStatics[key])) {
    	        var descriptor = getOwnPropertyDescriptor(sourceComponent, key);

    	        try {
    	          // Avoid failures from read-only properties
    	          defineProperty(targetComponent, key, descriptor);
    	        } catch (e) {}
    	      }
    	    }
    	  }

    	  return targetComponent;
    	}

    	hoistNonReactStatics_cjs = hoistNonReactStatics;
    	return hoistNonReactStatics_cjs;
    }

    var hoistNonReactStatics_cjsExports = requireHoistNonReactStatics_cjs();
    var hoistNonReactStatics = /*@__PURE__*/getDefaultExportFromCjs(hoistNonReactStatics_cjsExports);

    function ownKeys$9(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

    function _objectSpread$9(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys$9(Object(source), true).forEach(function (key) { _defineProperty$1(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys$9(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

    var getTheme = function getTheme(outerTheme, theme) {
      if (typeof theme === 'function') {
        var mergedTheme = theme(outerTheme);

        if ((mergedTheme == null || typeof mergedTheme !== 'object' || Array.isArray(mergedTheme))) {
          throw new Error('[ThemeProvider] Please return an object from your theme function, i.e. theme={() => ({})}!');
        }

        return mergedTheme;
      }

      if ((theme == null || typeof theme !== 'object' || Array.isArray(theme))) {
        throw new Error('[ThemeProvider] Please make your theme prop a plain object');
      }

      return _objectSpread$9({}, outerTheme, {}, theme);
    };

    var createCacheWithTheme = weakMemoize(function (outerTheme) {
      return weakMemoize(function (theme) {
        return getTheme(outerTheme, theme);
      });
    });

    var ThemeProvider = function ThemeProvider(props) {
      return /*#__PURE__*/reactExports.createElement(ThemeContext$1.Consumer, null, function (theme) {
        if (props.theme !== theme) {
          theme = createCacheWithTheme(theme)(props.theme);
        }

        return /*#__PURE__*/reactExports.createElement(ThemeContext$1.Provider, {
          value: theme
        }, props.children);
      });
    };

    // should we change this to be forwardRef/withCSSContext style so it doesn't merge with props?
    function withTheme(Component) {
      var componentName = Component.displayName || Component.name || 'Component';

      var render = function render(props, ref) {
        return /*#__PURE__*/reactExports.createElement(ThemeContext$1.Consumer, null, function (theme) {
          return /*#__PURE__*/reactExports.createElement(Component, _extends$1({
            theme: theme,
            ref: ref
          }, props));
        });
      }; // $FlowFixMe


      var WithTheme = /*#__PURE__*/reactExports.forwardRef(render);
      WithTheme.displayName = "WithTheme(" + componentName + ")";
      return hoistNonReactStatics(WithTheme, Component);
    }

    function useTheme() {
      return React.useContext(ThemeContext$1);
    }

    var emotionTheming_browser_esm = /*#__PURE__*/Object.freeze({
        __proto__: null,
        ThemeProvider: ThemeProvider,
        useTheme: useTheme,
        withTheme: withTheme
    });

    var require$$1 = /*@__PURE__*/getAugmentedNamespace(emotionTheming_browser_esm);

    var _default = {};

    var propTypes = {exports: {}};

    /*
    object-assign
    (c) Sindre Sorhus
    @license MIT
    */

    var objectAssign;
    var hasRequiredObjectAssign;

    function requireObjectAssign () {
    	if (hasRequiredObjectAssign) return objectAssign;
    	hasRequiredObjectAssign = 1;
    	/* eslint-disable no-unused-vars */
    	var getOwnPropertySymbols = Object.getOwnPropertySymbols;
    	var hasOwnProperty = Object.prototype.hasOwnProperty;
    	var propIsEnumerable = Object.prototype.propertyIsEnumerable;

    	function toObject(val) {
    		if (val === null || val === undefined) {
    			throw new TypeError('Object.assign cannot be called with null or undefined');
    		}

    		return Object(val);
    	}

    	function shouldUseNative() {
    		try {
    			if (!Object.assign) {
    				return false;
    			}

    			// Detect buggy property enumeration order in older V8 versions.

    			// https://bugs.chromium.org/p/v8/issues/detail?id=4118
    			var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
    			test1[5] = 'de';
    			if (Object.getOwnPropertyNames(test1)[0] === '5') {
    				return false;
    			}

    			// https://bugs.chromium.org/p/v8/issues/detail?id=3056
    			var test2 = {};
    			for (var i = 0; i < 10; i++) {
    				test2['_' + String.fromCharCode(i)] = i;
    			}
    			var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
    				return test2[n];
    			});
    			if (order2.join('') !== '0123456789') {
    				return false;
    			}

    			// https://bugs.chromium.org/p/v8/issues/detail?id=3056
    			var test3 = {};
    			'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
    				test3[letter] = letter;
    			});
    			if (Object.keys(Object.assign({}, test3)).join('') !==
    					'abcdefghijklmnopqrst') {
    				return false;
    			}

    			return true;
    		} catch (err) {
    			// We don't expect any of the above to throw, but better to be safe.
    			return false;
    		}
    	}

    	objectAssign = shouldUseNative() ? Object.assign : function (target, source) {
    		var from;
    		var to = toObject(target);
    		var symbols;

    		for (var s = 1; s < arguments.length; s++) {
    			from = Object(arguments[s]);

    			for (var key in from) {
    				if (hasOwnProperty.call(from, key)) {
    					to[key] = from[key];
    				}
    			}

    			if (getOwnPropertySymbols) {
    				symbols = getOwnPropertySymbols(from);
    				for (var i = 0; i < symbols.length; i++) {
    					if (propIsEnumerable.call(from, symbols[i])) {
    						to[symbols[i]] = from[symbols[i]];
    					}
    				}
    			}
    		}

    		return to;
    	};
    	return objectAssign;
    }

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     */

    var ReactPropTypesSecret_1;
    var hasRequiredReactPropTypesSecret;

    function requireReactPropTypesSecret () {
    	if (hasRequiredReactPropTypesSecret) return ReactPropTypesSecret_1;
    	hasRequiredReactPropTypesSecret = 1;

    	var ReactPropTypesSecret = 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED';

    	ReactPropTypesSecret_1 = ReactPropTypesSecret;
    	return ReactPropTypesSecret_1;
    }

    var has;
    var hasRequiredHas;

    function requireHas () {
    	if (hasRequiredHas) return has;
    	hasRequiredHas = 1;
    	has = Function.call.bind(Object.prototype.hasOwnProperty);
    	return has;
    }

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     */

    var checkPropTypes_1;
    var hasRequiredCheckPropTypes;

    function requireCheckPropTypes () {
    	if (hasRequiredCheckPropTypes) return checkPropTypes_1;
    	hasRequiredCheckPropTypes = 1;

    	var printWarning = function() {};

    	{
    	  var ReactPropTypesSecret = /*@__PURE__*/ requireReactPropTypesSecret();
    	  var loggedTypeFailures = {};
    	  var has = /*@__PURE__*/ requireHas();

    	  printWarning = function(text) {
    	    var message = 'Warning: ' + text;
    	    if (typeof console !== 'undefined') {
    	      console.error(message);
    	    }
    	    try {
    	      // --- Welcome to debugging React ---
    	      // This error was thrown as a convenience so that you can use this stack
    	      // to find the callsite that caused this warning to fire.
    	      throw new Error(message);
    	    } catch (x) { /**/ }
    	  };
    	}

    	/**
    	 * Assert that the values match with the type specs.
    	 * Error messages are memorized and will only be shown once.
    	 *
    	 * @param {object} typeSpecs Map of name to a ReactPropType
    	 * @param {object} values Runtime values that need to be type-checked
    	 * @param {string} location e.g. "prop", "context", "child context"
    	 * @param {string} componentName Name of the component for error messages.
    	 * @param {?Function} getStack Returns the component stack.
    	 * @private
    	 */
    	function checkPropTypes(typeSpecs, values, location, componentName, getStack) {
    	  {
    	    for (var typeSpecName in typeSpecs) {
    	      if (has(typeSpecs, typeSpecName)) {
    	        var error;
    	        // Prop type validation may throw. In case they do, we don't want to
    	        // fail the render phase where it didn't fail before. So we log it.
    	        // After these have been cleaned up, we'll let them throw.
    	        try {
    	          // This is intentionally an invariant that gets caught. It's the same
    	          // behavior as without this statement except with a better message.
    	          if (typeof typeSpecs[typeSpecName] !== 'function') {
    	            var err = Error(
    	              (componentName || 'React class') + ': ' + location + ' type `' + typeSpecName + '` is invalid; ' +
    	              'it must be a function, usually from the `prop-types` package, but received `' + typeof typeSpecs[typeSpecName] + '`.' +
    	              'This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.'
    	            );
    	            err.name = 'Invariant Violation';
    	            throw err;
    	          }
    	          error = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, ReactPropTypesSecret);
    	        } catch (ex) {
    	          error = ex;
    	        }
    	        if (error && !(error instanceof Error)) {
    	          printWarning(
    	            (componentName || 'React class') + ': type specification of ' +
    	            location + ' `' + typeSpecName + '` is invalid; the type checker ' +
    	            'function must return `null` or an `Error` but returned a ' + typeof error + '. ' +
    	            'You may have forgotten to pass an argument to the type checker ' +
    	            'creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and ' +
    	            'shape all require an argument).'
    	          );
    	        }
    	        if (error instanceof Error && !(error.message in loggedTypeFailures)) {
    	          // Only monitor this failure once because there tends to be a lot of the
    	          // same error.
    	          loggedTypeFailures[error.message] = true;

    	          var stack = getStack ? getStack() : '';

    	          printWarning(
    	            'Failed ' + location + ' type: ' + error.message + (stack != null ? stack : '')
    	          );
    	        }
    	      }
    	    }
    	  }
    	}

    	/**
    	 * Resets warning cache when testing.
    	 *
    	 * @private
    	 */
    	checkPropTypes.resetWarningCache = function() {
    	  {
    	    loggedTypeFailures = {};
    	  }
    	};

    	checkPropTypes_1 = checkPropTypes;
    	return checkPropTypes_1;
    }

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     */

    var factoryWithTypeCheckers;
    var hasRequiredFactoryWithTypeCheckers;

    function requireFactoryWithTypeCheckers () {
    	if (hasRequiredFactoryWithTypeCheckers) return factoryWithTypeCheckers;
    	hasRequiredFactoryWithTypeCheckers = 1;

    	var ReactIs = requireReactIs();
    	var assign = requireObjectAssign();

    	var ReactPropTypesSecret = /*@__PURE__*/ requireReactPropTypesSecret();
    	var has = /*@__PURE__*/ requireHas();
    	var checkPropTypes = /*@__PURE__*/ requireCheckPropTypes();

    	var printWarning = function() {};

    	{
    	  printWarning = function(text) {
    	    var message = 'Warning: ' + text;
    	    if (typeof console !== 'undefined') {
    	      console.error(message);
    	    }
    	    try {
    	      // --- Welcome to debugging React ---
    	      // This error was thrown as a convenience so that you can use this stack
    	      // to find the callsite that caused this warning to fire.
    	      throw new Error(message);
    	    } catch (x) {}
    	  };
    	}

    	function emptyFunctionThatReturnsNull() {
    	  return null;
    	}

    	factoryWithTypeCheckers = function(isValidElement, throwOnDirectAccess) {
    	  /* global Symbol */
    	  var ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
    	  var FAUX_ITERATOR_SYMBOL = '@@iterator'; // Before Symbol spec.

    	  /**
    	   * Returns the iterator method function contained on the iterable object.
    	   *
    	   * Be sure to invoke the function with the iterable as context:
    	   *
    	   *     var iteratorFn = getIteratorFn(myIterable);
    	   *     if (iteratorFn) {
    	   *       var iterator = iteratorFn.call(myIterable);
    	   *       ...
    	   *     }
    	   *
    	   * @param {?object} maybeIterable
    	   * @return {?function}
    	   */
    	  function getIteratorFn(maybeIterable) {
    	    var iteratorFn = maybeIterable && (ITERATOR_SYMBOL && maybeIterable[ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL]);
    	    if (typeof iteratorFn === 'function') {
    	      return iteratorFn;
    	    }
    	  }

    	  /**
    	   * Collection of methods that allow declaration and validation of props that are
    	   * supplied to React components. Example usage:
    	   *
    	   *   var Props = require('ReactPropTypes');
    	   *   var MyArticle = React.createClass({
    	   *     propTypes: {
    	   *       // An optional string prop named "description".
    	   *       description: Props.string,
    	   *
    	   *       // A required enum prop named "category".
    	   *       category: Props.oneOf(['News','Photos']).isRequired,
    	   *
    	   *       // A prop named "dialog" that requires an instance of Dialog.
    	   *       dialog: Props.instanceOf(Dialog).isRequired
    	   *     },
    	   *     render: function() { ... }
    	   *   });
    	   *
    	   * A more formal specification of how these methods are used:
    	   *
    	   *   type := array|bool|func|object|number|string|oneOf([...])|instanceOf(...)
    	   *   decl := ReactPropTypes.{type}(.isRequired)?
    	   *
    	   * Each and every declaration produces a function with the same signature. This
    	   * allows the creation of custom validation functions. For example:
    	   *
    	   *  var MyLink = React.createClass({
    	   *    propTypes: {
    	   *      // An optional string or URI prop named "href".
    	   *      href: function(props, propName, componentName) {
    	   *        var propValue = props[propName];
    	   *        if (propValue != null && typeof propValue !== 'string' &&
    	   *            !(propValue instanceof URI)) {
    	   *          return new Error(
    	   *            'Expected a string or an URI for ' + propName + ' in ' +
    	   *            componentName
    	   *          );
    	   *        }
    	   *      }
    	   *    },
    	   *    render: function() {...}
    	   *  });
    	   *
    	   * @internal
    	   */

    	  var ANONYMOUS = '<<anonymous>>';

    	  // Important!
    	  // Keep this list in sync with production version in `./factoryWithThrowingShims.js`.
    	  var ReactPropTypes = {
    	    array: createPrimitiveTypeChecker('array'),
    	    bigint: createPrimitiveTypeChecker('bigint'),
    	    bool: createPrimitiveTypeChecker('boolean'),
    	    func: createPrimitiveTypeChecker('function'),
    	    number: createPrimitiveTypeChecker('number'),
    	    object: createPrimitiveTypeChecker('object'),
    	    string: createPrimitiveTypeChecker('string'),
    	    symbol: createPrimitiveTypeChecker('symbol'),

    	    any: createAnyTypeChecker(),
    	    arrayOf: createArrayOfTypeChecker,
    	    element: createElementTypeChecker(),
    	    elementType: createElementTypeTypeChecker(),
    	    instanceOf: createInstanceTypeChecker,
    	    node: createNodeChecker(),
    	    objectOf: createObjectOfTypeChecker,
    	    oneOf: createEnumTypeChecker,
    	    oneOfType: createUnionTypeChecker,
    	    shape: createShapeTypeChecker,
    	    exact: createStrictShapeTypeChecker,
    	  };

    	  /**
    	   * inlined Object.is polyfill to avoid requiring consumers ship their own
    	   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
    	   */
    	  /*eslint-disable no-self-compare*/
    	  function is(x, y) {
    	    // SameValue algorithm
    	    if (x === y) {
    	      // Steps 1-5, 7-10
    	      // Steps 6.b-6.e: +0 != -0
    	      return x !== 0 || 1 / x === 1 / y;
    	    } else {
    	      // Step 6.a: NaN == NaN
    	      return x !== x && y !== y;
    	    }
    	  }
    	  /*eslint-enable no-self-compare*/

    	  /**
    	   * We use an Error-like object for backward compatibility as people may call
    	   * PropTypes directly and inspect their output. However, we don't use real
    	   * Errors anymore. We don't inspect their stack anyway, and creating them
    	   * is prohibitively expensive if they are created too often, such as what
    	   * happens in oneOfType() for any type before the one that matched.
    	   */
    	  function PropTypeError(message, data) {
    	    this.message = message;
    	    this.data = data && typeof data === 'object' ? data: {};
    	    this.stack = '';
    	  }
    	  // Make `instanceof Error` still work for returned errors.
    	  PropTypeError.prototype = Error.prototype;

    	  function createChainableTypeChecker(validate) {
    	    {
    	      var manualPropTypeCallCache = {};
    	      var manualPropTypeWarningCount = 0;
    	    }
    	    function checkType(isRequired, props, propName, componentName, location, propFullName, secret) {
    	      componentName = componentName || ANONYMOUS;
    	      propFullName = propFullName || propName;

    	      if (secret !== ReactPropTypesSecret) {
    	        if (throwOnDirectAccess) {
    	          // New behavior only for users of `prop-types` package
    	          var err = new Error(
    	            'Calling PropTypes validators directly is not supported by the `prop-types` package. ' +
    	            'Use `PropTypes.checkPropTypes()` to call them. ' +
    	            'Read more at http://fb.me/use-check-prop-types'
    	          );
    	          err.name = 'Invariant Violation';
    	          throw err;
    	        } else if (typeof console !== 'undefined') {
    	          // Old behavior for people using React.PropTypes
    	          var cacheKey = componentName + ':' + propName;
    	          if (
    	            !manualPropTypeCallCache[cacheKey] &&
    	            // Avoid spamming the console because they are often not actionable except for lib authors
    	            manualPropTypeWarningCount < 3
    	          ) {
    	            printWarning(
    	              'You are manually calling a React.PropTypes validation ' +
    	              'function for the `' + propFullName + '` prop on `' + componentName + '`. This is deprecated ' +
    	              'and will throw in the standalone `prop-types` package. ' +
    	              'You may be seeing this warning due to a third-party PropTypes ' +
    	              'library. See https://fb.me/react-warning-dont-call-proptypes ' + 'for details.'
    	            );
    	            manualPropTypeCallCache[cacheKey] = true;
    	            manualPropTypeWarningCount++;
    	          }
    	        }
    	      }
    	      if (props[propName] == null) {
    	        if (isRequired) {
    	          if (props[propName] === null) {
    	            return new PropTypeError('The ' + location + ' `' + propFullName + '` is marked as required ' + ('in `' + componentName + '`, but its value is `null`.'));
    	          }
    	          return new PropTypeError('The ' + location + ' `' + propFullName + '` is marked as required in ' + ('`' + componentName + '`, but its value is `undefined`.'));
    	        }
    	        return null;
    	      } else {
    	        return validate(props, propName, componentName, location, propFullName);
    	      }
    	    }

    	    var chainedCheckType = checkType.bind(null, false);
    	    chainedCheckType.isRequired = checkType.bind(null, true);

    	    return chainedCheckType;
    	  }

    	  function createPrimitiveTypeChecker(expectedType) {
    	    function validate(props, propName, componentName, location, propFullName, secret) {
    	      var propValue = props[propName];
    	      var propType = getPropType(propValue);
    	      if (propType !== expectedType) {
    	        // `propValue` being instance of, say, date/regexp, pass the 'object'
    	        // check, but we can offer a more precise error message here rather than
    	        // 'of type `object`'.
    	        var preciseType = getPreciseType(propValue);

    	        return new PropTypeError(
    	          'Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + preciseType + '` supplied to `' + componentName + '`, expected ') + ('`' + expectedType + '`.'),
    	          {expectedType: expectedType}
    	        );
    	      }
    	      return null;
    	    }
    	    return createChainableTypeChecker(validate);
    	  }

    	  function createAnyTypeChecker() {
    	    return createChainableTypeChecker(emptyFunctionThatReturnsNull);
    	  }

    	  function createArrayOfTypeChecker(typeChecker) {
    	    function validate(props, propName, componentName, location, propFullName) {
    	      if (typeof typeChecker !== 'function') {
    	        return new PropTypeError('Property `' + propFullName + '` of component `' + componentName + '` has invalid PropType notation inside arrayOf.');
    	      }
    	      var propValue = props[propName];
    	      if (!Array.isArray(propValue)) {
    	        var propType = getPropType(propValue);
    	        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + propType + '` supplied to `' + componentName + '`, expected an array.'));
    	      }
    	      for (var i = 0; i < propValue.length; i++) {
    	        var error = typeChecker(propValue, i, componentName, location, propFullName + '[' + i + ']', ReactPropTypesSecret);
    	        if (error instanceof Error) {
    	          return error;
    	        }
    	      }
    	      return null;
    	    }
    	    return createChainableTypeChecker(validate);
    	  }

    	  function createElementTypeChecker() {
    	    function validate(props, propName, componentName, location, propFullName) {
    	      var propValue = props[propName];
    	      if (!isValidElement(propValue)) {
    	        var propType = getPropType(propValue);
    	        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + propType + '` supplied to `' + componentName + '`, expected a single ReactElement.'));
    	      }
    	      return null;
    	    }
    	    return createChainableTypeChecker(validate);
    	  }

    	  function createElementTypeTypeChecker() {
    	    function validate(props, propName, componentName, location, propFullName) {
    	      var propValue = props[propName];
    	      if (!ReactIs.isValidElementType(propValue)) {
    	        var propType = getPropType(propValue);
    	        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + propType + '` supplied to `' + componentName + '`, expected a single ReactElement type.'));
    	      }
    	      return null;
    	    }
    	    return createChainableTypeChecker(validate);
    	  }

    	  function createInstanceTypeChecker(expectedClass) {
    	    function validate(props, propName, componentName, location, propFullName) {
    	      if (!(props[propName] instanceof expectedClass)) {
    	        var expectedClassName = expectedClass.name || ANONYMOUS;
    	        var actualClassName = getClassName(props[propName]);
    	        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + actualClassName + '` supplied to `' + componentName + '`, expected ') + ('instance of `' + expectedClassName + '`.'));
    	      }
    	      return null;
    	    }
    	    return createChainableTypeChecker(validate);
    	  }

    	  function createEnumTypeChecker(expectedValues) {
    	    if (!Array.isArray(expectedValues)) {
    	      {
    	        if (arguments.length > 1) {
    	          printWarning(
    	            'Invalid arguments supplied to oneOf, expected an array, got ' + arguments.length + ' arguments. ' +
    	            'A common mistake is to write oneOf(x, y, z) instead of oneOf([x, y, z]).'
    	          );
    	        } else {
    	          printWarning('Invalid argument supplied to oneOf, expected an array.');
    	        }
    	      }
    	      return emptyFunctionThatReturnsNull;
    	    }

    	    function validate(props, propName, componentName, location, propFullName) {
    	      var propValue = props[propName];
    	      for (var i = 0; i < expectedValues.length; i++) {
    	        if (is(propValue, expectedValues[i])) {
    	          return null;
    	        }
    	      }

    	      var valuesString = JSON.stringify(expectedValues, function replacer(key, value) {
    	        var type = getPreciseType(value);
    	        if (type === 'symbol') {
    	          return String(value);
    	        }
    	        return value;
    	      });
    	      return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of value `' + String(propValue) + '` ' + ('supplied to `' + componentName + '`, expected one of ' + valuesString + '.'));
    	    }
    	    return createChainableTypeChecker(validate);
    	  }

    	  function createObjectOfTypeChecker(typeChecker) {
    	    function validate(props, propName, componentName, location, propFullName) {
    	      if (typeof typeChecker !== 'function') {
    	        return new PropTypeError('Property `' + propFullName + '` of component `' + componentName + '` has invalid PropType notation inside objectOf.');
    	      }
    	      var propValue = props[propName];
    	      var propType = getPropType(propValue);
    	      if (propType !== 'object') {
    	        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + propType + '` supplied to `' + componentName + '`, expected an object.'));
    	      }
    	      for (var key in propValue) {
    	        if (has(propValue, key)) {
    	          var error = typeChecker(propValue, key, componentName, location, propFullName + '.' + key, ReactPropTypesSecret);
    	          if (error instanceof Error) {
    	            return error;
    	          }
    	        }
    	      }
    	      return null;
    	    }
    	    return createChainableTypeChecker(validate);
    	  }

    	  function createUnionTypeChecker(arrayOfTypeCheckers) {
    	    if (!Array.isArray(arrayOfTypeCheckers)) {
    	      printWarning('Invalid argument supplied to oneOfType, expected an instance of array.') ;
    	      return emptyFunctionThatReturnsNull;
    	    }

    	    for (var i = 0; i < arrayOfTypeCheckers.length; i++) {
    	      var checker = arrayOfTypeCheckers[i];
    	      if (typeof checker !== 'function') {
    	        printWarning(
    	          'Invalid argument supplied to oneOfType. Expected an array of check functions, but ' +
    	          'received ' + getPostfixForTypeWarning(checker) + ' at index ' + i + '.'
    	        );
    	        return emptyFunctionThatReturnsNull;
    	      }
    	    }

    	    function validate(props, propName, componentName, location, propFullName) {
    	      var expectedTypes = [];
    	      for (var i = 0; i < arrayOfTypeCheckers.length; i++) {
    	        var checker = arrayOfTypeCheckers[i];
    	        var checkerResult = checker(props, propName, componentName, location, propFullName, ReactPropTypesSecret);
    	        if (checkerResult == null) {
    	          return null;
    	        }
    	        if (checkerResult.data && has(checkerResult.data, 'expectedType')) {
    	          expectedTypes.push(checkerResult.data.expectedType);
    	        }
    	      }
    	      var expectedTypesMessage = (expectedTypes.length > 0) ? ', expected one of type [' + expectedTypes.join(', ') + ']': '';
    	      return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` supplied to ' + ('`' + componentName + '`' + expectedTypesMessage + '.'));
    	    }
    	    return createChainableTypeChecker(validate);
    	  }

    	  function createNodeChecker() {
    	    function validate(props, propName, componentName, location, propFullName) {
    	      if (!isNode(props[propName])) {
    	        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` supplied to ' + ('`' + componentName + '`, expected a ReactNode.'));
    	      }
    	      return null;
    	    }
    	    return createChainableTypeChecker(validate);
    	  }

    	  function invalidValidatorError(componentName, location, propFullName, key, type) {
    	    return new PropTypeError(
    	      (componentName || 'React class') + ': ' + location + ' type `' + propFullName + '.' + key + '` is invalid; ' +
    	      'it must be a function, usually from the `prop-types` package, but received `' + type + '`.'
    	    );
    	  }

    	  function createShapeTypeChecker(shapeTypes) {
    	    function validate(props, propName, componentName, location, propFullName) {
    	      var propValue = props[propName];
    	      var propType = getPropType(propValue);
    	      if (propType !== 'object') {
    	        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type `' + propType + '` ' + ('supplied to `' + componentName + '`, expected `object`.'));
    	      }
    	      for (var key in shapeTypes) {
    	        var checker = shapeTypes[key];
    	        if (typeof checker !== 'function') {
    	          return invalidValidatorError(componentName, location, propFullName, key, getPreciseType(checker));
    	        }
    	        var error = checker(propValue, key, componentName, location, propFullName + '.' + key, ReactPropTypesSecret);
    	        if (error) {
    	          return error;
    	        }
    	      }
    	      return null;
    	    }
    	    return createChainableTypeChecker(validate);
    	  }

    	  function createStrictShapeTypeChecker(shapeTypes) {
    	    function validate(props, propName, componentName, location, propFullName) {
    	      var propValue = props[propName];
    	      var propType = getPropType(propValue);
    	      if (propType !== 'object') {
    	        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type `' + propType + '` ' + ('supplied to `' + componentName + '`, expected `object`.'));
    	      }
    	      // We need to check all keys in case some are required but missing from props.
    	      var allKeys = assign({}, props[propName], shapeTypes);
    	      for (var key in allKeys) {
    	        var checker = shapeTypes[key];
    	        if (has(shapeTypes, key) && typeof checker !== 'function') {
    	          return invalidValidatorError(componentName, location, propFullName, key, getPreciseType(checker));
    	        }
    	        if (!checker) {
    	          return new PropTypeError(
    	            'Invalid ' + location + ' `' + propFullName + '` key `' + key + '` supplied to `' + componentName + '`.' +
    	            '\nBad object: ' + JSON.stringify(props[propName], null, '  ') +
    	            '\nValid keys: ' + JSON.stringify(Object.keys(shapeTypes), null, '  ')
    	          );
    	        }
    	        var error = checker(propValue, key, componentName, location, propFullName + '.' + key, ReactPropTypesSecret);
    	        if (error) {
    	          return error;
    	        }
    	      }
    	      return null;
    	    }

    	    return createChainableTypeChecker(validate);
    	  }

    	  function isNode(propValue) {
    	    switch (typeof propValue) {
    	      case 'number':
    	      case 'string':
    	      case 'undefined':
    	        return true;
    	      case 'boolean':
    	        return !propValue;
    	      case 'object':
    	        if (Array.isArray(propValue)) {
    	          return propValue.every(isNode);
    	        }
    	        if (propValue === null || isValidElement(propValue)) {
    	          return true;
    	        }

    	        var iteratorFn = getIteratorFn(propValue);
    	        if (iteratorFn) {
    	          var iterator = iteratorFn.call(propValue);
    	          var step;
    	          if (iteratorFn !== propValue.entries) {
    	            while (!(step = iterator.next()).done) {
    	              if (!isNode(step.value)) {
    	                return false;
    	              }
    	            }
    	          } else {
    	            // Iterator will provide entry [k,v] tuples rather than values.
    	            while (!(step = iterator.next()).done) {
    	              var entry = step.value;
    	              if (entry) {
    	                if (!isNode(entry[1])) {
    	                  return false;
    	                }
    	              }
    	            }
    	          }
    	        } else {
    	          return false;
    	        }

    	        return true;
    	      default:
    	        return false;
    	    }
    	  }

    	  function isSymbol(propType, propValue) {
    	    // Native Symbol.
    	    if (propType === 'symbol') {
    	      return true;
    	    }

    	    // falsy value can't be a Symbol
    	    if (!propValue) {
    	      return false;
    	    }

    	    // 19.4.3.5 Symbol.prototype[@@toStringTag] === 'Symbol'
    	    if (propValue['@@toStringTag'] === 'Symbol') {
    	      return true;
    	    }

    	    // Fallback for non-spec compliant Symbols which are polyfilled.
    	    if (typeof Symbol === 'function' && propValue instanceof Symbol) {
    	      return true;
    	    }

    	    return false;
    	  }

    	  // Equivalent of `typeof` but with special handling for array and regexp.
    	  function getPropType(propValue) {
    	    var propType = typeof propValue;
    	    if (Array.isArray(propValue)) {
    	      return 'array';
    	    }
    	    if (propValue instanceof RegExp) {
    	      // Old webkits (at least until Android 4.0) return 'function' rather than
    	      // 'object' for typeof a RegExp. We'll normalize this here so that /bla/
    	      // passes PropTypes.object.
    	      return 'object';
    	    }
    	    if (isSymbol(propType, propValue)) {
    	      return 'symbol';
    	    }
    	    return propType;
    	  }

    	  // This handles more types than `getPropType`. Only used for error messages.
    	  // See `createPrimitiveTypeChecker`.
    	  function getPreciseType(propValue) {
    	    if (typeof propValue === 'undefined' || propValue === null) {
    	      return '' + propValue;
    	    }
    	    var propType = getPropType(propValue);
    	    if (propType === 'object') {
    	      if (propValue instanceof Date) {
    	        return 'date';
    	      } else if (propValue instanceof RegExp) {
    	        return 'regexp';
    	      }
    	    }
    	    return propType;
    	  }

    	  // Returns a string that is postfixed to a warning about an invalid type.
    	  // For example, "undefined" or "of type array"
    	  function getPostfixForTypeWarning(value) {
    	    var type = getPreciseType(value);
    	    switch (type) {
    	      case 'array':
    	      case 'object':
    	        return 'an ' + type;
    	      case 'boolean':
    	      case 'date':
    	      case 'regexp':
    	        return 'a ' + type;
    	      default:
    	        return type;
    	    }
    	  }

    	  // Returns class name of the object, if any.
    	  function getClassName(propValue) {
    	    if (!propValue.constructor || !propValue.constructor.name) {
    	      return ANONYMOUS;
    	    }
    	    return propValue.constructor.name;
    	  }

    	  ReactPropTypes.checkPropTypes = checkPropTypes;
    	  ReactPropTypes.resetWarningCache = checkPropTypes.resetWarningCache;
    	  ReactPropTypes.PropTypes = ReactPropTypes;

    	  return ReactPropTypes;
    	};
    	return factoryWithTypeCheckers;
    }

    /**
     * Copyright (c) 2013-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     */

    var hasRequiredPropTypes;

    function requirePropTypes () {
    	if (hasRequiredPropTypes) return propTypes.exports;
    	hasRequiredPropTypes = 1;
    	{
    	  var ReactIs = requireReactIs();

    	  // By explicitly using `prop-types` you are opting into new development behavior.
    	  // http://fb.me/prop-types-in-prod
    	  var throwOnDirectAccess = true;
    	  propTypes.exports = /*@__PURE__*/ requireFactoryWithTypeCheckers()(ReactIs.isElement, throwOnDirectAccess);
    	}
    	return propTypes.exports;
    }

    var propTypesExports = /*@__PURE__*/ requirePropTypes();
    var PropTypes = /*@__PURE__*/getDefaultExportFromCjs(propTypesExports);

    var isObject;
    var hasRequiredIsObject;

    function requireIsObject () {
    	if (hasRequiredIsObject) return isObject;
    	hasRequiredIsObject = 1;

    	isObject = function isObject(x) {
    		return typeof x === 'object' && x !== null;
    	};
    	return isObject;
    }

    var isWindow;
    var hasRequiredIsWindow;

    function requireIsWindow () {
    	if (hasRequiredIsWindow) return isWindow;
    	hasRequiredIsWindow = 1;

    	isWindow = function (obj) {

    	  if (obj == null) {
    	    return false;
    	  }

    	  var o = Object(obj);

    	  return o === o.window;
    	};
    	return isWindow;
    }

    var isDom;
    var hasRequiredIsDom;

    function requireIsDom () {
    	if (hasRequiredIsDom) return isDom;
    	hasRequiredIsDom = 1;
    	var isObject = requireIsObject();
    	var isWindow = requireIsWindow();

    	function isNode (val) {
    	  if (!isObject(val) || !isWindow(window) || typeof window.Node !== 'function') {
    	    return false
    	  }

    	  return typeof val.nodeType === 'number' &&
    	    typeof val.nodeName === 'string'
    	}

    	isDom = isNode;
    	return isDom;
    }

    var isDomExports = requireIsDom();
    var isDOM = /*@__PURE__*/getDefaultExportFromCjs(isDomExports);

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var _extends_1 = createCommonjsModule(function (module) {
      function _extends() {
        module.exports = _extends = Object.assign || function (target) {
          for (var i = 1; i < arguments.length; i++) {
            var source = arguments[i];
            for (var key in source) {
              if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
              }
            }
          }
          return target;
        };
        module.exports["default"] = module.exports, module.exports.__esModule = true;
        return _extends.apply(this, arguments);
      }
      module.exports = _extends;
      module.exports["default"] = module.exports, module.exports.__esModule = true;
    });
    var _extends = unwrapExports(_extends_1);

    var objectWithoutPropertiesLoose = createCommonjsModule(function (module) {
      function _objectWithoutPropertiesLoose(source, excluded) {
        if (source == null) return {};
        var target = {};
        var sourceKeys = Object.keys(source);
        var key, i;
        for (i = 0; i < sourceKeys.length; i++) {
          key = sourceKeys[i];
          if (excluded.indexOf(key) >= 0) continue;
          target[key] = source[key];
        }
        return target;
      }
      module.exports = _objectWithoutPropertiesLoose;
      module.exports["default"] = module.exports, module.exports.__esModule = true;
    });
    unwrapExports(objectWithoutPropertiesLoose);

    var objectWithoutProperties = createCommonjsModule(function (module) {
      function _objectWithoutProperties(source, excluded) {
        if (source == null) return {};
        var target = objectWithoutPropertiesLoose(source, excluded);
        var key, i;
        if (Object.getOwnPropertySymbols) {
          var sourceSymbolKeys = Object.getOwnPropertySymbols(source);
          for (i = 0; i < sourceSymbolKeys.length; i++) {
            key = sourceSymbolKeys[i];
            if (excluded.indexOf(key) >= 0) continue;
            if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
            target[key] = source[key];
          }
        }
        return target;
      }
      module.exports = _objectWithoutProperties;
      module.exports["default"] = module.exports, module.exports.__esModule = true;
    });
    var _objectWithoutProperties = unwrapExports(objectWithoutProperties);

    var theme$1 = {
      BASE_FONT_FAMILY: 'Menlo, monospace',
      BASE_FONT_SIZE: '11px',
      BASE_LINE_HEIGHT: 1.2,
      BASE_BACKGROUND_COLOR: 'rgb(36, 36, 36)',
      BASE_COLOR: 'rgb(213, 213, 213)',
      OBJECT_PREVIEW_ARRAY_MAX_PROPERTIES: 10,
      OBJECT_PREVIEW_OBJECT_MAX_PROPERTIES: 5,
      OBJECT_NAME_COLOR: 'rgb(227, 110, 236)',
      OBJECT_VALUE_NULL_COLOR: 'rgb(127, 127, 127)',
      OBJECT_VALUE_UNDEFINED_COLOR: 'rgb(127, 127, 127)',
      OBJECT_VALUE_REGEXP_COLOR: 'rgb(233, 63, 59)',
      OBJECT_VALUE_STRING_COLOR: 'rgb(233, 63, 59)',
      OBJECT_VALUE_SYMBOL_COLOR: 'rgb(233, 63, 59)',
      OBJECT_VALUE_NUMBER_COLOR: 'hsl(252, 100%, 75%)',
      OBJECT_VALUE_BOOLEAN_COLOR: 'hsl(252, 100%, 75%)',
      OBJECT_VALUE_FUNCTION_PREFIX_COLOR: 'rgb(85, 106, 242)',
      HTML_TAG_COLOR: 'rgb(93, 176, 215)',
      HTML_TAGNAME_COLOR: 'rgb(93, 176, 215)',
      HTML_TAGNAME_TEXT_TRANSFORM: 'lowercase',
      HTML_ATTRIBUTE_NAME_COLOR: 'rgb(155, 187, 220)',
      HTML_ATTRIBUTE_VALUE_COLOR: 'rgb(242, 151, 102)',
      HTML_COMMENT_COLOR: 'rgb(137, 137, 137)',
      HTML_DOCTYPE_COLOR: 'rgb(192, 192, 192)',
      ARROW_COLOR: 'rgb(145, 145, 145)',
      ARROW_MARGIN_RIGHT: 3,
      ARROW_FONT_SIZE: 12,
      ARROW_ANIMATION_DURATION: '0',
      TREENODE_FONT_FAMILY: 'Menlo, monospace',
      TREENODE_FONT_SIZE: '11px',
      TREENODE_LINE_HEIGHT: 1.2,
      TREENODE_PADDING_LEFT: 12,
      TABLE_BORDER_COLOR: 'rgb(85, 85, 85)',
      TABLE_TH_BACKGROUND_COLOR: 'rgb(44, 44, 44)',
      TABLE_TH_HOVER_COLOR: 'rgb(48, 48, 48)',
      TABLE_SORT_ICON_COLOR: 'black',
      TABLE_DATA_BACKGROUND_IMAGE: 'linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0) 50%, rgba(51, 139, 255, 0.0980392) 50%, rgba(51, 139, 255, 0.0980392))',
      TABLE_DATA_BACKGROUND_SIZE: '128px 32px'
    };

    var theme$2 = {
      BASE_FONT_FAMILY: 'Menlo, monospace',
      BASE_FONT_SIZE: '11px',
      BASE_LINE_HEIGHT: 1.2,
      BASE_BACKGROUND_COLOR: 'white',
      BASE_COLOR: 'black',
      OBJECT_PREVIEW_ARRAY_MAX_PROPERTIES: 10,
      OBJECT_PREVIEW_OBJECT_MAX_PROPERTIES: 5,
      OBJECT_NAME_COLOR: 'rgb(136, 19, 145)',
      OBJECT_VALUE_NULL_COLOR: 'rgb(128, 128, 128)',
      OBJECT_VALUE_UNDEFINED_COLOR: 'rgb(128, 128, 128)',
      OBJECT_VALUE_REGEXP_COLOR: 'rgb(196, 26, 22)',
      OBJECT_VALUE_STRING_COLOR: 'rgb(196, 26, 22)',
      OBJECT_VALUE_SYMBOL_COLOR: 'rgb(196, 26, 22)',
      OBJECT_VALUE_NUMBER_COLOR: 'rgb(28, 0, 207)',
      OBJECT_VALUE_BOOLEAN_COLOR: 'rgb(28, 0, 207)',
      OBJECT_VALUE_FUNCTION_PREFIX_COLOR: 'rgb(13, 34, 170)',
      HTML_TAG_COLOR: 'rgb(168, 148, 166)',
      HTML_TAGNAME_COLOR: 'rgb(136, 18, 128)',
      HTML_TAGNAME_TEXT_TRANSFORM: 'lowercase',
      HTML_ATTRIBUTE_NAME_COLOR: 'rgb(153, 69, 0)',
      HTML_ATTRIBUTE_VALUE_COLOR: 'rgb(26, 26, 166)',
      HTML_COMMENT_COLOR: 'rgb(35, 110, 37)',
      HTML_DOCTYPE_COLOR: 'rgb(192, 192, 192)',
      ARROW_COLOR: '#6e6e6e',
      ARROW_MARGIN_RIGHT: 3,
      ARROW_FONT_SIZE: 12,
      ARROW_ANIMATION_DURATION: '0',
      TREENODE_FONT_FAMILY: 'Menlo, monospace',
      TREENODE_FONT_SIZE: '11px',
      TREENODE_LINE_HEIGHT: 1.2,
      TREENODE_PADDING_LEFT: 12,
      TABLE_BORDER_COLOR: '#aaa',
      TABLE_TH_BACKGROUND_COLOR: '#eee',
      TABLE_TH_HOVER_COLOR: 'hsla(0, 0%, 90%, 1)',
      TABLE_SORT_ICON_COLOR: '#6e6e6e',
      TABLE_DATA_BACKGROUND_IMAGE: 'linear-gradient(to bottom, white, white 50%, rgb(234, 243, 255) 50%, rgb(234, 243, 255))',
      TABLE_DATA_BACKGROUND_SIZE: '128px 32px'
    };

    var themes = /*#__PURE__*/Object.freeze({
    __proto__: null,
    chromeDark: theme$1,
    chromeLight: theme$2
    });

    var arrayWithHoles = createCommonjsModule(function (module) {
      function _arrayWithHoles(arr) {
        if (Array.isArray(arr)) return arr;
      }
      module.exports = _arrayWithHoles;
      module.exports["default"] = module.exports, module.exports.__esModule = true;
    });
    unwrapExports(arrayWithHoles);

    var iterableToArrayLimit = createCommonjsModule(function (module) {
      function _iterableToArrayLimit(arr, i) {
        if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return;
        var _arr = [];
        var _n = true;
        var _d = false;
        var _e = undefined;
        try {
          for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
            _arr.push(_s.value);
            if (i && _arr.length === i) break;
          }
        } catch (err) {
          _d = true;
          _e = err;
        } finally {
          try {
            if (!_n && _i["return"] != null) _i["return"]();
          } finally {
            if (_d) throw _e;
          }
        }
        return _arr;
      }
      module.exports = _iterableToArrayLimit;
      module.exports["default"] = module.exports, module.exports.__esModule = true;
    });
    unwrapExports(iterableToArrayLimit);

    var arrayLikeToArray = createCommonjsModule(function (module) {
      function _arrayLikeToArray(arr, len) {
        if (len == null || len > arr.length) len = arr.length;
        for (var i = 0, arr2 = new Array(len); i < len; i++) {
          arr2[i] = arr[i];
        }
        return arr2;
      }
      module.exports = _arrayLikeToArray;
      module.exports["default"] = module.exports, module.exports.__esModule = true;
    });
    unwrapExports(arrayLikeToArray);

    var unsupportedIterableToArray = createCommonjsModule(function (module) {
      function _unsupportedIterableToArray(o, minLen) {
        if (!o) return;
        if (typeof o === "string") return arrayLikeToArray(o, minLen);
        var n = Object.prototype.toString.call(o).slice(8, -1);
        if (n === "Object" && o.constructor) n = o.constructor.name;
        if (n === "Map" || n === "Set") return Array.from(o);
        if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return arrayLikeToArray(o, minLen);
      }
      module.exports = _unsupportedIterableToArray;
      module.exports["default"] = module.exports, module.exports.__esModule = true;
    });
    unwrapExports(unsupportedIterableToArray);

    var nonIterableRest = createCommonjsModule(function (module) {
      function _nonIterableRest() {
        throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }
      module.exports = _nonIterableRest;
      module.exports["default"] = module.exports, module.exports.__esModule = true;
    });
    unwrapExports(nonIterableRest);

    var slicedToArray = createCommonjsModule(function (module) {
      function _slicedToArray(arr, i) {
        return arrayWithHoles(arr) || iterableToArrayLimit(arr, i) || unsupportedIterableToArray(arr, i) || nonIterableRest();
      }
      module.exports = _slicedToArray;
      module.exports["default"] = module.exports, module.exports.__esModule = true;
    });
    var _slicedToArray = unwrapExports(slicedToArray);

    var _typeof_1 = createCommonjsModule(function (module) {
      function _typeof(obj) {
        "@babel/helpers - typeof";
        if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
          module.exports = _typeof = function _typeof(obj) {
            return typeof obj;
          };
          module.exports["default"] = module.exports, module.exports.__esModule = true;
        } else {
          module.exports = _typeof = function _typeof(obj) {
            return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
          };
          module.exports["default"] = module.exports, module.exports.__esModule = true;
        }
        return _typeof(obj);
      }
      module.exports = _typeof;
      module.exports["default"] = module.exports, module.exports.__esModule = true;
    });
    var _typeof = unwrapExports(_typeof_1);

    var runtime_1 = createCommonjsModule(function (module) {
      var runtime = function (exports) {
        var Op = Object.prototype;
        var hasOwn = Op.hasOwnProperty;
        var undefined$1;
        var $Symbol = typeof Symbol === "function" ? Symbol : {};
        var iteratorSymbol = $Symbol.iterator || "@@iterator";
        var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
        var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";
        function define(obj, key, value) {
          Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
          });
          return obj[key];
        }
        try {
          define({}, "");
        } catch (err) {
          define = function (obj, key, value) {
            return obj[key] = value;
          };
        }
        function wrap(innerFn, outerFn, self, tryLocsList) {
          var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
          var generator = Object.create(protoGenerator.prototype);
          var context = new Context(tryLocsList || []);
          generator._invoke = makeInvokeMethod(innerFn, self, context);
          return generator;
        }
        exports.wrap = wrap;
        function tryCatch(fn, obj, arg) {
          try {
            return {
              type: "normal",
              arg: fn.call(obj, arg)
            };
          } catch (err) {
            return {
              type: "throw",
              arg: err
            };
          }
        }
        var GenStateSuspendedStart = "suspendedStart";
        var GenStateSuspendedYield = "suspendedYield";
        var GenStateExecuting = "executing";
        var GenStateCompleted = "completed";
        var ContinueSentinel = {};
        function Generator() {}
        function GeneratorFunction() {}
        function GeneratorFunctionPrototype() {}
        var IteratorPrototype = {};
        IteratorPrototype[iteratorSymbol] = function () {
          return this;
        };
        var getProto = Object.getPrototypeOf;
        var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
        if (NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
          IteratorPrototype = NativeIteratorPrototype;
        }
        var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype);
        GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
        GeneratorFunctionPrototype.constructor = GeneratorFunction;
        GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction");
        function defineIteratorMethods(prototype) {
          ["next", "throw", "return"].forEach(function (method) {
            define(prototype, method, function (arg) {
              return this._invoke(method, arg);
            });
          });
        }
        exports.isGeneratorFunction = function (genFun) {
          var ctor = typeof genFun === "function" && genFun.constructor;
          return ctor ? ctor === GeneratorFunction ||
          (ctor.displayName || ctor.name) === "GeneratorFunction" : false;
        };
        exports.mark = function (genFun) {
          if (Object.setPrototypeOf) {
            Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
          } else {
            genFun.__proto__ = GeneratorFunctionPrototype;
            define(genFun, toStringTagSymbol, "GeneratorFunction");
          }
          genFun.prototype = Object.create(Gp);
          return genFun;
        };
        exports.awrap = function (arg) {
          return {
            __await: arg
          };
        };
        function AsyncIterator(generator, PromiseImpl) {
          function invoke(method, arg, resolve, reject) {
            var record = tryCatch(generator[method], generator, arg);
            if (record.type === "throw") {
              reject(record.arg);
            } else {
              var result = record.arg;
              var value = result.value;
              if (value && typeof value === "object" && hasOwn.call(value, "__await")) {
                return PromiseImpl.resolve(value.__await).then(function (value) {
                  invoke("next", value, resolve, reject);
                }, function (err) {
                  invoke("throw", err, resolve, reject);
                });
              }
              return PromiseImpl.resolve(value).then(function (unwrapped) {
                result.value = unwrapped;
                resolve(result);
              }, function (error) {
                return invoke("throw", error, resolve, reject);
              });
            }
          }
          var previousPromise;
          function enqueue(method, arg) {
            function callInvokeWithMethodAndArg() {
              return new PromiseImpl(function (resolve, reject) {
                invoke(method, arg, resolve, reject);
              });
            }
            return previousPromise =
            previousPromise ? previousPromise.then(callInvokeWithMethodAndArg,
            callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
          }
          this._invoke = enqueue;
        }
        defineIteratorMethods(AsyncIterator.prototype);
        AsyncIterator.prototype[asyncIteratorSymbol] = function () {
          return this;
        };
        exports.AsyncIterator = AsyncIterator;
        exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) {
          if (PromiseImpl === void 0) PromiseImpl = Promise;
          var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl);
          return exports.isGeneratorFunction(outerFn) ? iter
          : iter.next().then(function (result) {
            return result.done ? result.value : iter.next();
          });
        };
        function makeInvokeMethod(innerFn, self, context) {
          var state = GenStateSuspendedStart;
          return function invoke(method, arg) {
            if (state === GenStateExecuting) {
              throw new Error("Generator is already running");
            }
            if (state === GenStateCompleted) {
              if (method === "throw") {
                throw arg;
              }
              return doneResult();
            }
            context.method = method;
            context.arg = arg;
            while (true) {
              var delegate = context.delegate;
              if (delegate) {
                var delegateResult = maybeInvokeDelegate(delegate, context);
                if (delegateResult) {
                  if (delegateResult === ContinueSentinel) continue;
                  return delegateResult;
                }
              }
              if (context.method === "next") {
                context.sent = context._sent = context.arg;
              } else if (context.method === "throw") {
                if (state === GenStateSuspendedStart) {
                  state = GenStateCompleted;
                  throw context.arg;
                }
                context.dispatchException(context.arg);
              } else if (context.method === "return") {
                context.abrupt("return", context.arg);
              }
              state = GenStateExecuting;
              var record = tryCatch(innerFn, self, context);
              if (record.type === "normal") {
                state = context.done ? GenStateCompleted : GenStateSuspendedYield;
                if (record.arg === ContinueSentinel) {
                  continue;
                }
                return {
                  value: record.arg,
                  done: context.done
                };
              } else if (record.type === "throw") {
                state = GenStateCompleted;
                context.method = "throw";
                context.arg = record.arg;
              }
            }
          };
        }
        function maybeInvokeDelegate(delegate, context) {
          var method = delegate.iterator[context.method];
          if (method === undefined$1) {
            context.delegate = null;
            if (context.method === "throw") {
              if (delegate.iterator["return"]) {
                context.method = "return";
                context.arg = undefined$1;
                maybeInvokeDelegate(delegate, context);
                if (context.method === "throw") {
                  return ContinueSentinel;
                }
              }
              context.method = "throw";
              context.arg = new TypeError("The iterator does not provide a 'throw' method");
            }
            return ContinueSentinel;
          }
          var record = tryCatch(method, delegate.iterator, context.arg);
          if (record.type === "throw") {
            context.method = "throw";
            context.arg = record.arg;
            context.delegate = null;
            return ContinueSentinel;
          }
          var info = record.arg;
          if (!info) {
            context.method = "throw";
            context.arg = new TypeError("iterator result is not an object");
            context.delegate = null;
            return ContinueSentinel;
          }
          if (info.done) {
            context[delegate.resultName] = info.value;
            context.next = delegate.nextLoc;
            if (context.method !== "return") {
              context.method = "next";
              context.arg = undefined$1;
            }
          } else {
            return info;
          }
          context.delegate = null;
          return ContinueSentinel;
        }
        defineIteratorMethods(Gp);
        define(Gp, toStringTagSymbol, "Generator");
        Gp[iteratorSymbol] = function () {
          return this;
        };
        Gp.toString = function () {
          return "[object Generator]";
        };
        function pushTryEntry(locs) {
          var entry = {
            tryLoc: locs[0]
          };
          if (1 in locs) {
            entry.catchLoc = locs[1];
          }
          if (2 in locs) {
            entry.finallyLoc = locs[2];
            entry.afterLoc = locs[3];
          }
          this.tryEntries.push(entry);
        }
        function resetTryEntry(entry) {
          var record = entry.completion || {};
          record.type = "normal";
          delete record.arg;
          entry.completion = record;
        }
        function Context(tryLocsList) {
          this.tryEntries = [{
            tryLoc: "root"
          }];
          tryLocsList.forEach(pushTryEntry, this);
          this.reset(true);
        }
        exports.keys = function (object) {
          var keys = [];
          for (var key in object) {
            keys.push(key);
          }
          keys.reverse();
          return function next() {
            while (keys.length) {
              var key = keys.pop();
              if (key in object) {
                next.value = key;
                next.done = false;
                return next;
              }
            }
            next.done = true;
            return next;
          };
        };
        function values(iterable) {
          if (iterable) {
            var iteratorMethod = iterable[iteratorSymbol];
            if (iteratorMethod) {
              return iteratorMethod.call(iterable);
            }
            if (typeof iterable.next === "function") {
              return iterable;
            }
            if (!isNaN(iterable.length)) {
              var i = -1,
                  next = function next() {
                while (++i < iterable.length) {
                  if (hasOwn.call(iterable, i)) {
                    next.value = iterable[i];
                    next.done = false;
                    return next;
                  }
                }
                next.value = undefined$1;
                next.done = true;
                return next;
              };
              return next.next = next;
            }
          }
          return {
            next: doneResult
          };
        }
        exports.values = values;
        function doneResult() {
          return {
            value: undefined$1,
            done: true
          };
        }
        Context.prototype = {
          constructor: Context,
          reset: function (skipTempReset) {
            this.prev = 0;
            this.next = 0;
            this.sent = this._sent = undefined$1;
            this.done = false;
            this.delegate = null;
            this.method = "next";
            this.arg = undefined$1;
            this.tryEntries.forEach(resetTryEntry);
            if (!skipTempReset) {
              for (var name in this) {
                if (name.charAt(0) === "t" && hasOwn.call(this, name) && !isNaN(+name.slice(1))) {
                  this[name] = undefined$1;
                }
              }
            }
          },
          stop: function () {
            this.done = true;
            var rootEntry = this.tryEntries[0];
            var rootRecord = rootEntry.completion;
            if (rootRecord.type === "throw") {
              throw rootRecord.arg;
            }
            return this.rval;
          },
          dispatchException: function (exception) {
            if (this.done) {
              throw exception;
            }
            var context = this;
            function handle(loc, caught) {
              record.type = "throw";
              record.arg = exception;
              context.next = loc;
              if (caught) {
                context.method = "next";
                context.arg = undefined$1;
              }
              return !!caught;
            }
            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
              var entry = this.tryEntries[i];
              var record = entry.completion;
              if (entry.tryLoc === "root") {
                return handle("end");
              }
              if (entry.tryLoc <= this.prev) {
                var hasCatch = hasOwn.call(entry, "catchLoc");
                var hasFinally = hasOwn.call(entry, "finallyLoc");
                if (hasCatch && hasFinally) {
                  if (this.prev < entry.catchLoc) {
                    return handle(entry.catchLoc, true);
                  } else if (this.prev < entry.finallyLoc) {
                    return handle(entry.finallyLoc);
                  }
                } else if (hasCatch) {
                  if (this.prev < entry.catchLoc) {
                    return handle(entry.catchLoc, true);
                  }
                } else if (hasFinally) {
                  if (this.prev < entry.finallyLoc) {
                    return handle(entry.finallyLoc);
                  }
                } else {
                  throw new Error("try statement without catch or finally");
                }
              }
            }
          },
          abrupt: function (type, arg) {
            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
              var entry = this.tryEntries[i];
              if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
                var finallyEntry = entry;
                break;
              }
            }
            if (finallyEntry && (type === "break" || type === "continue") && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc) {
              finallyEntry = null;
            }
            var record = finallyEntry ? finallyEntry.completion : {};
            record.type = type;
            record.arg = arg;
            if (finallyEntry) {
              this.method = "next";
              this.next = finallyEntry.finallyLoc;
              return ContinueSentinel;
            }
            return this.complete(record);
          },
          complete: function (record, afterLoc) {
            if (record.type === "throw") {
              throw record.arg;
            }
            if (record.type === "break" || record.type === "continue") {
              this.next = record.arg;
            } else if (record.type === "return") {
              this.rval = this.arg = record.arg;
              this.method = "return";
              this.next = "end";
            } else if (record.type === "normal" && afterLoc) {
              this.next = afterLoc;
            }
            return ContinueSentinel;
          },
          finish: function (finallyLoc) {
            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
              var entry = this.tryEntries[i];
              if (entry.finallyLoc === finallyLoc) {
                this.complete(entry.completion, entry.afterLoc);
                resetTryEntry(entry);
                return ContinueSentinel;
              }
            }
          },
          "catch": function (tryLoc) {
            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
              var entry = this.tryEntries[i];
              if (entry.tryLoc === tryLoc) {
                var record = entry.completion;
                if (record.type === "throw") {
                  var thrown = record.arg;
                  resetTryEntry(entry);
                }
                return thrown;
              }
            }
            throw new Error("illegal catch attempt");
          },
          delegateYield: function (iterable, resultName, nextLoc) {
            this.delegate = {
              iterator: values(iterable),
              resultName: resultName,
              nextLoc: nextLoc
            };
            if (this.method === "next") {
              this.arg = undefined$1;
            }
            return ContinueSentinel;
          }
        };
        return exports;
      }(
      module.exports );
      try {
        regeneratorRuntime = runtime;
      } catch (accidentalStrictMode) {
        Function("r", "regeneratorRuntime = r")(runtime);
      }
    });

    var regenerator = runtime_1;

    var arrayWithoutHoles = createCommonjsModule(function (module) {
      function _arrayWithoutHoles(arr) {
        if (Array.isArray(arr)) return arrayLikeToArray(arr);
      }
      module.exports = _arrayWithoutHoles;
      module.exports["default"] = module.exports, module.exports.__esModule = true;
    });
    unwrapExports(arrayWithoutHoles);

    var iterableToArray = createCommonjsModule(function (module) {
      function _iterableToArray(iter) {
        if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
      }
      module.exports = _iterableToArray;
      module.exports["default"] = module.exports, module.exports.__esModule = true;
    });
    unwrapExports(iterableToArray);

    var nonIterableSpread = createCommonjsModule(function (module) {
      function _nonIterableSpread() {
        throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }
      module.exports = _nonIterableSpread;
      module.exports["default"] = module.exports, module.exports.__esModule = true;
    });
    unwrapExports(nonIterableSpread);

    var toConsumableArray = createCommonjsModule(function (module) {
      function _toConsumableArray(arr) {
        return arrayWithoutHoles(arr) || iterableToArray(arr) || unsupportedIterableToArray(arr) || nonIterableSpread();
      }
      module.exports = _toConsumableArray;
      module.exports["default"] = module.exports, module.exports.__esModule = true;
    });
    var _toConsumableArray = unwrapExports(toConsumableArray);

    var defineProperty = createCommonjsModule(function (module) {
      function _defineProperty(obj, key, value) {
        if (key in obj) {
          Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
          });
        } else {
          obj[key] = value;
        }
        return obj;
      }
      module.exports = _defineProperty;
      module.exports["default"] = module.exports, module.exports.__esModule = true;
    });
    var _defineProperty = unwrapExports(defineProperty);

    var ExpandedPathsContext = reactExports.createContext([{}, function () {}]);

    var unselectable = {
      WebkitTouchCallout: 'none',
      WebkitUserSelect: 'none',
      KhtmlUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      OUserSelect: 'none',
      userSelect: 'none'
    };

    function ownKeys$7(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }
    function _objectSpread$7(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys$7(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys$7(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }
    var base = (function (theme) {
      return {
        DOMNodePreview: {
          htmlOpenTag: {
            base: {
              color: theme.HTML_TAG_COLOR
            },
            tagName: {
              color: theme.HTML_TAGNAME_COLOR,
              textTransform: theme.HTML_TAGNAME_TEXT_TRANSFORM
            },
            htmlAttributeName: {
              color: theme.HTML_ATTRIBUTE_NAME_COLOR
            },
            htmlAttributeValue: {
              color: theme.HTML_ATTRIBUTE_VALUE_COLOR
            }
          },
          htmlCloseTag: {
            base: {
              color: theme.HTML_TAG_COLOR
            },
            offsetLeft: {
              marginLeft: -theme.TREENODE_PADDING_LEFT
            },
            tagName: {
              color: theme.HTML_TAGNAME_COLOR,
              textTransform: theme.HTML_TAGNAME_TEXT_TRANSFORM
            }
          },
          htmlComment: {
            color: theme.HTML_COMMENT_COLOR
          },
          htmlDoctype: {
            color: theme.HTML_DOCTYPE_COLOR
          }
        },
        ObjectPreview: {
          objectDescription: {
            fontStyle: 'italic'
          },
          preview: {
            fontStyle: 'italic'
          },
          arrayMaxProperties: theme.OBJECT_PREVIEW_ARRAY_MAX_PROPERTIES,
          objectMaxProperties: theme.OBJECT_PREVIEW_OBJECT_MAX_PROPERTIES
        },
        ObjectName: {
          base: {
            color: theme.OBJECT_NAME_COLOR
          },
          dimmed: {
            opacity: 0.6
          }
        },
        ObjectValue: {
          objectValueNull: {
            color: theme.OBJECT_VALUE_NULL_COLOR
          },
          objectValueUndefined: {
            color: theme.OBJECT_VALUE_UNDEFINED_COLOR
          },
          objectValueRegExp: {
            color: theme.OBJECT_VALUE_REGEXP_COLOR
          },
          objectValueString: {
            color: theme.OBJECT_VALUE_STRING_COLOR
          },
          objectValueSymbol: {
            color: theme.OBJECT_VALUE_SYMBOL_COLOR
          },
          objectValueNumber: {
            color: theme.OBJECT_VALUE_NUMBER_COLOR
          },
          objectValueBoolean: {
            color: theme.OBJECT_VALUE_BOOLEAN_COLOR
          },
          objectValueFunctionPrefix: {
            color: theme.OBJECT_VALUE_FUNCTION_PREFIX_COLOR,
            fontStyle: 'italic'
          },
          objectValueFunctionName: {
            fontStyle: 'italic'
          }
        },
        TreeView: {
          treeViewOutline: {
            padding: 0,
            margin: 0,
            listStyleType: 'none'
          }
        },
        TreeNode: {
          treeNodeBase: {
            color: theme.BASE_COLOR,
            backgroundColor: theme.BASE_BACKGROUND_COLOR,
            lineHeight: theme.TREENODE_LINE_HEIGHT,
            cursor: 'default',
            boxSizing: 'border-box',
            listStyle: 'none',
            fontFamily: theme.TREENODE_FONT_FAMILY,
            fontSize: theme.TREENODE_FONT_SIZE
          },
          treeNodePreviewContainer: {},
          treeNodePlaceholder: _objectSpread$7({
            whiteSpace: 'pre',
            fontSize: theme.ARROW_FONT_SIZE,
            marginRight: theme.ARROW_MARGIN_RIGHT
          }, unselectable),
          treeNodeArrow: {
            base: _objectSpread$7(_objectSpread$7({
              color: theme.ARROW_COLOR,
              display: 'inline-block',
              fontSize: theme.ARROW_FONT_SIZE,
              marginRight: theme.ARROW_MARGIN_RIGHT
            }, parseFloat(theme.ARROW_ANIMATION_DURATION) > 0 ? {
              transition: "transform ".concat(theme.ARROW_ANIMATION_DURATION, " ease 0s")
            } : {}), unselectable),
            expanded: {
              WebkitTransform: 'rotateZ(90deg)',
              MozTransform: 'rotateZ(90deg)',
              transform: 'rotateZ(90deg)'
            },
            collapsed: {
              WebkitTransform: 'rotateZ(0deg)',
              MozTransform: 'rotateZ(0deg)',
              transform: 'rotateZ(0deg)'
            }
          },
          treeNodeChildNodesContainer: {
            margin: 0,
            paddingLeft: theme.TREENODE_PADDING_LEFT
          }
        },
        TableInspector: {
          base: {
            color: theme.BASE_COLOR,
            position: 'relative',
            border: "1px solid ".concat(theme.TABLE_BORDER_COLOR),
            fontFamily: theme.BASE_FONT_FAMILY,
            fontSize: theme.BASE_FONT_SIZE,
            lineHeight: '120%',
            boxSizing: 'border-box',
            cursor: 'default'
          }
        },
        TableInspectorHeaderContainer: {
          base: {
            top: 0,
            height: '17px',
            left: 0,
            right: 0,
            overflowX: 'hidden'
          },
          table: {
            tableLayout: 'fixed',
            borderSpacing: 0,
            borderCollapse: 'separate',
            height: '100%',
            width: '100%',
            margin: 0
          }
        },
        TableInspectorDataContainer: {
          tr: {
            display: 'table-row'
          },
          td: {
            boxSizing: 'border-box',
            border: 'none',
            height: '16px',
            verticalAlign: 'top',
            padding: '1px 4px',
            WebkitUserSelect: 'text',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            lineHeight: '14px'
          },
          div: {
            position: 'static',
            top: '17px',
            bottom: 0,
            overflowY: 'overlay',
            transform: 'translateZ(0)',
            left: 0,
            right: 0,
            overflowX: 'hidden'
          },
          table: {
            positon: 'static',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            borderTop: '0 none transparent',
            margin: 0,
            backgroundImage: theme.TABLE_DATA_BACKGROUND_IMAGE,
            backgroundSize: theme.TABLE_DATA_BACKGROUND_SIZE,
            tableLayout: 'fixed',
            borderSpacing: 0,
            borderCollapse: 'separate',
            width: '100%',
            fontSize: theme.BASE_FONT_SIZE,
            lineHeight: '120%'
          }
        },
        TableInspectorTH: {
          base: {
            position: 'relative',
            height: 'auto',
            textAlign: 'left',
            backgroundColor: theme.TABLE_TH_BACKGROUND_COLOR,
            borderBottom: "1px solid ".concat(theme.TABLE_BORDER_COLOR),
            fontWeight: 'normal',
            verticalAlign: 'middle',
            padding: '0 4px',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            lineHeight: '14px',
            ':hover': {
              backgroundColor: theme.TABLE_TH_HOVER_COLOR
            }
          },
          div: {
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            fontSize: theme.BASE_FONT_SIZE,
            lineHeight: '120%'
          }
        },
        TableInspectorLeftBorder: {
          none: {
            borderLeft: 'none'
          },
          solid: {
            borderLeft: "1px solid ".concat(theme.TABLE_BORDER_COLOR)
          }
        },
        TableInspectorSortIcon: _objectSpread$7({
          display: 'block',
          marginRight: 3,
          width: 8,
          height: 7,
          marginTop: -7,
          color: theme.TABLE_SORT_ICON_COLOR,
          fontSize: 12
        }, unselectable)
      };
    });

    var DEFAULT_THEME_NAME = 'chromeLight';
    var ThemeContext = reactExports.createContext(base(themes[DEFAULT_THEME_NAME]));
    var useStyles = function useStyles(baseStylesKey) {
      var themeStyles = reactExports.useContext(ThemeContext);
      return themeStyles[baseStylesKey];
    };
    var themeAcceptor = function themeAcceptor(WrappedComponent) {
      var ThemeAcceptor = function ThemeAcceptor(_ref) {
        var _ref$theme = _ref.theme,
            theme = _ref$theme === void 0 ? DEFAULT_THEME_NAME : _ref$theme,
            restProps = _objectWithoutProperties(_ref, ["theme"]);
        var themeStyles = reactExports.useMemo(function () {
          switch (Object.prototype.toString.call(theme)) {
            case '[object String]':
              return base(themes[theme]);
            case '[object Object]':
              return base(theme);
            default:
              return base(themes[DEFAULT_THEME_NAME]);
          }
        }, [theme]);
        return React.createElement(ThemeContext.Provider, {
          value: themeStyles
        }, React.createElement(WrappedComponent, restProps));
      };
      ThemeAcceptor.propTypes = {
        theme: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
      };
      return ThemeAcceptor;
    };

    function ownKeys$6(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }
    function _objectSpread$6(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys$6(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys$6(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }
    var Arrow = function Arrow(_ref) {
      var expanded = _ref.expanded,
          styles = _ref.styles;
      return React.createElement("span", {
        style: _objectSpread$6(_objectSpread$6({}, styles.base), expanded ? styles.expanded : styles.collapsed)
      }, "\u25B6");
    };
    var TreeNode = reactExports.memo(function (props) {
      props = _objectSpread$6({
        expanded: true,
        nodeRenderer: function nodeRenderer(_ref2) {
          var name = _ref2.name;
          return React.createElement("span", null, name);
        },
        onClick: function onClick() {},
        shouldShowArrow: false,
        shouldShowPlaceholder: true
      }, props);
      var _props = props,
          expanded = _props.expanded,
          onClick = _props.onClick,
          children = _props.children,
          nodeRenderer = _props.nodeRenderer,
          title = _props.title,
          shouldShowArrow = _props.shouldShowArrow,
          shouldShowPlaceholder = _props.shouldShowPlaceholder;
      var styles = useStyles('TreeNode');
      var NodeRenderer = nodeRenderer;
      return React.createElement("li", {
        "aria-expanded": expanded,
        role: "treeitem",
        style: styles.treeNodeBase,
        title: title
      }, React.createElement("div", {
        style: styles.treeNodePreviewContainer,
        onClick: onClick
      }, shouldShowArrow || reactExports.Children.count(children) > 0 ? React.createElement(Arrow, {
        expanded: expanded,
        styles: styles.treeNodeArrow
      }) : shouldShowPlaceholder && React.createElement("span", {
        style: styles.treeNodePlaceholder
      }, "\xA0"), React.createElement(NodeRenderer, props)), React.createElement("ol", {
        role: "group",
        style: styles.treeNodeChildNodesContainer
      }, expanded ? children : undefined));
    });
    TreeNode.propTypes = {
      name: PropTypes.string,
      data: PropTypes.any,
      expanded: PropTypes.bool,
      shouldShowArrow: PropTypes.bool,
      shouldShowPlaceholder: PropTypes.bool,
      nodeRenderer: PropTypes.func,
      onClick: PropTypes.func
    };

    function ownKeys$5(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }
    function _objectSpread$5(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys$5(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys$5(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }
    function _createForOfIteratorHelper$1(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray$1(o)) || allowArrayLike) { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
    function _unsupportedIterableToArray$1(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$1(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$1(o, minLen); }
    function _arrayLikeToArray$1(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
    var DEFAULT_ROOT_PATH = '$';
    var WILDCARD = '*';
    function hasChildNodes(data, dataIterator) {
      return !dataIterator(data).next().done;
    }
    var wildcardPathsFromLevel = function wildcardPathsFromLevel(level) {
      return Array.from({
        length: level
      }, function (_, i) {
        return [DEFAULT_ROOT_PATH].concat(Array.from({
          length: i
        }, function () {
          return '*';
        })).join('.');
      });
    };
    var getExpandedPaths = function getExpandedPaths(data, dataIterator, expandPaths, expandLevel, prevExpandedPaths) {
      var wildcardPaths = [].concat(wildcardPathsFromLevel(expandLevel)).concat(expandPaths).filter(function (path) {
        return typeof path === 'string';
      });
      var expandedPaths = [];
      wildcardPaths.forEach(function (wildcardPath) {
        var keyPaths = wildcardPath.split('.');
        var populatePaths = function populatePaths(curData, curPath, depth) {
          if (depth === keyPaths.length) {
            expandedPaths.push(curPath);
            return;
          }
          var key = keyPaths[depth];
          if (depth === 0) {
            if (hasChildNodes(curData, dataIterator) && (key === DEFAULT_ROOT_PATH || key === WILDCARD)) {
              populatePaths(curData, DEFAULT_ROOT_PATH, depth + 1);
            }
          } else {
            if (key === WILDCARD) {
              var _iterator = _createForOfIteratorHelper$1(dataIterator(curData)),
                  _step;
              try {
                for (_iterator.s(); !(_step = _iterator.n()).done;) {
                  var _step$value = _step.value,
                      name = _step$value.name,
                      _data = _step$value.data;
                  if (hasChildNodes(_data, dataIterator)) {
                    populatePaths(_data, "".concat(curPath, ".").concat(name), depth + 1);
                  }
                }
              } catch (err) {
                _iterator.e(err);
              } finally {
                _iterator.f();
              }
            } else {
              var value = curData[key];
              if (hasChildNodes(value, dataIterator)) {
                populatePaths(value, "".concat(curPath, ".").concat(key), depth + 1);
              }
            }
          }
        };
        populatePaths(data, '', 0);
      });
      return expandedPaths.reduce(function (obj, path) {
        obj[path] = true;
        return obj;
      }, _objectSpread$5({}, prevExpandedPaths));
    };

    function ownKeys$4(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }
    function _objectSpread$4(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys$4(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys$4(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }
    var ConnectedTreeNode = reactExports.memo(function (props) {
      var data = props.data,
          dataIterator = props.dataIterator,
          path = props.path,
          depth = props.depth,
          nodeRenderer = props.nodeRenderer;
      var _useContext = reactExports.useContext(ExpandedPathsContext),
          _useContext2 = _slicedToArray(_useContext, 2),
          expandedPaths = _useContext2[0],
          setExpandedPaths = _useContext2[1];
      var nodeHasChildNodes = hasChildNodes(data, dataIterator);
      var expanded = !!expandedPaths[path];
      var handleClick = reactExports.useCallback(function () {
        return nodeHasChildNodes && setExpandedPaths(function (prevExpandedPaths) {
          return _objectSpread$4(_objectSpread$4({}, prevExpandedPaths), {}, _defineProperty({}, path, !expanded));
        });
      }, [nodeHasChildNodes, setExpandedPaths, path, expanded]);
      return React.createElement(TreeNode, _extends({
        expanded: expanded,
        onClick: handleClick
        ,
        shouldShowArrow: nodeHasChildNodes
        ,
        shouldShowPlaceholder: depth > 0
        ,
        nodeRenderer: nodeRenderer
      }, props),
      expanded ? _toConsumableArray(dataIterator(data)).map(function (_ref) {
        var name = _ref.name,
            data = _ref.data,
            renderNodeProps = _objectWithoutProperties(_ref, ["name", "data"]);
        return React.createElement(ConnectedTreeNode, _extends({
          name: name,
          data: data,
          depth: depth + 1,
          path: "".concat(path, ".").concat(name),
          key: name,
          dataIterator: dataIterator,
          nodeRenderer: nodeRenderer
        }, renderNodeProps));
      }) : null);
    });
    ConnectedTreeNode.propTypes = {
      name: PropTypes.string,
      data: PropTypes.any,
      dataIterator: PropTypes.func,
      depth: PropTypes.number,
      expanded: PropTypes.bool,
      nodeRenderer: PropTypes.func
    };
    var TreeView = reactExports.memo(function (_ref2) {
      var name = _ref2.name,
          data = _ref2.data,
          dataIterator = _ref2.dataIterator,
          nodeRenderer = _ref2.nodeRenderer,
          expandPaths = _ref2.expandPaths,
          expandLevel = _ref2.expandLevel;
      var styles = useStyles('TreeView');
      var stateAndSetter = reactExports.useState({});
      var _stateAndSetter = _slicedToArray(stateAndSetter, 2),
          setExpandedPaths = _stateAndSetter[1];
      reactExports.useLayoutEffect(function () {
        return setExpandedPaths(function (prevExpandedPaths) {
          return getExpandedPaths(data, dataIterator, expandPaths, expandLevel, prevExpandedPaths);
        });
      }, [data, dataIterator, expandPaths, expandLevel]);
      return React.createElement(ExpandedPathsContext.Provider, {
        value: stateAndSetter
      }, React.createElement("ol", {
        role: "tree",
        style: styles.treeViewOutline
      }, React.createElement(ConnectedTreeNode, {
        name: name,
        data: data,
        dataIterator: dataIterator,
        depth: 0,
        path: DEFAULT_ROOT_PATH,
        nodeRenderer: nodeRenderer
      })));
    });
    TreeView.propTypes = {
      name: PropTypes.string,
      data: PropTypes.any,
      dataIterator: PropTypes.func,
      nodeRenderer: PropTypes.func,
      expandPaths: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
      expandLevel: PropTypes.number
    };

    function ownKeys$3(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }
    function _objectSpread$3(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys$3(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys$3(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }
    var ObjectName = function ObjectName(_ref) {
      var name = _ref.name,
          _ref$dimmed = _ref.dimmed,
          dimmed = _ref$dimmed === void 0 ? false : _ref$dimmed,
          _ref$styles = _ref.styles,
          styles = _ref$styles === void 0 ? {} : _ref$styles;
      var themeStyles = useStyles('ObjectName');
      var appliedStyles = _objectSpread$3(_objectSpread$3(_objectSpread$3({}, themeStyles.base), dimmed ? themeStyles['dimmed'] : {}), styles);
      return React.createElement("span", {
        style: appliedStyles
      }, name);
    };
    ObjectName.propTypes = {
      name: PropTypes.string,
      dimmed: PropTypes.bool
    };

    function ownKeys$2(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }
    function _objectSpread$2(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys$2(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys$2(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }
    var ObjectValue = function ObjectValue(_ref) {
      var object = _ref.object,
          styles = _ref.styles;
      var themeStyles = useStyles('ObjectValue');
      var mkStyle = function mkStyle(key) {
        return _objectSpread$2(_objectSpread$2({}, themeStyles[key]), styles);
      };
      switch (_typeof(object)) {
        case 'bigint':
          return React.createElement("span", {
            style: mkStyle('objectValueNumber')
          }, String(object), "n");
        case 'number':
          return React.createElement("span", {
            style: mkStyle('objectValueNumber')
          }, String(object));
        case 'string':
          return React.createElement("span", {
            style: mkStyle('objectValueString')
          }, "\"", object, "\"");
        case 'boolean':
          return React.createElement("span", {
            style: mkStyle('objectValueBoolean')
          }, String(object));
        case 'undefined':
          return React.createElement("span", {
            style: mkStyle('objectValueUndefined')
          }, "undefined");
        case 'object':
          if (object === null) {
            return React.createElement("span", {
              style: mkStyle('objectValueNull')
            }, "null");
          }
          if (object instanceof Date) {
            return React.createElement("span", null, object.toString());
          }
          if (object instanceof RegExp) {
            return React.createElement("span", {
              style: mkStyle('objectValueRegExp')
            }, object.toString());
          }
          if (Array.isArray(object)) {
            return React.createElement("span", null, "Array(".concat(object.length, ")"));
          }
          if (!object.constructor) {
            return React.createElement("span", null, "Object");
          }
          if (typeof object.constructor.isBuffer === 'function' && object.constructor.isBuffer(object)) {
            return React.createElement("span", null, "Buffer[".concat(object.length, "]"));
          }
          return React.createElement("span", null, object.constructor.name);
        case 'function':
          return React.createElement("span", null, React.createElement("span", {
            style: mkStyle('objectValueFunctionPrefix')
          }, "\u0192\xA0"), React.createElement("span", {
            style: mkStyle('objectValueFunctionName')
          }, object.name, "()"));
        case 'symbol':
          return React.createElement("span", {
            style: mkStyle('objectValueSymbol')
          }, object.toString());
        default:
          return React.createElement("span", null);
      }
    };
    ObjectValue.propTypes = {
      object: PropTypes.any
    };

    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var propertyIsEnumerable = Object.prototype.propertyIsEnumerable;

    function getPropertyValue(object, propertyName) {
      var propertyDescriptor = Object.getOwnPropertyDescriptor(object, propertyName);
      if (propertyDescriptor.get) {
        try {
          return propertyDescriptor.get();
        } catch (_unused) {
          return propertyDescriptor.get;
        }
      }
      return object[propertyName];
    }

    function intersperse(arr, sep) {
      if (arr.length === 0) {
        return [];
      }
      return arr.slice(1).reduce(function (xs, x) {
        return xs.concat([sep, x]);
      }, [arr[0]]);
    }
    var ObjectPreview = function ObjectPreview(_ref) {
      var data = _ref.data;
      var styles = useStyles('ObjectPreview');
      var object = data;
      if (_typeof(object) !== 'object' || object === null || object instanceof Date || object instanceof RegExp) {
        return React.createElement(ObjectValue, {
          object: object
        });
      }
      if (Array.isArray(object)) {
        var maxProperties = styles.arrayMaxProperties;
        var previewArray = object.slice(0, maxProperties).map(function (element, index) {
          return React.createElement(ObjectValue, {
            key: index,
            object: element
          });
        });
        if (object.length > maxProperties) {
          previewArray.push( React.createElement("span", {
            key: "ellipsis"
          }, "\u2026"));
        }
        var arrayLength = object.length;
        return React.createElement(React.Fragment, null, React.createElement("span", {
          style: styles.objectDescription
        }, arrayLength === 0 ? "" : "(".concat(arrayLength, ")\xA0")), React.createElement("span", {
          style: styles.preview
        }, "[", intersperse(previewArray, ', '), "]"));
      } else {
        var _maxProperties = styles.objectMaxProperties;
        var propertyNodes = [];
        for (var propertyName in object) {
          if (hasOwnProperty.call(object, propertyName)) {
            var ellipsis = void 0;
            if (propertyNodes.length === _maxProperties - 1 && Object.keys(object).length > _maxProperties) {
              ellipsis = React.createElement("span", {
                key: 'ellipsis'
              }, "\u2026");
            }
            var propertyValue = getPropertyValue(object, propertyName);
            propertyNodes.push( React.createElement("span", {
              key: propertyName
            }, React.createElement(ObjectName, {
              name: propertyName || "\"\""
            }), ":\xA0", React.createElement(ObjectValue, {
              object: propertyValue
            }), ellipsis));
            if (ellipsis) break;
          }
        }
        var objectConstructorName = object.constructor ? object.constructor.name : 'Object';
        return React.createElement(React.Fragment, null, React.createElement("span", {
          style: styles.objectDescription
        }, objectConstructorName === 'Object' ? '' : "".concat(objectConstructorName, " ")), React.createElement("span", {
          style: styles.preview
        }, '{', intersperse(propertyNodes, ', '), '}'));
      }
    };

    var ObjectRootLabel = function ObjectRootLabel(_ref) {
      var name = _ref.name,
          data = _ref.data;
      if (typeof name === 'string') {
        return React.createElement("span", null, React.createElement(ObjectName, {
          name: name
        }), React.createElement("span", null, ": "), React.createElement(ObjectPreview, {
          data: data
        }));
      } else {
        return React.createElement(ObjectPreview, {
          data: data
        });
      }
    };

    var ObjectLabel = function ObjectLabel(_ref) {
      var name = _ref.name,
          data = _ref.data,
          _ref$isNonenumerable = _ref.isNonenumerable,
          isNonenumerable = _ref$isNonenumerable === void 0 ? false : _ref$isNonenumerable;
      var object = data;
      return React.createElement("span", null, typeof name === 'string' ? React.createElement(ObjectName, {
        name: name,
        dimmed: isNonenumerable
      }) : React.createElement(ObjectPreview, {
        data: name
      }), React.createElement("span", null, ": "), React.createElement(ObjectValue, {
        object: object
      }));
    };
    ObjectLabel.propTypes = {
      isNonenumerable: PropTypes.bool
    };

    function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike) { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
    function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
    function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
    var createIterator = function createIterator(showNonenumerable, sortObjectKeys) {
      var objectIterator = regenerator.mark(function objectIterator(data) {
        var shouldIterate, dataIsArray, i, _iterator, _step, entry, _entry, k, v, keys, _iterator2, _step2, propertyName, propertyValue, _propertyValue;
        return regenerator.wrap(function objectIterator$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                shouldIterate = _typeof(data) === 'object' && data !== null || typeof data === 'function';
                if (shouldIterate) {
                  _context.next = 3;
                  break;
                }
                return _context.abrupt("return");
              case 3:
                dataIsArray = Array.isArray(data);
                if (!(!dataIsArray && data[Symbol.iterator])) {
                  _context.next = 32;
                  break;
                }
                i = 0;
                _iterator = _createForOfIteratorHelper(data);
                _context.prev = 7;
                _iterator.s();
              case 9:
                if ((_step = _iterator.n()).done) {
                  _context.next = 22;
                  break;
                }
                entry = _step.value;
                if (!(Array.isArray(entry) && entry.length === 2)) {
                  _context.next = 17;
                  break;
                }
                _entry = _slicedToArray(entry, 2), k = _entry[0], v = _entry[1];
                _context.next = 15;
                return {
                  name: k,
                  data: v
                };
              case 15:
                _context.next = 19;
                break;
              case 17:
                _context.next = 19;
                return {
                  name: i.toString(),
                  data: entry
                };
              case 19:
                i++;
              case 20:
                _context.next = 9;
                break;
              case 22:
                _context.next = 27;
                break;
              case 24:
                _context.prev = 24;
                _context.t0 = _context["catch"](7);
                _iterator.e(_context.t0);
              case 27:
                _context.prev = 27;
                _iterator.f();
                return _context.finish(27);
              case 30:
                _context.next = 64;
                break;
              case 32:
                keys = Object.getOwnPropertyNames(data);
                if (sortObjectKeys === true && !dataIsArray) {
                  keys.sort();
                } else if (typeof sortObjectKeys === 'function') {
                  keys.sort(sortObjectKeys);
                }
                _iterator2 = _createForOfIteratorHelper(keys);
                _context.prev = 35;
                _iterator2.s();
              case 37:
                if ((_step2 = _iterator2.n()).done) {
                  _context.next = 53;
                  break;
                }
                propertyName = _step2.value;
                if (!propertyIsEnumerable.call(data, propertyName)) {
                  _context.next = 45;
                  break;
                }
                propertyValue = getPropertyValue(data, propertyName);
                _context.next = 43;
                return {
                  name: propertyName || "\"\"",
                  data: propertyValue
                };
              case 43:
                _context.next = 51;
                break;
              case 45:
                if (!showNonenumerable) {
                  _context.next = 51;
                  break;
                }
                _propertyValue = void 0;
                try {
                  _propertyValue = getPropertyValue(data, propertyName);
                } catch (e) {
                }
                if (!(_propertyValue !== undefined)) {
                  _context.next = 51;
                  break;
                }
                _context.next = 51;
                return {
                  name: propertyName,
                  data: _propertyValue,
                  isNonenumerable: true
                };
              case 51:
                _context.next = 37;
                break;
              case 53:
                _context.next = 58;
                break;
              case 55:
                _context.prev = 55;
                _context.t1 = _context["catch"](35);
                _iterator2.e(_context.t1);
              case 58:
                _context.prev = 58;
                _iterator2.f();
                return _context.finish(58);
              case 61:
                if (!(showNonenumerable && data !== Object.prototype
                )) {
                  _context.next = 64;
                  break;
                }
                _context.next = 64;
                return {
                  name: '__proto__',
                  data: Object.getPrototypeOf(data),
                  isNonenumerable: true
                };
              case 64:
              case "end":
                return _context.stop();
            }
          }
        }, objectIterator, null, [[7, 24, 27, 30], [35, 55, 58, 61]]);
      });
      return objectIterator;
    };
    var defaultNodeRenderer = function defaultNodeRenderer(_ref) {
      var depth = _ref.depth,
          name = _ref.name,
          data = _ref.data,
          isNonenumerable = _ref.isNonenumerable;
      return depth === 0 ? React.createElement(ObjectRootLabel, {
        name: name,
        data: data
      }) : React.createElement(ObjectLabel, {
        name: name,
        data: data,
        isNonenumerable: isNonenumerable
      });
    };
    var ObjectInspector = function ObjectInspector(_ref2) {
      var _ref2$showNonenumerab = _ref2.showNonenumerable,
          showNonenumerable = _ref2$showNonenumerab === void 0 ? false : _ref2$showNonenumerab,
          sortObjectKeys = _ref2.sortObjectKeys,
          nodeRenderer = _ref2.nodeRenderer,
          treeViewProps = _objectWithoutProperties(_ref2, ["showNonenumerable", "sortObjectKeys", "nodeRenderer"]);
      var dataIterator = createIterator(showNonenumerable, sortObjectKeys);
      var renderer = nodeRenderer ? nodeRenderer : defaultNodeRenderer;
      return React.createElement(TreeView, _extends({
        nodeRenderer: renderer,
        dataIterator: dataIterator
      }, treeViewProps));
    };
    ObjectInspector.propTypes = {
      expandLevel: PropTypes.number,
      expandPaths: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
      name: PropTypes.string,
      data: PropTypes.any,
      showNonenumerable: PropTypes.bool,
      sortObjectKeys: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
      nodeRenderer: PropTypes.func
    };
    var ObjectInspector$1 = themeAcceptor(ObjectInspector);

    if (!Array.prototype.includes) {
      Array.prototype.includes = function (searchElement
      ) {
        var O = Object(this);
        var len = parseInt(O.length) || 0;
        if (len === 0) {
          return false;
        }
        var n = parseInt(arguments[1]) || 0;
        var k;
        if (n >= 0) {
          k = n;
        } else {
          k = len + n;
          if (k < 0) {
            k = 0;
          }
        }
        var currentElement;
        while (k < len) {
          currentElement = O[k];
          if (searchElement === currentElement || searchElement !== searchElement && currentElement !== currentElement) {
            return true;
          }
          k++;
        }
        return false;
      };
    }
    function getHeaders(data) {
      if (_typeof(data) === 'object') {
        var rowHeaders;
        if (Array.isArray(data)) {
          var nRows = data.length;
          rowHeaders = _toConsumableArray(Array(nRows).keys());
        } else if (data !== null) {
          rowHeaders = Object.keys(data);
        }
        var colHeaders = rowHeaders.reduce(function (colHeaders, rowHeader) {
          var row = data[rowHeader];
          if (_typeof(row) === 'object' && row !== null) {
            var cols = Object.keys(row);
            cols.reduce(function (xs, x) {
              if (!xs.includes(x)) {
                xs.push(x);
              }
              return xs;
            }, colHeaders);
          }
          return colHeaders;
        }, []);
        return {
          rowHeaders: rowHeaders,
          colHeaders: colHeaders
        };
      }
      return undefined;
    }

    function ownKeys$1(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }
    function _objectSpread$1(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys$1(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys$1(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }
    var DataContainer = function DataContainer(_ref) {
      var rows = _ref.rows,
          columns = _ref.columns,
          rowsData = _ref.rowsData;
      var styles = useStyles('TableInspectorDataContainer');
      var borderStyles = useStyles('TableInspectorLeftBorder');
      return React.createElement("div", {
        style: styles.div
      }, React.createElement("table", {
        style: styles.table
      }, React.createElement("colgroup", null), React.createElement("tbody", null, rows.map(function (row, i) {
        return React.createElement("tr", {
          key: row,
          style: styles.tr
        }, React.createElement("td", {
          style: _objectSpread$1(_objectSpread$1({}, styles.td), borderStyles.none)
        }, row), columns.map(function (column) {
          var rowData = rowsData[i];
          if (_typeof(rowData) === 'object' && rowData !== null && hasOwnProperty.call(rowData, column)) {
            return React.createElement("td", {
              key: column,
              style: _objectSpread$1(_objectSpread$1({}, styles.td), borderStyles.solid)
            }, React.createElement(ObjectValue, {
              object: rowData[column]
            }));
          } else {
            return React.createElement("td", {
              key: column,
              style: _objectSpread$1(_objectSpread$1({}, styles.td), borderStyles.solid)
            });
          }
        }));
      }))));
    };

    function ownKeys$8(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }
    function _objectSpread$8(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys$8(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys$8(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }
    var SortIconContainer = function SortIconContainer(props) {
      return React.createElement("div", {
        style: {
          position: 'absolute',
          top: 1,
          right: 0,
          bottom: 1,
          display: 'flex',
          alignItems: 'center'
        }
      }, props.children);
    };
    var SortIcon = function SortIcon(_ref) {
      var sortAscending = _ref.sortAscending;
      var styles = useStyles('TableInspectorSortIcon');
      var glyph = sortAscending ? '▲' : '▼';
      return React.createElement("div", {
        style: styles
      }, glyph);
    };
    var TH = function TH(_ref2) {
      var _ref2$sortAscending = _ref2.sortAscending,
          sortAscending = _ref2$sortAscending === void 0 ? false : _ref2$sortAscending,
          _ref2$sorted = _ref2.sorted,
          sorted = _ref2$sorted === void 0 ? false : _ref2$sorted,
          _ref2$onClick = _ref2.onClick,
          onClick = _ref2$onClick === void 0 ? undefined : _ref2$onClick,
          _ref2$borderStyle = _ref2.borderStyle,
          borderStyle = _ref2$borderStyle === void 0 ? {} : _ref2$borderStyle,
          children = _ref2.children,
          thProps = _objectWithoutProperties(_ref2, ["sortAscending", "sorted", "onClick", "borderStyle", "children"]);
      var styles = useStyles('TableInspectorTH');
      var _useState = reactExports.useState(false),
          _useState2 = _slicedToArray(_useState, 2),
          hovered = _useState2[0],
          setHovered = _useState2[1];
      var handleMouseEnter = reactExports.useCallback(function () {
        return setHovered(true);
      }, []);
      var handleMouseLeave = reactExports.useCallback(function () {
        return setHovered(false);
      }, []);
      return React.createElement("th", _extends({}, thProps, {
        style: _objectSpread$8(_objectSpread$8(_objectSpread$8({}, styles.base), borderStyle), hovered ? styles.base[':hover'] : {}),
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        onClick: onClick
      }), React.createElement("div", {
        style: styles.div
      }, children), sorted && React.createElement(SortIconContainer, null, React.createElement(SortIcon, {
        sortAscending: sortAscending
      })));
    };

    var HeaderContainer = function HeaderContainer(_ref) {
      var _ref$indexColumnText = _ref.indexColumnText,
          indexColumnText = _ref$indexColumnText === void 0 ? '(index)' : _ref$indexColumnText,
          _ref$columns = _ref.columns,
          columns = _ref$columns === void 0 ? [] : _ref$columns,
          sorted = _ref.sorted,
          sortIndexColumn = _ref.sortIndexColumn,
          sortColumn = _ref.sortColumn,
          sortAscending = _ref.sortAscending,
          onTHClick = _ref.onTHClick,
          onIndexTHClick = _ref.onIndexTHClick;
      var styles = useStyles('TableInspectorHeaderContainer');
      var borderStyles = useStyles('TableInspectorLeftBorder');
      return React.createElement("div", {
        style: styles.base
      }, React.createElement("table", {
        style: styles.table
      }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement(TH, {
        borderStyle: borderStyles.none,
        sorted: sorted && sortIndexColumn,
        sortAscending: sortAscending,
        onClick: onIndexTHClick
      }, indexColumnText), columns.map(function (column) {
        return React.createElement(TH, {
          borderStyle: borderStyles.solid,
          key: column,
          sorted: sorted && sortColumn === column,
          sortAscending: sortAscending,
          onClick: onTHClick.bind(null, column)
        }, column);
      })))));
    };

    var TableInspector = function TableInspector(_ref) {
      var data = _ref.data,
          columns = _ref.columns;
      var styles = useStyles('TableInspector');
      var _useState = reactExports.useState({
        sorted: false,
        sortIndexColumn: false,
        sortColumn: undefined,
        sortAscending: false
      }),
          _useState2 = _slicedToArray(_useState, 2),
          _useState2$ = _useState2[0],
          sorted = _useState2$.sorted,
          sortIndexColumn = _useState2$.sortIndexColumn,
          sortColumn = _useState2$.sortColumn,
          sortAscending = _useState2$.sortAscending,
          setState = _useState2[1];
      var handleIndexTHClick = reactExports.useCallback(function () {
        setState(function (_ref2) {
          var sortIndexColumn = _ref2.sortIndexColumn,
              sortAscending = _ref2.sortAscending;
          return {
            sorted: true,
            sortIndexColumn: true,
            sortColumn: undefined,
            sortAscending: sortIndexColumn ? !sortAscending : true
          };
        });
      }, []);
      var handleTHClick = reactExports.useCallback(function (col) {
        setState(function (_ref3) {
          var sortColumn = _ref3.sortColumn,
              sortAscending = _ref3.sortAscending;
          return {
            sorted: true,
            sortIndexColumn: false,
            sortColumn: col,
            sortAscending: col === sortColumn ? !sortAscending : true
          };
        });
      }, []);
      if (_typeof(data) !== 'object' || data === null) {
        return React.createElement("div", null);
      }
      var _getHeaders = getHeaders(data),
          rowHeaders = _getHeaders.rowHeaders,
          colHeaders = _getHeaders.colHeaders;
      if (columns !== undefined) {
        colHeaders = columns;
      }
      var rowsData = rowHeaders.map(function (rowHeader) {
        return data[rowHeader];
      });
      var columnDataWithRowIndexes;
      if (sortColumn !== undefined) {
        columnDataWithRowIndexes = rowsData.map(function (rowData, index) {
          if (_typeof(rowData) === 'object' && rowData !== null
          ) {
              var columnData = rowData[sortColumn];
              return [columnData, index];
            }
          return [undefined, index];
        });
      } else {
        if (sortIndexColumn) {
          columnDataWithRowIndexes = rowHeaders.map(function (rowData, index) {
            var columnData = rowHeaders[index];
            return [columnData, index];
          });
        }
      }
      if (columnDataWithRowIndexes !== undefined) {
        var comparator = function comparator(mapper, ascending) {
          return function (a, b) {
            var v1 = mapper(a);
            var v2 = mapper(b);
            var type1 = _typeof(v1);
            var type2 = _typeof(v2);
            var lt = function lt(v1, v2) {
              if (v1 < v2) {
                return -1;
              } else if (v1 > v2) {
                return 1;
              } else {
                return 0;
              }
            };
            var result;
            if (type1 === type2) {
              result = lt(v1, v2);
            } else {
              var order = {
                string: 0,
                number: 1,
                object: 2,
                symbol: 3,
                boolean: 4,
                undefined: 5,
                function: 6
              };
              result = lt(order[type1], order[type2]);
            }
            if (!ascending) result = -result;
            return result;
          };
        };
        var sortedRowIndexes = columnDataWithRowIndexes.sort(comparator(function (item) {
          return item[0];
        }, sortAscending)).map(function (item) {
          return item[1];
        });
        rowHeaders = sortedRowIndexes.map(function (i) {
          return rowHeaders[i];
        });
        rowsData = sortedRowIndexes.map(function (i) {
          return rowsData[i];
        });
      }
      return React.createElement("div", {
        style: styles.base
      }, React.createElement(HeaderContainer, {
        columns: colHeaders
        ,
        sorted: sorted,
        sortIndexColumn: sortIndexColumn,
        sortColumn: sortColumn,
        sortAscending: sortAscending,
        onTHClick: handleTHClick,
        onIndexTHClick: handleIndexTHClick
      }), React.createElement(DataContainer, {
        rows: rowHeaders,
        columns: colHeaders,
        rowsData: rowsData
      }));
    };
    TableInspector.propTypes = {
      data: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
      columns: PropTypes.array
    };
    var TableInspector$1 = themeAcceptor(TableInspector);

    var TEXT_NODE_MAX_INLINE_CHARS = 80;
    var shouldInline = function shouldInline(data) {
      return data.childNodes.length === 0 || data.childNodes.length === 1 && data.childNodes[0].nodeType === Node.TEXT_NODE && data.textContent.length < TEXT_NODE_MAX_INLINE_CHARS;
    };

    var OpenTag = function OpenTag(_ref) {
      var tagName = _ref.tagName,
          attributes = _ref.attributes,
          styles = _ref.styles;
      return React.createElement("span", {
        style: styles.base
      }, '<', React.createElement("span", {
        style: styles.tagName
      }, tagName), function () {
        if (attributes) {
          var attributeNodes = [];
          for (var i = 0; i < attributes.length; i++) {
            var attribute = attributes[i];
            attributeNodes.push( React.createElement("span", {
              key: i
            }, ' ', React.createElement("span", {
              style: styles.htmlAttributeName
            }, attribute.name), '="', React.createElement("span", {
              style: styles.htmlAttributeValue
            }, attribute.value), '"'));
          }
          return attributeNodes;
        }
      }(), '>');
    };
    var CloseTag = function CloseTag(_ref2) {
      var tagName = _ref2.tagName,
          _ref2$isChildNode = _ref2.isChildNode,
          isChildNode = _ref2$isChildNode === void 0 ? false : _ref2$isChildNode,
          styles = _ref2.styles;
      return React.createElement("span", {
        style: _extends({}, styles.base, isChildNode && styles.offsetLeft)
      }, '</', React.createElement("span", {
        style: styles.tagName
      }, tagName), '>');
    };
    var nameByNodeType = {
      1: 'ELEMENT_NODE',
      3: 'TEXT_NODE',
      7: 'PROCESSING_INSTRUCTION_NODE',
      8: 'COMMENT_NODE',
      9: 'DOCUMENT_NODE',
      10: 'DOCUMENT_TYPE_NODE',
      11: 'DOCUMENT_FRAGMENT_NODE'
    };
    var DOMNodePreview = function DOMNodePreview(_ref3) {
      var isCloseTag = _ref3.isCloseTag,
          data = _ref3.data,
          expanded = _ref3.expanded;
      var styles = useStyles('DOMNodePreview');
      if (isCloseTag) {
        return React.createElement(CloseTag, {
          styles: styles.htmlCloseTag,
          isChildNode: true,
          tagName: data.tagName
        });
      }
      switch (data.nodeType) {
        case Node.ELEMENT_NODE:
          return React.createElement("span", null, React.createElement(OpenTag, {
            tagName: data.tagName,
            attributes: data.attributes,
            styles: styles.htmlOpenTag
          }), shouldInline(data) ? data.textContent : !expanded && '…', !expanded && React.createElement(CloseTag, {
            tagName: data.tagName,
            styles: styles.htmlCloseTag
          }));
        case Node.TEXT_NODE:
          return React.createElement("span", null, data.textContent);
        case Node.CDATA_SECTION_NODE:
          return React.createElement("span", null, '<![CDATA[' + data.textContent + ']]>');
        case Node.COMMENT_NODE:
          return React.createElement("span", {
            style: styles.htmlComment
          }, '<!--', data.textContent, '-->');
        case Node.PROCESSING_INSTRUCTION_NODE:
          return React.createElement("span", null, data.nodeName);
        case Node.DOCUMENT_TYPE_NODE:
          return React.createElement("span", {
            style: styles.htmlDoctype
          }, '<!DOCTYPE ', data.name, data.publicId ? " PUBLIC \"".concat(data.publicId, "\"") : '', !data.publicId && data.systemId ? ' SYSTEM' : '', data.systemId ? " \"".concat(data.systemId, "\"") : '', '>');
        case Node.DOCUMENT_NODE:
          return React.createElement("span", null, data.nodeName);
        case Node.DOCUMENT_FRAGMENT_NODE:
          return React.createElement("span", null, data.nodeName);
        default:
          return React.createElement("span", null, nameByNodeType[data.nodeType]);
      }
    };
    DOMNodePreview.propTypes = {
      isCloseTag: PropTypes.bool,
      name: PropTypes.string,
      data: PropTypes.object.isRequired,
      expanded: PropTypes.bool.isRequired
    };

    var domIterator = regenerator.mark(function domIterator(data) {
      var textInlined, i, node;
      return regenerator.wrap(function domIterator$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (!(data && data.childNodes)) {
                _context.next = 17;
                break;
              }
              textInlined = shouldInline(data);
              if (!textInlined) {
                _context.next = 4;
                break;
              }
              return _context.abrupt("return");
            case 4:
              i = 0;
            case 5:
              if (!(i < data.childNodes.length)) {
                _context.next = 14;
                break;
              }
              node = data.childNodes[i];
              if (!(node.nodeType === Node.TEXT_NODE && node.textContent.trim().length === 0)) {
                _context.next = 9;
                break;
              }
              return _context.abrupt("continue", 11);
            case 9:
              _context.next = 11;
              return {
                name: "".concat(node.tagName, "[").concat(i, "]"),
                data: node
              };
            case 11:
              i++;
              _context.next = 5;
              break;
            case 14:
              if (!data.tagName) {
                _context.next = 17;
                break;
              }
              _context.next = 17;
              return {
                name: 'CLOSE_TAG',
                data: {
                  tagName: data.tagName
                },
                isCloseTag: true
              };
            case 17:
            case "end":
              return _context.stop();
          }
        }
      }, domIterator);
    });
    var DOMInspector = function DOMInspector(props) {
      return React.createElement(TreeView, _extends({
        nodeRenderer: DOMNodePreview,
        dataIterator: domIterator
      }, props));
    };
    DOMInspector.propTypes = {
      data: PropTypes.object.isRequired
    };
    var DOMInspector$1 = themeAcceptor(DOMInspector);

    var Inspector = function Inspector(_ref) {
      var _ref$table = _ref.table,
          table = _ref$table === void 0 ? false : _ref$table,
          data = _ref.data,
          rest = _objectWithoutProperties(_ref, ["table", "data"]);
      if (table) {
        return React.createElement(TableInspector$1, _extends({
          data: data
        }, rest));
      }
      if (isDOM(data)) return React.createElement(DOMInspector$1, _extends({
        data: data
      }, rest));
      return React.createElement(ObjectInspector$1, _extends({
        data: data
      }, rest));
    };
    Inspector.propTypes = {
      data: PropTypes.any,
      name: PropTypes.string,
      table: PropTypes.bool
    };

    var reactInspector$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        DOMInspector: DOMInspector$1,
        Inspector: Inspector,
        ObjectInspector: ObjectInspector$1,
        ObjectLabel: ObjectLabel,
        ObjectName: ObjectName,
        ObjectPreview: ObjectPreview,
        ObjectRootLabel: ObjectRootLabel,
        ObjectValue: ObjectValue,
        TableInspector: TableInspector$1,
        chromeDark: theme$1,
        chromeLight: theme$2,
        default: Inspector
    });

    var require$$2$1 = /*@__PURE__*/getAugmentedNamespace(reactInspector$1);

    var hasRequired_default;

    function require_default () {
    	if (hasRequired_default) return _default;
    	hasRequired_default = 1;
    	(function (exports) {
    		var __assign = (_default && _default.__assign) || function () {
    		    __assign = Object.assign || function(t) {
    		        for (var s, i = 1, n = arguments.length; i < n; i++) {
    		            s = arguments[i];
    		            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
    		                t[p] = s[p];
    		        }
    		        return t;
    		    };
    		    return __assign.apply(this, arguments);
    		};
    		exports.__esModule = true;
    		var react_inspector_1 = require$$2$1;
    		var styles = function (props) {
    		    var isLight = (props.variant || 'light') === 'light';
    		    var chrome = isLight ? react_inspector_1.chromeLight : react_inspector_1.chromeDark;
    		    return __assign(__assign({}, chrome), { 
    		        /**
    		         * General
    		         */
    		        PADDING: '3px 22px 2px 0', 
    		        /**
    		         * Default log styles
    		         */
    		        LOG_COLOR: chrome.BASE_COLOR, LOG_BACKGROUND: 'transparent', LOG_BORDER: isLight ? 'rgb(236,236,236)' : 'rgb(44,44,44)', LOG_ICON_WIDTH: "".concat(10 / 12, "em"), LOG_ICON_HEIGHT: "".concat(10 / 12, "em"), LOG_ICON_BACKGROUND_SIZE: 'contain', LOG_ICON: 'none', LOG_AMOUNT_BACKGROUND: '#42597f', LOG_AMOUNT_COLOR: '#8d8f91', LOG_LINK_COLOR: isLight ? 'rgb(66, 66, 66)' : 'rgb(177, 177, 177)', 
    		        /**
    		         * Log types
    		         */
    		        LOG_WARN_ICON: "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACkSURBVChTbY7BCoJQFERn0Q/3BX1JuxQjsSCXiV8gtCgxhCIrKIRIqKDVzXl5w5cNHBjm6eGinXiAXu5inY2xYm/mbpIh+vcFhLA3sx0athNUhymEsP+10lAEEA17x8o/9wFuNGnYuVlWve0SQl7P0sBu3aq2R1Q/1JzSkYGd29eqNv2wjdnUuvNRciC/N+qe+7gidbA8zyHkOINsvA/sumcOkjcabcBmw2+mMgAAAABJRU5ErkJggg==)", LOG_WARN_BACKGROUND: isLight ? 'rgb(255,250,220)' : '#332b00', LOG_WARN_COLOR: isLight ? 'rgb(73,45,2)' : '#ffdc9e', LOG_WARN_BORDER: isLight ? 'rgb(255,244,181)' : '#650', LOG_WARN_AMOUNT_BACKGROUND: '#ffbb17', LOG_WARN_AMOUNT_COLOR: '#8d8f91', LOG_ERROR_ICON: "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAADESURBVChTY4CB7ZI8tmfU5E6e01b+DMIgNkgMKg0BR9Vkux6YWPx/bemIgkFiIDmwogOaqrYPzazAEm8DwuGKYGyQHEgNw0VT05Mwib9v3v7/kJEHxiA2TDFIDcNNU4vPMFPACj58/P/v40cwGyYOUsNwy8IZRSFIEUgxskKQGoZrzp4ErQapYbgYHG371M4dLACTQGaD5EBqwD6/FpzQ9dTBE64IhkFiIDmwIhi4mlJqey8o4eR9r8jPIAxig8QgsgwMAFZz1YtGPXgjAAAAAElFTkSuQmCC)", LOG_ERROR_BACKGROUND: isLight ? 'rgb(255,235,235)' : '#290000', LOG_ERROR_BORDER: isLight ? 'rgb(253,204,205)' : '#5b0000', LOG_ERROR_COLOR: isLight ? 'rgb(252,0,5)' : '#ff8080', LOG_ERROR_AMOUNT_BACKGROUND: '#dc2727', LOG_ERROR_AMOUNT_COLOR: '#8d8f91', LOG_DEBUG_ICON: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 459 459'%3e%3cpath fill='%234D88FF' d='M433.5 127.5h-71.4a177.7 177.7 0 0 0-45.9-51L357 35.7 321.3 0l-56.1 56.1c-10.2-2.6-23-5.1-35.7-5.1s-25.5 2.5-35.7 5.1L137.7 0 102 35.7l40.8 40.8a177.7 177.7 0 0 0-45.9 51H25.5v51H79c-2.5 7.7-2.5 17.9-2.5 25.5v25.5h-51v51h51V306a88 88 0 0 0 2.5 25.5H25.5v51h71.4A152.2 152.2 0 0 0 229.5 459c56.1 0 107.1-30.6 132.6-76.5h71.4v-51H380c2.5-7.7 2.5-17.9 2.5-25.5v-25.5h51v-51h-51V204c0-7.7 0-17.9-2.5-25.5h53.5v-51zm-153 204h-102v-51h102v51zm0-102h-102v-51h102v51z'/%3e%3c/svg%3e\")", LOG_DEBUG_BACKGROUND: '', LOG_DEBUG_BORDER: '', LOG_DEBUG_COLOR: '#4D88FF', LOG_COMMAND_ICON: "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABaSURBVChTY6AtmDx5cvnUqVP1oFzsoL+/XwCo8DEQv584caIVVBg7mDBhghxQ4Y2+vr6vU6ZM8YAKYwdA00SB+CxQ8S+g4jCoMCYgSiFRVpPkGaAiHMHDwAAA5Ko+F4/l6+MAAAAASUVORK5CYII=)", LOG_RESULT_ICON: "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABpSURBVChTY6A92LNnj96uXbvKoVzsYMeOHVbbt29/D1T4eP/+/QJQYVSwe/duD6CCr0B8A8iWgwqjAqBk2NatW38B6bPbtm0TBYkBFbsA+c9ANFgRCBCtEASAAoSthgGiPAMD2IOHgQEA521bM7uG52wAAAAASUVORK5CYII=)", LOG_INFO_ICON: "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAADISURBVChTY4ABp/AztmZBZ07qe538rO114rOa8+GTskYHbKHSEOARd6nLIOTsf61gIA46U6kVePYQiK3uc/K/hPG+LrCi8IyrtkZh5yCKgk/80w46ba0RdGYGhH/2v6rXyf88qtttGVwSLp2ECQLxeiAu1wo6uwpJ7L+o2f6TDA6xZz8jCyqFnuHXCj4djywmZXHoM/EK0azGqhBsNYpngL6VCTnGqRF4xgKo+D5IDO4ZEEAKnjcQBafvqwWf/YoSPDCAP8AZGAC7mLM81zgOTQAAAABJRU5ErkJggg==)", 
    		        /**
    		         * Fonts
    		         */
    		        BASE_FONT_FAMILY: 'Consolas, Lucida Console, Courier New, monospace', BASE_FONT_SIZE: '12px', 
    		        /**
    		         * Other
    		         */
    		        ARROW_FONT_SIZE: "".concat(10 / 12, "em"), OBJECT_VALUE_STRING_COLOR: 'rgb(233,63,59)' });
    		};
    		exports["default"] = styles;
    		
    	} (_default));
    	return _default;
    }

    var elements$1 = {};

    var theme = {};

    var reactPropsRegex = /^((children|dangerouslySetInnerHTML|key|ref|autoFocus|defaultValue|defaultChecked|innerHTML|suppressContentEditableWarning|suppressHydrationWarning|valueLink|accept|acceptCharset|accessKey|action|allow|allowUserMedia|allowPaymentRequest|allowFullScreen|allowTransparency|alt|async|autoComplete|autoPlay|capture|cellPadding|cellSpacing|challenge|charSet|checked|cite|classID|className|cols|colSpan|content|contentEditable|contextMenu|controls|controlsList|coords|crossOrigin|data|dateTime|decoding|default|defer|dir|disabled|disablePictureInPicture|download|draggable|encType|form|formAction|formEncType|formMethod|formNoValidate|formTarget|frameBorder|headers|height|hidden|high|href|hrefLang|htmlFor|httpEquiv|id|inputMode|integrity|is|keyParams|keyType|kind|label|lang|list|loading|loop|low|marginHeight|marginWidth|max|maxLength|media|mediaGroup|method|min|minLength|multiple|muted|name|nonce|noValidate|open|optimum|pattern|placeholder|playsInline|poster|preload|profile|radioGroup|readOnly|referrerPolicy|rel|required|reversed|role|rows|rowSpan|sandbox|scope|scoped|scrolling|seamless|selected|shape|size|sizes|slot|span|spellCheck|src|srcDoc|srcLang|srcSet|start|step|style|summary|tabIndex|target|title|type|useMap|value|width|wmode|wrap|about|datatype|inlist|prefix|property|resource|typeof|vocab|autoCapitalize|autoCorrect|autoSave|color|inert|itemProp|itemScope|itemType|itemID|itemRef|on|results|security|unselectable|accentHeight|accumulate|additive|alignmentBaseline|allowReorder|alphabetic|amplitude|arabicForm|ascent|attributeName|attributeType|autoReverse|azimuth|baseFrequency|baselineShift|baseProfile|bbox|begin|bias|by|calcMode|capHeight|clip|clipPathUnits|clipPath|clipRule|colorInterpolation|colorInterpolationFilters|colorProfile|colorRendering|contentScriptType|contentStyleType|cursor|cx|cy|d|decelerate|descent|diffuseConstant|direction|display|divisor|dominantBaseline|dur|dx|dy|edgeMode|elevation|enableBackground|end|exponent|externalResourcesRequired|fill|fillOpacity|fillRule|filter|filterRes|filterUnits|floodColor|floodOpacity|focusable|fontFamily|fontSize|fontSizeAdjust|fontStretch|fontStyle|fontVariant|fontWeight|format|from|fr|fx|fy|g1|g2|glyphName|glyphOrientationHorizontal|glyphOrientationVertical|glyphRef|gradientTransform|gradientUnits|hanging|horizAdvX|horizOriginX|ideographic|imageRendering|in|in2|intercept|k|k1|k2|k3|k4|kernelMatrix|kernelUnitLength|kerning|keyPoints|keySplines|keyTimes|lengthAdjust|letterSpacing|lightingColor|limitingConeAngle|local|markerEnd|markerMid|markerStart|markerHeight|markerUnits|markerWidth|mask|maskContentUnits|maskUnits|mathematical|mode|numOctaves|offset|opacity|operator|order|orient|orientation|origin|overflow|overlinePosition|overlineThickness|panose1|paintOrder|pathLength|patternContentUnits|patternTransform|patternUnits|pointerEvents|points|pointsAtX|pointsAtY|pointsAtZ|preserveAlpha|preserveAspectRatio|primitiveUnits|r|radius|refX|refY|renderingIntent|repeatCount|repeatDur|requiredExtensions|requiredFeatures|restart|result|rotate|rx|ry|scale|seed|shapeRendering|slope|spacing|specularConstant|specularExponent|speed|spreadMethod|startOffset|stdDeviation|stemh|stemv|stitchTiles|stopColor|stopOpacity|strikethroughPosition|strikethroughThickness|string|stroke|strokeDasharray|strokeDashoffset|strokeLinecap|strokeLinejoin|strokeMiterlimit|strokeOpacity|strokeWidth|surfaceScale|systemLanguage|tableValues|targetX|targetY|textAnchor|textDecoration|textRendering|textLength|to|transform|u1|u2|underlinePosition|underlineThickness|unicode|unicodeBidi|unicodeRange|unitsPerEm|vAlphabetic|vHanging|vIdeographic|vMathematical|values|vectorEffect|version|vertAdvY|vertOriginX|vertOriginY|viewBox|viewTarget|visibility|widths|wordSpacing|writingMode|x|xHeight|x1|x2|xChannelSelector|xlinkActuate|xlinkArcrole|xlinkHref|xlinkRole|xlinkShow|xlinkTitle|xlinkType|xmlBase|xmlns|xmlnsXlink|xmlLang|xmlSpace|y|y1|y2|yChannelSelector|z|zoomAndPan|for|class|autofocus)|(([Dd][Aa][Tt][Aa]|[Aa][Rr][Ii][Aa]|x)-.*))$/; // https://esbench.com/bench/5bfee68a4cd7e6009ef61d23

    var index = memoize(function (prop) {
      return reactPropsRegex.test(prop) || prop.charCodeAt(0) === 111
      /* o */
      && prop.charCodeAt(1) === 110
      /* n */
      && prop.charCodeAt(2) < 91;
    }
    /* Z+1 */
    );

    var testOmitPropsOnStringTag = index;

    var testOmitPropsOnComponent = function testOmitPropsOnComponent(key) {
      return key !== 'theme' && key !== 'innerRef';
    };

    var getDefaultShouldForwardProp = function getDefaultShouldForwardProp(tag) {
      return typeof tag === 'string' && // 96 is one less than the char code
      // for "a" so this is checking that
      // it's a lowercase character
      tag.charCodeAt(0) > 96 ? testOmitPropsOnStringTag : testOmitPropsOnComponent;
    };

    function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

    function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty$1(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }
    var ILLEGAL_ESCAPE_SEQUENCE_ERROR = "You have illegal escape sequence in your template literal, most likely inside content's property value.\nBecause you write your CSS inside a JavaScript string you actually have to do double escaping, so for example \"content: '\\00d7';\" should become \"content: '\\\\00d7';\".\nYou can read more about this here:\nhttps://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#ES2018_revision_of_illegal_escape_sequences";

    var Noop = function Noop() {
      return null;
    };

    var createStyled = function createStyled(tag, options) {
      {
        if (tag === undefined) {
          throw new Error('You are trying to create a styled element with an undefined component.\nYou may have forgotten to import it.');
        }
      }

      var identifierName;
      var shouldForwardProp;
      var targetClassName;

      if (options !== undefined) {
        identifierName = options.label;
        targetClassName = options.target;
        shouldForwardProp = tag.__emotion_forwardProp && options.shouldForwardProp ? function (propName) {
          return tag.__emotion_forwardProp(propName) && // $FlowFixMe
          options.shouldForwardProp(propName);
        } : options.shouldForwardProp;
      }

      var isReal = tag.__emotion_real === tag;
      var baseTag = isReal && tag.__emotion_base || tag;

      if (typeof shouldForwardProp !== 'function' && isReal) {
        shouldForwardProp = tag.__emotion_forwardProp;
      }

      var defaultShouldForwardProp = shouldForwardProp || getDefaultShouldForwardProp(baseTag);
      var shouldUseAs = !defaultShouldForwardProp('as');
      return function () {
        var args = arguments;
        var styles = isReal && tag.__emotion_styles !== undefined ? tag.__emotion_styles.slice(0) : [];

        if (identifierName !== undefined) {
          styles.push("label:" + identifierName + ";");
        }

        if (args[0] == null || args[0].raw === undefined) {
          styles.push.apply(styles, args);
        } else {
          if (args[0][0] === undefined) {
            console.error(ILLEGAL_ESCAPE_SEQUENCE_ERROR);
          }

          styles.push(args[0][0]);
          var len = args.length;
          var i = 1;

          for (; i < len; i++) {
            if (args[0][i] === undefined) {
              console.error(ILLEGAL_ESCAPE_SEQUENCE_ERROR);
            }

            styles.push(args[i], args[0][i]);
          }
        } // $FlowFixMe: we need to cast StatelessFunctionalComponent to our PrivateStyledComponent class


        var Styled = withEmotionCache(function (props, context, ref) {
          return /*#__PURE__*/reactExports.createElement(ThemeContext$1.Consumer, null, function (theme) {
            var finalTag = shouldUseAs && props.as || baseTag;
            var className = '';
            var classInterpolations = [];
            var mergedProps = props;

            if (props.theme == null) {
              mergedProps = {};

              for (var key in props) {
                mergedProps[key] = props[key];
              }

              mergedProps.theme = theme;
            }

            if (typeof props.className === 'string') {
              className = getRegisteredStyles(context.registered, classInterpolations, props.className);
            } else if (props.className != null) {
              className = props.className + " ";
            }

            var serialized = serializeStyles(styles.concat(classInterpolations), context.registered, mergedProps);
            insertStyles(context, serialized, typeof finalTag === 'string');
            className += context.key + "-" + serialized.name;

            if (targetClassName !== undefined) {
              className += " " + targetClassName;
            }

            var finalShouldForwardProp = shouldUseAs && shouldForwardProp === undefined ? getDefaultShouldForwardProp(finalTag) : defaultShouldForwardProp;
            var newProps = {};

            for (var _key in props) {
              if (shouldUseAs && _key === 'as') continue;

              if ( // $FlowFixMe
              finalShouldForwardProp(_key)) {
                newProps[_key] = props[_key];
              }
            }

            newProps.className = className;
            newProps.ref = ref || props.innerRef;

            if (props.innerRef) {
              console.error('`innerRef` is deprecated and will be removed in a future major version of Emotion, please use the `ref` prop instead' + (identifierName === undefined ? '' : " in the usage of `" + identifierName + "`"));
            }

            var ele = /*#__PURE__*/reactExports.createElement(finalTag, newProps);
            var possiblyStyleElement = /*#__PURE__*/reactExports.createElement(Noop, null);


            return /*#__PURE__*/reactExports.createElement(reactExports.Fragment, null, possiblyStyleElement, ele);
          });
        });
        Styled.displayName = identifierName !== undefined ? identifierName : "Styled(" + (typeof baseTag === 'string' ? baseTag : baseTag.displayName || baseTag.name || 'Component') + ")";
        Styled.defaultProps = tag.defaultProps;
        Styled.__emotion_real = Styled;
        Styled.__emotion_base = baseTag;
        Styled.__emotion_styles = styles;
        Styled.__emotion_forwardProp = shouldForwardProp;
        Object.defineProperty(Styled, 'toString', {
          value: function value() {
            if (targetClassName === undefined && "development" !== 'production') {
              return 'NO_COMPONENT_SELECTOR';
            } // $FlowFixMe: coerce undefined to string


            return "." + targetClassName;
          }
        });

        Styled.withComponent = function (nextTag, nextOptions) {
          return createStyled(nextTag, nextOptions !== undefined ? _objectSpread({}, options || {}, {}, nextOptions) : options).apply(void 0, styles);
        };

        return Styled;
      };
    };

    var tags = ['a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo', 'big', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'keygen', 'label', 'legend', 'li', 'link', 'main', 'map', 'mark', 'marquee', 'menu', 'menuitem', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section', 'select', 'small', 'source', 'span', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr', // SVG
    'circle', 'clipPath', 'defs', 'ellipse', 'foreignObject', 'g', 'image', 'line', 'linearGradient', 'mask', 'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect', 'stop', 'svg', 'text', 'tspan'];

    var newStyled = createStyled.bind();
    tags.forEach(function (tagName) {
      newStyled[tagName] = newStyled(tagName);
    });

    var styled_browser_esm = /*#__PURE__*/Object.freeze({
        __proto__: null,
        default: newStyled
    });

    var require$$0 = /*@__PURE__*/getAugmentedNamespace(styled_browser_esm);

    var hasRequiredTheme;

    function requireTheme () {
    	if (hasRequiredTheme) return theme;
    	hasRequiredTheme = 1;
    	(function (exports) {
    		var __importDefault = (theme && theme.__importDefault) || function (mod) {
    		    return (mod && mod.__esModule) ? mod : { "default": mod };
    		};
    		exports.__esModule = true;
    		var styled_1 = __importDefault(require$$0);
    		exports["default"] = styled_1["default"];
    		
    	} (theme));
    	return theme;
    }

    var hasRequiredElements$1;

    function requireElements$1 () {
    	if (hasRequiredElements$1) return elements$1;
    	hasRequiredElements$1 = 1;
    	var __importDefault = (elements$1 && elements$1.__importDefault) || function (mod) {
    	    return (mod && mod.__esModule) ? mod : { "default": mod };
    	};
    	elements$1.__esModule = true;
    	elements$1.Content = elements$1.Timestamp = elements$1.AmountIcon = elements$1.Icon = elements$1.IconContainer = elements$1.Message = elements$1.Root = void 0;
    	var theme_1 = __importDefault(requireTheme());
    	/**
    	 * Return themed log-method style
    	 * @param style The style
    	 * @param type The method
    	 */
    	var Themed = function (style, method, styles) {
    	    return styles["LOG_".concat(method.toUpperCase(), "_").concat(style.toUpperCase())] ||
    	        styles["LOG_".concat(style.toUpperCase())];
    	};
    	/**
    	 * console-feed
    	 */
    	elements$1.Root = (0, theme_1["default"])('div')({
    	    wordBreak: 'break-word',
    	    width: '100%'
    	});
    	/**
    	 * console-message
    	 */
    	elements$1.Message = (0, theme_1["default"])('div')(function (_a) {
    	    var _b = _a.theme, styles = _b.styles, method = _b.method;
    	    return ({
    	        position: 'relative',
    	        display: 'flex',
    	        color: Themed('color', method, styles),
    	        backgroundColor: Themed('background', method, styles),
    	        borderTop: "1px solid ".concat(Themed('border', method, styles)),
    	        borderBottom: "1px solid ".concat(Themed('border', method, styles)),
    	        marginTop: -1,
    	        marginBottom: +/^warn|error$/.test(method),
    	        padding: styles.PADDING,
    	        boxSizing: 'border-box',
    	        '& *': {
    	            boxSizing: 'border-box',
    	            fontFamily: styles.BASE_FONT_FAMILY,
    	            whiteSpace: 'pre-wrap',
    	            fontSize: styles.BASE_FONT_SIZE
    	        },
    	        '& a': {
    	            color: styles.LOG_LINK_COLOR
    	        }
    	    });
    	});
    	/**
    	 * Icon container
    	 */
    	elements$1.IconContainer = (0, theme_1["default"])('div')(function () { return ({
    	    paddingLeft: 10
    	}); });
    	/**
    	 * message-icon
    	 */
    	elements$1.Icon = (0, theme_1["default"])('div')(function (_a) {
    	    var _b = _a.theme, styles = _b.styles, method = _b.method;
    	    return ({
    	        width: styles.LOG_ICON_WIDTH,
    	        height: styles.LOG_ICON_HEIGHT,
    	        backgroundImage: Themed('icon', method, styles),
    	        backgroundRepeat: 'no-repeat',
    	        backgroundSize: styles.LOG_ICON_BACKGROUND_SIZE,
    	        backgroundPosition: 'center'
    	    });
    	});
    	/**
    	 * message-amount
    	 */
    	elements$1.AmountIcon = (0, theme_1["default"])('div')(function (_a) {
    	    var _b = _a.theme, styles = _b.styles, method = _b.method;
    	    return ({
    	        // make it a circle if the amount is one digit
    	        minWidth: "".concat(16 / 12, "em"),
    	        height: "".concat(16 / 12, "em"),
    	        margin: '1px 0',
    	        whiteSpace: 'nowrap',
    	        fontSize: "".concat(10 / 12, "em!important"),
    	        padding: '0px 3px',
    	        background: Themed('amount_background', method, styles),
    	        color: Themed('amount_color', method, styles),
    	        borderRadius: '9999px',
    	        display: 'flex',
    	        alignItems: 'center',
    	        justifyContent: 'center'
    	    });
    	});
    	/**
    	 * timestamp
    	 */
    	elements$1.Timestamp = (0, theme_1["default"])('div')(function (_a) {
    	    var _b = _a.theme; _b.styles; _b.method;
    	    return ({
    	        marginLeft: 5,
    	        color: 'dimgray'
    	    });
    	});
    	/**
    	 * console-content
    	 */
    	elements$1.Content = (0, theme_1["default"])('div')(function (_a) {
    	    _a.theme.styles;
    	    return ({
    	        clear: 'right',
    	        position: 'relative',
    	        marginLeft: 15,
    	        flex: 1
    	    });
    	});
    	
    	return elements$1;
    }

    var Message = {};

    const ZWSP = "\u200B";
    const InlineCenter = ({ children, disabled = false }) => disabled ? children : /* @__PURE__ */ React.createElement("span", {
      style: { display: "inline-flex", alignItems: "center" }
    }, ZWSP, children);
    var react_inline_center_default = InlineCenter;

    var index_esm = /*#__PURE__*/Object.freeze({
        __proto__: null,
        default: react_inline_center_default
    });

    var require$$2 = /*@__PURE__*/getAugmentedNamespace(index_esm);

    var Formatted = {};

    var elements = {};

    var hasRequiredElements;

    function requireElements () {
    	if (hasRequiredElements) return elements;
    	hasRequiredElements = 1;
    	var __importDefault = (elements && elements.__importDefault) || function (mod) {
    	    return (mod && mod.__esModule) ? mod : { "default": mod };
    	};
    	elements.__esModule = true;
    	elements.Constructor = elements.HTML = elements.Table = elements.Root = void 0;
    	var theme_1 = __importDefault(requireTheme());
    	/**
    	 * Object root
    	 */
    	elements.Root = (0, theme_1["default"])('div')({
    	    display: 'inline-block',
    	    wordBreak: 'break-all',
    	    '&::after': {
    	        content: "' '",
    	        display: 'inline-block'
    	    },
    	    '& > li, & > ol, & > details': {
    	        backgroundColor: 'transparent !important',
    	        display: 'inline-block'
    	    },
    	    '& ol:empty': {
    	        paddingLeft: '0 !important'
    	    }
    	});
    	/**
    	 * Table
    	 */
    	elements.Table = (0, theme_1["default"])('span')({
    	    '& > li': {
    	        display: 'inline-block',
    	        marginTop: 5
    	    },
    	    // override react-inspector/TableInspectorHeaderContainer.base
    	    '& div[style*="height: 17px"]': {
    	        height: "".concat(17 / 12, "em!important")
    	    },
    	    // override react-inspector/TableInspectorDataContainer.td
    	    '& td[style*="height: 16px"]': {
    	        height: "".concat(16 / 12, "em!important"),
    	        lineHeight: "1!important",
    	        verticalAlign: 'middle!important'
    	    },
    	    '& table[style*="background-size: 128px 32px"]': {
    	        // = td's fontSize * 2
    	        backgroundSize: "128px ".concat((16 / 12) * 2, "em!important")
    	    }
    	});
    	/**
    	 * HTML
    	 */
    	elements.HTML = (0, theme_1["default"])('span')({
    	    display: 'inline-block',
    	    '& div:hover': {
    	        backgroundColor: 'rgba(255, 220, 158, .05) !important',
    	        borderRadius: '2px'
    	    }
    	});
    	/**
    	 * Object constructor
    	 */
    	elements.Constructor = (0, theme_1["default"])('span')({
    	    '& > span > span:nth-child(1)': {
    	        opacity: 0.6
    	    }
    	});
    	
    	return elements;
    }

    var devtoolsParser = {};

    var linkifyHtml = {};

    var simpleHtmlTokenizer = {};

    var html5NamedCharRefs = {};

    var hasRequiredHtml5NamedCharRefs;

    function requireHtml5NamedCharRefs () {
    	if (hasRequiredHtml5NamedCharRefs) return html5NamedCharRefs;
    	hasRequiredHtml5NamedCharRefs = 1;

    	html5NamedCharRefs.__esModule = true;
    	var HTML5NamedCharRefs = {
    	    // We don't need the complete named character reference because linkifyHtml
    	    // does not modify the escape sequences. We do need &nbsp; so that
    	    // whitespace is parsed properly. Other types of whitespace should already
    	    // be accounted for
    	    nbsp: "\xA0"
    	};
    	html5NamedCharRefs.default = HTML5NamedCharRefs;
    	return html5NamedCharRefs;
    }

    var entityParser = {};

    var hasRequiredEntityParser;

    function requireEntityParser () {
    	if (hasRequiredEntityParser) return entityParser;
    	hasRequiredEntityParser = 1;

    	entityParser.__esModule = true;
    	function EntityParser(named) {
    	  this.named = named;
    	}

    	var HEXCHARCODE = /^#[xX]([A-Fa-f0-9]+)$/;
    	var CHARCODE = /^#([0-9]+)$/;
    	var NAMED = /^([A-Za-z0-9]+)$/;

    	EntityParser.prototype.parse = function (entity) {
    	  if (!entity) {
    	    return;
    	  }
    	  var matches = entity.match(HEXCHARCODE);
    	  if (matches) {
    	    return "&#x" + matches[1] + ";";
    	  }
    	  matches = entity.match(CHARCODE);
    	  if (matches) {
    	    return "&#" + matches[1] + ";";
    	  }
    	  matches = entity.match(NAMED);
    	  if (matches) {
    	    return this.named[matches[1]] || "&" + matches[1] + ";";
    	  }
    	};

    	entityParser.default = EntityParser;
    	return entityParser;
    }

    var eventedTokenizer = {};

    var utils = {};

    var hasRequiredUtils;

    function requireUtils () {
    	if (hasRequiredUtils) return utils;
    	hasRequiredUtils = 1;

    	utils.__esModule = true;
    	utils.isSpace = isSpace;
    	utils.isAlpha = isAlpha;
    	utils.preprocessInput = preprocessInput;
    	var WSP = /[\t\n\f ]/;
    	var ALPHA = /[A-Za-z]/;
    	var CRLF = /\r\n?/g;

    	function isSpace(char) {
    	  return WSP.test(char);
    	}

    	function isAlpha(char) {
    	  return ALPHA.test(char);
    	}

    	function preprocessInput(input) {
    	  return input.replace(CRLF, "\n");
    	}
    	return utils;
    }

    var hasRequiredEventedTokenizer;

    function requireEventedTokenizer () {
    	if (hasRequiredEventedTokenizer) return eventedTokenizer;
    	hasRequiredEventedTokenizer = 1;

    	eventedTokenizer.__esModule = true;

    	var _utils = requireUtils();

    	function EventedTokenizer(delegate, entityParser) {
    	  this.delegate = delegate;
    	  this.entityParser = entityParser;

    	  this.state = null;
    	  this.input = null;

    	  this.index = -1;
    	  this.line = -1;
    	  this.column = -1;
    	  this.tagLine = -1;
    	  this.tagColumn = -1;

    	  this.reset();
    	}

    	EventedTokenizer.prototype = {
    	  reset: function reset() {
    	    this.state = 'beforeData';
    	    this.input = '';

    	    this.index = 0;
    	    this.line = 1;
    	    this.column = 0;

    	    this.tagLine = -1;
    	    this.tagColumn = -1;

    	    this.delegate.reset();
    	  },

    	  tokenize: function tokenize(input) {
    	    this.reset();
    	    this.tokenizePart(input);
    	    this.tokenizeEOF();
    	  },

    	  tokenizePart: function tokenizePart(input) {
    	    this.input += (0, _utils.preprocessInput)(input);

    	    while (this.index < this.input.length) {
    	      this.states[this.state].call(this);
    	    }
    	  },

    	  tokenizeEOF: function tokenizeEOF() {
    	    this.flushData();
    	  },

    	  flushData: function flushData() {
    	    if (this.state === 'data') {
    	      this.delegate.finishData();
    	      this.state = 'beforeData';
    	    }
    	  },

    	  peek: function peek() {
    	    return this.input.charAt(this.index);
    	  },

    	  consume: function consume() {
    	    var char = this.peek();

    	    this.index++;

    	    if (char === "\n") {
    	      this.line++;
    	      this.column = 0;
    	    } else {
    	      this.column++;
    	    }

    	    return char;
    	  },

    	  consumeCharRef: function consumeCharRef() {
    	    var endIndex = this.input.indexOf(';', this.index);
    	    if (endIndex === -1) {
    	      return;
    	    }
    	    var entity = this.input.slice(this.index, endIndex);
    	    var chars = this.entityParser.parse(entity);
    	    if (chars) {
    	      var count = entity.length;
    	      // consume the entity chars
    	      while (count) {
    	        this.consume();
    	        count--;
    	      }
    	      // consume the `;`
    	      this.consume();

    	      return chars;
    	    }
    	  },

    	  markTagStart: function markTagStart() {
    	    // these properties to be removed in next major bump
    	    this.tagLine = this.line;
    	    this.tagColumn = this.column;

    	    if (this.delegate.tagOpen) {
    	      this.delegate.tagOpen();
    	    }
    	  },

    	  states: {
    	    beforeData: function beforeData() {
    	      var char = this.peek();

    	      if (char === "<") {
    	        this.state = 'tagOpen';
    	        this.markTagStart();
    	        this.consume();
    	      } else {
    	        this.state = 'data';
    	        this.delegate.beginData();
    	      }
    	    },

    	    data: function data() {
    	      var char = this.peek();

    	      if (char === "<") {
    	        this.delegate.finishData();
    	        this.state = 'tagOpen';
    	        this.markTagStart();
    	        this.consume();
    	      } else if (char === "&") {
    	        this.consume();
    	        this.delegate.appendToData(this.consumeCharRef() || "&");
    	      } else {
    	        this.consume();
    	        this.delegate.appendToData(char);
    	      }
    	    },

    	    tagOpen: function tagOpen() {
    	      var char = this.consume();

    	      if (char === "!") {
    	        this.state = 'markupDeclaration';
    	      } else if (char === "/") {
    	        this.state = 'endTagOpen';
    	      } else if ((0, _utils.isAlpha)(char)) {
    	        this.state = 'tagName';
    	        this.delegate.beginStartTag();
    	        this.delegate.appendToTagName(char.toLowerCase());
    	      }
    	    },

    	    markupDeclaration: function markupDeclaration() {
    	      var char = this.consume();

    	      if (char === "-" && this.input.charAt(this.index) === "-") {
    	        this.consume();
    	        this.state = 'commentStart';
    	        this.delegate.beginComment();
    	      }
    	    },

    	    commentStart: function commentStart() {
    	      var char = this.consume();

    	      if (char === "-") {
    	        this.state = 'commentStartDash';
    	      } else if (char === ">") {
    	        this.delegate.finishComment();
    	        this.state = 'beforeData';
    	      } else {
    	        this.delegate.appendToCommentData(char);
    	        this.state = 'comment';
    	      }
    	    },

    	    commentStartDash: function commentStartDash() {
    	      var char = this.consume();

    	      if (char === "-") {
    	        this.state = 'commentEnd';
    	      } else if (char === ">") {
    	        this.delegate.finishComment();
    	        this.state = 'beforeData';
    	      } else {
    	        this.delegate.appendToCommentData("-");
    	        this.state = 'comment';
    	      }
    	    },

    	    comment: function comment() {
    	      var char = this.consume();

    	      if (char === "-") {
    	        this.state = 'commentEndDash';
    	      } else {
    	        this.delegate.appendToCommentData(char);
    	      }
    	    },

    	    commentEndDash: function commentEndDash() {
    	      var char = this.consume();

    	      if (char === "-") {
    	        this.state = 'commentEnd';
    	      } else {
    	        this.delegate.appendToCommentData("-" + char);
    	        this.state = 'comment';
    	      }
    	    },

    	    commentEnd: function commentEnd() {
    	      var char = this.consume();

    	      if (char === ">") {
    	        this.delegate.finishComment();
    	        this.state = 'beforeData';
    	      } else {
    	        this.delegate.appendToCommentData("--" + char);
    	        this.state = 'comment';
    	      }
    	    },

    	    tagName: function tagName() {
    	      var char = this.consume();

    	      if ((0, _utils.isSpace)(char)) {
    	        this.state = 'beforeAttributeName';
    	      } else if (char === "/") {
    	        this.state = 'selfClosingStartTag';
    	      } else if (char === ">") {
    	        this.delegate.finishTag();
    	        this.state = 'beforeData';
    	      } else {
    	        this.delegate.appendToTagName(char);
    	      }
    	    },

    	    beforeAttributeName: function beforeAttributeName() {
    	      var char = this.peek();

    	      if ((0, _utils.isSpace)(char)) {
    	        this.consume();
    	        return;
    	      } else if (char === "/") {
    	        this.state = 'selfClosingStartTag';
    	        this.consume();
    	      } else if (char === ">") {
    	        this.consume();
    	        this.delegate.finishTag();
    	        this.state = 'beforeData';
    	      } else {
    	        this.state = 'attributeName';
    	        this.delegate.beginAttribute();
    	        this.consume();
    	        this.delegate.appendToAttributeName(char);
    	      }
    	    },

    	    attributeName: function attributeName() {
    	      var char = this.peek();

    	      if ((0, _utils.isSpace)(char)) {
    	        this.state = 'afterAttributeName';
    	        this.consume();
    	      } else if (char === "/") {
    	        this.delegate.beginAttributeValue(false);
    	        this.delegate.finishAttributeValue();
    	        this.consume();
    	        this.state = 'selfClosingStartTag';
    	      } else if (char === "=") {
    	        this.state = 'beforeAttributeValue';
    	        this.consume();
    	      } else if (char === ">") {
    	        this.delegate.beginAttributeValue(false);
    	        this.delegate.finishAttributeValue();
    	        this.consume();
    	        this.delegate.finishTag();
    	        this.state = 'beforeData';
    	      } else {
    	        this.consume();
    	        this.delegate.appendToAttributeName(char);
    	      }
    	    },

    	    afterAttributeName: function afterAttributeName() {
    	      var char = this.peek();

    	      if ((0, _utils.isSpace)(char)) {
    	        this.consume();
    	        return;
    	      } else if (char === "/") {
    	        this.delegate.beginAttributeValue(false);
    	        this.delegate.finishAttributeValue();
    	        this.consume();
    	        this.state = 'selfClosingStartTag';
    	      } else if (char === "=") {
    	        this.consume();
    	        this.state = 'beforeAttributeValue';
    	      } else if (char === ">") {
    	        this.delegate.beginAttributeValue(false);
    	        this.delegate.finishAttributeValue();
    	        this.consume();
    	        this.delegate.finishTag();
    	        this.state = 'beforeData';
    	      } else {
    	        this.delegate.beginAttributeValue(false);
    	        this.delegate.finishAttributeValue();
    	        this.consume();
    	        this.state = 'attributeName';
    	        this.delegate.beginAttribute();
    	        this.delegate.appendToAttributeName(char);
    	      }
    	    },

    	    beforeAttributeValue: function beforeAttributeValue() {
    	      var char = this.peek();

    	      if ((0, _utils.isSpace)(char)) {
    	        this.consume();
    	      } else if (char === '"') {
    	        this.state = 'attributeValueDoubleQuoted';
    	        this.delegate.beginAttributeValue(true);
    	        this.consume();
    	      } else if (char === "'") {
    	        this.state = 'attributeValueSingleQuoted';
    	        this.delegate.beginAttributeValue(true);
    	        this.consume();
    	      } else if (char === ">") {
    	        this.delegate.beginAttributeValue(false);
    	        this.delegate.finishAttributeValue();
    	        this.consume();
    	        this.delegate.finishTag();
    	        this.state = 'beforeData';
    	      } else {
    	        this.state = 'attributeValueUnquoted';
    	        this.delegate.beginAttributeValue(false);
    	        this.consume();
    	        this.delegate.appendToAttributeValue(char);
    	      }
    	    },

    	    attributeValueDoubleQuoted: function attributeValueDoubleQuoted() {
    	      var char = this.consume();

    	      if (char === '"') {
    	        this.delegate.finishAttributeValue();
    	        this.state = 'afterAttributeValueQuoted';
    	      } else if (char === "&") {
    	        this.delegate.appendToAttributeValue(this.consumeCharRef('"') || "&");
    	      } else {
    	        this.delegate.appendToAttributeValue(char);
    	      }
    	    },

    	    attributeValueSingleQuoted: function attributeValueSingleQuoted() {
    	      var char = this.consume();

    	      if (char === "'") {
    	        this.delegate.finishAttributeValue();
    	        this.state = 'afterAttributeValueQuoted';
    	      } else if (char === "&") {
    	        this.delegate.appendToAttributeValue(this.consumeCharRef("'") || "&");
    	      } else {
    	        this.delegate.appendToAttributeValue(char);
    	      }
    	    },

    	    attributeValueUnquoted: function attributeValueUnquoted() {
    	      var char = this.peek();

    	      if ((0, _utils.isSpace)(char)) {
    	        this.delegate.finishAttributeValue();
    	        this.consume();
    	        this.state = 'beforeAttributeName';
    	      } else if (char === "&") {
    	        this.consume();
    	        this.delegate.appendToAttributeValue(this.consumeCharRef(">") || "&");
    	      } else if (char === ">") {
    	        this.delegate.finishAttributeValue();
    	        this.consume();
    	        this.delegate.finishTag();
    	        this.state = 'beforeData';
    	      } else {
    	        this.consume();
    	        this.delegate.appendToAttributeValue(char);
    	      }
    	    },

    	    afterAttributeValueQuoted: function afterAttributeValueQuoted() {
    	      var char = this.peek();

    	      if ((0, _utils.isSpace)(char)) {
    	        this.consume();
    	        this.state = 'beforeAttributeName';
    	      } else if (char === "/") {
    	        this.consume();
    	        this.state = 'selfClosingStartTag';
    	      } else if (char === ">") {
    	        this.consume();
    	        this.delegate.finishTag();
    	        this.state = 'beforeData';
    	      } else {
    	        this.state = 'beforeAttributeName';
    	      }
    	    },

    	    selfClosingStartTag: function selfClosingStartTag() {
    	      var char = this.peek();

    	      if (char === ">") {
    	        this.consume();
    	        this.delegate.markTagAsSelfClosing();
    	        this.delegate.finishTag();
    	        this.state = 'beforeData';
    	      } else {
    	        this.state = 'beforeAttributeName';
    	      }
    	    },

    	    endTagOpen: function endTagOpen() {
    	      var char = this.consume();

    	      if ((0, _utils.isAlpha)(char)) {
    	        this.state = 'tagName';
    	        this.delegate.beginEndTag();
    	        this.delegate.appendToTagName(char.toLowerCase());
    	      }
    	    }
    	  }
    	};

    	eventedTokenizer.default = EventedTokenizer;
    	return eventedTokenizer;
    }

    var tokenizer = {};

    var hasRequiredTokenizer;

    function requireTokenizer () {
    	if (hasRequiredTokenizer) return tokenizer;
    	hasRequiredTokenizer = 1;

    	tokenizer.__esModule = true;

    	var _eventedTokenizer = requireEventedTokenizer();

    	var _eventedTokenizer2 = _interopRequireDefault(_eventedTokenizer);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function Tokenizer(entityParser, options) {
    	  this.token = null;
    	  this.startLine = 1;
    	  this.startColumn = 0;
    	  this.options = options || {};
    	  this.tokenizer = new _eventedTokenizer2.default(this, entityParser);
    	}

    	Tokenizer.prototype = {
    	  tokenize: function tokenize(input) {
    	    this.tokens = [];
    	    this.tokenizer.tokenize(input);
    	    return this.tokens;
    	  },

    	  tokenizePart: function tokenizePart(input) {
    	    this.tokens = [];
    	    this.tokenizer.tokenizePart(input);
    	    return this.tokens;
    	  },

    	  tokenizeEOF: function tokenizeEOF() {
    	    this.tokens = [];
    	    this.tokenizer.tokenizeEOF();
    	    return this.tokens[0];
    	  },

    	  reset: function reset() {
    	    this.token = null;
    	    this.startLine = 1;
    	    this.startColumn = 0;
    	  },

    	  addLocInfo: function addLocInfo() {
    	    if (this.options.loc) {
    	      this.token.loc = {
    	        start: {
    	          line: this.startLine,
    	          column: this.startColumn
    	        },
    	        end: {
    	          line: this.tokenizer.line,
    	          column: this.tokenizer.column
    	        }
    	      };
    	    }
    	    this.startLine = this.tokenizer.line;
    	    this.startColumn = this.tokenizer.column;
    	  },

    	  // Data

    	  beginData: function beginData() {
    	    this.token = {
    	      type: 'Chars',
    	      chars: ''
    	    };
    	    this.tokens.push(this.token);
    	  },

    	  appendToData: function appendToData(char) {
    	    this.token.chars += char;
    	  },

    	  finishData: function finishData() {
    	    this.addLocInfo();
    	  },

    	  // Comment

    	  beginComment: function beginComment() {
    	    this.token = {
    	      type: 'Comment',
    	      chars: ''
    	    };
    	    this.tokens.push(this.token);
    	  },

    	  appendToCommentData: function appendToCommentData(char) {
    	    this.token.chars += char;
    	  },

    	  finishComment: function finishComment() {
    	    this.addLocInfo();
    	  },

    	  // Tags - basic

    	  beginStartTag: function beginStartTag() {
    	    this.token = {
    	      type: 'StartTag',
    	      tagName: '',
    	      attributes: [],
    	      selfClosing: false
    	    };
    	    this.tokens.push(this.token);
    	  },

    	  beginEndTag: function beginEndTag() {
    	    this.token = {
    	      type: 'EndTag',
    	      tagName: ''
    	    };
    	    this.tokens.push(this.token);
    	  },

    	  finishTag: function finishTag() {
    	    this.addLocInfo();
    	  },

    	  markTagAsSelfClosing: function markTagAsSelfClosing() {
    	    this.token.selfClosing = true;
    	  },

    	  // Tags - name

    	  appendToTagName: function appendToTagName(char) {
    	    this.token.tagName += char;
    	  },

    	  // Tags - attributes

    	  beginAttribute: function beginAttribute() {
    	    this._currentAttribute = ["", "", null];
    	    this.token.attributes.push(this._currentAttribute);
    	  },

    	  appendToAttributeName: function appendToAttributeName(char) {
    	    this._currentAttribute[0] += char;
    	  },

    	  beginAttributeValue: function beginAttributeValue(isQuoted) {
    	    this._currentAttribute[2] = isQuoted;
    	  },

    	  appendToAttributeValue: function appendToAttributeValue(char) {
    	    this._currentAttribute[1] = this._currentAttribute[1] || "";
    	    this._currentAttribute[1] += char;
    	  },

    	  finishAttributeValue: function finishAttributeValue() {}
    	};

    	tokenizer.default = Tokenizer;
    	return tokenizer;
    }

    var tokenize = {};

    var hasRequiredTokenize;

    function requireTokenize () {
    	if (hasRequiredTokenize) return tokenize;
    	hasRequiredTokenize = 1;

    	tokenize.__esModule = true;
    	tokenize.default = tokenize$1;

    	var _tokenizer = requireTokenizer();

    	var _tokenizer2 = _interopRequireDefault(_tokenizer);

    	var _entityParser = requireEntityParser();

    	var _entityParser2 = _interopRequireDefault(_entityParser);

    	var _html5NamedCharRefs = requireHtml5NamedCharRefs();

    	var _html5NamedCharRefs2 = _interopRequireDefault(_html5NamedCharRefs);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function tokenize$1(input, options) {
    	  var tokenizer = new _tokenizer2.default(new _entityParser2.default(_html5NamedCharRefs2.default), options);
    	  return tokenizer.tokenize(input);
    	}
    	return tokenize;
    }

    var hasRequiredSimpleHtmlTokenizer;

    function requireSimpleHtmlTokenizer () {
    	if (hasRequiredSimpleHtmlTokenizer) return simpleHtmlTokenizer;
    	hasRequiredSimpleHtmlTokenizer = 1;

    	simpleHtmlTokenizer.__esModule = true;

    	var _html5NamedCharRefs = requireHtml5NamedCharRefs();

    	var _html5NamedCharRefs2 = _interopRequireDefault(_html5NamedCharRefs);

    	var _entityParser = requireEntityParser();

    	var _entityParser2 = _interopRequireDefault(_entityParser);

    	var _eventedTokenizer = requireEventedTokenizer();

    	var _eventedTokenizer2 = _interopRequireDefault(_eventedTokenizer);

    	var _tokenizer = requireTokenizer();

    	var _tokenizer2 = _interopRequireDefault(_tokenizer);

    	var _tokenize = requireTokenize();

    	var _tokenize2 = _interopRequireDefault(_tokenize);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var HTML5Tokenizer = {
    		HTML5NamedCharRefs: _html5NamedCharRefs2.default,
    		EntityParser: _entityParser2.default,
    		EventedTokenizer: _eventedTokenizer2.default,
    		Tokenizer: _tokenizer2.default,
    		tokenize: _tokenize2.default
    	};

    	simpleHtmlTokenizer.default = HTML5Tokenizer;
    	return simpleHtmlTokenizer;
    }

    var linkify = {};

    var _class = {};

    var hasRequired_class;

    function require_class () {
    	if (hasRequired_class) return _class;
    	hasRequired_class = 1;

    	_class.__esModule = true;
    	_class.inherits = inherits;
    	function inherits(parent, child) {
    		var props = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    		var extended = Object.create(parent.prototype);
    		for (var p in props) {
    			extended[p] = props[p];
    		}
    		extended.constructor = child;
    		child.prototype = extended;
    		return child;
    	}
    	return _class;
    }

    var options = {};

    var hasRequiredOptions;

    function requireOptions () {
    	if (hasRequiredOptions) return options;
    	hasRequiredOptions = 1;

    	options.__esModule = true;

    	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

    	var defaults = {
    		defaultProtocol: 'http',
    		events: null,
    		format: noop,
    		formatHref: noop,
    		nl2br: false,
    		tagName: 'a',
    		target: typeToTarget,
    		validate: true,
    		ignoreTags: [],
    		attributes: null,
    		className: 'linkified' // Deprecated value - no default class will be provided in the future
    	};

    	options.defaults = defaults;
    	options.Options = Options;
    	options.contains = contains;


    	function Options(opts) {
    		opts = opts || {};

    		this.defaultProtocol = opts.hasOwnProperty('defaultProtocol') ? opts.defaultProtocol : defaults.defaultProtocol;
    		this.events = opts.hasOwnProperty('events') ? opts.events : defaults.events;
    		this.format = opts.hasOwnProperty('format') ? opts.format : defaults.format;
    		this.formatHref = opts.hasOwnProperty('formatHref') ? opts.formatHref : defaults.formatHref;
    		this.nl2br = opts.hasOwnProperty('nl2br') ? opts.nl2br : defaults.nl2br;
    		this.tagName = opts.hasOwnProperty('tagName') ? opts.tagName : defaults.tagName;
    		this.target = opts.hasOwnProperty('target') ? opts.target : defaults.target;
    		this.validate = opts.hasOwnProperty('validate') ? opts.validate : defaults.validate;
    		this.ignoreTags = [];

    		// linkAttributes and linkClass is deprecated
    		this.attributes = opts.attributes || opts.linkAttributes || defaults.attributes;
    		this.className = opts.hasOwnProperty('className') ? opts.className : opts.linkClass || defaults.className;

    		// Make all tags names upper case
    		var ignoredTags = opts.hasOwnProperty('ignoreTags') ? opts.ignoreTags : defaults.ignoreTags;
    		for (var i = 0; i < ignoredTags.length; i++) {
    			this.ignoreTags.push(ignoredTags[i].toUpperCase());
    		}
    	}

    	Options.prototype = {
    		/**
    	  * Given the token, return all options for how it should be displayed
    	  */
    		resolve: function resolve(token) {
    			var href = token.toHref(this.defaultProtocol);
    			return {
    				formatted: this.get('format', token.toString(), token),
    				formattedHref: this.get('formatHref', href, token),
    				tagName: this.get('tagName', href, token),
    				className: this.get('className', href, token),
    				target: this.get('target', href, token),
    				events: this.getObject('events', href, token),
    				attributes: this.getObject('attributes', href, token)
    			};
    		},


    		/**
    	  * Returns true or false based on whether a token should be displayed as a
    	  * link based on the user options. By default,
    	  */
    		check: function check(token) {
    			return this.get('validate', token.toString(), token);
    		},


    		// Private methods

    		/**
    	  * Resolve an option's value based on the value of the option and the given
    	  * params.
    	  * @param {String} key Name of option to use
    	  * @param operator will be passed to the target option if it's method
    	  * @param {MultiToken} token The token from linkify.tokenize
    	  */
    		get: function get(key, operator, token) {
    			var optionValue = void 0,
    			    option = this[key];
    			if (!option) {
    				return option;
    			}

    			switch (typeof option === 'undefined' ? 'undefined' : _typeof(option)) {
    				case 'function':
    					return option(operator, token.type);
    				case 'object':
    					optionValue = option.hasOwnProperty(token.type) ? option[token.type] : defaults[key];
    					return typeof optionValue === 'function' ? optionValue(operator, token.type) : optionValue;
    			}

    			return option;
    		},
    		getObject: function getObject(key, operator, token) {
    			var option = this[key];
    			return typeof option === 'function' ? option(operator, token.type) : option;
    		}
    	};

    	/**
    	 * Quick indexOf replacement for checking the ignoreTags option
    	 */
    	function contains(arr, value) {
    		for (var i = 0; i < arr.length; i++) {
    			if (arr[i] === value) {
    				return true;
    			}
    		}
    		return false;
    	}

    	function noop(val) {
    		return val;
    	}

    	function typeToTarget(href, type) {
    		return type === 'url' ? '_blank' : null;
    	}
    	return options;
    }

    var scanner = {};

    var state$1 = {};

    var hasRequiredState$1;

    function requireState$1 () {
    	if (hasRequiredState$1) return state$1;
    	hasRequiredState$1 = 1;

    	state$1.__esModule = true;
    	state$1.stateify = state$1.TokenState = state$1.CharacterState = undefined;

    	var _class = require_class();

    	function createStateClass() {
    		return function (tClass) {
    			this.j = [];
    			this.T = tClass || null;
    		};
    	}

    	/**
    		A simple state machine that can emit token classes

    		The `j` property in this class refers to state jumps. It's a
    		multidimensional array where for each element:

    		* index [0] is a symbol or class of symbols to transition to.
    		* index [1] is a State instance which matches

    		The type of symbol will depend on the target implementation for this class.
    		In Linkify, we have a two-stage scanner. Each stage uses this state machine
    		but with a slighly different (polymorphic) implementation.

    		The `T` property refers to the token class.

    		TODO: Can the `on` and `next` methods be combined?

    		@class BaseState
    	*/
    	var BaseState = createStateClass();
    	BaseState.prototype = {
    		defaultTransition: false,

    		/**
    	 	@method constructor
    	 	@param {Class} tClass Pass in the kind of token to emit if there are
    	 		no jumps after this state and the state is accepting.
    	 */

    		/**
    	 	On the given symbol(s), this machine should go to the given state
    	 		@method on
    	 	@param {Array|Mixed} symbol
    	 	@param {BaseState} state Note that the type of this state should be the
    	 		same as the current instance (i.e., don't pass in a different
    	 		subclass)
    	 */
    		on: function on(symbol, state) {
    			if (symbol instanceof Array) {
    				for (var i = 0; i < symbol.length; i++) {
    					this.j.push([symbol[i], state]);
    				}
    				return this;
    			}
    			this.j.push([symbol, state]);
    			return this;
    		},


    		/**
    	 	Given the next item, returns next state for that item
    	 	@method next
    	 	@param {Mixed} item Should be an instance of the symbols handled by
    	 		this particular machine.
    	 	@return {State} state Returns false if no jumps are available
    	 */
    		next: function next(item) {
    			for (var i = 0; i < this.j.length; i++) {
    				var jump = this.j[i];
    				var symbol = jump[0]; // Next item to check for
    				var state = jump[1]; // State to jump to if items match

    				// compare item with symbol
    				if (this.test(item, symbol)) {
    					return state;
    				}
    			}

    			// Nowhere left to jump!
    			return this.defaultTransition;
    		},


    		/**
    	 	Does this state accept?
    	 	`true` only of `this.T` exists
    	 		@method accepts
    	 	@return {Boolean}
    	 */
    		accepts: function accepts() {
    			return !!this.T;
    		},


    		/**
    	 	Determine whether a given item "symbolizes" the symbol, where symbol is
    	 	a class of items handled by this state machine.
    	 		This method should be overriden in extended classes.
    	 		@method test
    	 	@param {Mixed} item Does this item match the given symbol?
    	 	@param {Mixed} symbol
    	 	@return {Boolean}
    	 */
    		test: function test(item, symbol) {
    			return item === symbol;
    		},


    		/**
    	 	Emit the token for this State (just return it in this case)
    	 	If this emits a token, this instance is an accepting state
    	 	@method emit
    	 	@return {Class} T
    	 */
    		emit: function emit() {
    			return this.T;
    		}
    	};

    	/**
    		State machine for string-based input

    		@class CharacterState
    		@extends BaseState
    	*/
    	var CharacterState = (0, _class.inherits)(BaseState, createStateClass(), {
    		/**
    	 	Does the given character match the given character or regular
    	 	expression?
    	 		@method test
    	 	@param {String} char
    	 	@param {String|RegExp} charOrRegExp
    	 	@return {Boolean}
    	 */
    		test: function test(character, charOrRegExp) {
    			return character === charOrRegExp || charOrRegExp instanceof RegExp && charOrRegExp.test(character);
    		}
    	});

    	/**
    		State machine for input in the form of TextTokens

    		@class TokenState
    		@extends BaseState
    	*/
    	var TokenState = (0, _class.inherits)(BaseState, createStateClass(), {

    		/**
    	  * Similar to `on`, but returns the state the results in the transition from
    	  * the given item
    	  * @method jump
    	  * @param {Mixed} item
    	  * @param {Token} [token]
    	  * @return state
    	  */
    		jump: function jump(token) {
    			var tClass = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

    			var state = this.next(new token('')); // dummy temp token
    			if (state === this.defaultTransition) {
    				// Make a new state!
    				state = new this.constructor(tClass);
    				this.on(token, state);
    			} else if (tClass) {
    				state.T = tClass;
    			}
    			return state;
    		},


    		/**
    	 	Is the given token an instance of the given token class?
    	 		@method test
    	 	@param {TextToken} token
    	 	@param {Class} tokenClass
    	 	@return {Boolean}
    	 */
    		test: function test(token, tokenClass) {
    			return token instanceof tokenClass;
    		}
    	});

    	/**
    		Given a non-empty target string, generates states (if required) for each
    		consecutive substring of characters in str starting from the beginning of
    		the string. The final state will have a special value, as specified in
    		options. All other "in between" substrings will have a default end state.

    		This turns the state machine into a Trie-like data structure (rather than a
    		intelligently-designed DFA).

    		Note that I haven't really tried these with any strings other than
    		DOMAIN.

    		@param {String} str
    		@param {CharacterState} start State to jump from the first character
    		@param {Class} endToken Token class to emit when the given string has been
    			matched and no more jumps exist.
    		@param {Class} defaultToken "Filler token", or which token type to emit when
    			we don't have a full match
    		@return {Array} list of newly-created states
    	*/
    	function stateify(str, start, endToken, defaultToken) {
    		var i = 0,
    		    len = str.length,
    		    state = start,
    		    newStates = [],
    		    nextState = void 0;

    		// Find the next state without a jump to the next character
    		while (i < len && (nextState = state.next(str[i]))) {
    			state = nextState;
    			i++;
    		}

    		if (i >= len) {
    			return [];
    		} // no new tokens were added

    		while (i < len - 1) {
    			nextState = new CharacterState(defaultToken);
    			newStates.push(nextState);
    			state.on(str[i], nextState);
    			state = nextState;
    			i++;
    		}

    		nextState = new CharacterState(endToken);
    		newStates.push(nextState);
    		state.on(str[len - 1], nextState);

    		return newStates;
    	}

    	state$1.CharacterState = CharacterState;
    	state$1.TokenState = TokenState;
    	state$1.stateify = stateify;
    	return state$1;
    }

    var text = {};

    var createTokenClass = {};

    var hasRequiredCreateTokenClass;

    function requireCreateTokenClass () {
    	if (hasRequiredCreateTokenClass) return createTokenClass;
    	hasRequiredCreateTokenClass = 1;

    	createTokenClass.__esModule = true;
    	function createTokenClass$1() {
    		return function (value) {
    			if (value) {
    				this.v = value;
    			}
    		};
    	}

    	createTokenClass.createTokenClass = createTokenClass$1;
    	return createTokenClass;
    }

    var hasRequiredText;

    function requireText () {
    	if (hasRequiredText) return text;
    	hasRequiredText = 1;

    	text.__esModule = true;
    	text.AMPERSAND = text.CLOSEPAREN = text.CLOSEANGLEBRACKET = text.CLOSEBRACKET = text.CLOSEBRACE = text.OPENPAREN = text.OPENANGLEBRACKET = text.OPENBRACKET = text.OPENBRACE = text.WS = text.TLD = text.SYM = text.UNDERSCORE = text.SLASH = text.MAILTO = text.PROTOCOL = text.QUERY = text.POUND = text.PLUS = text.NUM = text.NL = text.LOCALHOST = text.PUNCTUATION = text.DOT = text.COLON = text.AT = text.DOMAIN = text.Base = undefined;

    	var _createTokenClass = requireCreateTokenClass();

    	var _class = require_class();

    	/******************************************************************************
    		Text Tokens
    		Tokens composed of strings
    	******************************************************************************/

    	/**
    		Abstract class used for manufacturing text tokens.
    		Pass in the value this token represents

    		@class TextToken
    		@abstract
    	*/
    	var TextToken = (0, _createTokenClass.createTokenClass)();
    	TextToken.prototype = {
    		toString: function toString() {
    			return this.v + '';
    		}
    	};

    	function inheritsToken(value) {
    		var props = value ? { v: value } : {};
    		return (0, _class.inherits)(TextToken, (0, _createTokenClass.createTokenClass)(), props);
    	}

    	/**
    		A valid domain token
    		@class DOMAIN
    		@extends TextToken
    	*/
    	var DOMAIN = inheritsToken();

    	/**
    		@class AT
    		@extends TextToken
    	*/
    	var AT = inheritsToken('@');

    	/**
    		Represents a single colon `:` character

    		@class COLON
    		@extends TextToken
    	*/
    	var COLON = inheritsToken(':');

    	/**
    		@class DOT
    		@extends TextToken
    	*/
    	var DOT = inheritsToken('.');

    	/**
    		A character class that can surround the URL, but which the URL cannot begin
    		or end with. Does not include certain English punctuation like parentheses.

    		@class PUNCTUATION
    		@extends TextToken
    	*/
    	var PUNCTUATION = inheritsToken();

    	/**
    		The word localhost (by itself)
    		@class LOCALHOST
    		@extends TextToken
    	*/
    	var LOCALHOST = inheritsToken();

    	/**
    		Newline token
    		@class NL
    		@extends TextToken
    	*/
    	var NL = inheritsToken('\n');

    	/**
    		@class NUM
    		@extends TextToken
    	*/
    	var NUM = inheritsToken();

    	/**
    		@class PLUS
    		@extends TextToken
    	*/
    	var PLUS = inheritsToken('+');

    	/**
    		@class POUND
    		@extends TextToken
    	*/
    	var POUND = inheritsToken('#');

    	/**
    		Represents a web URL protocol. Supported types include

    		* `http:`
    		* `https:`
    		* `ftp:`
    		* `ftps:`

    		@class PROTOCOL
    		@extends TextToken
    	*/
    	var PROTOCOL = inheritsToken();

    	/**
    		Represents the start of the email URI protocol

    		@class MAILTO
    		@extends TextToken
    	*/
    	var MAILTO = inheritsToken('mailto:');

    	/**
    		@class QUERY
    		@extends TextToken
    	*/
    	var QUERY = inheritsToken('?');

    	/**
    		@class SLASH
    		@extends TextToken
    	*/
    	var SLASH = inheritsToken('/');

    	/**
    		@class UNDERSCORE
    		@extends TextToken
    	*/
    	var UNDERSCORE = inheritsToken('_');

    	/**
    		One ore more non-whitespace symbol.
    		@class SYM
    		@extends TextToken
    	*/
    	var SYM = inheritsToken();

    	/**
    		@class TLD
    		@extends TextToken
    	*/
    	var TLD = inheritsToken();

    	/**
    		Represents a string of consecutive whitespace characters

    		@class WS
    		@extends TextToken
    	*/
    	var WS = inheritsToken();

    	/**
    		Opening/closing bracket classes
    	*/

    	var OPENBRACE = inheritsToken('{');
    	var OPENBRACKET = inheritsToken('[');
    	var OPENANGLEBRACKET = inheritsToken('<');
    	var OPENPAREN = inheritsToken('(');
    	var CLOSEBRACE = inheritsToken('}');
    	var CLOSEBRACKET = inheritsToken(']');
    	var CLOSEANGLEBRACKET = inheritsToken('>');
    	var CLOSEPAREN = inheritsToken(')');

    	var AMPERSAND = inheritsToken('&');

    	text.Base = TextToken;
    	text.DOMAIN = DOMAIN;
    	text.AT = AT;
    	text.COLON = COLON;
    	text.DOT = DOT;
    	text.PUNCTUATION = PUNCTUATION;
    	text.LOCALHOST = LOCALHOST;
    	text.NL = NL;
    	text.NUM = NUM;
    	text.PLUS = PLUS;
    	text.POUND = POUND;
    	text.QUERY = QUERY;
    	text.PROTOCOL = PROTOCOL;
    	text.MAILTO = MAILTO;
    	text.SLASH = SLASH;
    	text.UNDERSCORE = UNDERSCORE;
    	text.SYM = SYM;
    	text.TLD = TLD;
    	text.WS = WS;
    	text.OPENBRACE = OPENBRACE;
    	text.OPENBRACKET = OPENBRACKET;
    	text.OPENANGLEBRACKET = OPENANGLEBRACKET;
    	text.OPENPAREN = OPENPAREN;
    	text.CLOSEBRACE = CLOSEBRACE;
    	text.CLOSEBRACKET = CLOSEBRACKET;
    	text.CLOSEANGLEBRACKET = CLOSEANGLEBRACKET;
    	text.CLOSEPAREN = CLOSEPAREN;
    	text.AMPERSAND = AMPERSAND;
    	return text;
    }

    var hasRequiredScanner;

    function requireScanner () {
    	if (hasRequiredScanner) return scanner;
    	hasRequiredScanner = 1;

    	scanner.__esModule = true;
    	scanner.start = scanner.run = scanner.TOKENS = scanner.State = undefined;

    	var _state = requireState$1();

    	var _text = requireText();

    	var TOKENS = _interopRequireWildcard(_text);

    	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

    	var tlds = 'aaa|aarp|abarth|abb|abbott|abbvie|abc|able|abogado|abudhabi|ac|academy|accenture|accountant|accountants|aco|active|actor|ad|adac|ads|adult|ae|aeg|aero|aetna|af|afamilycompany|afl|africa|ag|agakhan|agency|ai|aig|aigo|airbus|airforce|airtel|akdn|al|alfaromeo|alibaba|alipay|allfinanz|allstate|ally|alsace|alstom|am|americanexpress|americanfamily|amex|amfam|amica|amsterdam|analytics|android|anquan|anz|ao|aol|apartments|app|apple|aq|aquarelle|ar|arab|aramco|archi|army|arpa|art|arte|as|asda|asia|associates|at|athleta|attorney|au|auction|audi|audible|audio|auspost|author|auto|autos|avianca|aw|aws|ax|axa|az|azure|ba|baby|baidu|banamex|bananarepublic|band|bank|bar|barcelona|barclaycard|barclays|barefoot|bargains|baseball|basketball|bauhaus|bayern|bb|bbc|bbt|bbva|bcg|bcn|bd|be|beats|beauty|beer|bentley|berlin|best|bestbuy|bet|bf|bg|bh|bharti|bi|bible|bid|bike|bing|bingo|bio|biz|bj|black|blackfriday|blanco|blockbuster|blog|bloomberg|blue|bm|bms|bmw|bn|bnl|bnpparibas|bo|boats|boehringer|bofa|bom|bond|boo|book|booking|boots|bosch|bostik|boston|bot|boutique|box|br|bradesco|bridgestone|broadway|broker|brother|brussels|bs|bt|budapest|bugatti|build|builders|business|buy|buzz|bv|bw|by|bz|bzh|ca|cab|cafe|cal|call|calvinklein|cam|camera|camp|cancerresearch|canon|capetown|capital|capitalone|car|caravan|cards|care|career|careers|cars|cartier|casa|case|caseih|cash|casino|cat|catering|catholic|cba|cbn|cbre|cbs|cc|cd|ceb|center|ceo|cern|cf|cfa|cfd|cg|ch|chanel|channel|chase|chat|cheap|chintai|chloe|christmas|chrome|chrysler|church|ci|cipriani|circle|cisco|citadel|citi|citic|city|cityeats|ck|cl|claims|cleaning|click|clinic|clinique|clothing|cloud|club|clubmed|cm|cn|co|coach|codes|coffee|college|cologne|com|comcast|commbank|community|company|compare|computer|comsec|condos|construction|consulting|contact|contractors|cooking|cookingchannel|cool|coop|corsica|country|coupon|coupons|courses|cr|credit|creditcard|creditunion|cricket|crown|crs|cruise|cruises|csc|cu|cuisinella|cv|cw|cx|cy|cymru|cyou|cz|dabur|dad|dance|data|date|dating|datsun|day|dclk|dds|de|deal|dealer|deals|degree|delivery|dell|deloitte|delta|democrat|dental|dentist|desi|design|dev|dhl|diamonds|diet|digital|direct|directory|discount|discover|dish|diy|dj|dk|dm|dnp|do|docs|doctor|dodge|dog|doha|domains|dot|download|drive|dtv|dubai|duck|dunlop|duns|dupont|durban|dvag|dvr|dz|earth|eat|ec|eco|edeka|edu|education|ee|eg|email|emerck|energy|engineer|engineering|enterprises|epost|epson|equipment|er|ericsson|erni|es|esq|estate|esurance|et|etisalat|eu|eurovision|eus|events|everbank|exchange|expert|exposed|express|extraspace|fage|fail|fairwinds|faith|family|fan|fans|farm|farmers|fashion|fast|fedex|feedback|ferrari|ferrero|fi|fiat|fidelity|fido|film|final|finance|financial|fire|firestone|firmdale|fish|fishing|fit|fitness|fj|fk|flickr|flights|flir|florist|flowers|fly|fm|fo|foo|food|foodnetwork|football|ford|forex|forsale|forum|foundation|fox|fr|free|fresenius|frl|frogans|frontdoor|frontier|ftr|fujitsu|fujixerox|fun|fund|furniture|futbol|fyi|ga|gal|gallery|gallo|gallup|game|games|gap|garden|gb|gbiz|gd|gdn|ge|gea|gent|genting|george|gf|gg|ggee|gh|gi|gift|gifts|gives|giving|gl|glade|glass|gle|global|globo|gm|gmail|gmbh|gmo|gmx|gn|godaddy|gold|goldpoint|golf|goo|goodhands|goodyear|goog|google|gop|got|gov|gp|gq|gr|grainger|graphics|gratis|green|gripe|grocery|group|gs|gt|gu|guardian|gucci|guge|guide|guitars|guru|gw|gy|hair|hamburg|hangout|haus|hbo|hdfc|hdfcbank|health|healthcare|help|helsinki|here|hermes|hgtv|hiphop|hisamitsu|hitachi|hiv|hk|hkt|hm|hn|hockey|holdings|holiday|homedepot|homegoods|homes|homesense|honda|honeywell|horse|hospital|host|hosting|hot|hoteles|hotels|hotmail|house|how|hr|hsbc|ht|htc|hu|hughes|hyatt|hyundai|ibm|icbc|ice|icu|id|ie|ieee|ifm|ikano|il|im|imamat|imdb|immo|immobilien|in|industries|infiniti|info|ing|ink|institute|insurance|insure|int|intel|international|intuit|investments|io|ipiranga|iq|ir|irish|is|iselect|ismaili|ist|istanbul|it|itau|itv|iveco|iwc|jaguar|java|jcb|jcp|je|jeep|jetzt|jewelry|jio|jlc|jll|jm|jmp|jnj|jo|jobs|joburg|jot|joy|jp|jpmorgan|jprs|juegos|juniper|kaufen|kddi|ke|kerryhotels|kerrylogistics|kerryproperties|kfh|kg|kh|ki|kia|kim|kinder|kindle|kitchen|kiwi|km|kn|koeln|komatsu|kosher|kp|kpmg|kpn|kr|krd|kred|kuokgroup|kw|ky|kyoto|kz|la|lacaixa|ladbrokes|lamborghini|lamer|lancaster|lancia|lancome|land|landrover|lanxess|lasalle|lat|latino|latrobe|law|lawyer|lb|lc|lds|lease|leclerc|lefrak|legal|lego|lexus|lgbt|li|liaison|lidl|life|lifeinsurance|lifestyle|lighting|like|lilly|limited|limo|lincoln|linde|link|lipsy|live|living|lixil|lk|loan|loans|locker|locus|loft|lol|london|lotte|lotto|love|lpl|lplfinancial|lr|ls|lt|ltd|ltda|lu|lundbeck|lupin|luxe|luxury|lv|ly|ma|macys|madrid|maif|maison|makeup|man|management|mango|map|market|marketing|markets|marriott|marshalls|maserati|mattel|mba|mc|mckinsey|md|me|med|media|meet|melbourne|meme|memorial|men|menu|meo|merckmsd|metlife|mg|mh|miami|microsoft|mil|mini|mint|mit|mitsubishi|mk|ml|mlb|mls|mm|mma|mn|mo|mobi|mobile|mobily|moda|moe|moi|mom|monash|money|monster|mopar|mormon|mortgage|moscow|moto|motorcycles|mov|movie|movistar|mp|mq|mr|ms|msd|mt|mtn|mtr|mu|museum|mutual|mv|mw|mx|my|mz|na|nab|nadex|nagoya|name|nationwide|natura|navy|nba|nc|ne|nec|net|netbank|netflix|network|neustar|new|newholland|news|next|nextdirect|nexus|nf|nfl|ng|ngo|nhk|ni|nico|nike|nikon|ninja|nissan|nissay|nl|no|nokia|northwesternmutual|norton|now|nowruz|nowtv|np|nr|nra|nrw|ntt|nu|nyc|nz|obi|observer|off|office|okinawa|olayan|olayangroup|oldnavy|ollo|om|omega|one|ong|onl|online|onyourside|ooo|open|oracle|orange|org|organic|origins|osaka|otsuka|ott|ovh|pa|page|panasonic|panerai|paris|pars|partners|parts|party|passagens|pay|pccw|pe|pet|pf|pfizer|pg|ph|pharmacy|phd|philips|phone|photo|photography|photos|physio|piaget|pics|pictet|pictures|pid|pin|ping|pink|pioneer|pizza|pk|pl|place|play|playstation|plumbing|plus|pm|pn|pnc|pohl|poker|politie|porn|post|pr|pramerica|praxi|press|prime|pro|prod|productions|prof|progressive|promo|properties|property|protection|pru|prudential|ps|pt|pub|pw|pwc|py|qa|qpon|quebec|quest|qvc|racing|radio|raid|re|read|realestate|realtor|realty|recipes|red|redstone|redumbrella|rehab|reise|reisen|reit|reliance|ren|rent|rentals|repair|report|republican|rest|restaurant|review|reviews|rexroth|rich|richardli|ricoh|rightathome|ril|rio|rip|rmit|ro|rocher|rocks|rodeo|rogers|room|rs|rsvp|ru|rugby|ruhr|run|rw|rwe|ryukyu|sa|saarland|safe|safety|sakura|sale|salon|samsclub|samsung|sandvik|sandvikcoromant|sanofi|sap|sapo|sarl|sas|save|saxo|sb|sbi|sbs|sc|sca|scb|schaeffler|schmidt|scholarships|school|schule|schwarz|science|scjohnson|scor|scot|sd|se|search|seat|secure|security|seek|select|sener|services|ses|seven|sew|sex|sexy|sfr|sg|sh|shangrila|sharp|shaw|shell|shia|shiksha|shoes|shop|shopping|shouji|show|showtime|shriram|si|silk|sina|singles|site|sj|sk|ski|skin|sky|skype|sl|sling|sm|smart|smile|sn|sncf|so|soccer|social|softbank|software|sohu|solar|solutions|song|sony|soy|space|spiegel|spot|spreadbetting|sr|srl|srt|st|stada|staples|star|starhub|statebank|statefarm|statoil|stc|stcgroup|stockholm|storage|store|stream|studio|study|style|su|sucks|supplies|supply|support|surf|surgery|suzuki|sv|swatch|swiftcover|swiss|sx|sy|sydney|symantec|systems|sz|tab|taipei|talk|taobao|target|tatamotors|tatar|tattoo|tax|taxi|tc|tci|td|tdk|team|tech|technology|tel|telecity|telefonica|temasek|tennis|teva|tf|tg|th|thd|theater|theatre|tiaa|tickets|tienda|tiffany|tips|tires|tirol|tj|tjmaxx|tjx|tk|tkmaxx|tl|tm|tmall|tn|to|today|tokyo|tools|top|toray|toshiba|total|tours|town|toyota|toys|tr|trade|trading|training|travel|travelchannel|travelers|travelersinsurance|trust|trv|tt|tube|tui|tunes|tushu|tv|tvs|tw|tz|ua|ubank|ubs|uconnect|ug|uk|unicom|university|uno|uol|ups|us|uy|uz|va|vacations|vana|vanguard|vc|ve|vegas|ventures|verisign|versicherung|vet|vg|vi|viajes|video|vig|viking|villas|vin|vip|virgin|visa|vision|vista|vistaprint|viva|vivo|vlaanderen|vn|vodka|volkswagen|volvo|vote|voting|voto|voyage|vu|vuelos|wales|walmart|walter|wang|wanggou|warman|watch|watches|weather|weatherchannel|webcam|weber|website|wed|wedding|weibo|weir|wf|whoswho|wien|wiki|williamhill|win|windows|wine|winners|wme|wolterskluwer|woodside|work|works|world|wow|ws|wtc|wtf|xbox|xerox|xfinity|xihuan|xin|xn--11b4c3d|xn--1ck2e1b|xn--1qqw23a|xn--2scrj9c|xn--30rr7y|xn--3bst00m|xn--3ds443g|xn--3e0b707e|xn--3hcrj9c|xn--3oq18vl8pn36a|xn--3pxu8k|xn--42c2d9a|xn--45br5cyl|xn--45brj9c|xn--45q11c|xn--4gbrim|xn--54b7fta0cc|xn--55qw42g|xn--55qx5d|xn--5su34j936bgsg|xn--5tzm5g|xn--6frz82g|xn--6qq986b3xl|xn--80adxhks|xn--80ao21a|xn--80aqecdr1a|xn--80asehdb|xn--80aswg|xn--8y0a063a|xn--90a3ac|xn--90ae|xn--90ais|xn--9dbq2a|xn--9et52u|xn--9krt00a|xn--b4w605ferd|xn--bck1b9a5dre4c|xn--c1avg|xn--c2br7g|xn--cck2b3b|xn--cg4bki|xn--clchc0ea0b2g2a9gcd|xn--czr694b|xn--czrs0t|xn--czru2d|xn--d1acj3b|xn--d1alf|xn--e1a4c|xn--eckvdtc9d|xn--efvy88h|xn--estv75g|xn--fct429k|xn--fhbei|xn--fiq228c5hs|xn--fiq64b|xn--fiqs8s|xn--fiqz9s|xn--fjq720a|xn--flw351e|xn--fpcrj9c3d|xn--fzc2c9e2c|xn--fzys8d69uvgm|xn--g2xx48c|xn--gckr3f0f|xn--gecrj9c|xn--gk3at1e|xn--h2breg3eve|xn--h2brj9c|xn--h2brj9c8c|xn--hxt814e|xn--i1b6b1a6a2e|xn--imr513n|xn--io0a7i|xn--j1aef|xn--j1amh|xn--j6w193g|xn--jlq61u9w7b|xn--jvr189m|xn--kcrx77d1x4a|xn--kprw13d|xn--kpry57d|xn--kpu716f|xn--kput3i|xn--l1acc|xn--lgbbat1ad8j|xn--mgb9awbf|xn--mgba3a3ejt|xn--mgba3a4f16a|xn--mgba7c0bbn0a|xn--mgbaakc7dvf|xn--mgbaam7a8h|xn--mgbab2bd|xn--mgbai9azgqp6j|xn--mgbayh7gpa|xn--mgbb9fbpob|xn--mgbbh1a|xn--mgbbh1a71e|xn--mgbc0a9azcg|xn--mgbca7dzdo|xn--mgberp4a5d4ar|xn--mgbgu82a|xn--mgbi4ecexp|xn--mgbpl2fh|xn--mgbt3dhd|xn--mgbtx2b|xn--mgbx4cd0ab|xn--mix891f|xn--mk1bu44c|xn--mxtq1m|xn--ngbc5azd|xn--ngbe9e0a|xn--ngbrx|xn--node|xn--nqv7f|xn--nqv7fs00ema|xn--nyqy26a|xn--o3cw4h|xn--ogbpf8fl|xn--p1acf|xn--p1ai|xn--pbt977c|xn--pgbs0dh|xn--pssy2u|xn--q9jyb4c|xn--qcka1pmc|xn--qxam|xn--rhqv96g|xn--rovu88b|xn--rvc1e0am3e|xn--s9brj9c|xn--ses554g|xn--t60b56a|xn--tckwe|xn--tiq49xqyj|xn--unup4y|xn--vermgensberater-ctb|xn--vermgensberatung-pwb|xn--vhquv|xn--vuq861b|xn--w4r85el8fhu5dnra|xn--w4rs40l|xn--wgbh1c|xn--wgbl6a|xn--xhq521b|xn--xkc2al3hye2a|xn--xkc2dl3a5ee0h|xn--y9a3aq|xn--yfro4i67o|xn--ygbi2ammx|xn--zfr164b|xperia|xxx|xyz|yachts|yahoo|yamaxun|yandex|ye|yodobashi|yoga|yokohama|you|youtube|yt|yun|za|zappos|zara|zero|zip|zippo|zm|zone|zuerich|zw'.split('|'); // macro, see gulpfile.js

    	/**
    		The scanner provides an interface that takes a string of text as input, and
    		outputs an array of tokens instances that can be used for easy URL parsing.

    		@module linkify
    		@submodule scanner
    		@main scanner
    	*/

    	var NUMBERS = '0123456789'.split('');
    	var ALPHANUM = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');
    	var WHITESPACE = [' ', '\f', '\r', '\t', '\v', '\xA0', '\u1680', '\u180E']; // excluding line breaks

    	var domainStates = []; // states that jump to DOMAIN on /[a-z0-9]/
    	var makeState = function makeState(tokenClass) {
    		return new _state.CharacterState(tokenClass);
    	};

    	// Frequently used states
    	var S_START = makeState();
    	var S_NUM = makeState(_text.NUM);
    	var S_DOMAIN = makeState(_text.DOMAIN);
    	var S_DOMAIN_HYPHEN = makeState(); // domain followed by 1 or more hyphen characters
    	var S_WS = makeState(_text.WS);

    	// States for special URL symbols
    	S_START.on('@', makeState(_text.AT)).on('.', makeState(_text.DOT)).on('+', makeState(_text.PLUS)).on('#', makeState(_text.POUND)).on('?', makeState(_text.QUERY)).on('/', makeState(_text.SLASH)).on('_', makeState(_text.UNDERSCORE)).on(':', makeState(_text.COLON)).on('{', makeState(_text.OPENBRACE)).on('[', makeState(_text.OPENBRACKET)).on('<', makeState(_text.OPENANGLEBRACKET)).on('(', makeState(_text.OPENPAREN)).on('}', makeState(_text.CLOSEBRACE)).on(']', makeState(_text.CLOSEBRACKET)).on('>', makeState(_text.CLOSEANGLEBRACKET)).on(')', makeState(_text.CLOSEPAREN)).on('&', makeState(_text.AMPERSAND)).on([',', ';', '!', '"', '\''], makeState(_text.PUNCTUATION));

    	// Whitespace jumps
    	// Tokens of only non-newline whitespace are arbitrarily long
    	S_START.on('\n', makeState(_text.NL)).on(WHITESPACE, S_WS);

    	// If any whitespace except newline, more whitespace!
    	S_WS.on(WHITESPACE, S_WS);

    	// Generates states for top-level domains
    	// Note that this is most accurate when tlds are in alphabetical order
    	for (var i = 0; i < tlds.length; i++) {
    		var newStates = (0, _state.stateify)(tlds[i], S_START, _text.TLD, _text.DOMAIN);
    		domainStates.push.apply(domainStates, newStates);
    	}

    	// Collect the states generated by different protocls
    	var partialProtocolFileStates = (0, _state.stateify)('file', S_START, _text.DOMAIN, _text.DOMAIN);
    	var partialProtocolFtpStates = (0, _state.stateify)('ftp', S_START, _text.DOMAIN, _text.DOMAIN);
    	var partialProtocolHttpStates = (0, _state.stateify)('http', S_START, _text.DOMAIN, _text.DOMAIN);
    	var partialProtocolMailtoStates = (0, _state.stateify)('mailto', S_START, _text.DOMAIN, _text.DOMAIN);

    	// Add the states to the array of DOMAINeric states
    	domainStates.push.apply(domainStates, partialProtocolFileStates);
    	domainStates.push.apply(domainStates, partialProtocolFtpStates);
    	domainStates.push.apply(domainStates, partialProtocolHttpStates);
    	domainStates.push.apply(domainStates, partialProtocolMailtoStates);

    	// Protocol states
    	var S_PROTOCOL_FILE = partialProtocolFileStates.pop();
    	var S_PROTOCOL_FTP = partialProtocolFtpStates.pop();
    	var S_PROTOCOL_HTTP = partialProtocolHttpStates.pop();
    	var S_MAILTO = partialProtocolMailtoStates.pop();
    	var S_PROTOCOL_SECURE = makeState(_text.DOMAIN);
    	var S_FULL_PROTOCOL = makeState(_text.PROTOCOL); // Full protocol ends with COLON
    	var S_FULL_MAILTO = makeState(_text.MAILTO); // Mailto ends with COLON

    	// Secure protocols (end with 's')
    	S_PROTOCOL_FTP.on('s', S_PROTOCOL_SECURE).on(':', S_FULL_PROTOCOL);

    	S_PROTOCOL_HTTP.on('s', S_PROTOCOL_SECURE).on(':', S_FULL_PROTOCOL);

    	domainStates.push(S_PROTOCOL_SECURE);

    	// Become protocol tokens after a COLON
    	S_PROTOCOL_FILE.on(':', S_FULL_PROTOCOL);
    	S_PROTOCOL_SECURE.on(':', S_FULL_PROTOCOL);
    	S_MAILTO.on(':', S_FULL_MAILTO);

    	// Localhost
    	var partialLocalhostStates = (0, _state.stateify)('localhost', S_START, _text.LOCALHOST, _text.DOMAIN);
    	domainStates.push.apply(domainStates, partialLocalhostStates);

    	// Everything else
    	// DOMAINs make more DOMAINs
    	// Number and character transitions
    	S_START.on(NUMBERS, S_NUM);
    	S_NUM.on('-', S_DOMAIN_HYPHEN).on(NUMBERS, S_NUM).on(ALPHANUM, S_DOMAIN); // number becomes DOMAIN

    	S_DOMAIN.on('-', S_DOMAIN_HYPHEN).on(ALPHANUM, S_DOMAIN);

    	// All the generated states should have a jump to DOMAIN
    	for (var _i = 0; _i < domainStates.length; _i++) {
    		domainStates[_i].on('-', S_DOMAIN_HYPHEN).on(ALPHANUM, S_DOMAIN);
    	}

    	S_DOMAIN_HYPHEN.on('-', S_DOMAIN_HYPHEN).on(NUMBERS, S_DOMAIN).on(ALPHANUM, S_DOMAIN);

    	// Set default transition
    	S_START.defaultTransition = makeState(_text.SYM);

    	/**
    		Given a string, returns an array of TOKEN instances representing the
    		composition of that string.

    		@method run
    		@param {String} str Input string to scan
    		@return {Array} Array of TOKEN instances
    	*/
    	var run = function run(str) {

    		// The state machine only looks at lowercase strings.
    		// This selective `toLowerCase` is used because lowercasing the entire
    		// string causes the length and character position to vary in some in some
    		// non-English strings. This happens only on V8-based runtimes.
    		var lowerStr = str.replace(/[A-Z]/g, function (c) {
    			return c.toLowerCase();
    		});
    		var len = str.length;
    		var tokens = []; // return value

    		var cursor = 0;

    		// Tokenize the string
    		while (cursor < len) {
    			var state = S_START;
    			var nextState = null;
    			var tokenLength = 0;
    			var latestAccepting = null;
    			var sinceAccepts = -1;

    			while (cursor < len && (nextState = state.next(lowerStr[cursor]))) {
    				state = nextState;

    				// Keep track of the latest accepting state
    				if (state.accepts()) {
    					sinceAccepts = 0;
    					latestAccepting = state;
    				} else if (sinceAccepts >= 0) {
    					sinceAccepts++;
    				}

    				tokenLength++;
    				cursor++;
    			}

    			if (sinceAccepts < 0) {
    				continue;
    			} // Should never happen

    			// Roll back to the latest accepting state
    			cursor -= sinceAccepts;
    			tokenLength -= sinceAccepts;

    			// Get the class for the new token
    			var TOKEN = latestAccepting.emit(); // Current token class

    			// No more jumps, just make a new token
    			tokens.push(new TOKEN(str.substr(cursor - tokenLength, tokenLength)));
    		}

    		return tokens;
    	};

    	var start = S_START;
    	scanner.State = _state.CharacterState;
    	scanner.TOKENS = TOKENS;
    	scanner.run = run;
    	scanner.start = start;
    	return scanner;
    }

    var parser = {};

    var multi = {};

    var hasRequiredMulti;

    function requireMulti () {
    	if (hasRequiredMulti) return multi;
    	hasRequiredMulti = 1;

    	multi.__esModule = true;
    	multi.URL = multi.TEXT = multi.NL = multi.EMAIL = multi.MAILTOEMAIL = multi.Base = undefined;

    	var _createTokenClass = requireCreateTokenClass();

    	var _class = require_class();

    	var _text = requireText();

    	/******************************************************************************
    		Multi-Tokens
    		Tokens composed of arrays of TextTokens
    	******************************************************************************/

    	// Is the given token a valid domain token?
    	// Should nums be included here?
    	function isDomainToken(token) {
    		return token instanceof _text.DOMAIN || token instanceof _text.TLD;
    	}

    	/**
    		Abstract class used for manufacturing tokens of text tokens. That is rather
    		than the value for a token being a small string of text, it's value an array
    		of text tokens.

    		Used for grouping together URLs, emails, hashtags, and other potential
    		creations.

    		@class MultiToken
    		@abstract
    	*/
    	var MultiToken = (0, _createTokenClass.createTokenClass)();

    	MultiToken.prototype = {
    		/**
    	 	String representing the type for this token
    	 	@property type
    	 	@default 'TOKEN'
    	 */
    		type: 'token',

    		/**
    	 	Is this multitoken a link?
    	 	@property isLink
    	 	@default false
    	 */
    		isLink: false,

    		/**
    	 	Return the string this token represents.
    	 	@method toString
    	 	@return {String}
    	 */
    		toString: function toString() {
    			var result = [];
    			for (var i = 0; i < this.v.length; i++) {
    				result.push(this.v[i].toString());
    			}
    			return result.join('');
    		},


    		/**
    	 	What should the value for this token be in the `href` HTML attribute?
    	 	Returns the `.toString` value by default.
    	 		@method toHref
    	 	@return {String}
    	 */
    		toHref: function toHref() {
    			return this.toString();
    		},


    		/**
    	 	Returns a hash of relevant values for this token, which includes keys
    	 	* type - Kind of token ('url', 'email', etc.)
    	 	* value - Original text
    	 	* href - The value that should be added to the anchor tag's href
    	 		attribute
    	 		@method toObject
    	 	@param {String} [protocol] `'http'` by default
    	 	@return {Object}
    	 */
    		toObject: function toObject() {
    			var protocol = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'http';

    			return {
    				type: this.type,
    				value: this.toString(),
    				href: this.toHref(protocol)
    			};
    		}
    	};

    	/**
    		Represents an arbitrarily mailto email address with the prefix included
    		@class MAILTO
    		@extends MultiToken
    	*/
    	var MAILTOEMAIL = (0, _class.inherits)(MultiToken, (0, _createTokenClass.createTokenClass)(), {
    		type: 'email',
    		isLink: true
    	});

    	/**
    		Represents a list of tokens making up a valid email address
    		@class EMAIL
    		@extends MultiToken
    	*/
    	var EMAIL = (0, _class.inherits)(MultiToken, (0, _createTokenClass.createTokenClass)(), {
    		type: 'email',
    		isLink: true,
    		toHref: function toHref() {
    			return 'mailto:' + this.toString();
    		}
    	});

    	/**
    		Represents some plain text
    		@class TEXT
    		@extends MultiToken
    	*/
    	var TEXT = (0, _class.inherits)(MultiToken, (0, _createTokenClass.createTokenClass)(), { type: 'text' });

    	/**
    		Multi-linebreak token - represents a line break
    		@class NL
    		@extends MultiToken
    	*/
    	var NL = (0, _class.inherits)(MultiToken, (0, _createTokenClass.createTokenClass)(), { type: 'nl' });

    	/**
    		Represents a list of tokens making up a valid URL
    		@class URL
    		@extends MultiToken
    	*/
    	var URL = (0, _class.inherits)(MultiToken, (0, _createTokenClass.createTokenClass)(), {
    		type: 'url',
    		isLink: true,

    		/**
    	 	Lowercases relevant parts of the domain and adds the protocol if
    	 	required. Note that this will not escape unsafe HTML characters in the
    	 	URL.
    	 		@method href
    	 	@param {String} protocol
    	 	@return {String}
    	 */
    		toHref: function toHref() {
    			var protocol = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'http';

    			var hasProtocol = false;
    			var hasSlashSlash = false;
    			var tokens = this.v;
    			var result = [];
    			var i = 0;

    			// Make the first part of the domain lowercase
    			// Lowercase protocol
    			while (tokens[i] instanceof _text.PROTOCOL) {
    				hasProtocol = true;
    				result.push(tokens[i].toString().toLowerCase());
    				i++;
    			}

    			// Skip slash-slash
    			while (tokens[i] instanceof _text.SLASH) {
    				hasSlashSlash = true;
    				result.push(tokens[i].toString());
    				i++;
    			}

    			// Lowercase all other characters in the domain
    			while (isDomainToken(tokens[i])) {
    				result.push(tokens[i].toString().toLowerCase());
    				i++;
    			}

    			// Leave all other characters as they were written
    			for (; i < tokens.length; i++) {
    				result.push(tokens[i].toString());
    			}

    			result = result.join('');

    			if (!(hasProtocol || hasSlashSlash)) {
    				result = protocol + '://' + result;
    			}

    			return result;
    		},
    		hasProtocol: function hasProtocol() {
    			return this.v[0] instanceof _text.PROTOCOL;
    		}
    	});

    	multi.Base = MultiToken;
    	multi.MAILTOEMAIL = MAILTOEMAIL;
    	multi.EMAIL = EMAIL;
    	multi.NL = NL;
    	multi.TEXT = TEXT;
    	multi.URL = URL;
    	return multi;
    }

    var hasRequiredParser;

    function requireParser () {
    	if (hasRequiredParser) return parser;
    	hasRequiredParser = 1;

    	parser.__esModule = true;
    	parser.start = parser.run = parser.TOKENS = parser.State = undefined;

    	var _state = requireState$1();

    	var _multi = requireMulti();

    	var MULTI_TOKENS = _interopRequireWildcard(_multi);

    	var _text = requireText();

    	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

    	/**
    		Not exactly parser, more like the second-stage scanner (although we can
    		theoretically hotswap the code here with a real parser in the future... but
    		for a little URL-finding utility abstract syntax trees may be a little
    		overkill).

    		URL format: http://en.wikipedia.org/wiki/URI_scheme
    		Email format: http://en.wikipedia.org/wiki/Email_address (links to RFC in
    		reference)

    		@module linkify
    		@submodule parser
    		@main parser
    	*/

    	var makeState = function makeState(tokenClass) {
    		return new _state.TokenState(tokenClass);
    	};

    	// The universal starting state.
    	var S_START = makeState();

    	// Intermediate states for URLs. Note that domains that begin with a protocol
    	// are treated slighly differently from those that don't.
    	var S_PROTOCOL = makeState(); // e.g., 'http:'
    	var S_MAILTO = makeState(); // 'mailto:'
    	var S_PROTOCOL_SLASH = makeState(); // e.g., '/', 'http:/''
    	var S_PROTOCOL_SLASH_SLASH = makeState(); // e.g., '//', 'http://'
    	var S_DOMAIN = makeState(); // parsed string ends with a potential domain name (A)
    	var S_DOMAIN_DOT = makeState(); // (A) domain followed by DOT
    	var S_TLD = makeState(_multi.URL); // (A) Simplest possible URL with no query string
    	var S_TLD_COLON = makeState(); // (A) URL followed by colon (potential port number here)
    	var S_TLD_PORT = makeState(_multi.URL); // TLD followed by a port number
    	var S_URL = makeState(_multi.URL); // Long URL with optional port and maybe query string
    	var S_URL_NON_ACCEPTING = makeState(); // URL followed by some symbols (will not be part of the final URL)
    	var S_URL_OPENBRACE = makeState(); // URL followed by {
    	var S_URL_OPENBRACKET = makeState(); // URL followed by [
    	var S_URL_OPENANGLEBRACKET = makeState(); // URL followed by <
    	var S_URL_OPENPAREN = makeState(); // URL followed by (
    	var S_URL_OPENBRACE_Q = makeState(_multi.URL); // URL followed by { and some symbols that the URL can end it
    	var S_URL_OPENBRACKET_Q = makeState(_multi.URL); // URL followed by [ and some symbols that the URL can end it
    	var S_URL_OPENANGLEBRACKET_Q = makeState(_multi.URL); // URL followed by < and some symbols that the URL can end it
    	var S_URL_OPENPAREN_Q = makeState(_multi.URL); // URL followed by ( and some symbols that the URL can end it
    	var S_URL_OPENBRACE_SYMS = makeState(); // S_URL_OPENBRACE_Q followed by some symbols it cannot end it
    	var S_URL_OPENBRACKET_SYMS = makeState(); // S_URL_OPENBRACKET_Q followed by some symbols it cannot end it
    	var S_URL_OPENANGLEBRACKET_SYMS = makeState(); // S_URL_OPENANGLEBRACKET_Q followed by some symbols it cannot end it
    	var S_URL_OPENPAREN_SYMS = makeState(); // S_URL_OPENPAREN_Q followed by some symbols it cannot end it
    	var S_EMAIL_DOMAIN = makeState(); // parsed string starts with local email info + @ with a potential domain name (C)
    	var S_EMAIL_DOMAIN_DOT = makeState(); // (C) domain followed by DOT
    	var S_EMAIL = makeState(_multi.EMAIL); // (C) Possible email address (could have more tlds)
    	var S_EMAIL_COLON = makeState(); // (C) URL followed by colon (potential port number here)
    	var S_EMAIL_PORT = makeState(_multi.EMAIL); // (C) Email address with a port
    	var S_MAILTO_EMAIL = makeState(_multi.MAILTOEMAIL); // Email that begins with the mailto prefix (D)
    	var S_MAILTO_EMAIL_NON_ACCEPTING = makeState(); // (D) Followed by some non-query string chars
    	var S_LOCALPART = makeState(); // Local part of the email address
    	var S_LOCALPART_AT = makeState(); // Local part of the email address plus @
    	var S_LOCALPART_DOT = makeState(); // Local part of the email address plus '.' (localpart cannot end in .)
    	var S_NL = makeState(_multi.NL); // single new line

    	// Make path from start to protocol (with '//')
    	S_START.on(_text.NL, S_NL).on(_text.PROTOCOL, S_PROTOCOL).on(_text.MAILTO, S_MAILTO).on(_text.SLASH, S_PROTOCOL_SLASH);

    	S_PROTOCOL.on(_text.SLASH, S_PROTOCOL_SLASH);
    	S_PROTOCOL_SLASH.on(_text.SLASH, S_PROTOCOL_SLASH_SLASH);

    	// The very first potential domain name
    	S_START.on(_text.TLD, S_DOMAIN).on(_text.DOMAIN, S_DOMAIN).on(_text.LOCALHOST, S_TLD).on(_text.NUM, S_DOMAIN);

    	// Force URL for protocol followed by anything sane
    	S_PROTOCOL_SLASH_SLASH.on(_text.TLD, S_URL).on(_text.DOMAIN, S_URL).on(_text.NUM, S_URL).on(_text.LOCALHOST, S_URL);

    	// Account for dots and hyphens
    	// hyphens are usually parts of domain names
    	S_DOMAIN.on(_text.DOT, S_DOMAIN_DOT);
    	S_EMAIL_DOMAIN.on(_text.DOT, S_EMAIL_DOMAIN_DOT);

    	// Hyphen can jump back to a domain name

    	// After the first domain and a dot, we can find either a URL or another domain
    	S_DOMAIN_DOT.on(_text.TLD, S_TLD).on(_text.DOMAIN, S_DOMAIN).on(_text.NUM, S_DOMAIN).on(_text.LOCALHOST, S_DOMAIN);

    	S_EMAIL_DOMAIN_DOT.on(_text.TLD, S_EMAIL).on(_text.DOMAIN, S_EMAIL_DOMAIN).on(_text.NUM, S_EMAIL_DOMAIN).on(_text.LOCALHOST, S_EMAIL_DOMAIN);

    	// S_TLD accepts! But the URL could be longer, try to find a match greedily
    	// The `run` function should be able to "rollback" to the accepting state
    	S_TLD.on(_text.DOT, S_DOMAIN_DOT);
    	S_EMAIL.on(_text.DOT, S_EMAIL_DOMAIN_DOT);

    	// Become real URLs after `SLASH` or `COLON NUM SLASH`
    	// Here PSS and non-PSS converge
    	S_TLD.on(_text.COLON, S_TLD_COLON).on(_text.SLASH, S_URL);
    	S_TLD_COLON.on(_text.NUM, S_TLD_PORT);
    	S_TLD_PORT.on(_text.SLASH, S_URL);
    	S_EMAIL.on(_text.COLON, S_EMAIL_COLON);
    	S_EMAIL_COLON.on(_text.NUM, S_EMAIL_PORT);

    	// Types of characters the URL can definitely end in
    	var qsAccepting = [_text.DOMAIN, _text.AT, _text.LOCALHOST, _text.NUM, _text.PLUS, _text.POUND, _text.PROTOCOL, _text.SLASH, _text.TLD, _text.UNDERSCORE, _text.SYM, _text.AMPERSAND];

    	// Types of tokens that can follow a URL and be part of the query string
    	// but cannot be the very last characters
    	// Characters that cannot appear in the URL at all should be excluded
    	var qsNonAccepting = [_text.COLON, _text.DOT, _text.QUERY, _text.PUNCTUATION, _text.CLOSEBRACE, _text.CLOSEBRACKET, _text.CLOSEANGLEBRACKET, _text.CLOSEPAREN, _text.OPENBRACE, _text.OPENBRACKET, _text.OPENANGLEBRACKET, _text.OPENPAREN];

    	// These states are responsible primarily for determining whether or not to
    	// include the final round bracket.

    	// URL, followed by an opening bracket
    	S_URL.on(_text.OPENBRACE, S_URL_OPENBRACE).on(_text.OPENBRACKET, S_URL_OPENBRACKET).on(_text.OPENANGLEBRACKET, S_URL_OPENANGLEBRACKET).on(_text.OPENPAREN, S_URL_OPENPAREN);

    	// URL with extra symbols at the end, followed by an opening bracket
    	S_URL_NON_ACCEPTING.on(_text.OPENBRACE, S_URL_OPENBRACE).on(_text.OPENBRACKET, S_URL_OPENBRACKET).on(_text.OPENANGLEBRACKET, S_URL_OPENANGLEBRACKET).on(_text.OPENPAREN, S_URL_OPENPAREN);

    	// Closing bracket component. This character WILL be included in the URL
    	S_URL_OPENBRACE.on(_text.CLOSEBRACE, S_URL);
    	S_URL_OPENBRACKET.on(_text.CLOSEBRACKET, S_URL);
    	S_URL_OPENANGLEBRACKET.on(_text.CLOSEANGLEBRACKET, S_URL);
    	S_URL_OPENPAREN.on(_text.CLOSEPAREN, S_URL);
    	S_URL_OPENBRACE_Q.on(_text.CLOSEBRACE, S_URL);
    	S_URL_OPENBRACKET_Q.on(_text.CLOSEBRACKET, S_URL);
    	S_URL_OPENANGLEBRACKET_Q.on(_text.CLOSEANGLEBRACKET, S_URL);
    	S_URL_OPENPAREN_Q.on(_text.CLOSEPAREN, S_URL);
    	S_URL_OPENBRACE_SYMS.on(_text.CLOSEBRACE, S_URL);
    	S_URL_OPENBRACKET_SYMS.on(_text.CLOSEBRACKET, S_URL);
    	S_URL_OPENANGLEBRACKET_SYMS.on(_text.CLOSEANGLEBRACKET, S_URL);
    	S_URL_OPENPAREN_SYMS.on(_text.CLOSEPAREN, S_URL);

    	// URL that beings with an opening bracket, followed by a symbols.
    	// Note that the final state can still be `S_URL_OPENBRACE_Q` (if the URL only
    	// has a single opening bracket for some reason).
    	S_URL_OPENBRACE.on(qsAccepting, S_URL_OPENBRACE_Q);
    	S_URL_OPENBRACKET.on(qsAccepting, S_URL_OPENBRACKET_Q);
    	S_URL_OPENANGLEBRACKET.on(qsAccepting, S_URL_OPENANGLEBRACKET_Q);
    	S_URL_OPENPAREN.on(qsAccepting, S_URL_OPENPAREN_Q);
    	S_URL_OPENBRACE.on(qsNonAccepting, S_URL_OPENBRACE_SYMS);
    	S_URL_OPENBRACKET.on(qsNonAccepting, S_URL_OPENBRACKET_SYMS);
    	S_URL_OPENANGLEBRACKET.on(qsNonAccepting, S_URL_OPENANGLEBRACKET_SYMS);
    	S_URL_OPENPAREN.on(qsNonAccepting, S_URL_OPENPAREN_SYMS);

    	// URL that begins with an opening bracket, followed by some symbols
    	S_URL_OPENBRACE_Q.on(qsAccepting, S_URL_OPENBRACE_Q);
    	S_URL_OPENBRACKET_Q.on(qsAccepting, S_URL_OPENBRACKET_Q);
    	S_URL_OPENANGLEBRACKET_Q.on(qsAccepting, S_URL_OPENANGLEBRACKET_Q);
    	S_URL_OPENPAREN_Q.on(qsAccepting, S_URL_OPENPAREN_Q);
    	S_URL_OPENBRACE_Q.on(qsNonAccepting, S_URL_OPENBRACE_Q);
    	S_URL_OPENBRACKET_Q.on(qsNonAccepting, S_URL_OPENBRACKET_Q);
    	S_URL_OPENANGLEBRACKET_Q.on(qsNonAccepting, S_URL_OPENANGLEBRACKET_Q);
    	S_URL_OPENPAREN_Q.on(qsNonAccepting, S_URL_OPENPAREN_Q);

    	S_URL_OPENBRACE_SYMS.on(qsAccepting, S_URL_OPENBRACE_Q);
    	S_URL_OPENBRACKET_SYMS.on(qsAccepting, S_URL_OPENBRACKET_Q);
    	S_URL_OPENANGLEBRACKET_SYMS.on(qsAccepting, S_URL_OPENANGLEBRACKET_Q);
    	S_URL_OPENPAREN_SYMS.on(qsAccepting, S_URL_OPENPAREN_Q);
    	S_URL_OPENBRACE_SYMS.on(qsNonAccepting, S_URL_OPENBRACE_SYMS);
    	S_URL_OPENBRACKET_SYMS.on(qsNonAccepting, S_URL_OPENBRACKET_SYMS);
    	S_URL_OPENANGLEBRACKET_SYMS.on(qsNonAccepting, S_URL_OPENANGLEBRACKET_SYMS);
    	S_URL_OPENPAREN_SYMS.on(qsNonAccepting, S_URL_OPENPAREN_SYMS);

    	// Account for the query string
    	S_URL.on(qsAccepting, S_URL);
    	S_URL_NON_ACCEPTING.on(qsAccepting, S_URL);

    	S_URL.on(qsNonAccepting, S_URL_NON_ACCEPTING);
    	S_URL_NON_ACCEPTING.on(qsNonAccepting, S_URL_NON_ACCEPTING);

    	// Email address-specific state definitions
    	// Note: We are not allowing '/' in email addresses since this would interfere
    	// with real URLs

    	// For addresses with the mailto prefix
    	// 'mailto:' followed by anything sane is a valid email
    	S_MAILTO.on(_text.TLD, S_MAILTO_EMAIL).on(_text.DOMAIN, S_MAILTO_EMAIL).on(_text.NUM, S_MAILTO_EMAIL).on(_text.LOCALHOST, S_MAILTO_EMAIL);

    	// Greedily get more potential valid email values
    	S_MAILTO_EMAIL.on(qsAccepting, S_MAILTO_EMAIL).on(qsNonAccepting, S_MAILTO_EMAIL_NON_ACCEPTING);
    	S_MAILTO_EMAIL_NON_ACCEPTING.on(qsAccepting, S_MAILTO_EMAIL).on(qsNonAccepting, S_MAILTO_EMAIL_NON_ACCEPTING);

    	// For addresses without the mailto prefix
    	// Tokens allowed in the localpart of the email
    	var localpartAccepting = [_text.DOMAIN, _text.NUM, _text.PLUS, _text.POUND, _text.QUERY, _text.UNDERSCORE, _text.SYM, _text.AMPERSAND, _text.TLD];

    	// Some of the tokens in `localpartAccepting` are already accounted for here and
    	// will not be overwritten (don't worry)
    	S_DOMAIN.on(localpartAccepting, S_LOCALPART).on(_text.AT, S_LOCALPART_AT);
    	S_TLD.on(localpartAccepting, S_LOCALPART).on(_text.AT, S_LOCALPART_AT);
    	S_DOMAIN_DOT.on(localpartAccepting, S_LOCALPART);

    	// Okay we're on a localpart. Now what?
    	// TODO: IP addresses and what if the email starts with numbers?
    	S_LOCALPART.on(localpartAccepting, S_LOCALPART).on(_text.AT, S_LOCALPART_AT) // close to an email address now
    	.on(_text.DOT, S_LOCALPART_DOT);
    	S_LOCALPART_DOT.on(localpartAccepting, S_LOCALPART);
    	S_LOCALPART_AT.on(_text.TLD, S_EMAIL_DOMAIN).on(_text.DOMAIN, S_EMAIL_DOMAIN).on(_text.LOCALHOST, S_EMAIL);
    	// States following `@` defined above

    	var run = function run(tokens) {
    		var len = tokens.length;
    		var cursor = 0;
    		var multis = [];
    		var textTokens = [];

    		while (cursor < len) {
    			var state = S_START;
    			var secondState = null;
    			var nextState = null;
    			var multiLength = 0;
    			var latestAccepting = null;
    			var sinceAccepts = -1;

    			while (cursor < len && !(secondState = state.next(tokens[cursor]))) {
    				// Starting tokens with nowhere to jump to.
    				// Consider these to be just plain text
    				textTokens.push(tokens[cursor++]);
    			}

    			while (cursor < len && (nextState = secondState || state.next(tokens[cursor]))) {

    				// Get the next state
    				secondState = null;
    				state = nextState;

    				// Keep track of the latest accepting state
    				if (state.accepts()) {
    					sinceAccepts = 0;
    					latestAccepting = state;
    				} else if (sinceAccepts >= 0) {
    					sinceAccepts++;
    				}

    				cursor++;
    				multiLength++;
    			}

    			if (sinceAccepts < 0) {

    				// No accepting state was found, part of a regular text token
    				// Add all the tokens we looked at to the text tokens array
    				for (var i = cursor - multiLength; i < cursor; i++) {
    					textTokens.push(tokens[i]);
    				}
    			} else {

    				// Accepting state!

    				// First close off the textTokens (if available)
    				if (textTokens.length > 0) {
    					multis.push(new _multi.TEXT(textTokens));
    					textTokens = [];
    				}

    				// Roll back to the latest accepting state
    				cursor -= sinceAccepts;
    				multiLength -= sinceAccepts;

    				// Create a new multitoken
    				var MULTI = latestAccepting.emit();
    				multis.push(new MULTI(tokens.slice(cursor - multiLength, cursor)));
    			}
    		}

    		// Finally close off the textTokens (if available)
    		if (textTokens.length > 0) {
    			multis.push(new _multi.TEXT(textTokens));
    		}

    		return multis;
    	};

    	parser.State = _state.TokenState;
    	parser.TOKENS = MULTI_TOKENS;
    	parser.run = run;
    	parser.start = S_START;
    	return parser;
    }

    var hasRequiredLinkify;

    function requireLinkify () {
    	if (hasRequiredLinkify) return linkify;
    	hasRequiredLinkify = 1;

    	linkify.__esModule = true;
    	linkify.tokenize = linkify.test = linkify.scanner = linkify.parser = linkify.options = linkify.inherits = linkify.find = undefined;

    	var _class = require_class();

    	var _options = requireOptions();

    	var options = _interopRequireWildcard(_options);

    	var _scanner = requireScanner();

    	var scanner = _interopRequireWildcard(_scanner);

    	var _parser = requireParser();

    	var parser = _interopRequireWildcard(_parser);

    	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

    	if (!Array.isArray) {
    		Array.isArray = function (arg) {
    			return Object.prototype.toString.call(arg) === '[object Array]';
    		};
    	}

    	/**
    		Converts a string into tokens that represent linkable and non-linkable bits
    		@method tokenize
    		@param {String} str
    		@return {Array} tokens
    	*/
    	var tokenize = function tokenize(str) {
    		return parser.run(scanner.run(str));
    	};

    	/**
    		Returns a list of linkable items in the given string.
    	*/
    	var find = function find(str) {
    		var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

    		var tokens = tokenize(str);
    		var filtered = [];

    		for (var i = 0; i < tokens.length; i++) {
    			var token = tokens[i];
    			if (token.isLink && (!type || token.type === type)) {
    				filtered.push(token.toObject());
    			}
    		}

    		return filtered;
    	};

    	/**
    		Is the given string valid linkable text of some sort
    		Note that this does not trim the text for you.

    		Optionally pass in a second `type` param, which is the type of link to test
    		for.

    		For example,

    			test(str, 'email');

    		Will return `true` if str is a valid email.
    	*/
    	var test = function test(str) {
    		var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

    		var tokens = tokenize(str);
    		return tokens.length === 1 && tokens[0].isLink && (!type || tokens[0].type === type);
    	};

    	// Scanner and parser provide states and tokens for the lexicographic stage
    	// (will be used to add additional link types)
    	linkify.find = find;
    	linkify.inherits = _class.inherits;
    	linkify.options = options;
    	linkify.parser = parser;
    	linkify.scanner = scanner;
    	linkify.test = test;
    	linkify.tokenize = tokenize;
    	return linkify;
    }

    var hasRequiredLinkifyHtml;

    function requireLinkifyHtml () {
    	if (hasRequiredLinkifyHtml) return linkifyHtml;
    	hasRequiredLinkifyHtml = 1;

    	linkifyHtml.__esModule = true;
    	linkifyHtml.default = linkifyHtml$1;

    	var _simpleHtmlTokenizer = requireSimpleHtmlTokenizer();

    	var _simpleHtmlTokenizer2 = _interopRequireDefault(_simpleHtmlTokenizer);

    	var _linkify = requireLinkify();

    	var linkify = _interopRequireWildcard(_linkify);

    	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var options = linkify.options;
    	var Options = options.Options;


    	var StartTag = 'StartTag';
    	var EndTag = 'EndTag';
    	var Chars = 'Chars';
    	var Comment = 'Comment';

    	/**
    		`tokens` and `token` in this section refer to tokens generated by the HTML
    		parser.
    	*/
    	function linkifyHtml$1(str) {
    		var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    		var tokens = _simpleHtmlTokenizer2.default.tokenize(str);
    		var linkifiedTokens = [];
    		var linkified = [];
    		var i;

    		opts = new Options(opts);

    		// Linkify the tokens given by the parser
    		for (i = 0; i < tokens.length; i++) {
    			var token = tokens[i];

    			if (token.type === StartTag) {
    				linkifiedTokens.push(token);

    				// Ignore all the contents of ignored tags
    				var tagName = token.tagName.toUpperCase();
    				var isIgnored = tagName === 'A' || options.contains(opts.ignoreTags, tagName);
    				if (!isIgnored) {
    					continue;
    				}

    				var preskipLen = linkifiedTokens.length;
    				skipTagTokens(tagName, tokens, ++i, linkifiedTokens);
    				i += linkifiedTokens.length - preskipLen - 1;
    				continue;
    			} else if (token.type !== Chars) {
    				// Skip this token, it's not important
    				linkifiedTokens.push(token);
    				continue;
    			}

    			// Valid text token, linkify it!
    			var linkifedChars = linkifyChars(token.chars, opts);
    			linkifiedTokens.push.apply(linkifiedTokens, linkifedChars);
    		}

    		// Convert the tokens back into a string
    		for (i = 0; i < linkifiedTokens.length; i++) {
    			var _token = linkifiedTokens[i];
    			switch (_token.type) {
    				case StartTag:
    					{
    						var link = '<' + _token.tagName;
    						if (_token.attributes.length > 0) {
    							var attrs = attrsToStrings(_token.attributes);
    							link += ' ' + attrs.join(' ');
    						}
    						link += '>';
    						linkified.push(link);
    						break;
    					}
    				case EndTag:
    					linkified.push('</' + _token.tagName + '>');
    					break;
    				case Chars:
    					linkified.push(escapeText(_token.chars));
    					break;
    				case Comment:
    					linkified.push('<!--' + escapeText(_token.chars) + '-->');
    					break;
    			}
    		}

    		return linkified.join('');
    	}

    	/**
    		`tokens` and `token` in this section referes to tokens returned by
    		`linkify.tokenize`. `linkified` will contain HTML Parser-style tokens
    	*/
    	function linkifyChars(str, opts) {
    		var tokens = linkify.tokenize(str);
    		var result = [];

    		for (var i = 0; i < tokens.length; i++) {
    			var token = tokens[i];

    			if (token.type === 'nl' && opts.nl2br) {
    				result.push({
    					type: StartTag,
    					tagName: 'br',
    					attributes: [],
    					selfClosing: true
    				});
    				continue;
    			} else if (!token.isLink || !opts.check(token)) {
    				result.push({ type: Chars, chars: token.toString() });
    				continue;
    			}

    			var _opts$resolve = opts.resolve(token),
    			    formatted = _opts$resolve.formatted,
    			    formattedHref = _opts$resolve.formattedHref,
    			    tagName = _opts$resolve.tagName,
    			    className = _opts$resolve.className,
    			    target = _opts$resolve.target,
    			    attributes = _opts$resolve.attributes;

    			// Build up attributes


    			var attributeArray = [['href', formattedHref]];

    			if (className) {
    				attributeArray.push(['class', className]);
    			}

    			if (target) {
    				attributeArray.push(['target', target]);
    			}

    			for (var attr in attributes) {
    				attributeArray.push([attr, attributes[attr]]);
    			}

    			// Add the required tokens
    			result.push({
    				type: StartTag,
    				tagName: tagName,
    				attributes: attributeArray,
    				selfClosing: false
    			});
    			result.push({ type: Chars, chars: formatted });
    			result.push({ type: EndTag, tagName: tagName });
    		}

    		return result;
    	}

    	/**
    		Returns a list of tokens skipped until the closing tag of tagName.

    		* `tagName` is the closing tag which will prompt us to stop skipping
    		* `tokens` is the array of tokens generated by HTML5Tokenizer which
    		* `i` is the index immediately after the opening tag to skip
    		* `skippedTokens` is an array which skipped tokens are being pushed into

    		Caveats

    		* Assumes that i is the first token after the given opening tagName
    		* The closing tag will be skipped, but nothing after it
    		* Will track whether there is a nested tag of the same type
    	*/
    	function skipTagTokens(tagName, tokens, i, skippedTokens) {

    		// number of tokens of this type on the [fictional] stack
    		var stackCount = 1;

    		while (i < tokens.length && stackCount > 0) {
    			var token = tokens[i];

    			if (token.type === StartTag && token.tagName.toUpperCase() === tagName) {
    				// Nested tag of the same type, "add to stack"
    				stackCount++;
    			} else if (token.type === EndTag && token.tagName.toUpperCase() === tagName) {
    				// Closing tag
    				stackCount--;
    			}

    			skippedTokens.push(token);
    			i++;
    		}

    		// Note that if stackCount > 0 here, the HTML is probably invalid
    		return skippedTokens;
    	}

    	function escapeText(text) {
    		// Not required, HTML tokenizer ensures this occurs properly
    		return text;
    	}

    	function escapeAttr(attr) {
    		return attr.replace(/"/g, '&quot;');
    	}

    	function attrsToStrings(attrs) {
    		var attrStrs = [];
    		for (var i = 0; i < attrs.length; i++) {
    			var _attrs$i = attrs[i],
    			    name = _attrs$i[0],
    			    value = _attrs$i[1];

    			attrStrs.push(name + '="' + escapeAttr(value) + '"');
    		}
    		return attrStrs;
    	}
    	return linkifyHtml;
    }

    var html;
    var hasRequiredHtml;

    function requireHtml () {
    	if (hasRequiredHtml) return html;
    	hasRequiredHtml = 1;
    	html = requireLinkifyHtml().default;
    	return html;
    }

    var formatMessage = {};

    var stringUtils = {};

    var hasRequiredStringUtils;

    function requireStringUtils () {
    	if (hasRequiredStringUtils) return stringUtils;
    	hasRequiredStringUtils = 1;
    	// Taken from the source of chrome devtools:
    	// https://github.com/ChromeDevTools/devtools-frontend/blob/master/front_end/platform/utilities.js#L805-L1006
    	stringUtils.__esModule = true;
    	stringUtils.String = void 0;
    	// Copyright 2014 The Chromium Authors. All rights reserved.
    	//
    	// Redistribution and use in source and binary forms, with or without
    	// modification, are permitted provided that the following conditions are
    	// met:
    	//
    	//    * Redistributions of source code must retain the above copyright
    	// notice, this list of conditions and the following disclaimer.
    	//    * Redistributions in binary form must reproduce the above
    	// copyright notice, this list of conditions and the following disclaimer
    	// in the documentation and/or other materials provided with the
    	// distribution.
    	//    * Neither the name of Google Inc. nor the names of its
    	// contributors may be used to endorse or promote products derived from
    	// this software without specific prior written permission.
    	//
    	// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
    	// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
    	// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
    	// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
    	// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
    	// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
    	// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
    	// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    	// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
    	// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
    	// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
    	var String;
    	(function (String) {
    	    /**
    	     * @param {string} string
    	     * @param {number} index
    	     * @return {boolean}
    	     */
    	    function isDigitAt(string, index) {
    	        var c = string.charCodeAt(index);
    	        return 48 <= c && c <= 57;
    	    }
    	    /**
    	     * @param {string} format
    	     * @param {!Object.<string, function(string, ...):*>} formatters
    	     * @return {!Array.<!Object>}
    	     */
    	    function tokenizeFormatString(format, formatters) {
    	        var tokens = [];
    	        var substitutionIndex = 0;
    	        function addStringToken(str) {
    	            if (tokens.length && tokens[tokens.length - 1].type === 'string')
    	                tokens[tokens.length - 1].value += str;
    	            else
    	                tokens.push({ type: 'string', value: str });
    	        }
    	        function addSpecifierToken(specifier, precision, substitutionIndex) {
    	            tokens.push({
    	                type: 'specifier',
    	                specifier: specifier,
    	                precision: precision,
    	                substitutionIndex: substitutionIndex
    	            });
    	        }
    	        var index = 0;
    	        for (var precentIndex = format.indexOf('%', index); precentIndex !== -1; precentIndex = format.indexOf('%', index)) {
    	            if (format.length === index)
    	                // unescaped % sign at the end of the format string.
    	                break;
    	            addStringToken(format.substring(index, precentIndex));
    	            index = precentIndex + 1;
    	            if (format[index] === '%') {
    	                // %% escape sequence.
    	                addStringToken('%');
    	                ++index;
    	                continue;
    	            }
    	            if (isDigitAt(format, index)) {
    	                // The first character is a number, it might be a substitution index.
    	                var number = parseInt(format.substring(index), 10);
    	                while (isDigitAt(format, index))
    	                    ++index;
    	                // If the number is greater than zero and ends with a "$",
    	                // then this is a substitution index.
    	                if (number > 0 && format[index] === '$') {
    	                    substitutionIndex = number - 1;
    	                    ++index;
    	                }
    	            }
    	            var precision = -1;
    	            if (format[index] === '.') {
    	                // This is a precision specifier. If no digit follows the ".",
    	                // then the precision should be zero.
    	                ++index;
    	                precision = parseInt(format.substring(index), 10);
    	                if (isNaN(precision))
    	                    precision = 0;
    	                while (isDigitAt(format, index))
    	                    ++index;
    	            }
    	            if (!(format[index] in formatters)) {
    	                addStringToken(format.substring(precentIndex, index + 1));
    	                ++index;
    	                continue;
    	            }
    	            addSpecifierToken(format[index], precision, substitutionIndex);
    	            ++substitutionIndex;
    	            ++index;
    	        }
    	        addStringToken(format.substring(index));
    	        return tokens;
    	    }
    	    /**
    	     * @param {string} format
    	     * @param {?ArrayLike} substitutions
    	     * @param {!Object.<string, function(string, ...):Q>} formatters
    	     * @param {!T} initialValue
    	     * @param {function(T, Q): T|undefined} append
    	     * @param {!Array.<!Object>=} tokenizedFormat
    	     * @return {!{formattedResult: T, unusedSubstitutions: ?ArrayLike}};
    	     * @template T, Q
    	     */
    	    function format(format, substitutions, formatters, initialValue, append, tokenizedFormat) {
    	        if (!format || !substitutions || !substitutions.length)
    	            return {
    	                formattedResult: append(initialValue, format),
    	                unusedSubstitutions: substitutions
    	            };
    	        function prettyFunctionName() {
    	            return ('String.format("' +
    	                format +
    	                '", "' +
    	                Array.prototype.join.call(substitutions, '", "') +
    	                '")');
    	        }
    	        function warn(msg) {
    	            console.warn(prettyFunctionName() + ': ' + msg);
    	        }
    	        function error(msg) {
    	            console.error(prettyFunctionName() + ': ' + msg);
    	        }
    	        var result = initialValue;
    	        var tokens = tokenizedFormat || tokenizeFormatString(format, formatters);
    	        var usedSubstitutionIndexes = {};
    	        for (var i = 0; i < tokens.length; ++i) {
    	            var token = tokens[i];
    	            if (token.type === 'string') {
    	                result = append(result, token.value);
    	                continue;
    	            }
    	            if (token.type !== 'specifier') {
    	                error('Unknown token type "' + token.type + '" found.');
    	                continue;
    	            }
    	            if (token.substitutionIndex >= substitutions.length) {
    	                // If there are not enough substitutions for the current substitutionIndex
    	                // just output the format specifier literally and move on.
    	                error('not enough substitution arguments. Had ' +
    	                    substitutions.length +
    	                    ' but needed ' +
    	                    (token.substitutionIndex + 1) +
    	                    ', so substitution was skipped.');
    	                result = append(result, '%' + (token.precision > -1 ? token.precision : '') + token.specifier);
    	                continue;
    	            }
    	            usedSubstitutionIndexes[token.substitutionIndex] = true;
    	            if (!(token.specifier in formatters)) {
    	                // Encountered an unsupported format character, treat as a string.
    	                warn('unsupported format character \u201C' +
    	                    token.specifier +
    	                    '\u201D. Treating as a string.');
    	                result = append(result, substitutions[token.substitutionIndex]);
    	                continue;
    	            }
    	            result = append(result, formatters[token.specifier](substitutions[token.substitutionIndex], token));
    	        }
    	        var unusedSubstitutions = [];
    	        for (var i = 0; i < substitutions.length; ++i) {
    	            if (i in usedSubstitutionIndexes)
    	                continue;
    	            unusedSubstitutions.push(substitutions[i]);
    	        }
    	        return { formattedResult: result, unusedSubstitutions: unusedSubstitutions };
    	    }
    	    String.format = format;
    	})(String || (stringUtils.String = String = {}));
    	
    	return stringUtils;
    }

    var hasRequiredFormatMessage;

    function requireFormatMessage () {
    	if (hasRequiredFormatMessage) return formatMessage;
    	hasRequiredFormatMessage = 1;
    	(function (exports) {
    		exports.__esModule = true;
    		var string_utils_1 = requireStringUtils();
    		function createAppend(s) {
    		    var container = document.createDocumentFragment();
    		    container.appendChild(document.createTextNode(s));
    		    return container;
    		}
    		/**
    		 * @param {string} format
    		 * @param {!Array.<!SDK.RemoteObject>} parameters
    		 * @param {!Element} formattedResult
    		 */
    		function formatWithSubstitutionString(format, parameters, formattedResult) {
    		    var formatters = {};
    		    function stringFormatter(obj) {
    		        if (typeof obj !== 'string') {
    		            return '';
    		        }
    		        return String(obj);
    		    }
    		    function floatFormatter(obj) {
    		        if (typeof obj !== 'number')
    		            return 'NaN';
    		        return obj;
    		    }
    		    function integerFormatter(obj) {
    		        if (typeof obj !== 'number')
    		            return 'NaN';
    		        return Math.floor(obj);
    		    }
    		    var currentStyle = null;
    		    function styleFormatter(obj) {
    		        currentStyle = {};
    		        var buffer = document.createElement('span');
    		        buffer.setAttribute('style', obj);
    		        for (var i = 0; i < buffer.style.length; i++) {
    		            var property = buffer.style[i];
    		            if (isWhitelistedProperty(property))
    		                currentStyle[property] = buffer.style[property];
    		        }
    		    }
    		    function isWhitelistedProperty(property) {
    		        var prefixes = [
    		            'background',
    		            'border',
    		            'color',
    		            'font',
    		            'line',
    		            'margin',
    		            'padding',
    		            'text',
    		            '-webkit-background',
    		            '-webkit-border',
    		            '-webkit-font',
    		            '-webkit-margin',
    		            '-webkit-padding',
    		            '-webkit-text'
    		        ];
    		        for (var i = 0; i < prefixes.length; i++) {
    		            if (property.startsWith(prefixes[i]))
    		                return true;
    		        }
    		        return false;
    		    }
    		    formatters.s = stringFormatter;
    		    formatters.f = floatFormatter;
    		    // Firebug allows both %i and %d for formatting integers.
    		    formatters.i = integerFormatter;
    		    formatters.d = integerFormatter;
    		    // Firebug uses %c for styling the message.
    		    formatters.c = styleFormatter;
    		    function append(a, b) {
    		        if (b instanceof Node) {
    		            a.appendChild(b);
    		        }
    		        else if (typeof b !== 'undefined') {
    		            var toAppend = createAppend(String(b));
    		            if (currentStyle) {
    		                var wrapper = document.createElement('span');
    		                wrapper.appendChild(toAppend);
    		                applyCurrentStyle(wrapper);
    		                for (var i = 0; i < wrapper.children.length; ++i)
    		                    applyCurrentStyle(wrapper.children[i]);
    		                toAppend = wrapper;
    		            }
    		            a.appendChild(toAppend);
    		        }
    		        return a;
    		    }
    		    /**
    		     * @param {!Element} element
    		     */
    		    function applyCurrentStyle(element) {
    		        for (var key in currentStyle)
    		            element.style[key] = currentStyle[key];
    		    }
    		    // String.format does treat formattedResult like a Builder, result is an object.
    		    return string_utils_1.String.format(format, parameters, formatters, formattedResult, append);
    		}
    		exports["default"] = formatWithSubstitutionString;
    		
    	} (formatMessage));
    	return formatMessage;
    }

    var hasRequiredDevtoolsParser;

    function requireDevtoolsParser () {
    	if (hasRequiredDevtoolsParser) return devtoolsParser;
    	hasRequiredDevtoolsParser = 1;
    	(function (exports) {
    		var __importDefault = (devtoolsParser && devtoolsParser.__importDefault) || function (mod) {
    		    return (mod && mod.__esModule) ? mod : { "default": mod };
    		};
    		exports.__esModule = true;
    		var html_1 = __importDefault(requireHtml());
    		var format_message_1 = __importDefault(requireFormatMessage());
    		/**
    		 * Formats a console log message using the Devtools parser and returns HTML
    		 * @param args The arguments passed to the console method
    		 */
    		function formatMessage(args) {
    		    var formattedResult = document.createElement('span');
    		    (0, format_message_1["default"])(args[0], args.slice(1), formattedResult);
    		    return (0, html_1["default"])(formattedResult.outerHTML.replace(/(?:\r\n|\r|\n)/g, '<br />'));
    		}
    		exports["default"] = formatMessage;
    		
    	} (devtoolsParser));
    	return devtoolsParser;
    }

    var hasRequiredFormatted;

    function requireFormatted () {
    	if (hasRequiredFormatted) return Formatted;
    	hasRequiredFormatted = 1;
    	(function (exports) {
    		var __extends = (Formatted && Formatted.__extends) || (function () {
    		    var extendStatics = function (d, b) {
    		        extendStatics = Object.setPrototypeOf ||
    		            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
    		            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    		        return extendStatics(d, b);
    		    };
    		    return function (d, b) {
    		        if (typeof b !== "function" && b !== null)
    		            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    		        extendStatics(d, b);
    		        function __() { this.constructor = d; }
    		        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    		    };
    		})();
    		var __createBinding = (Formatted && Formatted.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    		    if (k2 === undefined) k2 = k;
    		    var desc = Object.getOwnPropertyDescriptor(m, k);
    		    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    		      desc = { enumerable: true, get: function() { return m[k]; } };
    		    }
    		    Object.defineProperty(o, k2, desc);
    		}) : (function(o, m, k, k2) {
    		    if (k2 === undefined) k2 = k;
    		    o[k2] = m[k];
    		}));
    		var __setModuleDefault = (Formatted && Formatted.__setModuleDefault) || (Object.create ? (function(o, v) {
    		    Object.defineProperty(o, "default", { enumerable: true, value: v });
    		}) : function(o, v) {
    		    o["default"] = v;
    		});
    		var __importStar = (Formatted && Formatted.__importStar) || function (mod) {
    		    if (mod && mod.__esModule) return mod;
    		    var result = {};
    		    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    		    __setModuleDefault(result, mod);
    		    return result;
    		};
    		var __importDefault = (Formatted && Formatted.__importDefault) || function (mod) {
    		    return (mod && mod.__esModule) ? mod : { "default": mod };
    		};
    		exports.__esModule = true;
    		var React = __importStar(requireReact$1());
    		var elements_1 = requireElements();
    		var devtools_parser_1 = __importDefault(requireDevtoolsParser());
    		var Formatted$1 = /** @class */ (function (_super) {
    		    __extends(Formatted, _super);
    		    function Formatted() {
    		        return _super !== null && _super.apply(this, arguments) || this;
    		    }
    		    Formatted.prototype.render = function () {
    		        return (React.createElement(elements_1.Root, { "data-type": "formatted", dangerouslySetInnerHTML: {
    		                __html: (0, devtools_parser_1["default"])(this.props.data || [])
    		            } }));
    		    };
    		    return Formatted;
    		}(React.PureComponent));
    		exports["default"] = Formatted$1;
    		
    	} (Formatted));
    	return Formatted;
    }

    var _Object = {};

    var linkifyReact = {};

    var hasRequiredLinkifyReact;

    function requireLinkifyReact () {
    	if (hasRequiredLinkifyReact) return linkifyReact;
    	hasRequiredLinkifyReact = 1;

    	linkifyReact.__esModule = true;

    	var _react = requireReact$1();

    	var _react2 = _interopRequireDefault(_react);

    	var _linkify = requireLinkify();

    	var linkify = _interopRequireWildcard(_linkify);

    	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    	var options = linkify.options;
    	var Options = options.Options;

    	// Given a string, converts to an array of valid React components
    	// (which may include strings)

    	function stringToElements(str, opts) {

    		var tokens = linkify.tokenize(str);
    		var elements = [];
    		var linkId = 0;

    		for (var i = 0; i < tokens.length; i++) {
    			var token = tokens[i];

    			if (token.type === 'nl' && opts.nl2br) {
    				elements.push(_react2.default.createElement('br', { key: 'linkified-' + ++linkId }));
    				continue;
    			} else if (!token.isLink || !opts.check(token)) {
    				// Regular text
    				elements.push(token.toString());
    				continue;
    			}

    			var _opts$resolve = opts.resolve(token),
    			    formatted = _opts$resolve.formatted,
    			    formattedHref = _opts$resolve.formattedHref,
    			    tagName = _opts$resolve.tagName,
    			    className = _opts$resolve.className,
    			    target = _opts$resolve.target,
    			    attributes = _opts$resolve.attributes;

    			var props = {
    				key: 'linkified-' + ++linkId,
    				href: formattedHref
    			};

    			if (className) {
    				props.className = className;
    			}

    			if (target) {
    				props.target = target;
    			}

    			// Build up additional attributes
    			// Support for events via attributes hash
    			if (attributes) {
    				for (var attr in attributes) {
    					props[attr] = attributes[attr];
    				}
    			}

    			elements.push(_react2.default.createElement(tagName, props, formatted));
    		}

    		return elements;
    	}

    	// Recursively linkify the contents of the given React Element instance
    	function linkifyReactElement(element, opts) {
    		var elementId = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

    		if (_react2.default.Children.count(element.props.children) === 0) {
    			// No need to clone if the element had no children
    			return element;
    		}

    		var children = [];

    		_react2.default.Children.forEach(element.props.children, function (child) {
    			if (typeof child === 'string') {
    				// ensure that we always generate unique element IDs for keys
    				elementId = elementId + 1;
    				children.push.apply(children, stringToElements(child, opts));
    			} else if (_react2.default.isValidElement(child)) {
    				if (typeof child.type === 'string' && options.contains(opts.ignoreTags, child.type.toUpperCase())) {
    					// Don't linkify this element
    					children.push(child);
    				} else {
    					children.push(linkifyReactElement(child, opts, ++elementId));
    				}
    			} else {
    				// Unknown element type, just push
    				children.push(child);
    			}
    		});

    		// Set a default unique key, copy over remaining props
    		var newProps = { key: 'linkified-element-' + elementId };
    		for (var prop in element.props) {
    			newProps[prop] = element.props[prop];
    		}

    		return _react2.default.cloneElement(element, newProps, children);
    	}

    	var Linkify = function (_React$Component) {
    		_inherits(Linkify, _React$Component);

    		function Linkify() {
    			_classCallCheck(this, Linkify);

    			return _possibleConstructorReturn(this, _React$Component.apply(this, arguments));
    		}

    		Linkify.prototype.render = function render() {
    			// Copy over all non-linkify-specific props
    			var newProps = { key: 'linkified-element-0' };
    			for (var prop in this.props) {
    				if (prop !== 'options' && prop !== 'tagName') {
    					newProps[prop] = this.props[prop];
    				}
    			}

    			var opts = new Options(this.props.options);
    			var tagName = this.props.tagName || 'span';
    			var element = _react2.default.createElement(tagName, newProps);

    			return linkifyReactElement(element, opts, 0);
    		};

    		return Linkify;
    	}(_react2.default.Component);

    	linkifyReact.default = Linkify;
    	return linkifyReact;
    }

    var react;
    var hasRequiredReact;

    function requireReact () {
    	if (hasRequiredReact) return react;
    	hasRequiredReact = 1;
    	react = requireLinkifyReact().default;
    	return react;
    }

    var reactInspector = {};

    var _Error = {};

    var hasRequired_Error;

    function require_Error () {
    	if (hasRequired_Error) return _Error;
    	hasRequired_Error = 1;
    	(function (exports) {
    		var __createBinding = (_Error && _Error.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    		    if (k2 === undefined) k2 = k;
    		    var desc = Object.getOwnPropertyDescriptor(m, k);
    		    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    		      desc = { enumerable: true, get: function() { return m[k]; } };
    		    }
    		    Object.defineProperty(o, k2, desc);
    		}) : (function(o, m, k, k2) {
    		    if (k2 === undefined) k2 = k;
    		    o[k2] = m[k];
    		}));
    		var __setModuleDefault = (_Error && _Error.__setModuleDefault) || (Object.create ? (function(o, v) {
    		    Object.defineProperty(o, "default", { enumerable: true, value: v });
    		}) : function(o, v) {
    		    o["default"] = v;
    		});
    		var __importStar = (_Error && _Error.__importStar) || function (mod) {
    		    if (mod && mod.__esModule) return mod;
    		    var result = {};
    		    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    		    __setModuleDefault(result, mod);
    		    return result;
    		};
    		var __importDefault = (_Error && _Error.__importDefault) || function (mod) {
    		    return (mod && mod.__esModule) ? mod : { "default": mod };
    		};
    		exports.__esModule = true;
    		var React = __importStar(requireReact$1());
    		var react_1 = __importDefault(requireReact());
    		function splitMessage(message) {
    		    var breakIndex = message.indexOf('\n');
    		    // consider that there can be line without a break
    		    if (breakIndex === -1) {
    		        return message;
    		    }
    		    return message.substr(0, breakIndex);
    		}
    		function ErrorPanel(_a) {
    		    var error = _a.error;
    		    /* This checks for error logTypes and shortens the message in the console by wrapping
    		    it a <details /> tag and putting the first line in a <summary /> tag and the other lines
    		    follow after that. This creates a nice collapsible error message */
    		    var otherErrorLines;
    		    var firstLine = splitMessage(error);
    		    var msgArray = error.split('\n');
    		    if (msgArray.length > 1) {
    		        otherErrorLines = msgArray.slice(1);
    		    }
    		    if (!otherErrorLines) {
    		        return React.createElement(react_1["default"], null, error);
    		    }
    		    return (React.createElement("details", null,
    		        React.createElement("summary", { style: { outline: 'none', cursor: 'pointer' } }, firstLine),
    		        React.createElement(react_1["default"], null, otherErrorLines.join('\n\r'))));
    		}
    		exports["default"] = ErrorPanel;
    		
    	} (_Error));
    	return _Error;
    }

    var hasRequiredReactInspector;

    function requireReactInspector () {
    	if (hasRequiredReactInspector) return reactInspector;
    	hasRequiredReactInspector = 1;
    	(function (exports) {
    		var __extends = (reactInspector && reactInspector.__extends) || (function () {
    		    var extendStatics = function (d, b) {
    		        extendStatics = Object.setPrototypeOf ||
    		            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
    		            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    		        return extendStatics(d, b);
    		    };
    		    return function (d, b) {
    		        if (typeof b !== "function" && b !== null)
    		            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    		        extendStatics(d, b);
    		        function __() { this.constructor = d; }
    		        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    		    };
    		})();
    		var __assign = (reactInspector && reactInspector.__assign) || function () {
    		    __assign = Object.assign || function(t) {
    		        for (var s, i = 1, n = arguments.length; i < n; i++) {
    		            s = arguments[i];
    		            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
    		                t[p] = s[p];
    		        }
    		        return t;
    		    };
    		    return __assign.apply(this, arguments);
    		};
    		var __createBinding = (reactInspector && reactInspector.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    		    if (k2 === undefined) k2 = k;
    		    var desc = Object.getOwnPropertyDescriptor(m, k);
    		    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    		      desc = { enumerable: true, get: function() { return m[k]; } };
    		    }
    		    Object.defineProperty(o, k2, desc);
    		}) : (function(o, m, k, k2) {
    		    if (k2 === undefined) k2 = k;
    		    o[k2] = m[k];
    		}));
    		var __setModuleDefault = (reactInspector && reactInspector.__setModuleDefault) || (Object.create ? (function(o, v) {
    		    Object.defineProperty(o, "default", { enumerable: true, value: v });
    		}) : function(o, v) {
    		    o["default"] = v;
    		});
    		var __importStar = (reactInspector && reactInspector.__importStar) || function (mod) {
    		    if (mod && mod.__esModule) return mod;
    		    var result = {};
    		    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    		    __setModuleDefault(result, mod);
    		    return result;
    		};
    		var __importDefault = (reactInspector && reactInspector.__importDefault) || function (mod) {
    		    return (mod && mod.__esModule) ? mod : { "default": mod };
    		};
    		exports.__esModule = true;
    		var emotion_theming_1 = require$$1;
    		var React = __importStar(requireReact$1());
    		var react_inspector_1 = require$$2$1;
    		var Error_1 = __importDefault(require_Error());
    		var elements_1 = requireElements();
    		var REMAINING_KEY = '__console_feed_remaining__';
    		// copied from react-inspector
    		function intersperse(arr, sep) {
    		    if (arr.length === 0) {
    		        return [];
    		    }
    		    return arr.slice(1).reduce(function (xs, x) { return xs.concat([sep, x]); }, [arr[0]]);
    		}
    		var getArrayLength = function (array) {
    		    if (!array || array.length < 1) {
    		        return 0;
    		    }
    		    var remainingKeyCount = array[array.length - 1]
    		        .toString()
    		        .split(REMAINING_KEY);
    		    if (remainingKeyCount[1] === undefined) {
    		        return array.length;
    		    }
    		    else {
    		        var remaining = parseInt(array[array.length - 1].toString().split(REMAINING_KEY)[1]);
    		        return array.length - 1 + remaining;
    		    }
    		};
    		var CustomObjectRootLabel = function (_a) {
    		    var name = _a.name, data = _a.data;
    		    var rootData = data;
    		    if (typeof data === 'object' && !Array.isArray(data) && data !== null) {
    		        var object = {};
    		        for (var propertyName in data) {
    		            if (data.hasOwnProperty(propertyName)) {
    		                var propertyValue = data[propertyName];
    		                if (Array.isArray(propertyValue)) {
    		                    var arrayLength = getArrayLength(propertyValue);
    		                    object[propertyName] = new Array(arrayLength);
    		                }
    		                else {
    		                    object[propertyName] = propertyValue;
    		                }
    		            }
    		        }
    		        rootData = Object.assign(Object.create(Object.getPrototypeOf(data)), object);
    		    }
    		    if (typeof name === 'string') {
    		        return (React.createElement("span", null,
    		            React.createElement(react_inspector_1.ObjectName, { name: name }),
    		            React.createElement("span", null, ": "),
    		            React.createElement(react_inspector_1.ObjectPreview, { data: rootData })));
    		    }
    		    else {
    		        return React.createElement(react_inspector_1.ObjectPreview, { data: rootData });
    		    }
    		};
    		var CustomObjectLabel = function (_a) {
    		    var name = _a.name, data = _a.data, _b = _a.isNonenumerable, isNonenumerable = _b === void 0 ? false : _b;
    		    return name === REMAINING_KEY ? (data > 0 ? (React.createElement("span", null,
    		        data,
    		        " more...")) : null) : (React.createElement("span", null,
    		        typeof name === 'string' ? (React.createElement(react_inspector_1.ObjectName, { name: name, dimmed: isNonenumerable })) : (React.createElement(react_inspector_1.ObjectPreview, { data: name })),
    		        React.createElement("span", null, ": "),
    		        React.createElement(react_inspector_1.ObjectValue, { object: data })));
    		};
    		var CustomInspector = /** @class */ (function (_super) {
    		    __extends(CustomInspector, _super);
    		    function CustomInspector() {
    		        return _super !== null && _super.apply(this, arguments) || this;
    		    }
    		    CustomInspector.prototype.render = function () {
    		        var _a = this.props, data = _a.data, theme = _a.theme;
    		        var styles = theme.styles, method = theme.method;
    		        var dom = data instanceof HTMLElement;
    		        var table = method === 'table';
    		        return (React.createElement(elements_1.Root, { "data-type": table ? 'table' : dom ? 'html' : 'object' }, table ? (React.createElement(elements_1.Table, null,
    		            React.createElement(react_inspector_1.Inspector, __assign({}, this.props, { theme: styles, table: true })),
    		            React.createElement(react_inspector_1.Inspector, __assign({}, this.props, { theme: styles, nodeRenderer: this.nodeRenderer.bind(this) })))) : dom ? (React.createElement(elements_1.HTML, null,
    		            React.createElement(react_inspector_1.DOMInspector, __assign({}, this.props, { theme: styles })))) : (React.createElement(react_inspector_1.Inspector, __assign({}, this.props, { theme: styles, nodeRenderer: this.nodeRenderer.bind(this) })))));
    		    };
    		    CustomInspector.prototype.getCustomNode = function (data) {
    		        var _a;
    		        var styles = this.props.theme.styles;
    		        var constructor = (_a = data === null || data === void 0 ? void 0 : data.constructor) === null || _a === void 0 ? void 0 : _a.name;
    		        if (constructor === 'Function')
    		            return (React.createElement("span", { style: { fontStyle: 'italic' } },
    		                React.createElement(react_inspector_1.ObjectPreview, { data: data }), " {",
    		                React.createElement("span", { style: { color: 'rgb(181, 181, 181)' } }, data.body), "}"));
    		        if (data instanceof Error && typeof data.stack === 'string') {
    		            return React.createElement(Error_1["default"], { error: data.stack });
    		        }
    		        if (constructor === 'Promise')
    		            return (React.createElement("span", { style: { fontStyle: 'italic' } },
    		                "Promise ", "{",
    		                React.createElement("span", { style: { opacity: 0.6 } }, "<pending>"), "}"));
    		        if (data instanceof HTMLElement)
    		            return (React.createElement(elements_1.HTML, null,
    		                React.createElement(react_inspector_1.DOMInspector, { data: data, theme: styles })));
    		        if (Array.isArray(data)) {
    		            var arrayLength = getArrayLength(data);
    		            var maxProperties = styles.OBJECT_PREVIEW_ARRAY_MAX_PROPERTIES;
    		            if (typeof data[data.length - 1] === 'string' &&
    		                data[data.length - 1].includes(REMAINING_KEY)) {
    		                data = data.slice(0, -1);
    		            }
    		            var previewArray = data
    		                .slice(0, maxProperties)
    		                .map(function (element, index) {
    		                if (Array.isArray(element)) {
    		                    return (React.createElement(react_inspector_1.ObjectValue, { key: index, object: new Array(getArrayLength(element)) }));
    		                }
    		                else {
    		                    return React.createElement(react_inspector_1.ObjectValue, { key: index, object: element });
    		                }
    		            });
    		            if (arrayLength > maxProperties) {
    		                previewArray.push(React.createElement("span", { key: "ellipsis" }, "\u2026"));
    		            }
    		            return (React.createElement(React.Fragment, null,
    		                React.createElement("span", { style: styles.objectDescription }, arrayLength === 0 ? "" : "(".concat(arrayLength, ")\u00A0")),
    		                React.createElement("span", { style: styles.preview },
    		                    "[",
    		                    intersperse(previewArray, ', '),
    		                    "]")));
    		        }
    		        return null;
    		    };
    		    CustomInspector.prototype.nodeRenderer = function (props) {
    		        var depth = props.depth, name = props.name, data = props.data, isNonenumerable = props.isNonenumerable;
    		        // Root
    		        if (depth === 0) {
    		            var customNode_1 = this.getCustomNode(data);
    		            return customNode_1 || React.createElement(CustomObjectRootLabel, { name: name, data: data });
    		        }
    		        if (typeof data === 'string' && data.includes(REMAINING_KEY)) {
    		            name = REMAINING_KEY;
    		            data = data.split(REMAINING_KEY)[1];
    		        }
    		        if (name === 'constructor')
    		            return (React.createElement(elements_1.Constructor, null,
    		                React.createElement(react_inspector_1.ObjectLabel, { name: "<constructor>", data: data.name, isNonenumerable: isNonenumerable })));
    		        var customNode = this.getCustomNode(data);
    		        return customNode ? (React.createElement(elements_1.Root, null,
    		            React.createElement(react_inspector_1.ObjectName, { name: name }),
    		            React.createElement("span", null, ": "),
    		            customNode)) : (React.createElement(CustomObjectLabel, { name: name, data: data, isNonenumerable: isNonenumerable }));
    		    };
    		    return CustomInspector;
    		}(React.PureComponent));
    		exports["default"] = (0, emotion_theming_1.withTheme)(CustomInspector);
    		
    	} (reactInspector));
    	return reactInspector;
    }

    var hasRequired_Object;

    function require_Object () {
    	if (hasRequired_Object) return _Object;
    	hasRequired_Object = 1;
    	(function (exports) {
    		var __extends = (_Object && _Object.__extends) || (function () {
    		    var extendStatics = function (d, b) {
    		        extendStatics = Object.setPrototypeOf ||
    		            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
    		            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    		        return extendStatics(d, b);
    		    };
    		    return function (d, b) {
    		        if (typeof b !== "function" && b !== null)
    		            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    		        extendStatics(d, b);
    		        function __() { this.constructor = d; }
    		        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    		    };
    		})();
    		var __createBinding = (_Object && _Object.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    		    if (k2 === undefined) k2 = k;
    		    var desc = Object.getOwnPropertyDescriptor(m, k);
    		    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    		      desc = { enumerable: true, get: function() { return m[k]; } };
    		    }
    		    Object.defineProperty(o, k2, desc);
    		}) : (function(o, m, k, k2) {
    		    if (k2 === undefined) k2 = k;
    		    o[k2] = m[k];
    		}));
    		var __setModuleDefault = (_Object && _Object.__setModuleDefault) || (Object.create ? (function(o, v) {
    		    Object.defineProperty(o, "default", { enumerable: true, value: v });
    		}) : function(o, v) {
    		    o["default"] = v;
    		});
    		var __importStar = (_Object && _Object.__importStar) || function (mod) {
    		    if (mod && mod.__esModule) return mod;
    		    var result = {};
    		    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    		    __setModuleDefault(result, mod);
    		    return result;
    		};
    		var __importDefault = (_Object && _Object.__importDefault) || function (mod) {
    		    return (mod && mod.__esModule) ? mod : { "default": mod };
    		};
    		exports.__esModule = true;
    		var React = __importStar(requireReact$1());
    		var emotion_theming_1 = require$$1;
    		var elements_1 = requireElements();
    		var react_1 = __importDefault(requireReact());
    		var react_inspector_1 = __importDefault(requireReactInspector());
    		var ObjectTree = /** @class */ (function (_super) {
    		    __extends(ObjectTree, _super);
    		    function ObjectTree() {
    		        return _super !== null && _super.apply(this, arguments) || this;
    		    }
    		    ObjectTree.prototype.render = function () {
    		        var _this = this;
    		        var _a = this.props, theme = _a.theme, quoted = _a.quoted, log = _a.log;
    		        return log.data.map(function (message, i) {
    		            if (typeof message === 'string') {
    		                var string = !quoted && message.length ? ("".concat(message, " ")) : (React.createElement("span", null,
    		                    React.createElement("span", null, "\""),
    		                    React.createElement("span", { style: {
    		                            color: theme.styles.OBJECT_VALUE_STRING_COLOR
    		                        } }, message),
    		                    React.createElement("span", null, "\" ")));
    		                return (React.createElement(elements_1.Root, { "data-type": "string", key: i },
    		                    React.createElement(react_1["default"], { options: _this.props.linkifyOptions }, string)));
    		            }
    		            return React.createElement(react_inspector_1["default"], { data: message, key: i });
    		        });
    		    };
    		    return ObjectTree;
    		}(React.PureComponent));
    		exports["default"] = (0, emotion_theming_1.withTheme)(ObjectTree);
    		
    	} (_Object));
    	return _Object;
    }

    var hasRequiredMessage;

    function requireMessage () {
    	if (hasRequiredMessage) return Message;
    	hasRequiredMessage = 1;
    	(function (exports) {
    		var __extends = (Message && Message.__extends) || (function () {
    		    var extendStatics = function (d, b) {
    		        extendStatics = Object.setPrototypeOf ||
    		            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
    		            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    		        return extendStatics(d, b);
    		    };
    		    return function (d, b) {
    		        if (typeof b !== "function" && b !== null)
    		            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    		        extendStatics(d, b);
    		        function __() { this.constructor = d; }
    		        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    		    };
    		})();
    		var __assign = (Message && Message.__assign) || function () {
    		    __assign = Object.assign || function(t) {
    		        for (var s, i = 1, n = arguments.length; i < n; i++) {
    		            s = arguments[i];
    		            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
    		                t[p] = s[p];
    		        }
    		        return t;
    		    };
    		    return __assign.apply(this, arguments);
    		};
    		var __createBinding = (Message && Message.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    		    if (k2 === undefined) k2 = k;
    		    var desc = Object.getOwnPropertyDescriptor(m, k);
    		    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    		      desc = { enumerable: true, get: function() { return m[k]; } };
    		    }
    		    Object.defineProperty(o, k2, desc);
    		}) : (function(o, m, k, k2) {
    		    if (k2 === undefined) k2 = k;
    		    o[k2] = m[k];
    		}));
    		var __setModuleDefault = (Message && Message.__setModuleDefault) || (Object.create ? (function(o, v) {
    		    Object.defineProperty(o, "default", { enumerable: true, value: v });
    		}) : function(o, v) {
    		    o["default"] = v;
    		});
    		var __importStar = (Message && Message.__importStar) || function (mod) {
    		    if (mod && mod.__esModule) return mod;
    		    var result = {};
    		    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    		    __setModuleDefault(result, mod);
    		    return result;
    		};
    		var __importDefault = (Message && Message.__importDefault) || function (mod) {
    		    return (mod && mod.__esModule) ? mod : { "default": mod };
    		};
    		exports.__esModule = true;
    		var React = __importStar(requireReact$1());
    		var emotion_theming_1 = require$$1;
    		var react_inline_center_1 = __importDefault(require$$2);
    		var elements_1 = requireElements$1();
    		var Formatted_1 = __importDefault(requireFormatted());
    		var Object_1 = __importDefault(require_Object());
    		var Error_1 = __importDefault(require_Error());
    		// https://developer.mozilla.org/en-US/docs/Web/API/console#Using_string_substitutions
    		var reSubstitutions = /(%[coOs])|(%(([0-9]*[.])?[0-9]+)?[dif])/g;
    		var ConsoleMessage = /** @class */ (function (_super) {
    		    __extends(ConsoleMessage, _super);
    		    function ConsoleMessage() {
    		        var _this = _super !== null && _super.apply(this, arguments) || this;
    		        _this.theme = function (theme) { return (__assign(__assign({}, theme), { method: _this.props.log.method })); };
    		        return _this;
    		    }
    		    ConsoleMessage.prototype.shouldComponentUpdate = function (nextProps) {
    		        return this.props.log.amount !== nextProps.log.amount;
    		    };
    		    ConsoleMessage.prototype.render = function () {
    		        var _a = this.props, log = _a.log, components = _a.components;
    		        var node = this.getNode();
    		        var MessageComponent = (components === null || components === void 0 ? void 0 : components.Message) || elements_1.Message;
    		        return (React.createElement(emotion_theming_1.ThemeProvider, { theme: this.theme },
    		            React.createElement(MessageComponent, { log: log, node: node, "data-method": log.method },
    		                React.createElement(elements_1.IconContainer, null,
    		                    React.createElement(react_inline_center_1["default"], null, log.amount > 1 ? (React.createElement(elements_1.AmountIcon, null, log.amount)) : (React.createElement(elements_1.Icon, null)))),
    		                log.timestamp ? React.createElement(elements_1.Timestamp, null, log.timestamp) : React.createElement("span", null),
    		                React.createElement(elements_1.Content, null, node))));
    		    };
    		    ConsoleMessage.prototype.getNode = function () {
    		        var _a;
    		        var log = this.props.log;
    		        // Error handling
    		        var error = this.typeCheck(log);
    		        if (error)
    		            return error;
    		        // Chrome formatting
    		        if (log.data.length > 0 && typeof log.data[0] === 'string') {
    		            var matchLength = (_a = log.data[0].match(reSubstitutions)) === null || _a === void 0 ? void 0 : _a.length;
    		            if (matchLength) {
    		                var restData = log.data.slice(1 + matchLength);
    		                return (React.createElement(React.Fragment, null,
    		                    React.createElement(Formatted_1["default"], { data: log.data }),
    		                    restData.length > 0 && (React.createElement(Object_1["default"], { quoted: false, log: __assign(__assign({}, log), { data: restData }), linkifyOptions: this.props.linkifyOptions }))));
    		            }
    		        }
    		        // Error panel
    		        if (log.data.every(function (message) { return typeof message === 'string'; }) &&
    		            log.method === 'error') {
    		            return React.createElement(Error_1["default"], { error: log.data.join(' ') });
    		        }
    		        // Normal inspector
    		        var quoted = typeof log.data[0] !== 'string';
    		        return (React.createElement(Object_1["default"], { log: log, quoted: quoted, linkifyOptions: this.props.linkifyOptions }));
    		    };
    		    ConsoleMessage.prototype.typeCheck = function (log) {
    		        if (!log) {
    		            return (React.createElement(Formatted_1["default"], { data: [
    		                    "%c[console-feed] %cFailed to parse message! %clog was typeof ".concat(typeof log, ", but it should've been a log object"),
    		                    'color: red',
    		                    'color: orange',
    		                    'color: cyan',
    		                ] }));
    		        }
    		        else if (!(log.data instanceof Array)) {
    		            return (React.createElement(Formatted_1["default"], { data: [
    		                    '%c[console-feed] %cFailed to parse message! %clog.data was not an array!',
    		                    'color: red',
    		                    'color: orange',
    		                    'color: cyan',
    		                ] }));
    		        }
    		        return false;
    		    };
    		    return ConsoleMessage;
    		}(React.Component));
    		exports["default"] = ConsoleMessage;
    		
    	} (Message));
    	return Message;
    }

    var hasRequiredComponent;

    function requireComponent () {
    	if (hasRequiredComponent) return Component;
    	hasRequiredComponent = 1;
    	(function (exports) {
    		var __extends = (Component && Component.__extends) || (function () {
    		    var extendStatics = function (d, b) {
    		        extendStatics = Object.setPrototypeOf ||
    		            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
    		            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    		        return extendStatics(d, b);
    		    };
    		    return function (d, b) {
    		        if (typeof b !== "function" && b !== null)
    		            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    		        extendStatics(d, b);
    		        function __() { this.constructor = d; }
    		        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    		    };
    		})();
    		var __assign = (Component && Component.__assign) || function () {
    		    __assign = Object.assign || function(t) {
    		        for (var s, i = 1, n = arguments.length; i < n; i++) {
    		            s = arguments[i];
    		            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
    		                t[p] = s[p];
    		        }
    		        return t;
    		    };
    		    return __assign.apply(this, arguments);
    		};
    		var __createBinding = (Component && Component.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    		    if (k2 === undefined) k2 = k;
    		    var desc = Object.getOwnPropertyDescriptor(m, k);
    		    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    		      desc = { enumerable: true, get: function() { return m[k]; } };
    		    }
    		    Object.defineProperty(o, k2, desc);
    		}) : (function(o, m, k, k2) {
    		    if (k2 === undefined) k2 = k;
    		    o[k2] = m[k];
    		}));
    		var __setModuleDefault = (Component && Component.__setModuleDefault) || (Object.create ? (function(o, v) {
    		    Object.defineProperty(o, "default", { enumerable: true, value: v });
    		}) : function(o, v) {
    		    o["default"] = v;
    		});
    		var __importStar = (Component && Component.__importStar) || function (mod) {
    		    if (mod && mod.__esModule) return mod;
    		    var result = {};
    		    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    		    __setModuleDefault(result, mod);
    		    return result;
    		};
    		var __importDefault = (Component && Component.__importDefault) || function (mod) {
    		    return (mod && mod.__esModule) ? mod : { "default": mod };
    		};
    		exports.__esModule = true;
    		var React = __importStar(requireReact$1());
    		var emotion_theming_1 = require$$1;
    		var default_1 = __importDefault(require_default());
    		var elements_1 = requireElements$1();
    		var Message_1 = __importDefault(requireMessage());
    		// https://stackoverflow.com/a/48254637/4089357
    		var customStringify = function (v) {
    		    var cache = new Set();
    		    return JSON.stringify(v, function (key, value) {
    		        if (typeof value === 'object' && value !== null) {
    		            if (cache.has(value)) {
    		                // Circular reference found, discard key
    		                return;
    		            }
    		            // Store value in our set
    		            cache.add(value);
    		        }
    		        return value;
    		    });
    		};
    		var getTheme = function (props) { return ({
    		    variant: props.variant || 'light',
    		    styles: __assign(__assign({}, (0, default_1["default"])(props)), props.styles)
    		}); };
    		var Console = /** @class */ (function (_super) {
    		    __extends(Console, _super);
    		    function Console() {
    		        var _this = _super !== null && _super.apply(this, arguments) || this;
    		        _this.state = {
    		            theme: getTheme(_this.props),
    		            prevStyles: _this.props.styles,
    		            prevVariant: _this.props.variant
    		        };
    		        return _this;
    		    }
    		    Console.getDerivedStateFromProps = function (props, state) {
    		        if (props.variant !== state.prevVariant ||
    		            JSON.stringify(props.styles) !== JSON.stringify(props.prevStyles)) {
    		            return {
    		                theme: getTheme(props),
    		                prevStyles: props.styles,
    		                prevVariant: props.variant
    		            };
    		        }
    		        return null;
    		    };
    		    Console.prototype.render = function () {
    		        var _this = this;
    		        var _a = this.props, _b = _a.filter, filter = _b === void 0 ? [] : _b, _c = _a.logs, logs = _c === void 0 ? [] : _c, searchKeywords = _a.searchKeywords, logFilter = _a.logFilter, _d = _a.logGrouping, logGrouping = _d === void 0 ? true : _d;
    		        if (searchKeywords) {
    		            var regex_1 = new RegExp(searchKeywords);
    		            var filterFun = logFilter
    		                ? logFilter
    		                : function (log) {
    		                    try {
    		                        return regex_1.test(customStringify(log));
    		                    }
    		                    catch (e) {
    		                        return true;
    		                    }
    		                };
    		            // @ts-ignore
    		            logs = logs.filter(filterFun);
    		        }
    		        if (logGrouping) {
    		            // @ts-ignore
    		            logs = logs.reduce(function (acc, log) {
    		                var prevLog = acc[acc.length - 1];
    		                if (prevLog &&
    		                    prevLog.amount &&
    		                    prevLog.method === log.method &&
    		                    prevLog.data.length === log.data.length &&
    		                    prevLog.data.every(function (value, i) { return log.data[i] === value; })) {
    		                    prevLog.amount += 1;
    		                    return acc;
    		                }
    		                acc.push(__assign(__assign({}, log), { amount: 1 }));
    		                return acc;
    		            }, []);
    		        }
    		        return (React.createElement(emotion_theming_1.ThemeProvider, { theme: this.state.theme },
    		            React.createElement(elements_1.Root, null, logs.map(function (log, i) {
    		                // If the filter is defined and doesn't include the method
    		                var filtered = filter.length !== 0 &&
    		                    log.method &&
    		                    filter.indexOf(log.method) === -1;
    		                return filtered ? null : (React.createElement(Message_1["default"], { log: log, key: log.id || "".concat(log.method, "-").concat(i), linkifyOptions: _this.props.linkifyOptions, components: _this.props.components }));
    		            }))));
    		    };
    		    return Console;
    		}(React.PureComponent));
    		exports["default"] = Console;
    		
    	} (Component));
    	return Component;
    }

    var Hook = {};

    var Methods = {};

    var hasRequiredMethods;

    function requireMethods () {
    	if (hasRequiredMethods) return Methods;
    	hasRequiredMethods = 1;
    	(function (exports) {
    		exports.__esModule = true;
    		var methods = [
    		    'log',
    		    'debug',
    		    'info',
    		    'warn',
    		    'error',
    		    'table',
    		    'clear',
    		    'time',
    		    'timeEnd',
    		    'count',
    		    'assert',
    		    'command',
    		    'result',
    		    'dir',
    		];
    		exports["default"] = methods;
    		
    	} (Methods));
    	return Methods;
    }

    var parse = {};

    var GUID = {};

    var hasRequiredGUID;

    function requireGUID () {
    	if (hasRequiredGUID) return GUID;
    	hasRequiredGUID = 1;
    	(function (exports) {
    		exports.__esModule = true;
    		function guidGenerator() {
    		    var S4 = function () {
    		        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    		    };
    		    return (S4() +
    		        S4() +
    		        '-' +
    		        S4() +
    		        '-' +
    		        S4() +
    		        '-' +
    		        S4() +
    		        '-' +
    		        S4() +
    		        '-' +
    		        Date.now());
    		}
    		exports["default"] = guidGenerator;
    		
    	} (GUID));
    	return GUID;
    }

    var timing = {};

    var state = {};

    var hasRequiredState;

    function requireState () {
    	if (hasRequiredState) return state;
    	hasRequiredState = 1;
    	state.__esModule = true;
    	state.update = state.state = void 0;
    	function update(newState) {
    	    state.state = newState;
    	}
    	state.update = update;
    	
    	return state;
    }

    var dispatch = {};

    var reducer = {};

    var hasRequiredReducer;

    function requireReducer () {
    	if (hasRequiredReducer) return reducer;
    	hasRequiredReducer = 1;
    	(function (exports) {
    		var __assign = (reducer && reducer.__assign) || function () {
    		    __assign = Object.assign || function(t) {
    		        for (var s, i = 1, n = arguments.length; i < n; i++) {
    		            s = arguments[i];
    		            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
    		                t[p] = s[p];
    		        }
    		        return t;
    		    };
    		    return __assign.apply(this, arguments);
    		};
    		exports.__esModule = true;
    		exports.initialState = void 0;
    		exports.initialState = {
    		    timings: {},
    		    count: {}
    		};
    		var now = function () {
    		    return typeof performance !== 'undefined' && performance.now
    		        ? performance.now()
    		        : Date.now();
    		};
    		exports["default"] = (function (state, action) {
    		    var _a, _b, _c;
    		    if (state === void 0) { state = exports.initialState; }
    		    switch (action.type) {
    		        case 'COUNT': {
    		            var times = state.count[action.name] || 0;
    		            return __assign(__assign({}, state), { count: __assign(__assign({}, state.count), (_a = {}, _a[action.name] = times + 1, _a)) });
    		        }
    		        case 'TIME_START': {
    		            return __assign(__assign({}, state), { timings: __assign(__assign({}, state.timings), (_b = {}, _b[action.name] = {
    		                    start: now()
    		                }, _b)) });
    		        }
    		        case 'TIME_END': {
    		            var timing = state.timings[action.name];
    		            var end = now();
    		            var start = timing.start;
    		            var time = end - start;
    		            return __assign(__assign({}, state), { timings: __assign(__assign({}, state.timings), (_c = {}, _c[action.name] = __assign(__assign({}, timing), { end: end, time: time }), _c)) });
    		        }
    		        default: {
    		            return state;
    		        }
    		    }
    		});
    		
    	} (reducer));
    	return reducer;
    }

    var hasRequiredDispatch;

    function requireDispatch () {
    	if (hasRequiredDispatch) return dispatch;
    	hasRequiredDispatch = 1;
    	(function (exports) {
    		var __importDefault = (dispatch && dispatch.__importDefault) || function (mod) {
    		    return (mod && mod.__esModule) ? mod : { "default": mod };
    		};
    		exports.__esModule = true;
    		var reducer_1 = __importDefault(requireReducer());
    		var state_1 = requireState();
    		function dispatch$1(action) {
    		    (0, state_1.update)((0, reducer_1["default"])(state_1.state, action));
    		}
    		exports["default"] = dispatch$1;
    		
    	} (dispatch));
    	return dispatch;
    }

    var actions = {};

    var hasRequiredActions;

    function requireActions () {
    	if (hasRequiredActions) return actions;
    	hasRequiredActions = 1;
    	actions.__esModule = true;
    	actions.timeEnd = actions.timeStart = actions.count = void 0;
    	function count(name) {
    	    return {
    	        type: 'COUNT',
    	        name: name
    	    };
    	}
    	actions.count = count;
    	function timeStart(name) {
    	    return {
    	        type: 'TIME_START',
    	        name: name
    	    };
    	}
    	actions.timeStart = timeStart;
    	function timeEnd(name) {
    	    return {
    	        type: 'TIME_END',
    	        name: name
    	    };
    	}
    	actions.timeEnd = timeEnd;
    	
    	return actions;
    }

    var hasRequiredTiming;

    function requireTiming () {
    	if (hasRequiredTiming) return timing;
    	hasRequiredTiming = 1;
    	var __importDefault = (timing && timing.__importDefault) || function (mod) {
    	    return (mod && mod.__esModule) ? mod : { "default": mod };
    	};
    	timing.__esModule = true;
    	timing.stop = timing.start = void 0;
    	var state_1 = requireState();
    	var dispatch_1 = __importDefault(requireDispatch());
    	var actions_1 = requireActions();
    	function start(label) {
    	    (0, dispatch_1["default"])((0, actions_1.timeStart)(label));
    	}
    	timing.start = start;
    	function stop(label) {
    	    var timing = state_1.state === null || state_1.state === void 0 ? void 0 : state_1.state.timings[label];
    	    if (timing && !timing.end) {
    	        (0, dispatch_1["default"])((0, actions_1.timeEnd)(label));
    	        var time = state_1.state.timings[label].time;
    	        return {
    	            method: 'log',
    	            data: ["".concat(label, ": ").concat(time, "ms")]
    	        };
    	    }
    	    return {
    	        method: 'warn',
    	        data: ["Timer '".concat(label, "' does not exist")]
    	    };
    	}
    	timing.stop = stop;
    	
    	return timing;
    }

    var count = {};

    var hasRequiredCount;

    function requireCount () {
    	if (hasRequiredCount) return count;
    	hasRequiredCount = 1;
    	var __importDefault = (count && count.__importDefault) || function (mod) {
    	    return (mod && mod.__esModule) ? mod : { "default": mod };
    	};
    	count.__esModule = true;
    	count.increment = void 0;
    	var state_1 = requireState();
    	var dispatch_1 = __importDefault(requireDispatch());
    	var actions_1 = requireActions();
    	function increment(label) {
    	    (0, dispatch_1["default"])((0, actions_1.count)(label));
    	    var times = state_1.state.count[label];
    	    return {
    	        method: 'log',
    	        data: ["".concat(label, ": ").concat(times)]
    	    };
    	}
    	count.increment = increment;
    	
    	return count;
    }

    var assert = {};

    var hasRequiredAssert;

    function requireAssert () {
    	if (hasRequiredAssert) return assert;
    	hasRequiredAssert = 1;
    	var __spreadArray = (assert && assert.__spreadArray) || function (to, from, pack) {
    	    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    	        if (ar || !(i in from)) {
    	            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
    	            ar[i] = from[i];
    	        }
    	    }
    	    return to.concat(ar || Array.prototype.slice.call(from));
    	};
    	assert.__esModule = true;
    	assert.test = void 0;
    	function test(expression) {
    	    var messages = [];
    	    for (var _i = 1; _i < arguments.length; _i++) {
    	        messages[_i - 1] = arguments[_i];
    	    }
    	    if (expression)
    	        return false;
    	    // Default message
    	    if (messages.length === 0)
    	        messages.push('console.assert');
    	    return {
    	        method: 'error',
    	        data: __spreadArray(["Assertion failed:"], messages, true)
    	    };
    	}
    	assert.test = test;
    	
    	return assert;
    }

    var hasRequiredParse;

    function requireParse () {
    	if (hasRequiredParse) return parse;
    	hasRequiredParse = 1;
    	(function (exports) {
    		var __assign = (parse && parse.__assign) || function () {
    		    __assign = Object.assign || function(t) {
    		        for (var s, i = 1, n = arguments.length; i < n; i++) {
    		            s = arguments[i];
    		            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
    		                t[p] = s[p];
    		        }
    		        return t;
    		    };
    		    return __assign.apply(this, arguments);
    		};
    		var __createBinding = (parse && parse.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    		    if (k2 === undefined) k2 = k;
    		    var desc = Object.getOwnPropertyDescriptor(m, k);
    		    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    		      desc = { enumerable: true, get: function() { return m[k]; } };
    		    }
    		    Object.defineProperty(o, k2, desc);
    		}) : (function(o, m, k, k2) {
    		    if (k2 === undefined) k2 = k;
    		    o[k2] = m[k];
    		}));
    		var __setModuleDefault = (parse && parse.__setModuleDefault) || (Object.create ? (function(o, v) {
    		    Object.defineProperty(o, "default", { enumerable: true, value: v });
    		}) : function(o, v) {
    		    o["default"] = v;
    		});
    		var __importStar = (parse && parse.__importStar) || function (mod) {
    		    if (mod && mod.__esModule) return mod;
    		    var result = {};
    		    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    		    __setModuleDefault(result, mod);
    		    return result;
    		};
    		var __spreadArray = (parse && parse.__spreadArray) || function (to, from, pack) {
    		    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    		        if (ar || !(i in from)) {
    		            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
    		            ar[i] = from[i];
    		        }
    		    }
    		    return to.concat(ar || Array.prototype.slice.call(from));
    		};
    		var __importDefault = (parse && parse.__importDefault) || function (mod) {
    		    return (mod && mod.__esModule) ? mod : { "default": mod };
    		};
    		exports.__esModule = true;
    		var GUID_1 = __importDefault(requireGUID());
    		var Timing = __importStar(requireTiming());
    		var Count = __importStar(requireCount());
    		var Assert = __importStar(requireAssert());
    		/**
    		 * Parses a console log and converts it to a special Log object
    		 * @argument method The console method to parse
    		 * @argument data The arguments passed to the console method
    		 */
    		function Parse(method, data, staticID) {
    		    // Create an ID
    		    var id = staticID || (0, GUID_1["default"])();
    		    // Parse the methods
    		    switch (method) {
    		        case 'clear': {
    		            return {
    		                method: method,
    		                id: id
    		            };
    		        }
    		        case 'count': {
    		            var label = typeof data[0] === 'string' ? data[0] : 'default';
    		            if (!label)
    		                return false;
    		            return __assign(__assign({}, Count.increment(label)), { id: id });
    		        }
    		        case 'time':
    		        case 'timeEnd': {
    		            var label = typeof data[0] === 'string' ? data[0] : 'default';
    		            if (!label)
    		                return false;
    		            if (method === 'time') {
    		                Timing.start(label);
    		                return false;
    		            }
    		            return __assign(__assign({}, Timing.stop(label)), { id: id });
    		        }
    		        case 'assert': {
    		            var valid = data.length !== 0;
    		            if (valid) {
    		                var assertion = Assert.test.apply(Assert, __spreadArray([data[0]], data.slice(1), false));
    		                if (assertion) {
    		                    return __assign(__assign({}, assertion), { id: id });
    		                }
    		            }
    		            return false;
    		        }
    		        case 'error': {
    		            var errors = data.map(function (error) {
    		                try {
    		                    return error.stack || error;
    		                }
    		                catch (e) {
    		                    return error;
    		                }
    		            });
    		            return {
    		                method: method,
    		                id: id,
    		                data: errors
    		            };
    		        }
    		        default: {
    		            return {
    		                method: method,
    		                id: id,
    		                data: data
    		            };
    		        }
    		    }
    		}
    		exports["default"] = Parse;
    		
    	} (parse));
    	return parse;
    }

    var Transform = {};

    var arithmetic = {};

    var hasRequiredArithmetic;

    function requireArithmetic () {
    	if (hasRequiredArithmetic) return arithmetic;
    	hasRequiredArithmetic = 1;
    	(function (exports) {
    		exports.__esModule = true;
    		var Arithmetic;
    		(function (Arithmetic) {
    		    Arithmetic[Arithmetic["infinity"] = 0] = "infinity";
    		    Arithmetic[Arithmetic["minusInfinity"] = 1] = "minusInfinity";
    		    Arithmetic[Arithmetic["minusZero"] = 2] = "minusZero";
    		})(Arithmetic || (Arithmetic = {}));
    		function isMinusZero(value) {
    		    return 1 / value === -Infinity;
    		}
    		exports["default"] = {
    		    type: 'Arithmetic',
    		    lookup: Number,
    		    shouldTransform: function (type, value) {
    		        return (type === 'number' &&
    		            (value === Infinity || value === -Infinity || isMinusZero(value)));
    		    },
    		    toSerializable: function (value) {
    		        return value === Infinity
    		            ? Arithmetic.infinity
    		            : value === -Infinity
    		                ? Arithmetic.minusInfinity
    		                : Arithmetic.minusZero;
    		    },
    		    fromSerializable: function (data) {
    		        if (data === Arithmetic.infinity)
    		            return Infinity;
    		        if (data === Arithmetic.minusInfinity)
    		            return -Infinity;
    		        if (data === Arithmetic.minusZero)
    		            return -0;
    		        return data;
    		    }
    		};
    		
    	} (arithmetic));
    	return arithmetic;
    }

    var BigInt$1 = {};

    var hasRequiredBigInt;

    function requireBigInt () {
    	if (hasRequiredBigInt) return BigInt$1;
    	hasRequiredBigInt = 1;
    	(function (exports) {
    		exports.__esModule = true;
    		/**
    		 * Serialize a `bigint` to a string
    		 */
    		exports["default"] = {
    		    type: 'BigInt',
    		    shouldTransform: function (_type, obj) {
    		        return typeof obj === 'bigint';
    		    },
    		    toSerializable: function (value) {
    		        return "".concat(value, "n");
    		    },
    		    fromSerializable: function (data) {
    		        return BigInt(data.slice(0, -1));
    		    }
    		};
    		
    	} (BigInt$1));
    	return BigInt$1;
    }

    var _Function = {};

    var hasRequired_Function;

    function require_Function () {
    	if (hasRequired_Function) return _Function;
    	hasRequired_Function = 1;
    	(function (exports) {
    		exports.__esModule = true;
    		/**
    		 * Serialize a function into JSON
    		 */
    		exports["default"] = {
    		    type: 'Function',
    		    lookup: Function,
    		    shouldTransform: function (type, obj) {
    		        return typeof obj === 'function';
    		    },
    		    toSerializable: function (func) {
    		        var body = '';
    		        try {
    		            body = func
    		                .toString()
    		                .substring(body.indexOf('{') + 1, body.lastIndexOf('}'));
    		        }
    		        catch (e) { }
    		        return {
    		            name: func.name,
    		            body: body,
    		            proto: Object.getPrototypeOf(func).constructor.name
    		        };
    		    },
    		    fromSerializable: function (data) {
    		        try {
    		            var tempFunc = function () { };
    		            if (typeof data.name === 'string') {
    		                Object.defineProperty(tempFunc, 'name', {
    		                    value: data.name,
    		                    writable: false
    		                });
    		            }
    		            if (typeof data.body === 'string') {
    		                Object.defineProperty(tempFunc, 'body', {
    		                    value: data.body,
    		                    writable: false
    		                });
    		            }
    		            if (typeof data.proto === 'string') {
    		                // @ts-ignore
    		                tempFunc.constructor = {
    		                    name: data.proto
    		                };
    		            }
    		            return tempFunc;
    		        }
    		        catch (e) {
    		            return data;
    		        }
    		    }
    		};
    		
    	} (_Function));
    	return _Function;
    }

    var HTML = {};

    var hasRequiredHTML;

    function requireHTML () {
    	if (hasRequiredHTML) return HTML;
    	hasRequiredHTML = 1;
    	(function (exports) {
    		exports.__esModule = true;
    		// Sandbox HTML elements
    		var sandbox;
    		function getSandbox() {
    		    return (sandbox || (sandbox = document.implementation.createHTMLDocument('sandbox')));
    		}
    		function objectifyAttributes(element) {
    		    var data = {};
    		    for (var _i = 0, _a = element.attributes; _i < _a.length; _i++) {
    		        var attribute = _a[_i];
    		        data[attribute.name] = attribute.value;
    		    }
    		    return data;
    		}
    		/**
    		 * Serialize a HTML element into JSON
    		 */
    		exports["default"] = {
    		    type: 'HTMLElement',
    		    shouldTransform: function (type, obj) {
    		        return (obj &&
    		            obj.children &&
    		            typeof obj.innerHTML === 'string' &&
    		            typeof obj.tagName === 'string');
    		    },
    		    toSerializable: function (element) {
    		        return {
    		            tagName: element.tagName.toLowerCase(),
    		            attributes: objectifyAttributes(element),
    		            innerHTML: element.innerHTML
    		        };
    		    },
    		    fromSerializable: function (data) {
    		        try {
    		            var element = getSandbox().createElement(data.tagName);
    		            element.innerHTML = data.innerHTML;
    		            for (var _i = 0, _a = Object.keys(data.attributes); _i < _a.length; _i++) {
    		                var attribute = _a[_i];
    		                try {
    		                    element.setAttribute(attribute, data.attributes[attribute]);
    		                }
    		                catch (e) { }
    		            }
    		            return element;
    		        }
    		        catch (e) {
    		            return data;
    		        }
    		    }
    		};
    		
    	} (HTML));
    	return HTML;
    }

    var _Map = {};

    var hasRequired_Map;

    function require_Map () {
    	if (hasRequired_Map) return _Map;
    	hasRequired_Map = 1;
    	(function (exports) {
    		var __assign = (_Map && _Map.__assign) || function () {
    		    __assign = Object.assign || function(t) {
    		        for (var s, i = 1, n = arguments.length; i < n; i++) {
    		            s = arguments[i];
    		            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
    		                t[p] = s[p];
    		        }
    		        return t;
    		    };
    		    return __assign.apply(this, arguments);
    		};
    		exports.__esModule = true;
    		/**
    		 * Serialize a Map into JSON
    		 */
    		exports["default"] = {
    		    type: 'Map',
    		    lookup: Map,
    		    shouldTransform: function (type, obj) {
    		        return obj && obj.constructor && obj.constructor.name === 'Map';
    		    },
    		    toSerializable: function (map) {
    		        var body = {};
    		        map.forEach(function (value, key) {
    		            var k = typeof key == 'object' ? JSON.stringify(key) : key;
    		            body[k] = value;
    		        });
    		        return {
    		            name: 'Map',
    		            body: body,
    		            proto: Object.getPrototypeOf(map).constructor.name
    		        };
    		    },
    		    fromSerializable: function (data) {
    		        var body = data.body;
    		        var obj = __assign({}, body);
    		        if (typeof data.proto === 'string') {
    		            // @ts-ignore
    		            obj.constructor = {
    		                name: data.proto
    		            };
    		        }
    		        return obj;
    		    }
    		};
    		
    	} (_Map));
    	return _Map;
    }

    var replicator = {};

    var hasRequiredReplicator;

    function requireReplicator () {
    	if (hasRequiredReplicator) return replicator;
    	hasRequiredReplicator = 1;
    	(function (exports) {
    		exports.__esModule = true;
    		// Const
    		var TRANSFORMED_TYPE_KEY = '@t';
    		var CIRCULAR_REF_KEY = '@r';
    		var KEY_REQUIRE_ESCAPING_RE = /^#*@(t|r)$/;
    		var REMAINING_KEY = '__console_feed_remaining__';
    		var GLOBAL = (function getGlobal() {
    		    // NOTE: see http://www.ecma-international.org/ecma-262/6.0/index.html#sec-performeval step 10
    		    var savedEval = eval;
    		    return savedEval('this');
    		})();
    		var ARRAY_BUFFER_SUPPORTED = typeof ArrayBuffer === 'function';
    		var MAP_SUPPORTED = typeof Map === 'function';
    		var SET_SUPPORTED = typeof Set === 'function';
    		var TYPED_ARRAY_CTORS = [
    		    'Int8Array',
    		    'Uint8Array',
    		    'Uint8ClampedArray',
    		    'Int16Array',
    		    'Uint16Array',
    		    'Int32Array',
    		    'Uint32Array',
    		    'Float32Array',
    		    'Float64Array',
    		];
    		// Saved proto functions
    		var arrSlice = Array.prototype.slice;
    		// Default serializer
    		var JSONSerializer = {
    		    serialize: function (val) {
    		        return JSON.stringify(val);
    		    },
    		    deserialize: function (val) {
    		        return JSON.parse(val);
    		    }
    		};
    		// EncodingTransformer
    		var EncodingTransformer = /** @class */ (function () {
    		    function EncodingTransformer(val, transforms, limit) {
    		        this.references = val;
    		        this.transforms = transforms;
    		        this.transformsMap = this._makeTransformsMap();
    		        this.circularCandidates = [];
    		        this.circularCandidatesDescrs = [];
    		        this.circularRefCount = 0;
    		        this.limit = limit !== null && limit !== void 0 ? limit : Infinity;
    		    }
    		    EncodingTransformer._createRefMark = function (idx) {
    		        var obj = Object.create(null);
    		        obj[CIRCULAR_REF_KEY] = idx;
    		        return obj;
    		    };
    		    EncodingTransformer.prototype._createCircularCandidate = function (val, parent, key) {
    		        this.circularCandidates.push(val);
    		        this.circularCandidatesDescrs.push({ parent: parent, key: key, refIdx: -1 });
    		    };
    		    EncodingTransformer.prototype._applyTransform = function (val, parent, key, transform) {
    		        var result = Object.create(null);
    		        var serializableVal = transform.toSerializable(val);
    		        if (typeof serializableVal === 'object')
    		            this._createCircularCandidate(val, parent, key);
    		        result[TRANSFORMED_TYPE_KEY] = transform.type;
    		        result.data = this._handleValue(function () { return serializableVal; }, parent, key);
    		        return result;
    		    };
    		    EncodingTransformer.prototype._handleArray = function (arr) {
    		        var result = [];
    		        var arrayLimit = Math.min(arr.length, this.limit);
    		        var remaining = arr.length - arrayLimit;
    		        var _loop_1 = function (i) {
    		            result[i] = this_1._handleValue(function () { return arr[i]; }, result, i);
    		        };
    		        var this_1 = this;
    		        for (var i = 0; i < arrayLimit; i++) {
    		            _loop_1(i);
    		        }
    		        result[arrayLimit] = REMAINING_KEY + remaining;
    		        return result;
    		    };
    		    EncodingTransformer.prototype._handlePlainObject = function (obj) {
    		        var _a, _b;
    		        var result = Object.create(null);
    		        var counter = 0;
    		        var total = 0;
    		        var _loop_2 = function (key) {
    		            if (Reflect.has(obj, key)) {
    		                if (counter >= this_2.limit) {
    		                    total++;
    		                    return "continue";
    		                }
    		                var resultKey = KEY_REQUIRE_ESCAPING_RE.test(key) ? "#".concat(key) : key;
    		                result[resultKey] = this_2._handleValue(function () { return obj[key]; }, result, resultKey);
    		                counter++;
    		                total++;
    		            }
    		        };
    		        var this_2 = this;
    		        for (var key in obj) {
    		            _loop_2(key);
    		        }
    		        var remaining = total - counter;
    		        var name = (_b = (_a = obj === null || obj === void 0 ? void 0 : obj.__proto__) === null || _a === void 0 ? void 0 : _a.constructor) === null || _b === void 0 ? void 0 : _b.name;
    		        if (name && name !== 'Object') {
    		            result.constructor = { name: name };
    		        }
    		        if (remaining) {
    		            result[REMAINING_KEY] = remaining;
    		        }
    		        return result;
    		    };
    		    EncodingTransformer.prototype._handleObject = function (obj, parent, key) {
    		        this._createCircularCandidate(obj, parent, key);
    		        return Array.isArray(obj)
    		            ? this._handleArray(obj)
    		            : this._handlePlainObject(obj);
    		    };
    		    EncodingTransformer.prototype._ensureCircularReference = function (obj) {
    		        var circularCandidateIdx = this.circularCandidates.indexOf(obj);
    		        if (circularCandidateIdx > -1) {
    		            var descr = this.circularCandidatesDescrs[circularCandidateIdx];
    		            if (descr.refIdx === -1)
    		                descr.refIdx = descr.parent ? ++this.circularRefCount : 0;
    		            return EncodingTransformer._createRefMark(descr.refIdx);
    		        }
    		        return null;
    		    };
    		    EncodingTransformer.prototype._handleValue = function (getVal, parent, key) {
    		        try {
    		            var val = getVal();
    		            var type = typeof val;
    		            var isObject = type === 'object' && val !== null;
    		            if (isObject) {
    		                var refMark = this._ensureCircularReference(val);
    		                if (refMark)
    		                    return refMark;
    		            }
    		            var transform = this._findTransform(type, val);
    		            if (transform) {
    		                return this._applyTransform(val, parent, key, transform);
    		            }
    		            if (isObject)
    		                return this._handleObject(val, parent, key);
    		            return val;
    		        }
    		        catch (e) {
    		            try {
    		                return this._handleValue(function () { return (e instanceof Error ? e : new Error(e)); }, parent, key);
    		            }
    		            catch (_a) {
    		                return null;
    		            }
    		        }
    		    };
    		    EncodingTransformer.prototype._makeTransformsMap = function () {
    		        if (!MAP_SUPPORTED) {
    		            return;
    		        }
    		        var map = new Map();
    		        this.transforms.forEach(function (transform) {
    		            if (transform.lookup) {
    		                map.set(transform.lookup, transform);
    		            }
    		        });
    		        return map;
    		    };
    		    EncodingTransformer.prototype._findTransform = function (type, val) {
    		        if (MAP_SUPPORTED) {
    		            if (val && val.constructor) {
    		                var transform = this.transformsMap.get(val.constructor);
    		                if (transform === null || transform === void 0 ? void 0 : transform.shouldTransform(type, val))
    		                    return transform;
    		            }
    		        }
    		        for (var _i = 0, _a = this.transforms; _i < _a.length; _i++) {
    		            var transform = _a[_i];
    		            if (transform.shouldTransform(type, val))
    		                return transform;
    		        }
    		    };
    		    EncodingTransformer.prototype.transform = function () {
    		        var _this = this;
    		        var references = [this._handleValue(function () { return _this.references; }, null, null)];
    		        for (var _i = 0, _a = this.circularCandidatesDescrs; _i < _a.length; _i++) {
    		            var descr = _a[_i];
    		            if (descr.refIdx > 0) {
    		                references[descr.refIdx] = descr.parent[descr.key];
    		                descr.parent[descr.key] = EncodingTransformer._createRefMark(descr.refIdx);
    		            }
    		        }
    		        return references;
    		    };
    		    return EncodingTransformer;
    		}());
    		// DecodingTransform
    		var DecodingTransformer = /** @class */ (function () {
    		    function DecodingTransformer(references, transformsMap) {
    		        this.activeTransformsStack = [];
    		        this.visitedRefs = Object.create(null);
    		        this.references = references;
    		        this.transformMap = transformsMap;
    		    }
    		    DecodingTransformer.prototype._handlePlainObject = function (obj) {
    		        var unescaped = Object.create(null);
    		        if ('constructor' in obj) {
    		            if (!obj.constructor || typeof obj.constructor.name !== 'string') {
    		                obj.constructor = {
    		                    name: 'Object'
    		                };
    		            }
    		        }
    		        for (var key in obj) {
    		            if (obj.hasOwnProperty(key)) {
    		                this._handleValue(obj[key], obj, key);
    		                if (KEY_REQUIRE_ESCAPING_RE.test(key)) {
    		                    // NOTE: use intermediate object to avoid unescaped and escaped keys interference
    		                    // E.g. unescaped "##@t" will be "#@t" which can overwrite escaped "#@t".
    		                    unescaped[key.substring(1)] = obj[key];
    		                    delete obj[key];
    		                }
    		            }
    		        }
    		        for (var unsecapedKey in unescaped)
    		            obj[unsecapedKey] = unescaped[unsecapedKey];
    		    };
    		    DecodingTransformer.prototype._handleTransformedObject = function (obj, parent, key) {
    		        var transformType = obj[TRANSFORMED_TYPE_KEY];
    		        var transform = this.transformMap[transformType];
    		        if (!transform)
    		            throw new Error("Can't find transform for \"".concat(transformType, "\" type."));
    		        this.activeTransformsStack.push(obj);
    		        this._handleValue(obj.data, obj, 'data');
    		        this.activeTransformsStack.pop();
    		        parent[key] = transform.fromSerializable(obj.data);
    		    };
    		    DecodingTransformer.prototype._handleCircularSelfRefDuringTransform = function (refIdx, parent, key) {
    		        // NOTE: we've hit a hard case: object reference itself during transformation.
    		        // We can't dereference it since we don't have resulting object yet. And we'll
    		        // not be able to restore reference lately because we will need to traverse
    		        // transformed object again and reference might be unreachable or new object contain
    		        // new circular references. As a workaround we create getter, so once transformation
    		        // complete, dereferenced property will point to correct transformed object.
    		        var references = this.references;
    		        Object.defineProperty(parent, key, {
    		            // @ts-ignore
    		            val: void 0,
    		            configurable: true,
    		            enumerable: true,
    		            get: function () {
    		                if (this.val === void 0)
    		                    this.val = references[refIdx];
    		                return this.val;
    		            },
    		            set: function (value) {
    		                this.val = value;
    		            }
    		        });
    		    };
    		    DecodingTransformer.prototype._handleCircularRef = function (refIdx, parent, key) {
    		        if (this.activeTransformsStack.includes(this.references[refIdx]))
    		            this._handleCircularSelfRefDuringTransform(refIdx, parent, key);
    		        else {
    		            if (!this.visitedRefs[refIdx]) {
    		                this.visitedRefs[refIdx] = true;
    		                this._handleValue(this.references[refIdx], this.references, refIdx);
    		            }
    		            parent[key] = this.references[refIdx];
    		        }
    		    };
    		    DecodingTransformer.prototype._handleValue = function (val, parent, key) {
    		        if (typeof val !== 'object' || val === null)
    		            return;
    		        var refIdx = val[CIRCULAR_REF_KEY];
    		        if (refIdx !== void 0)
    		            this._handleCircularRef(refIdx, parent, key);
    		        else if (val[TRANSFORMED_TYPE_KEY])
    		            this._handleTransformedObject(val, parent, key);
    		        else if (Array.isArray(val)) {
    		            for (var i = 0; i < val.length; i++)
    		                this._handleValue(val[i], val, i);
    		        }
    		        else
    		            this._handlePlainObject(val);
    		    };
    		    DecodingTransformer.prototype.transform = function () {
    		        this.visitedRefs[0] = true;
    		        this._handleValue(this.references[0], this.references, 0);
    		        return this.references[0];
    		    };
    		    return DecodingTransformer;
    		}());
    		// Transforms
    		var builtInTransforms = [
    		    {
    		        type: '[[NaN]]',
    		        shouldTransform: function (type, val) {
    		            return type === 'number' && isNaN(val);
    		        },
    		        toSerializable: function () {
    		            return '';
    		        },
    		        fromSerializable: function () {
    		            return NaN;
    		        }
    		    },
    		    {
    		        type: '[[undefined]]',
    		        shouldTransform: function (type) {
    		            return type === 'undefined';
    		        },
    		        toSerializable: function () {
    		            return '';
    		        },
    		        fromSerializable: function () {
    		            return void 0;
    		        }
    		    },
    		    {
    		        type: '[[Date]]',
    		        lookup: Date,
    		        shouldTransform: function (type, val) {
    		            return val instanceof Date;
    		        },
    		        toSerializable: function (date) {
    		            return date.getTime();
    		        },
    		        fromSerializable: function (val) {
    		            var date = new Date();
    		            date.setTime(val);
    		            return date;
    		        }
    		    },
    		    {
    		        type: '[[RegExp]]',
    		        lookup: RegExp,
    		        shouldTransform: function (type, val) {
    		            return val instanceof RegExp;
    		        },
    		        toSerializable: function (re) {
    		            var result = {
    		                src: re.source,
    		                flags: ''
    		            };
    		            if (re.global)
    		                result.flags += 'g';
    		            if (re.ignoreCase)
    		                result.flags += 'i';
    		            if (re.multiline)
    		                result.flags += 'm';
    		            return result;
    		        },
    		        fromSerializable: function (val) {
    		            return new RegExp(val.src, val.flags);
    		        }
    		    },
    		    {
    		        type: '[[Error]]',
    		        lookup: Error,
    		        shouldTransform: function (type, val) {
    		            return val instanceof Error;
    		        },
    		        toSerializable: function (err) {
    		            var _a, _b;
    		            if (!err.stack) {
    		                (_b = (_a = Error).captureStackTrace) === null || _b === void 0 ? void 0 : _b.call(_a, err);
    		            }
    		            return {
    		                name: err.name,
    		                message: err.message,
    		                stack: err.stack
    		            };
    		        },
    		        fromSerializable: function (val) {
    		            var Ctor = GLOBAL[val.name] || Error;
    		            var err = new Ctor(val.message);
    		            err.stack = val.stack;
    		            return err;
    		        }
    		    },
    		    {
    		        type: '[[ArrayBuffer]]',
    		        lookup: ARRAY_BUFFER_SUPPORTED && ArrayBuffer,
    		        shouldTransform: function (type, val) {
    		            return ARRAY_BUFFER_SUPPORTED && val instanceof ArrayBuffer;
    		        },
    		        toSerializable: function (buffer) {
    		            var view = new Int8Array(buffer);
    		            return arrSlice.call(view);
    		        },
    		        fromSerializable: function (val) {
    		            if (ARRAY_BUFFER_SUPPORTED) {
    		                var buffer = new ArrayBuffer(val.length);
    		                var view = new Int8Array(buffer);
    		                view.set(val);
    		                return buffer;
    		            }
    		            return val;
    		        }
    		    },
    		    {
    		        type: '[[TypedArray]]',
    		        shouldTransform: function (type, val) {
    		            if (ARRAY_BUFFER_SUPPORTED) {
    		                return ArrayBuffer.isView(val) && !(val instanceof DataView);
    		            }
    		            for (var _i = 0, TYPED_ARRAY_CTORS_1 = TYPED_ARRAY_CTORS; _i < TYPED_ARRAY_CTORS_1.length; _i++) {
    		                var ctorName = TYPED_ARRAY_CTORS_1[_i];
    		                if (typeof GLOBAL[ctorName] === 'function' &&
    		                    val instanceof GLOBAL[ctorName])
    		                    return true;
    		            }
    		            return false;
    		        },
    		        toSerializable: function (arr) {
    		            return {
    		                ctorName: arr.constructor.name,
    		                arr: arrSlice.call(arr)
    		            };
    		        },
    		        fromSerializable: function (val) {
    		            return typeof GLOBAL[val.ctorName] === 'function'
    		                ? new GLOBAL[val.ctorName](val.arr)
    		                : val.arr;
    		        }
    		    },
    		    {
    		        type: '[[Map]]',
    		        lookup: MAP_SUPPORTED && Map,
    		        shouldTransform: function (type, val) {
    		            return MAP_SUPPORTED && val instanceof Map;
    		        },
    		        toSerializable: function (map) {
    		            var flattenedKVArr = [];
    		            map.forEach(function (val, key) {
    		                flattenedKVArr.push(key);
    		                flattenedKVArr.push(val);
    		            });
    		            return flattenedKVArr;
    		        },
    		        fromSerializable: function (val) {
    		            if (MAP_SUPPORTED) {
    		                // NOTE: new Map(iterable) is not supported by all browsers
    		                var map = new Map();
    		                for (var i = 0; i < val.length; i += 2)
    		                    map.set(val[i], val[i + 1]);
    		                return map;
    		            }
    		            var kvArr = [];
    		            // @ts-ignore
    		            for (var j = 0; j < val.length; j += 2)
    		                kvArr.push([val[i], val[i + 1]]);
    		            return kvArr;
    		        }
    		    },
    		    {
    		        type: '[[Set]]',
    		        lookup: SET_SUPPORTED && Set,
    		        shouldTransform: function (type, val) {
    		            return SET_SUPPORTED && val instanceof Set;
    		        },
    		        toSerializable: function (set) {
    		            var arr = [];
    		            set.forEach(function (val) {
    		                arr.push(val);
    		            });
    		            return arr;
    		        },
    		        fromSerializable: function (val) {
    		            if (SET_SUPPORTED) {
    		                // NOTE: new Set(iterable) is not supported by all browsers
    		                var set = new Set();
    		                for (var i = 0; i < val.length; i++)
    		                    set.add(val[i]);
    		                return set;
    		            }
    		            return val;
    		        }
    		    },
    		];
    		// Replicator
    		var Replicator = /** @class */ (function () {
    		    function Replicator(serializer) {
    		        this.transforms = [];
    		        this.transformsMap = Object.create(null);
    		        this.serializer = serializer || JSONSerializer;
    		        this.addTransforms(builtInTransforms);
    		    }
    		    Replicator.prototype.addTransforms = function (transforms) {
    		        transforms = Array.isArray(transforms) ? transforms : [transforms];
    		        for (var _i = 0, transforms_1 = transforms; _i < transforms_1.length; _i++) {
    		            var transform = transforms_1[_i];
    		            if (this.transformsMap[transform.type])
    		                throw new Error("Transform with type \"".concat(transform.type, "\" was already added."));
    		            this.transforms.push(transform);
    		            this.transformsMap[transform.type] = transform;
    		        }
    		        return this;
    		    };
    		    Replicator.prototype.removeTransforms = function (transforms) {
    		        transforms = Array.isArray(transforms) ? transforms : [transforms];
    		        for (var _i = 0, transforms_2 = transforms; _i < transforms_2.length; _i++) {
    		            var transform = transforms_2[_i];
    		            var idx = this.transforms.indexOf(transform);
    		            if (idx > -1)
    		                this.transforms.splice(idx, 1);
    		            delete this.transformsMap[transform.type];
    		        }
    		        return this;
    		    };
    		    Replicator.prototype.encode = function (val, limit) {
    		        var transformer = new EncodingTransformer(val, this.transforms, limit);
    		        var references = transformer.transform();
    		        return this.serializer.serialize(references);
    		    };
    		    Replicator.prototype.decode = function (val) {
    		        var references = this.serializer.deserialize(val);
    		        var transformer = new DecodingTransformer(references, this.transformsMap);
    		        return transformer.transform();
    		    };
    		    return Replicator;
    		}());
    		exports["default"] = Replicator;
    		
    	} (replicator));
    	return replicator;
    }

    var hasRequiredTransform;

    function requireTransform () {
    	if (hasRequiredTransform) return Transform;
    	hasRequiredTransform = 1;
    	var __importDefault = (Transform && Transform.__importDefault) || function (mod) {
    	    return (mod && mod.__esModule) ? mod : { "default": mod };
    	};
    	Transform.__esModule = true;
    	Transform.Decode = Transform.Encode = void 0;
    	var arithmetic_1 = __importDefault(requireArithmetic());
    	var BigInt_1 = __importDefault(requireBigInt());
    	var Function_1 = __importDefault(require_Function());
    	var HTML_1 = __importDefault(requireHTML());
    	var Map_1 = __importDefault(require_Map());
    	var replicator_1 = __importDefault(requireReplicator());
    	var transforms = [HTML_1["default"], Function_1["default"], arithmetic_1["default"], Map_1["default"], BigInt_1["default"]];
    	var replicator = new replicator_1["default"]();
    	replicator.addTransforms(transforms);
    	function Encode(data, limit) {
    	    return JSON.parse(replicator.encode(data, limit));
    	}
    	Transform.Encode = Encode;
    	function Decode(data) {
    	    var decoded = replicator.decode(JSON.stringify(data));
    	    // remove __console_feed_remaining__
    	    decoded.data.pop();
    	    return decoded;
    	}
    	Transform.Decode = Decode;
    	
    	return Transform;
    }

    var hasRequiredHook;

    function requireHook () {
    	if (hasRequiredHook) return Hook;
    	hasRequiredHook = 1;
    	(function (exports) {
    		var __importDefault = (Hook && Hook.__importDefault) || function (mod) {
    		    return (mod && mod.__esModule) ? mod : { "default": mod };
    		};
    		exports.__esModule = true;
    		var Methods_1 = __importDefault(requireMethods());
    		var parse_1 = __importDefault(requireParse());
    		var Transform_1 = requireTransform();
    		// import Construct from './construct'
    		/**
    		 * Hook a console constructor and forward messages to a callback
    		 * @argument console The Console constructor to Hook
    		 * @argument callback The callback to be called once a message is logged
    		 */
    		function Hook$1(console, callback, encode, limit) {
    		    if (encode === void 0) { encode = true; }
    		    var TargetConsole = console;
    		    var Storage = {
    		        pointers: {},
    		        src: {
    		            npm: 'https://npmjs.com/package/console-feed',
    		            github: 'https://github.com/samdenty/console-feed'
    		        }
    		    };
    		    var _loop_1 = function (method) {
    		        var NativeMethod = TargetConsole[method];
    		        // Override
    		        TargetConsole[method] = function () {
    		            // Pass back to native method
    		            NativeMethod.apply(this, arguments);
    		            // Parse arguments and send to transport
    		            var args = [].slice.call(arguments);
    		            // setTimeout to prevent lag
    		            setTimeout(function () {
    		                var parsed = (0, parse_1["default"])(method, args);
    		                if (parsed) {
    		                    var encoded = parsed;
    		                    if (encode) {
    		                        encoded = (0, Transform_1.Encode)(parsed, limit);
    		                    }
    		                    callback(encoded, parsed);
    		                }
    		            });
    		        };
    		        // Store native methods
    		        Storage.pointers[method] = NativeMethod;
    		    };
    		    // Override console methods
    		    for (var _i = 0, Methods_2 = Methods_1["default"]; _i < Methods_2.length; _i++) {
    		        var method = Methods_2[_i];
    		        _loop_1(method);
    		    }
    		    TargetConsole.feed = Storage;
    		    return TargetConsole;
    		}
    		exports["default"] = Hook$1;
    		
    	} (Hook));
    	return Hook;
    }

    var Unhook = {};

    var hasRequiredUnhook;

    function requireUnhook () {
    	if (hasRequiredUnhook) return Unhook;
    	hasRequiredUnhook = 1;
    	(function (exports) {
    		exports.__esModule = true;
    		/**
    		 * Unhook a console constructor and restore back the Native methods
    		 * @argument console The Console constructor to Hook
    		 */
    		function Unhook(console) {
    		    if (console.feed) {
    		        for (var _i = 0, _a = Object.keys(console.feed.pointers); _i < _a.length; _i++) {
    		            var method = _a[_i];
    		            console[method] = console.feed.pointers[method];
    		        }
    		        return delete console.feed;
    		    }
    		    else {
    		        return false;
    		    }
    		}
    		exports["default"] = Unhook;
    		
    	} (Unhook));
    	return Unhook;
    }

    var hasRequiredLib;

    function requireLib () {
    	if (hasRequiredLib) return lib;
    	hasRequiredLib = 1;
    	(function (exports) {
    		var __createBinding = (lib && lib.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    		    if (k2 === undefined) k2 = k;
    		    var desc = Object.getOwnPropertyDescriptor(m, k);
    		    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    		      desc = { enumerable: true, get: function() { return m[k]; } };
    		    }
    		    Object.defineProperty(o, k2, desc);
    		}) : (function(o, m, k, k2) {
    		    if (k2 === undefined) k2 = k;
    		    o[k2] = m[k];
    		}));
    		exports.__esModule = true;
    		exports.Encode = exports.Decode = exports.Unhook = exports.Hook = exports.Console = void 0;
    		var Component_1 = requireComponent();
    		__createBinding(exports, Component_1, "default", "Console");
    		var Hook_1 = requireHook();
    		__createBinding(exports, Hook_1, "default", "Hook");
    		var Unhook_1 = requireUnhook();
    		__createBinding(exports, Unhook_1, "default", "Unhook");
    		var Transform_1 = requireTransform();
    		__createBinding(exports, Transform_1, "Decode");
    		var Transform_2 = requireTransform();
    		__createBinding(exports, Transform_2, "Encode");
    		
    	} (lib));
    	return lib;
    }

    var libExports = requireLib();

    class LogClient {
        baseURL;
        constructor() {
            this.baseURL = "http://localhost:4096/api/v1";
        }
        async append(log) {
            await fetch(`${this.baseURL}/logs/append`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ log }),
            });
        }
        async clear() {
            await fetch(`${this.baseURL}/logs/clear`, {
                method: "POST",
            });
        }
    }
    async function initializeDevToolsLatest() {
        const logClient = new LogClient();
        await logClient.clear();
        const getInspectName = (element) => {
            return element.nodeName;
        };
        let overlay = null;
        const mousePos = { x: 0, y: 0 };
        wrap(windowEndpoint(window.parent));
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
        expose(api, windowEndpoint(window.parent));
        libExports.Hook(window.console, async (log) => {
            const message = log;
            const logEntry = {
                id: message.id,
                type: "console",
                source: "browser",
                method: message.method,
                data: message.data,
                timestamp: message.timestamp || new Date().toISOString(),
                amount: message.amount,
                userAgent: navigator.userAgent,
            };
            await logClient.append(logEntry);
        });
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
            console.log({ fiber, props, source });
            // connection.selectElement({ props, source });
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
