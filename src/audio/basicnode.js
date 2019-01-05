import { TonesNode } from "./tonesnode.js";
import * as utils from "../utils";
import {DefaultContext} from "./webaudio";
import {Parameter} from "./parameter.js";

class TonesGainNode extends TonesNode {
    constructor(params = {}) {
        let context = utils.select(params.context, DefaultContext);
        super({node: context.createGain(), context});

        this.gain = this.exit.gain; // temp
    }
}

export {TonesGainNode};