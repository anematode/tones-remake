// An abstraction of automation

class AutomationSegment {
    constructor(x1, y1, x2, y2) {
        if (x2 < x1)
            throw new Error("x2 must be greater than or equal to x1.");
        this.x1 = x1;
        this.x2 = x2;
        this.y1 = y1;
        this.y2 = y2;
    }

    length() {
        return this.x2 - this.x1;
    }

    deltaY() {
        return this.y2 - this.y1;
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

    static derivativeAt() {
        return 0;
    }

    integralAt(x) {
        return this.c * (x - this.x1);
    }

    timeIntegral(x) {
        this._timeIntegralCheck();

        return (x - this.x1) / this.c;
    }

    translateX(x) {
        this.x1 += x;
        this.x2 += x;
    }

    translateY(y) {
        this.y1 += y;
        this.y2 += y;
    }

    scaleX(x) {
        this.x1 *= x;
        this.x2 *= x;

        if (this.x2 < this.x1) { // flip the values in case the scaling caused the segment to flip over unceremoniously
            let tmp = this.x2;

            this.x2 = this.x1;
            this.x1 = tmp;
        }
    }

    scaleY(y) {
        this.y1 *= y;
        this.y2 *= y;
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

    ymin() {
        return Math.min(this.y1, this.y2);
    }

    ymax() {
        return Math.max(this.y1, this.y2);
    }

    valueAt(x) {
        return (x - this.x1) * this.derivativeAt() + this.y1;
    }

    derivativeAt() {
        return (this.y2 - this.y1) / (this.x2 - this.x1);
    }

    integralAt(x) {
        let xd = x - this.x1;
        return this.y1 * xd + this.derivativeAt() * xd * xd / 2;
    }

    timeIntegral(x) {
        this._timeIntegralCheck();

        let m = this.derivativeAt();
        if (Math.abs(m) < linearAutomationTimeIntegralEps) {
            return (x - this.x1) / this.y1;
        }

        return (Math.log(m * (x - this.x1) + this.y1) - Math.log(this.y1)) / m;
    }

    translateX(x) {
        this.x1 += x;
        this.x2 += x;
    }

    translateY(y) {
        this.y1 += y;
        this.y2 += y;
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
    }

    scaleY(y) {
        this.y1 *= y;
        this.y2 *= y;
    }

    clone() {
        return new LinearAutomationSegment(this.x1, this.y1, this.x2, this.y2);
    }
}

const exponentialAutomationEps = 10e-9;

class ExponentialAutomationSegment extends AutomationSegment {
    constructor(x1, y1, x2, y2, yc) {
        if (x2 === x1)
            throw new Error("LinearAutomationSegment can't have two identical x boundaries.");
        super(x1, y1, x2, y2);

        if (yc <= this.ymin() || yc >= this.ymax())
            throw new Error("yc out of bounds");

        this.yc = yc;
    }

    ymin() {
        return Math.min(this.y1, this.y2);
    }

    ymax() {
        return Math.max(this.y1, this.y2);
    }

    valueAt(x) {
        let ycp = (this.yc - this.y1) / (this.y2 - this.y1);

        if (Math.abs(ycp - 0.5) < exponentialAutomationEps) {
            return (x - this.x1) * (this.y2 - this.y1) / (this.x2 - this.x1) + this.y1
        } else {
            return ycp * ycp / (1 - 2 * ycp) *
                (Math.pow(1 / ycp - 1, 2 * (x - this.x1) / (this.x2 - this.x1)) - 1) *
                (this.y2 - this.y1) + this.y1;
        }
    }

    derivativeAt(x) {
        let ycp = (this.yc - this.y1) / (this.y2 - this.y1);

        if (Math.abs(ycp - 0.5) < exponentialAutomationEps) {
            return (this.y2 - this.y1) / (this.x2 - this.x1);
        } else {
            let rycp = 1/ycp - 1;
            let xd = this.x2 - this.x1;

            return 2 * ycp * ycp / (1 - 2 * ycp) * (this.y2 - this.y1) / xd *
                Math.log(rycp) * Math.pow(rycp, 2 * (x - this.x1) / xd);
        }
    }

    integralAt(x) {
        let ycp = (this.yc - this.y1) / (this.y2 - this.y1);

        if (Math.abs(ycp - 0.5) < exponentialAutomationEps) {
            let xd = x - this.x1;
            return this.y1 * xd + (this.y2 - this.y1) / (this.x2 - this.x1) * xd * xd / 2;
        } else {
            let rycp = 1/ycp - 1;
            let xd = this.x2 - this.x1;

            return this.y1 * (x - this.x1) + ycp * ycp / (1 - 2 * ycp) * (this.y2 - this.y1) * (this.x1 - x +
                (xd * (Math.pow(rycp, 2 * (x - this.x1) / xd) - 1)) /
                (2 * Math.log(rycp)));
        }
    }

    timeIntegral(x) {
        let ycp = (this.yc - this.y1) / (this.y2 - this.y1);

        if (Math.abs(ycp - 0.5) < exponentialAutomationEps) {
            let m = (this.y2 - this.y1) / (this.x2 - this.x1);

            if (m === 0) {
                return (x - this.x1) / this.y1;
            } else {
                return (Math.log(m * (x - this.x1) + this.y1) - Math.log(this.y1)) / m;
            }
        } else {
            let a = ycp * ycp / (1 - 2 * ycp) * (this.y2 - this.y1), b = this.y1;
            let rycp = 1 / ycp - 1;
            let log_v = 2 * Math.log(rycp) / (this.x2 - this.x1);

            rycp *= rycp;

            return (Math.log((a * (Math.pow(rycp, (x - this.x1) / (this.x2 - this.x1)) - 1) + b) / b) - (x - this.x1) * log_v) / ((a - b) * log_v)
        }
    }
}

let seg = new ExponentialAutomationSegment(1, 60, 5, 120, 90);