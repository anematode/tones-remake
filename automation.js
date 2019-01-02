// An abstraction of automation

class AutomationSegment {
    constructor(x1, y1, x2, y2) {
        if (x2 < x1)
            throw new Error("x2 must be greater than or equal to x1.");
        this._length = 0;

        this.x1 = x1;
        this.x2 = x2;
        this.y1 = y1;
        this.y2 = y2;
    }

    get x2() {
        return this.x1 + this.length;
    }

    set x2(v) {
        this.length = v - this.x1;
    }

    get length() {
        return this._length;
    }

    set length(x) {
        if (x < 0)
            throw new Error("Can't have a negative length");
        else if (x === 0 && this._disallowZeroLength)
            throw new Error("Can't have a zero length");
        else
            this._length = x;
    }

    static get _disallowZeroLength() {
        return false;
    }

    deltaY() {
        return this.y2 - this.y1;
    }

    valueAt(x) {
        let arr = new Float64Array([x]);
        this.getValues(arr);
        return arr[0];
    }

    derivativeAt(x) {
        let arr = new Float64Array([x]);
        this.getDerivatives(arr);
        return arr[0];
    }

    integralAt(x) {
        let arr = new Float64Array([x]);
        this.getIntegrals(arr);
        return arr[0];
    }

    timeIntegralAt(x) {
        let arr = new Float64Array([x]);
        this.getTimeIntegrals(arr);
        return arr[0];
    }

    _timeIntegralCheck() {
        if (this.ymin && this.ymin() <= 0)
            throw new Error("Time integral does not exist, because the y minimum is less than 0.");
    }
}

class ConstantAutomationSegment extends AutomationSegment {
    constructor(x1, x2, c) {
        super(x1, c, x2, c);
        this.c = c;
    }

    ymin() {
        return this.c;
    }

    ymax() {
        return this.c;
    }

    valueAt() {
        return this.c;
    }

    getValues(arr) {
        arr.fill(this.c);
    }

    static derivativeAt() {
        return 0;
    }

    static getDerivatives(arr) {
        arr.fill(0);
    }

    getIntegrals(arr) {
        let x1 = this.x1;
        let c = this.c;

        for (let i = 0; i < arr.length; i++) {
            arr[i] = c * (arr[i] - x1);
        }
    }

    getTimeIntegrals(arr) {
        this._timeIntegralCheck();

        let x1 = this.x1;
        let c = this.c;

        for (let i = 0; i < arr.length; i++) {
            arr[i] = (arr[i] - x1) / c;
        }
    }

    translateX(x) {
        this.x1 += x;
        this.x2 += x;
        return this;
    }

    translateY(y) {
        this.y1 += y;
        this.y2 += y;
        return this;
    }

    scaleX(x) {
        this.x1 *= x;
        this.x2 *= x;

        if (this.x2 < this.x1) { // flip the values in case the scaling caused the segment to flip over unceremoniously
            let tmp = this.x2;

            this.x2 = this.x1;
            this.x1 = tmp;
        }
        return this;
    }

    scaleY(y) {
        this.y1 *= y;
        this.y2 *= y;
        return this;
    }

    clone() {
        return new ConstantAutomationSegment(this.x1, this.x2, this.c);
    }
}

const linearAutomationTimeIntegralEps = 1e-9;

// Note: this.derivativeAt(0) is just an easy way to get the slope
class LinearAutomationSegment extends AutomationSegment {
    constructor(x1, y1, x2, y2) {
        if (x2 === x1)
            throw new Error("LinearAutomationSegment can't have two identical x boundaries.");
        super(x1, y1, x2, y2);
    }

    static get _disallowZeroLength() {
        return false;
    }

    ymin() {
        return Math.min(this.y1, this.y2);
    }

    ymax() {
        return Math.max(this.y1, this.y2);
    }

    getValues(arr) {
        let slope = this.derivativeAt();
        let x1 = this.x1;
        let y1 = this.y1;

        for (let i = 0; i < arr.length; i++) {
            arr[i] = (arr[i] - x1) * slope + y1;
        }
    }

    derivativeAt() {
        return (this.y2 - this.y1) / (this.x2 - this.x1);
    }

    getDerivatives(arr) {
        arr.fill(this.derivativeAt());
    }

    getIntegrals(arr) {
        let y1 = this.y1;
        let x1 = this.x1;
        let slope = this.derivativeAt();

        for (let xd, i = 0; i < arr.length; i++) {
            xd = arr[i] - this.x1;
            arr[i] = y1 * xd + slope * xd * xd / 2;
        }
    }

    getTimeIntegrals(arr) {
        this._timeIntegralCheck();

        let m = this.derivativeAt();

        let x1 = this.x1, y1 = this.y1;

        if (Math.abs(m) < linearAutomationTimeIntegralEps) {
            for (let i = 0; i < arr.length; i++)
                arr[i] = (arr[i] - x1) / y1;
        }

        for (let i = 0; i < arr.length; i++)
            arr[i] = (Math.log(m * (arr[i] - x1) + y1) - Math.log(y1)) / m;
    }

    translateX(x) {
        this.x1 += x;
        this.x2 += x;
        return this;
    }

    translateY(y) {
        this.y1 += y;
        this.y2 += y;
        return this;
    }

    scaleX(x) {
        if (x === 0)
            throw new Error("Can't scale by a factor of 0");

        this.x1 *= x;
        this.x2 *= x;

        if (this.x2 < this.x1) { // flip the values in case the scaling caused the segment to flip over unceremoniously
            let tmp = this.x2;

            this.x2 = this.x1;
            this.x1 = tmp;
            tmp = this.y2;
            this.y2 = this.y1;
            this.y1 = tmp;
        } else if (this.x2 === this.x1) {
            throw new Error("Scaling resulted in the collapsing of the LinearAutomationSegment due to float imprecision.");
        }
        return this;
    }

    scaleY(y) {
        this.y1 *= y;
        this.y2 *= y;
        return this;
    }

    clone() {
        return new LinearAutomationSegment(this.x1, this.y1, this.x2, this.y2);
    }
}

const exponentialAutomationEps = 10e-9;

class ExponentialAutomationSegment extends AutomationSegment {
    constructor(x1, y1, x2, y2, yc) {
        if (x2 === x1)
            throw new Error("ExponentialAutomationSegment can't have two identical x boundaries.");
        super(x1, y1, x2, y2);

        this.yc = yc;
    }

    get yc() {
        return this._yc;
    }

    set yc(yc) {
        if (yc <= this.ymin() || yc >= this.ymax())
            throw new Error("yc out of bounds");

        this._yc = yc;
    }

    static get _disallowZeroLength() {
        return false;
    }

    ymin() {
        return Math.min(this.y1, this.y2);
    }

    ymax() {
        return Math.max(this.y1, this.y2);
    }

    getValues(arr) {
        let x1 = this.x1, x2 = this.x2, y1 = this.y1, y2 = this.y2, yc = this.yc;
        let ycp = (yc - y1) / (y2 - y1);

        if (!ycp || Math.abs(ycp - 0.5) < exponentialAutomationEps) {
            let slp = (y2 - y1) / (x2 - x1);
            for (let i = 0; i < arr.length; i++) {
                arr[i] = (arr[i] - x1) * slp + y1;
            }
        } else {
            let c1 = ycp * ycp / (1 - 2 * ycp) * (y2 - y1);
            let tms = 2 / (x2 - x1);
            let base = Math.pow(1 / ycp - 1, tms);

            for (let i = 0; i < arr.length; i++) {
                arr[i] = c1 * (Math.pow(base, arr[i] - x1) - 1) + y1;
            }
        }
    }

    getDerivatives(arr) {
        let x1 = this.x1, x2 = this.x2, y1 = this.y1, y2 = this.y2, yc = this.yc;
        let ycp = (yc - y1) / (y2 - y1);

        if (!ycp || Math.abs(ycp - 0.5) < exponentialAutomationEps) {
            arr.fill((y2 - y1) / (x2 - x1));
        } else {
            let rycp = 1/ycp - 1;
            let xd = x2 - x1;
            let c1 = 2 * ycp * ycp / (1 - 2 * ycp) * (y2 - y1) / xd *
                Math.log(rycp);
            xd = 2 / xd;

            for (let i = 0; i < arr.length; i++) {
                arr[i] = c1 * Math.pow(rycp, xd * (arr[i] - x1));
            }
        }
    }

    getIntegrals(arr) {
        let x1 = this.x1, x2 = this.x2, y1 = this.y1, y2 = this.y2, yc = this.yc;
        let ycp = (yc - y1) / (y2 - y1);

        if (!ycp || Math.abs(ycp - 0.5) < exponentialAutomationEps) {
            let c1 = (y2 - y1) / (x2 - x1) / 2;
            for (let i = 0; i < arr.length; i++) {
                let xd = arr[i] - x1;
                arr[i] = xd * (y1 + c1 * xd);
            }
        } else {
            let rycp = 1/ycp - 1;
            let xd = x2 - x1;

            let c1 = ycp * ycp / (1 - 2 * ycp) * (y2 - y1);
            let c2 = (2 * Math.log(rycp));

            for (let i = 0; i < arr.length; i++) {
                let xfd = arr[i] - x1;
                arr[i] = y1 * xfd + c1 * (-xfd + (xd * (Math.pow(rycp, 2 * xfd / xd) - 1)) / c2);
            }
        }
    }

    getTimeIntegrals(arr) {
        let x1 = this.x1, x2 = this.x2, y1 = this.y1, y2 = this.y2, yc = this.yc;
        let ycp = (yc - y1) / (y2 - y1);

        if (!ycp || Math.abs(ycp - 0.5) < exponentialAutomationEps) {
            let m = (y2 - y1) / (x2 - x1);

            if (m === 0) {
                for (let i = 0; i < arr.length; i++) {
                    arr[i] = (arr[i] - x1) / y1;
                }
            } else {
                for (let i = 0; i < arr.length; i++) {
                    arr[i] = (Math.log(m * (arr[i] - x1) + y1) - Math.log(y1)) / m;
                }
            }
        } else {
            let a = ycp * ycp / (1 - 2 * ycp) * (y2 - y1), b = y1;
            let rycp = 1 / ycp - 1;
            let xd = x2 - x1;
            let log_v = 2 * Math.log(rycp) / xd;

            rycp *= rycp;

            let den = ((a - b) * log_v);

            for (let i = 0; i < arr.length; i++) {
                let xfd = arr[i] - x1;
                arr[i] = (Math.log((a * (Math.pow(rycp, xfd / xd) - 1) + b) / b) - xfd * log_v) / den;
            }
        }
    }

    translateX(x) {
        this.x1 += x;
        this.x2 += x;
        return this;
    }

    translateY(y) {
        this.y1 += y;
        this.y2 += y;
        return this;
    }

    scaleX(x) {
        this.x1 *= x;
        this.x2 *= x;

        if (x === 0)
            throw new Error("Can't scale by a factor of 0");

        this.x1 *= x;
        this.x2 *= x;

        if (this.x2 < this.x1) { // flip the values in case the scaling caused the segment to flip over unceremoniously
            let tmp = this.x2;

            this.x2 = this.x1;
            this.x1 = tmp;
            tmp = this.y2;
            this.y2 = this.y1;
            this.y1 = tmp;
        } else if (this.x2 === this.x1) {
            throw new Error("Scaling resulted in the collapsing of the ExponentialAutomationSegment due to float imprecision.");
        }
        return this;
    }

    scaleY(y) {
        this.y1 *= y;
        this.y2 *= y;
        this.yc *= y;
        return this;
    }

    clone() {
        return new ExponentialAutomationSegment(this.x1, this.y1, this.x2, this.y2, this.yc);
    }
}

const quadraticAutomationEps = 10e-9;

class QuadraticAutomationSegment extends AutomationSegment {
    constructor(x1,y1,x2,y2,yc) {
        if (x2 === x1)
            throw new Error("QuadraticAutomationSegment can't have two identical x boundaries.");
        super(x1, y1, x2, y2);
        this.yc = yc;
    }

    static get _disallowZeroLength() {
        return false;
    }

    _n() {
        let m = (this.x1 + this.x2) / 2;
        return 4 * this.x2 * this.yc + 4 * this.x1 * this.yc - 2 * m * this.y2 - 2 * m * this.y1 - 2 * this.x1 * this.y2 - 2 * this.y1 * this.x2;
    }

    _d() {
        return 4 * this.y1 + 4 * this.y2 - 8 * this.yc;
    }

    ymin() {
        let d = this._d();

        if (d <= 0)
            return Math.min(this.y1, this.y2);

        let x = this._n() / d;

        if (this.x1 < x && x < this.x2) {
            return this.valueAt(x);
        } else {
            return Math.min(this.y1, this.y2);
        }
    }

    ymax() {
        let d = this._d();

        if (d >= 0)
            return Math.max(this.y1, this.y2);

        let x = this._n() / d;

        if (this.x1 < x && x < this.x2) {
            return this.valueAt(x);
        } else {
            return Math.max(this.y1, this.y2);
        }
    }

    getValues(arr) {
        let x1 = this.x1, x2 = this.x2, y1 = this.y1, y2 = this.y2, yc = this.yc;

        let m = (x1 + x2) / 2;
        let xd = x2 - x1;
        xd *= xd;

        for (let i = 0; i < arr.length; i++) {
            let x = arr[i];
            arr[i] = (2 * (x - m) * (y1 * (x - x2) + y2 * (x-x1)) - 4 * yc * (x - x1) * (x - x2)) / xd;
        }
    }

    getDerivatives(arr) {
        let m = (this.x1 + this.x2) / 2;
        let xd2 = this.x2 - this.x1;

        xd2 *= xd2;

        let d = this._d();
        let n = this._n();


        for (let i = 0; i < arr.length; i++) {
            arr[i] = (d * arr[i] + n) / (xd2);
        }
    }

    getIntegrals(arr) {
        let x1 = this.x1, x2 = this.x2, y1 = this.y1, y2 = this.y2, yc = this.yc;

        let m = (x1 + x2) / 2;
        let xd = x2 - x1;
        let x1c = x1 * x1 * x1;
        let x1s = x1 * x1;

        xd *= xd;

        let d = this._d() / 6;
        let n = this._n() / 2;
        let c1 = (-4 * x2 * yc * x1 + 2 * m * y1 * x2 + 2 * m * x1 * y2);

        for (let i = 0; i < arr.length; i++) {
            let x = arr[i];

            arr[i] = (d * (x * x * x - x1c) + n * (x * x - x1s) + c1 * (x - x1)) / xd;
        }
    }

    getTimeIntegrals(arr) {
        let x1 = this.x1, x2 = this.x2, y1 = this.y1, y2 = this.y2, yc = this.yc;

        this._timeIntegralCheck();
        let xd = (x2 - x1);
        let xd2 = xd * xd;
        let m = (x1 + x2) / 2;

        let a = .5 * this._d() / xd2;
        let b = this._n() / xd2;
        let c = (-4 * x2 * yc * x1 + 2 * m * y1 * x2 + 2 * m * x1 * y2) / xd2;


        if (Math.abs(a) < quadraticAutomationEps) {
            if (Math.abs(b) < quadraticAutomationEps) {
                for (let i = 0; i < arr.length; i++)
                    arr[i] = (arr[i] - x1) / c;
            }
            for (let i = 0; i < arr.length; i++)
                arr[i] = (Math.log(b * arr[i] + c) - Math.log(b * x1 + c)) / b;
        }

        let q = b * b - 4 * a * c;

        if (q === 0) {
            let c1 = 1 / (2 * a * x1 + b);
            for (let i = 0; i < arr.length; i++)
                arr[i] = -2 * (1 / (2 * a * arr[i] + b) + c1);
        } else if (q < 0) {
            let sq = Math.sqrt(-q);
            let c1 = -Math.atan((2 * a * this.x1 + b) / sq);

            for (let i = 0; i < arr.length; i++)
                arr[i] = 2 * (Math.atan((2 * a * arr[i] + b) / sq) + c1) / sq;
        } else {
            let sq = Math.sqrt(q);
            let c1 = Math.atanh((2 * a * this.x1 + b) / sq);

            for (let i = 0; i < arr.length; i++)
                arr[i] = 2 * (-Math.atanh((2 * a * x + b) / sq) + c1) / sq;
        }
    }

    translateX(x) {
        this.x1 += x;
        this.x2 += x;
        return this;
    }

    translateY(y) {
        this.y1 += y;
        this.y2 += y;
        return this;
    }

    scaleX(x) {
        this.x1 *= x;
        this.x2 *= x;

        if (x === 0)
            throw new Error("Can't scale by a factor of 0");

        this.x1 *= x;
        this.x2 *= x;

        if (this.x2 < this.x1) { // flip the values in case the scaling caused the segment to flip over unceremoniously
            let tmp = this.x2;

            this.x2 = this.x1;
            this.x1 = tmp;
            tmp = this.y2;
            this.y2 = this.y1;
            this.y1 = tmp;
        } else if (this.x2 === this.x1) {
            throw new Error("Scaling resulted in the collapsing of the QuadraticAutomationSegment due to float imprecision.");
        }
        return this;
    }

    scaleY(y) {
        this.y1 *= y;
        this.y2 *= y;
        this.yc *= y;
        return this;
    }

    clone() {
        return new QuadraticAutomationSegment(this.x1, this.y1, this.x2, this.y2, this.yc);
    }
}

function isSorted(arr) {
    let prev = -Infinity;
    for (let i = 0; i < arr.length; i++) {
        if (prev < arr[i])
            prev = arr[i];
        else
            return false;
    }
    return true;
}

class Automation {
    constructor(segments = []) {
        if (!Array.isArray(segments))
            throw new Error("Automation constructor takes in an array.");

        this.segments = segments;
    }

    ymin() {
        let minV = Infinity;
        let segments = this.segments;

        for (let i = 0; i < segments.length; i++) {
            let seg_min = segments[i].ymin();

            if (seg_min < minV)
                minV = seg_min;
        }

        return minV;
    }

    ymax() {
        let maxV = Infinity;
        let segments = this.segments;

        for (let i = 0; i < segments.length; i++) {
            let seg_max = segments[i].ymax();

            if (seg_max < maxV)
                maxV = seg_max;
        }

        return maxV;
    }

    get segCount() {
        return this.segments.length;
    }

    get length() {
        return this.segCount() > 0 ? this.getSegment(this.segCount() - 1).x2 : 0;
    }

    getSegment(i) {
        if (0 <= i && i < this.segments.length) {
            return this.segments[i];
        }
        throw new Error(`Index ${i} out of bounds.`);
    }

    setSegment(i, seg) {
        if (0 <= i && i < this.segments.length) {
            this.segments[i] = seg;
        } else {
            throw new Error(`Index ${i} out of bounds.`);
        }

        this.update();

        return this;
    }

    insertSegment(i, seg) {
        if (0 <= i && i <= this.segments.length) {
            this.segments.splice(i, 0, seg);
        } else {
            throw new Error(`Index ${i} out of bounds.`);
        }

        this.update();

        return this;
    }

    removeSegment(i) {
        if (0 <= i && i < this.segments.length) {
            this.segments.splice(i, 1);
        }

        this.update();

        return this;
    }

    removeSegmentIf(func) {
        let segments = this.segments;

        for (let i = segments.length - 1; i >= 0; i--) {
            if (func(segments[i]))
                segments.splice(i, 1);
        }

        this.update();
        return this;
    }

    addSegment(seg) {
        this.segments.push(seg);

        this.update();

        return this;
    }

    update() {
        let segments = this.segments;
        let x = 0;

        for (let i = 0; i < segments.length; i++) {
            segments[i].x1 = x;
            x = segments[i].x2;
        }
    }

    getValues(arr, sorted = false) {
        let segments = this.segments;

        if ((arr.constructor === Float32Array || arr.constructor === Float64Array) && (sorted || isSorted(arr))) {
            // Special algorithm when the array is a typed array and sorted to reduce copies by a lot

            let j = 0, seg, x1, x2;

            for (let i = 0; i < segments.length; i++) {
                seg = segments[i];

                if ((x2 = seg.x2) < arr[j])
                    continue;

                let start_j = j;

                while (arr[++j] < x2);

                console.time("sub");
                seg.getValues(arr.subarray(start_j, j));
                console.timeEnd("sub");
            }
        } else {
            for (let i = 0; i < arr.length; i++) {
                let x = arr[i];

                let min = 0;
                let max = segments.length-1;
                let mid = Math.floor((min + max) / 2);
                let loop = 50; // how many searches before it gives up

                if (x <= 0)
                    x = 0;

                if (x < segments[0].x2) {
                    mid = 0;
                    loop = false;
                } else if (x > segments[max].x2) {
                    // x is beyond segment
                    mid = -1;
                    loop = false;
                }

                while (loop--) {
                    let seg = segments[mid];
                    let x1 = seg.x1, x2 = seg.x2;

                    if (x >= x2) {
                        min = mid;
                    } else if (x < x1) {
                        max = mid;
                    } else {
                        break;
                    }

                    mid = Math.ceil((min + max) / 2);
                }

                if (mid === -1)
                    arr[i] = segments[max].y2;
                else {
                    arr[i] = segments[mid].valueAt(arr[i]);
                }
            }
        }
    }
}

let automation = new Automation();

let arr = new Float32Array([...Array(1e6).keys()].map(x => 10 * x / 1e6));
//let arr = new Float32Array([...Array(50).keys()].map(x => x / 5));

automation.addSegment(new ConstantAutomationSegment(0, 4, 60));
automation.addSegment(new ExponentialAutomationSegment(0, 60, 2, 80, 69.9999));
automation.addSegment(new ExponentialAutomationSegment(0, 60, 2, 80, 64));
automation.addSegment(new LinearAutomationSegment(0, 80, 4, 40));

console.time("egg");
automation.getValues(arr, true);
console.timeEnd("egg");