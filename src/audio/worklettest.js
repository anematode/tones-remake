import {DefaultContext} from "./webaudio.js";
import * as utils from "../utils.js";

let DefaultWorklet = DefaultContext.audioWorklet;

(async function egg() {
    utils.markLoading("workletnode");
    await DefaultWorklet.addModule("../src/audio/wasm/wasmnodes.module.js");
    utils.markLoadingProgress("workletnode", 1);
})();

export {DefaultWorklet};