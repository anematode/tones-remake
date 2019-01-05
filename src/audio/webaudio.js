import {TonesDestinationNode} from "./tonesnode.js";
import {Context, destinationNode} from "./context.js";

let Destination = new TonesDestinationNode({node: Context.createGain()});

Destination.entry.connect(destinationNode);
let masterVolume = Destination.entry.gain;

let unmutedVol;

function mute() {
    unmutedVol = getMasterVolume();
    setMasterVolume(0);
}

function unmute() {
    setMasterVolume(unmutedVol);
}

function setMasterVolume(val) {
    masterVolume.value = val;
}

function getMasterVolume() {
    return masterVolume.value;
}

function chainNodes(nodes) {
    for (let i = 0; i < nodes.length - 1;) {
        nodes[i].connect(nodes[++i]);
    }
}

// For Chrome
window.addEventListener("onclick", () => Context.resume());

export {Context as DefaultContext, mute, unmute, setMasterVolume, getMasterVolume, chainNodes, Destination as DefaultDestination};