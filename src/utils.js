function clamp(value, min, max, name) {
    if (value > max) {
        console.warn(`Value ${name} outside nominal range [${min}, ${max}]; value will be clamped.`);
        return max;
    } else if (value < min) {
        console.warn(`Value ${name} outside nominal range [${min}, ${max}]; value will be clamped.`);
        return min;
    } else {
        return value;
    }
}

function desmosPrint(pointArray, minX, maxX) {
    let out_str = "";
    if (minX) { // just y values
        for (let i = 0; i < pointArray.length; i++) {
            out_str += `${i / (pointArray.length - 1) * (maxX - minX) + minX}\t${pointArray[i]}\n`;
        }
    } else { // x, y, x, y
        for (let i = 0; i < pointArray.length / 2; i++) {
            out_str += `${pointArray[i * 2]}\t${pointArray[i * 2 + 1]}\n`;
        }
    }
}

function isNumeric(n) {
    return (n !== null) && (n !== undefined) && !!n.toFixed;
}

function isString(s) {
    return (typeof s === 'string' || s instanceof String);
}

let ID_INDEX = 0;

function getID() {
    return ++ID_INDEX;
}

function assert(test, message = "Assertion error") {
    if (!test) {
        throw new Error(message);
    }
}

function compareObjects(object1, object2) {
    for (let p in object1){
        if (object1.hasOwnProperty(p)) {
            if (object1[p] !== object2[p]) {
                return false;
            }
        }
    }

    for (let p in object2) {
        if (object2.hasOwnProperty(p)) {
            if (object1[p] !== object2[p]) {
                return false;
            }
        }
    }

    return true;
}

// https://github.com/epoberezkin/fast-deep-equal

let isArray = Array.isArray;
let keyList = Object.keys;
let hasProp = Object.prototype.hasOwnProperty;

function equal(a, b) {
    if (a === b) return true;

    if (a && b && typeof a == 'object' && typeof b == 'object') {
        var arrA = isArray(a)
            , arrB = isArray(b)
            , i
            , length
            , key;

        if (arrA && arrB) {
            length = a.length;
            if (length != b.length) return false;
            for (i = length; i-- !== 0;)
                if (!equal(a[i], b[i])) return false;
            return true;
        }

        if (arrA != arrB) return false;

        var dateA = a instanceof Date
            , dateB = b instanceof Date;
        if (dateA != dateB) return false;
        if (dateA && dateB) return a.getTime() == b.getTime();

        var regexpA = a instanceof RegExp
            , regexpB = b instanceof RegExp;
        if (regexpA != regexpB) return false;
        if (regexpA && regexpB) return a.toString() == b.toString();

        var keys = keyList(a);
        length = keys.length;

        if (length !== keyList(b).length)
            return false;

        for (i = length; i-- !== 0;)
            if (!hasProp.call(b, keys[i])) return false;

        for (i = length; i-- !== 0;) {
            key = keys[i];
            if (!equal(a[key], b[key])) return false;
        }

        return true;
    }

    return a!==a && b!==b;
}

function select(s1, ...args) {
    if (s1 !== undefined) {
        return s1;
    } else {
        if (args.length === 0) {
            return undefined;
        }

        return select(...args);
    }
}

function time(func, times = 1) {
    let time = performance.now();

    for (let i = 0; i < times; i++)
        func();

    return (performance.now() - time) / times;
}

function isInteger(x) {
    return isNumeric(x) && (x % 1 === 0);
}

function inRange(x, min, max) {
    return (min <= x) && (x <= max);
}

function inStrictRange(x, min, max) {
    return (min < x) && (x < max);
}

function isTypedArray(arr) {
    return ArrayBuffer.isView(arr) && (!(arr instanceof DataView));
}

let loading = {};

function markLoading(id) {
    loading[id] = {progress: 0, comments: []};
}

function commentLoading(id, comment) {
    loading[id].comments.push(comment);
}

function markLoadingProgress(id, progress) { // 1 is finished, 0 is just started
    assert(0 <= progress && progress <= 1, "Progress update must be between 0 and 1");
    loading[id].progress = progress;

    if (totalLoadingProgress() === 1 && !loaded) {
        loaded = true;
        callLoadedEventListeners();
    } else {
        loaded = false;
    }
}

let loaded = false;

function totalLoadingProgress() {
    let sum = 0;
    let count = 0;

    for (let key in loading) {
        if (loading.hasOwnProperty(key)) {
            sum += loading[key].progress;
            count++;
        }
    }

    return count === 0 ? 1 : sum / count;
}

let loadedEventListeners = [];

function addLoadedEventListener(listener) {
    if (loaded)
        listener();

    loadedEventListeners.push(listener);
}

function removeLoadedEventListener(listener) {
    let index = loadedEventListeners.indexOf(listener);
    if (index > 1)
        loadedEventListeners.splice(index, 1);
}

function callLoadedEventListeners() {
    loadedEventListeners.forEach(f => f());
}

export {
    equal,
    clamp,
    isNumeric,
    // CancellableTimeout,
    isString,
    desmosPrint,
    getID,
    assert,
    compareObjects,
    select,
    time,
    isInteger,
    inRange,
    inStrictRange,
    isArray,
    isTypedArray,
    markLoading,
    commentLoading,
    markLoadingProgress,
    totalLoadingProgress,
    addLoadedEventListener,
    removeLoadedEventListener
};