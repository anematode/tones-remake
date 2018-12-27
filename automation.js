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
}