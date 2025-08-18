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
            const path = target.getAttribute("data-insp-path") || "";
            connection.selectElement(path);
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
