import * as utils from "../utils.js";

/* An automation defines a mapping x -> y taking in a beat or time for x and outputting the value of a parameter at that time
An automation is composed of a series of segments and has no gaps; the evaluated value at an interface is the first value of
the segment directly after this interface. Furthermore, values beyond the end of the automation are the last defined value of
the last segment. Automations always start at 0. */

/*
Relevant .tex files: automation_development.tex (1)
Written by anematode, 1/2/2019
 */

/* The parent class for all automation segments, defined by a starting (x1, y1), a positive length, and an ending y2. */
class AutomationSegment {
    constructor(params = {}) {
        let x1 = utils.select(params.x1, 0);
        let y1 = utils.select(params.y1, 0);
        let x2 = utils.select(params.x2, x1 + 1);
        let y2 = utils.select(params.y2, y1 + 1);

        if (x2 < x1) // Reject x2 < x1
            throw new Error("x2 must be greater than or equal to x1.");

        this.x1 = x1;
        this.x2 = x2;
        this.y1 = y1;
        this.y2 = y2;
    }

    get x2() { // x2 is a getter based on length
        return this.x1 + this.length;
    }

    set x2(v) { // sets length based on x2 - x1
        this.length = v - this.x1;
    }

    get length() {
        return this._length;
    }

    set length(x) {
        if (x < 0)
            throw new Error("Can't have a negative length");
        else if (x === 0 && this._disallowZeroLength) // _disallowZeroLength stops segments with 0 length if this is undefinable for that segment type
            throw new Error("Can't have a zero length");
        else
            this._length = x;
    }

    static get _disallowZeroLength() {
        return false;
    }

    deltaY() { // how much does the segment change from start to end
        return this.y2 - this.y1;
    }

    valueAt(x) { // get the value of the segment at x
        let arr = new Float64Array([x]); // create internal array to feed to getValues
        this.getValues(arr); // fill up array with values
        return arr[0]; // return the array's element
    }

    derivativeAt(x) { // get the derivative (slope) of the segment at x
        let arr = new Float64Array([x]);
        this.getDerivatives(arr);
        return arr[0];
    }

    integralAt(x) { // get the integral (area under) the segment from x1 to x
        let arr = new Float64Array([x]);
        this.getIntegrals(arr);
        return arr[0];
    }

    timeIntegralAt(x) { // get the integral (area under) 1 / f(x), where f(x) is valueAt, from x1 to x (used for tempo)
        let arr = new Float64Array([x]);
        this.getTimeIntegrals(arr);
        return arr[0];
    }

    _timeIntegralCheck() { // throws an error if the timeIntegral is undefined for the segment (i.e. f(c) <= 0 for some c)
        if (this.ymin && this.ymin() <= 0)
            throw new Error("Time integral does not exist, because the y minimum is less than 0.");
    }
}

/*
Automation segment that holds a constant value c between x1 and x2
 */
class ConstantAutomationSegment extends AutomationSegment {
    constructor(params = {}) {
        let c = utils.select(params.c, 0);
        super({x1: params.x1, y1: c, x2: params.x2, y2: c});

        this.c = c; // the constant value
    }

    ymin() {
        return this.c;
    }

    ymax() {
        return this.c;
    }

    valueAt() { // it always has a value of c
        return this.c;
    }

    getValues(arr) {
        arr.fill(this.c); // nice and fast
    }

    derivativeAt() {
        return 0;
    }

    getDerivatives(arr) { // flat lines have a derivative everywhere of 0
        arr.fill(0);
    }

    getIntegrals(arr) {
        let x1 = this.x1;
        let c = this.c;

        for (let i = 0; i < arr.length; i++) {
            arr[i] = c * (arr[i] - x1); // area of a rectangle with sides c and x - x1
        }
    }

    getTimeIntegrals(arr) {
        this._timeIntegralCheck();

        let x1 = this.x1;
        let c = this.c;

        for (let i = 0; i < arr.length; i++) {
            arr[i] = (arr[i] - x1) / c; // area of rectangle with sides 1/c and x - x1
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
        this.length *= Math.abs(x);
        // No need to flip, it's constant

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

const linearAutomationTimeIntegralEps = 1e-9; // epsilon used internally

/*
Simple linear interpolation between (x1, y1) and (x2, y2). This is a special case of quadratic and exp, but this is
slightly faster than those two just because this doesn't have to check for certain corner cases (those other two, however,
use basically the same formula as this does already, so there is little difference in actual value computational time).
 */
class LinearAutomationSegment extends AutomationSegment {
    constructor(params = {}) {
        super(params);
    }

    static get _disallowZeroLength() { // disallow 0 length segments, because this makes the derivative implosive
        return true;
    }

    ymin() { // minimum is the minimum of each y value
        return Math.min(this.y1, this.y2);
    }

    ymax() { // max is the max of each y value
        return Math.max(this.y1, this.y2);
    }

    getValues(arr) {
        let slope = this.derivativeAt();
        let x1 = this.x1;
        let y1 = this.y1;

        for (let i = 0; i < arr.length; i++) {
            arr[i] = (arr[i] - x1) * slope + y1; // simple linear interpolation, shown in (1)
        }
    }

    derivativeAt() { // Note: this.derivativeAt() is just an easy way to get the slope for later
        return (this.y2 - this.y1) / (this.x2 - this.x1);
    }

    getDerivatives(arr) {
        arr.fill(this.derivativeAt()); // line has the same derivative everywhere
    }

    getIntegrals(arr) {
        let y1 = this.y1;
        let x1 = this.x1;
        let slope = this.derivativeAt();

        for (let xd, i = 0; i < arr.length; i++) {
            xd = arr[i] - this.x1;
            arr[i] = y1 * xd + slope * xd * xd / 2; // shown in (1)
        }
    }

    getTimeIntegrals(arr) {
        this._timeIntegralCheck();

        let m = this.derivativeAt();

        let x1 = this.x1, y1 = this.y1;

        if (Math.abs(m) < linearAutomationTimeIntegralEps) {
            // if the slope is extremely small then the next formula will explode (dividing by small number), so approximate as constant
            for (let i = 0; i < arr.length; i++)
                arr[i] = (arr[i] - x1) / y1;
        }

        for (let i = 0; i < arr.length; i++)
            arr[i] = (Math.log(m * (arr[i] - x1) + y1) - Math.log(y1)) / m; // Derived in (1)
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
        this.length *= Math.abs(x);

        if (x < 0) { // flip over if necessary
            let tmp = this.y1;
            this.y1 = this.y2;
            this.y2 = tmp;
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

/*
This automation segment does an exponential interpolation between (x1, y1), ((x1 + x2) / 2, yc), (x2, y2).
Note: if yc = sqrt(y1 * y2) (geometric mean of the two y values), then the interpolation will be smooth in the sense that
it will specify a frequency increase that is linear pitch-wise, which is useful
 */
class ExponentialAutomationSegment extends AutomationSegment {
    constructor(params = {}) {
        super(params);

        this.yc = utils.select(params.yc, (this.y1 + this.y2) / 2, 0.5);
    }

    get yc() {
        return this._yc;
    }

    set yc(yc) {
        if (yc <= this.ymin() || yc >= this.ymax()) // since exponentials are monotonically increasing/decreasing, yc must be between the y values
            throw new Error("yc out of bounds");

        this._yc = yc;
    }

    static get _disallowZeroLength() { // zero length makes certain things undefined
        return true;
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

        if (!ycp || Math.abs(ycp - 0.5) < exponentialAutomationEps) { // If it's too close to a line, compute it like a line
            let slp = (y2 - y1) / (x2 - x1);
            for (let i = 0; i < arr.length; i++) {
                arr[i] = (arr[i] - x1) * slp + y1; // derived in (1)
            }
        } else {
            let c1 = ycp * ycp / (1 - 2 * ycp) * (y2 - y1);
            let tms = 2 / (x2 - x1);
            let base = Math.pow(1 / ycp - 1, tms);

            for (let i = 0; i < arr.length; i++) {
                arr[i] = c1 * (Math.pow(base, arr[i] - x1) - 1) + y1; // derived in (1)
            }
        }
    }

    getDerivatives(arr) {
        let x1 = this.x1, x2 = this.x2, y1 = this.y1, y2 = this.y2, yc = this.yc;
        let ycp = (yc - y1) / (y2 - y1);

        if (!ycp || Math.abs(ycp - 0.5) < exponentialAutomationEps) { // If it's too close to a line, compute it like a line
            arr.fill((y2 - y1) / (x2 - x1));
        } else {
            let rycp = 1/ycp - 1;
            let xd = x2 - x1;
            let c1 = 2 * ycp * ycp / (1 - 2 * ycp) * (y2 - y1) / xd *
                Math.log(rycp);
            xd = 2 / xd;

            for (let i = 0; i < arr.length; i++) {
                arr[i] = c1 * Math.pow(rycp, xd * (arr[i] - x1)); // derived in (1)
            }
        }
    }

    getIntegrals(arr) {
        let x1 = this.x1, x2 = this.x2, y1 = this.y1, y2 = this.y2, yc = this.yc;
        let ycp = (yc - y1) / (y2 - y1);

        if (!ycp || Math.abs(ycp - 0.5) < exponentialAutomationEps) { // If it's too close to a line, compute it like a line
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
                arr[i] = y1 * xfd + c1 * (-xfd + (xd * (Math.pow(rycp, 2 * xfd / xd) - 1)) / c2); // derived in (1)
            }
        }
    }

    getTimeIntegrals(arr) {
        let x1 = this.x1, x2 = this.x2, y1 = this.y1, y2 = this.y2, yc = this.yc;
        let ycp = (yc - y1) / (y2 - y1);

        if (!ycp || Math.abs(ycp - 0.5) < exponentialAutomationEps) { // If it's too close to a line, compute it like a line
            let m = (y2 - y1) / (x2 - x1);

            if (Math.abs(m) < exponentialAutomationEps) {
                for (let i = 0; i < arr.length; i++) { // If it's too close to a constant, compute it like a constant
                    arr[i] = (arr[i] - x1) / y1;
                }
            } else {
                for (let i = 0; i < arr.length; i++) {
                    arr[i] = (Math.log(m * (arr[i] - x1) + y1) - Math.log(y1)) / m; // If it's too close to a line, computer it like a line
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
                arr[i] = (Math.log((a * (Math.pow(rycp, xfd / xd) - 1) + b) / b) - xfd * log_v) / den; // derived in (1)
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
        this.length *= Math.abs(x);

        if (x < 0) { // flip the values in case the scaling caused the segment to flip over unceremoniously
            let tmp = this.y2;
            this.y2 = this.y1;
            this.y1 = tmp;
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

/*
This does a quadratic interpolation between (x1, y1), ((x1 + x2) / 2, yc), (x2, y2), which is uniquely defined.
Note that unlike the exp case, yc can be outside of y1 to y2, and the boundaries of this segment may be beyond as well.
If you wish to restrict it so that the entire segment lies between y1 and y2, restrict yc between (y1+3*y2)/4 and
(3*y1+y2)/4.
 */
class QuadraticAutomationSegment extends AutomationSegment {
    constructor(params = {}) {
        super(params);

        this.yc = utils.select(params.yc, (this.y1 + this.y2) / 2, 0.5);
    }

    static get _disallowZeroLength() { // causes div by 0 errors if not prohibited
        return true;
    }

    _n() { // recurring constant
        let m = (this.x1 + this.x2) / 2;
        return 4 * this.x2 * this.yc + 4 * this.x1 * this.yc -
            2 * m * this.y2 - 2 * m * this.y1 - 2 * this.x1 * this.y2 - 2 * this.y1 * this.x2;
    }

    _d() { // recurring constant
        return 4 * this.y1 + 4 * this.y2 - 8 * this.yc;
    }

    ymin() { // derived in (1)
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

    ymax() { // derived in (1)
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
            arr[i] = (2 * (x - m) * (y1 * (x - x2) + y2 * (x-x1)) - 4 * yc * (x - x1) * (x - x2)) / xd; // derived in (1)
        }
    }

    getDerivatives(arr) {
        let m = (this.x1 + this.x2) / 2;
        let xd2 = this.x2 - this.x1;

        xd2 *= xd2;

        let d = this._d();
        let n = this._n();


        for (let i = 0; i < arr.length; i++) {
            arr[i] = (d * arr[i] + n) / (xd2); // derived in (1)
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

            arr[i] = (d * (x * x * x - x1c) + n * (x * x - x1s) + c1 * (x - x1)) / xd; // derived in (1)
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
            if (Math.abs(b) < quadraticAutomationEps) { // too much like a constant, derived in (1)
                for (let i = 0; i < arr.length; i++)
                    arr[i] = (arr[i] - x1) / c;
            }
            for (let i = 0; i < arr.length; i++)
                arr[i] = (Math.log(b * arr[i] + c) - Math.log(b * x1 + c)) / b; // too much line a line, derived in (1)
        }

        let q = b * b - 4 * a * c; // discriminant

        if (q === 0) {
            let c1 = 1 / (2 * a * x1 + b);
            for (let i = 0; i < arr.length; i++)
                arr[i] = -2 * (1 / (2 * a * arr[i] + b) + c1); // q=0, derived in (1)
        } else if (q < 0) {
            let sq = Math.sqrt(-q);
            let c1 = -Math.atan((2 * a * this.x1 + b) / sq);

            for (let i = 0; i < arr.length; i++)
                arr[i] = 2 * (Math.atan((2 * a * arr[i] + b) / sq) + c1) / sq; // negative discriminant, derived in (1)
        } else {
            let sq = Math.sqrt(q);
            let c1 = Math.atanh((2 * a * this.x1 + b) / sq);

            for (let i = 0; i < arr.length; i++)
                arr[i] = 2 * (-Math.atanh((2 * a * x + b) / sq) + c1) / sq; // positive discriminant, derived in (1)
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
        this.length *= Math.abs(x);

        if (x < 0) { // flip the values in case the scaling caused the segment to flip over unceremoniously
            let tmp = this.y2;
            this.y2 = this.y1;
            this.y1 = tmp;
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

function isSorted(arr) { // utility function to check if an array is sorted or not
    let prev = -Infinity;
    for (let i = 0; i < arr.length; i++) {
        if (prev < arr[i])
            prev = arr[i];
        else
            return false;
    }
    return true;
}

/*
The generalized automation class. Simply consists of an array of segments, along with some utility functions and
crucially, a function update() which uses the segments' length data to rearrange them into their uniquely defined x
positions based on their order in the array. Also implements getValues, getDerivatives, getIntegrals, getTimeIntegrals
in the array format as shown above.

How to make an Automation: eventually there will be an easy way to do this, but it's already not too bad:

1. Create an automation instance (new Automation())
2. Add segments to it with addSegment:

automation.addSegment(new ConstantAutomationSegment(*0*, *1*, 5)); // constant value of 5 from 0 to 1
automation.addSegment(new LinearAutomationSegment(*1*, 5, *6*, 10)); // linear interpolation from 5 to 10 from x = 1 to x = 6

Note that the x values (indicated in asterisks) don't really matter, though I find they help me visualize what the automation
will ultimately look like. Instead, only the length information is used when justifying the automation segments into the correct
position.

How to retrieve values:

Performant Way:

1. Create a Float32Array or Float64Array of the values (or derivatives, etc.) which you want to compute.

array = new Float32Array([0,1,2,3,4,5,6,7,8,9]);

2. Call the associated function, passing the array and checking the value "sorted" if it's sorted (sorted float arrays
HUGELY improve performance because of the algorithm and ability to use subarrays)

automation.getValues(array, true), or automation.getDerivatives(array, true), etc.

3. Array will now be filled up with the values

array
-> [5, 5, 6, 7, 8, 9, 10, 10, 10, 10]

Slow but Convenient Way:

1. Call the function valueAt (or derivativeAt, etc.) to evaluate that function at a point x:

array.derivativeAt(0.5) -> 0

This is bad because it can't take advantage of the succulent algorithms, but it's okay for certain tasks.

Note: Automation takes in an array of segments rather than a parameter object.
 */
class Automation {
    constructor(segments = []) {
        if (!Array.isArray(segments))
            throw new Error("Automation constructor takes in an array.");

        this.segments = segments;
        this.update();
    }

    ymin() {
        // Find the minimum of all segments
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
        // Find the maximum of all segments
        let maxV = -Infinity;
        let segments = this.segments;

        for (let i = 0; i < segments.length; i++) {
            let seg_max = segments[i].ymax();

            if (seg_max > maxV)
                maxV = seg_max;
        }

        return maxV;
    }

    get segCount() { // number of segments
        return this.segments.length;
    }

    get length() { // formula given in (1)
        return this.segCount > 0 ? this.getSegment(this.segCount - 1).x2 : 0;
    }

    getSegment(i) { // returns the ith segment
        if (0 <= i && i < this.segments.length) {
            return this.segments[i];
        }
        throw new Error(`Index ${i} out of bounds.`);
    }

    setSegment(i, seg) { // sets the ith segment to seg, then updates
        if (0 <= i && i < this.segments.length) {
            this.segments[i] = seg;
        } else {
            throw new Error(`Index ${i} out of bounds.`);
        }

        this.update();

        return this;
    }

    insertSegment(i, seg) { // insert seg at index i (i = segCount() will append it at the end), then update
        if (0 <= i && i <= this.segments.length) {
            this.segments.splice(i, 0, seg);
        } else {
            throw new Error(`Index ${i} out of bounds.`);
        }

        this.update();

        return this;
    }

    removeSegment(i) { // remove the segment with index i, then update
        if (0 <= i && i < this.segments.length) {
            this.segments.splice(i, 1);
        }

        this.update();

        return this;
    }

    removeSegmentIf(func) { // remove a segment if they satisfy a certain boolean function, then update
        let segments = this.segments;

        for (let i = segments.length - 1; i >= 0; i--) {
            if (func(segments[i]))
                segments.splice(i, 1);
        }

        this.update();
        return this;
    }

    addSegment(seg) { // append a segment (most often used probably)
        this.segments.push(seg);

        this.update();

        return this;
    }

    update() { // update function
        let segments = this.segments;
        let x = 0; // start at x = 0

        for (let i = 0; i < segments.length; i++) {
            segments[i].x1 = x; // set the starting x1 value to the x2 value of the previous segment, 0 if it doesn't exist
            x = segments[i].x2;
        }
    }

    getValues(arr, sorted = false) {
        let segments = this.segments;

        if ((arr.constructor === Float32Array || arr.constructor === Float64Array) && (sorted || isSorted(arr))) {
            // Special algorithm when the array is a typed array and sorted to reduce copies by a lot

            let j = 0, seg, x2, start_j, min, max;
            // j is the current array value that's gonna be computed next

            for (let i = 0; i < segments.length; i++) {
                seg = segments[i]; // for each segment...

                if ((x2 = seg.x2) <= arr[j]) // if x2 is before j, then this segment is irrelevant to our calculations, so continue
                    continue;

                start_j = j; // if we're here, then j is before x2 (and j is greater than x1 because otherwise it would have been consumed in the previous iteration)

                min = j;
                max = arr.length - 1;
                j = Math.floor((min + max) / 2);

                // Perform a binary search on arr to find the place where we jump to the next segment

                if (arr[max] < x2) { // if that place is the end of the array, then set j to the end of the array and skip the binary search
                    j = max + 1;
                } else while (true) { // otherwise, do the binary search...
                    if (arr[j] < x2) {
                        min = j;
                    } else {
                        max = j;
                        if (j === 0 || arr[j - 1] < x2) // break when we get to an arr[j] >= x2 where there is no previous array value, or the previous array value is smaller than x2
                            break; // note that this takes care of duplicate arr[j] values
                    }

                    j = (min + max + 1) >> 1; // this is equivalent to ceil(avg(min, max)) for integer min, max, but avoids float division (lol)
                }

                seg.getValues(arr.subarray(start_j, j)); // The crucial part of making this algorithm fast: create a subarray view from start_j to j and fill them up with the segment values
                // Because the array is sorted, these are the only values that have to be computed for this segment, and the fact that this is a TypedArray makes things way faster

                if (j === arr.length) // if we're finished with j, we can break out
                    break;
            }

            if (j < arr.length) {
                // Fill up remaining values if we exhausted the segments without exhausting j, meaning that array contains some values beyond the automation
                // well, not really beyond, but outside of the specially defined ranges. we just fill this up with the last defined value

                let lastVal = segments[segments.length - 1].y2;
                arr.subarray(j).fill(lastVal);
            }
        } else { // Ah, the shitty algorithm when it's not sorted or not a TypedArray
            for (let i = 0; i < arr.length; i++) {
                let x = arr[i]; // For each array item...

                let min = 0;
                let max = segments.length-1;
                let mid = Math.floor((min + max) / 2);
                let loop = 50; // how many binary searches before it gives up

                if (x <= 0)
                    x = 0;

                if (x < segments[0].x2) {
                    mid = 0;
                    loop = false;
                } else if (x > segments[max].x2) {
                    // x is beyond any segment
                    mid = -1;
                    loop = false;
                }

                while (loop--) { // do a binary search for the containing segment
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
                    arr[i] = segments[max].y2; // set it to the last value
                else
                    arr[i] = segments[mid].valueAt(arr[i]); // this is part of why this algorithm is so slow; set arr[i] to the associated value
            }
        }
    }

    getDerivatives(arr, sorted = false) { // Identical to the previous algorithm, except that we may want to reject corner values (TODO make decision on this with BC)
        let segments = this.segments;

        if ((arr.constructor === Float32Array || arr.constructor === Float64Array) && (sorted || isSorted(arr))) {
            let j = 0, seg, x2, start_j, min, max;

            for (let i = 0; i < segments.length; i++) {
                seg = segments[i];

                if ((x2 = seg.x2) <= arr[j])
                    continue;

                start_j = j;

                min = j;
                max = arr.length - 1;
                j = Math.floor((min + max) / 2);

                if (arr[max] < x2) {
                    j = max + 1;
                } else while (true) {
                    if (arr[j] < x2) {
                        min = j;
                    } else {
                        max = j;
                        if (j === 0 || arr[j - 1] < x2)
                            break;
                    }

                    j = (min + max + 1) >> 1; // ceil(avg(min, max))
                }

                let subarray = arr.subarray(start_j, j);

                seg.getDerivatives(subarray);

                // The NaN section that we may or may not want to include
                /*for (let i = 0, item; i < subarray.length; i++) { // set undefined derivatives to NaN
                    item = subarray[i];
                    if (item === x1 || item === x2)
                        subarray[i] = NaN;
                }*/

                if (j === arr.length)
                    break;
            }

            if (j < arr.length) {
                // Fill up remaining values

                arr.subarray(j).fill(0);
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
                    arr[i] = 0; // In this case the derivative after the defined segments is just 0
                else {
                    arr[i] = segments[mid].derivativeAt(arr[i]);
                }
            }
        }
    }

    getIntegrals(arr, sorted = false) { // similar to the previous algorithms, but we need to sum up all the previous integrals
        let segments = this.segments;

        if ((arr.constructor === Float32Array || arr.constructor === Float64Array) && (sorted || isSorted(arr))) {
            // Special algorithm when the array is a typed array and sorted to reduce copies by a lot

            let j = 0, seg, x2, start_j, min, max, tmp, seg_i, subarray;
            let running_integral = 0; // the running integral value so far (all previous segments summed up)

            for (let i = 0; i < segments.length; i++) {
                seg = segments[i];

                if ((x2 = seg.x2) <= arr[j]) {
                    running_integral += seg.integralAt(seg.x2); // we need to add to the running integral even if we skip a segment for evaluation to arr

                    continue;
                }

                start_j = j;

                min = j;
                max = arr.length - 1;
                j = Math.floor((min + max) / 2);

                if (arr[max] < x2) {
                    j = max + 1;
                } else while (true) {
                    if (arr[j] < x2) {
                        min = j;
                    } else {
                        max = j;
                        if (j === 0 || arr[j - 1] < x2)
                            break;
                    }

                    j = (min + max + 1) >> 1;
                }

                if (j < arr.length) { // if there's space to squeeze in one extra value than usual...
                    subarray = arr.subarray(start_j, j + 1); // we use j + 1 here to take advantage of the extra space
                    tmp = arr[j];  // keep track of the ACTUAL value
                    arr[j] = seg.x2; // set it to seg.x2, which is the end of the segment, and will therefore evaluate to the integral under the entire segment

                    seg.getIntegrals(subarray); // get the integrals

                    seg_i = arr[j]; // seg_i is the value of the integral of the segment
                    arr[j] = tmp; // set that value we used

                    for (let i = 0; i < subarray.length - 1; i++) { // for every element in the subarray besides the last (accessory) element, add up the previous segment integrals
                        subarray[i] += running_integral;
                    }

                    running_integral += seg_i; // add this segment's integral to the running total
                } else { // we don't have to continue keeping track of the running integral because there's no more values to compute, so no need to squeeze!
                    subarray = arr.subarray(start_j, j);
                    seg.getIntegrals(subarray);

                    for (let i = 0; i < subarray.length; i++) {
                        subarray[i] += running_integral;
                    }

                    break;
                }
            }

            if (j < arr.length) {
                // Fill up remaining values if needed, but we're gonna have to do a bit of calculation
                let last_seg = segments[segments.length - 1];

                let y2 = last_seg.y2;
                let x2 = last_seg.x2;

                for (let i = j; i < arr.length; i++) {
                    arr[i] = running_integral + (arr[i] - x2) * y2; // add up the running integral plus the rectangle with sides y2 and x - x2
                }
            }
        } else {
            let integrals = new Float64Array(segments.length);

            for (let i = 0; i < segments.length; i++) {
                let seg = segments[i];

                integrals[i] = seg.integralAt(seg.x2) + (i > 0 ? integrals[i-1] : 0); // precompute all integral sums into a floatarray
            }

            for (let i = 0; i < arr.length; i++) {
                let x = arr[i];

                let min = 0;
                let max = segments.length - 1;
                let mid = Math.floor((min + max) / 2);
                let loop = 50;

                if (x <= 0)
                    x = 0;

                if (x < segments[0].x2) {
                    mid = 0;
                    loop = false;
                } else if (x > segments[max].x2) {
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

                if (mid === -1) {
                    let last_seg = segments[segments.length - 1];

                    arr[i] = integrals[integrals.length - 1] + (arr[i] - last_seg.x2) * last_seg.y2; // add up the last integral sum with the rectangle
                } else {
                    arr[i] = segments[mid].integralAt(arr[i]) + (mid > 0 ? integrals[mid - 1] : 0); // compute the integral under the segment, then add it to the relevant integral for prev. segmts
                }
            }
        }
    }

    getTimeIntegrals(arr, sorted = false) { // basically identical to the previous one, just asking for timeIntegrals (which is generally gonna be a lot slower!)
        this._timeIntegralCheck();

        let segments = this.segments;

        if ((arr.constructor === Float32Array || arr.constructor === Float64Array) && (sorted || isSorted(arr))) {
            let j = 0, seg, x2, start_j, min, max, tmp, seg_i, subarray;
            let running_integral = 0;

            for (let i = 0; i < segments.length; i++) {
                seg = segments[i];

                if ((x2 = seg.x2) <= arr[j]) {
                    running_integral += seg.timeIntegralAt(seg.x2);

                    continue;
                }

                start_j = j;

                min = j;
                max = arr.length - 1;
                j = Math.floor((min + max) / 2);

                if (arr[max] < x2) {
                    j = max + 1;
                } else while (true) {
                    if (arr[j] < x2) {
                        min = j;
                    } else {
                        max = j;
                        if (j === 0 || arr[j - 1] < x2)
                            break;
                    }

                    j = (min + max + 1) >> 1; // ceil(avg(min, max))
                }

                if (j < arr.length) {

                    subarray = arr.subarray(start_j, j + 1);
                    tmp = arr[j];
                    arr[j] = seg.x2;

                    seg.getTimeIntegrals(subarray);
                    seg_i = arr[j];
                    arr[j] = tmp;

                    for (let i = 0; i < subarray.length - 1; i++) {
                        subarray[i] += running_integral;
                    }

                    running_integral += seg_i;
                } else {
                    subarray = arr.subarray(start_j, j);
                    seg.getTimeIntegrals(subarray);

                    for (let i = 0; i < subarray.length; i++) {
                        subarray[i] += running_integral;
                    }

                    break;
                }
            }

            if (j < arr.length) {
                // Fill up remaining values
                let last_seg = segments[segments.length - 1];

                let y2 = last_seg.y2;
                let x2 = last_seg.x2;

                for (let i = j; i < arr.length; i++) {
                    arr[i] = running_integral + (arr[i] - x2) / y2;
                }
            }
        } else {
            let integrals = new Float64Array(segments.length);

            for (let i = 0; i < segments.length; i++) {
                let seg = segments[i];

                integrals[i] = seg.integralAt(seg.x2) + (i > 0 ? integrals[i-1] : 0);
            }

            for (let i = 0; i < arr.length; i++) {
                let x = arr[i];

                let min = 0;
                let max = segments.length - 1;
                let mid = Math.floor((min + max) / 2);
                let loop = 50;

                if (x <= 0)
                    x = 0;

                if (x < segments[0].x2) {
                    mid = 0;
                    loop = false;
                } else if (x > segments[max].x2) {
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

                if (mid === -1) {
                    let last_seg = segments[segments.length - 1];

                    arr[i] = integrals[integrals.length - 1] + (arr[i] - last_seg.x2) / last_seg.y2;
                } else {
                    arr[i] = segments[mid].timeIntegralAt(arr[i]) + (mid > 0 ? integrals[mid - 1] : 0);
                }
            }
        }
    }

    valueAt(c) {
        let arr = new Float64Array([c]);
        this.getValues(arr);
        return arr[0];
    }

    derivativeAt(c) {
        let arr = new Float64Array([c]);
        this.getDerivatives(arr);
        return arr[0];
    }

    integralAt(c) {
        let arr = new Float64Array([c]);
        this.getIntegrals(arr);
        return arr[0];
    }

    _timeIntegralCheck() {
        if (this.ymin() <= 0)
            throw new Error("Time integral does not exist, because the y minimum is less than 0.");
    }

    timeIntegralAt(c) {
        let arr = new Float64Array([c]);
        this.getTimeIntegrals(arr);
        return arr[0];
    }

    scaleX(x) {
        if (x === 0)
            throw new Error("Can't scale by factor of 0");

        this.segments.forEach(segment => segment.scaleX(x));

        if (x < 0) // reverse the segment order if the scale factor is negative
            this.segments.reverse();

        this.update();
    }

    scaleY(y) {
        this.segments.forEach(segment => segment.scaleY(y));
    }
}

export { Automation, ConstantAutomationSegment, ExponentialAutomationSegment, LinearAutomationSegment, QuadraticAutomationSegment };