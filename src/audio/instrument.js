import {SystemObject} from "./system.js";
import * as utils from "../utils.js";

class Instrument extends SystemObject {
    constructor(params = {}) {
        super(params);
        this.instrument_id = utils.getID();
    }
}

export {Instrument};