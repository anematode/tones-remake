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

const linearAutomationTimeIntegralEps = 1e-9;

// Note: this.derivativeAt(0) is just an easy way to get the slope
class LinearAutomationSegment extends AutomationSegment {
    constructor(...args) {
        super(...args);
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

    derivativeAt(x) {
        return (this.y2 - this.y1) / (this.x2 - this.x1);
    }

    integralAt(x) {
        let xd = x - this.x1;
        return this.y1 * xd + this.derivativeAt() * xd * xd / 2;
    }

    timeIntegral(x) {
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
        this.x1 *= x;
        this.x2 *= x;
    }

    scaleY(y) {
        this.y1 *= y;
        this.y2 *= y;
    }

    clone() {
        return new LinearAutomationSegment(this.x1, this.y1, this.x2, this.y2);
    }
}