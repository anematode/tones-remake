import * as utils from "../utils.js";
import {DefaultContext, DefaultDestination} from "./webaudio.js";
import {TonesGainNode} from "./basicnode.js";

class System {
    constructor(params = {}) {
        let context = utils.select(params.Context, DefaultContext);

        utils.assert(context instanceof AudioContext, "context must be an AudioContext");

        this.context = context;
        this._destinationNode = utils.select(params.destinationNode, DefaultDestination);
        this.entry = new TonesGainNode();

        let autoConnect = utils.select(params.autoConnect, true);
        if (autoConnect)
            this.connect(this._destinationNode);

        this.instruments = {};
        this.modulatable_parameters = {};
        this.loopStart = 0;
        this.playhead = 0;
        this.loopEnd = Infinity;
        this._muted = false;
    }

    connect(destination = DefaultDestination) {
        this.entry.connect(destination);
    }

    disconnect() {
        this.entry.disconnect();
    }

    hasInstrument(id) {
        return this.instruments.hasOwnProperty(id);
    }

    getInstrument(id) {
        return this.instruments[id];
    }

    _setInstrument(inst) {
        utils.assert(inst.system === this);
        this.instruments[inst.id] = inst;
    }

    _removeInstrument(inst) {
        utils.assert(inst.system === this);
        if (!this.instruments[inst.id])
            throw new Error("Instrument is not a child of this system");

        delete this.instruments[inst.id];
    }

    get muted() {
        return this._muted;
    }

    set muted(val) {
        if (val && !this._muted) {
            this._unmutedVolume = this.volume;
            this.volume = 0;
        } else if (this._muted && !val) {
            this.volume = this._unmutedVolume;
        }
    }

    get volume() {
        return this.exit.gain.value;
    }

    set volume(val) {
        this.exit.gain.value = val;
    }
}

// An object tied to a specific system
class SystemObject {
    constructor(params = {}) {
        let system = params.system;
        utils.assert(system instanceof System, "SystemObject must be constructed with a system");
        this.system = system;
        this.context = system.context;
    }
}

export {System, SystemObject};