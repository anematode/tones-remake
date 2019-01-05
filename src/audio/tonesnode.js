import { Context as DefaultContext } from "./context.js";
import * as utils from "../utils.js";

class BaseNode {
    constructor(params = {}) {
        let context = utils.select(params.context, DefaultContext);
        utils.assert(context instanceof AudioContext);
        this.context = context;

        this.id = utils.getID();
    }

    connect(node) {
        utils.assert(node !== this && node !== this.entry);
        if (node.entry)
            this.exit.connect(node.entry);
        else
            this.exit.connect(node);
    }

    disconnect(node) {
        utils.assert(node !== this && node !== this.entry);
        if (node.entry)
            this.exit.disconnect(node.entry);
        else
            this.exit.disconnect(node);
    }

    connectFrom(node) {
        utils.assert(node !== this && node !== this.exit);
        if (node instanceof BaseNode)
            node.connect(this);
        else
            node.connect(this.entry);
    }

    disconnectFrom(node) {
        utils.assert(node !== this && node !== this.exit);
        if (node instanceof BaseNode)
            node.connect(this);
        else
            node.connect(this.entry);
    }
}

class TonesNode extends BaseNode {
    constructor(params = {}) {
        super(params);
        let createEndpoints = utils.select(params.createEndpoints, true);

        if (params.node && createEndpoints) {
            this.entry = this.exit = params.node;
        } else if (createEndpoints) {
            this.entry = this.context.createGain();
            this.exit = this.context.createGain();
        }
    }
}

class TonesSourceNode extends BaseNode {
    constructor(params = {}) {
        super(params);
        let createEndpoints = utils.select(params.createEndpoints, true);

        if (params.node && createEndpoints) {
            this.exit = params.node;
        } else if (createEndpoints) {
            this.exit = this.context.createGain();
        }
    }

    connectFrom() {
        throw new Error("Can't connect other nodes to source node");
    }

    disconnectFrom() {
        throw new Error("Can't connect other nodes to source node");
    }
}

class TonesDestinationNode extends BaseNode {
    constructor(params = {}) {
        super(params);
        let createEndpoints = utils.select(params.createEndpoints, true);

        if (params.node && createEndpoints) {
            this.entry = params.node;
        } else if (createEndpoints) {
            this.entry = this.context.createGain();
        }
    }

    connect() {
        throw new Error("Can't connect destination node to other nodes");
    }

    disconnect() {
        throw new Error("Can't connect destination node to other nodes");
    }
}

function isTonesNode(node) {
    return node instanceof BaseNode;
}

export {TonesNode, TonesSourceNode, TonesDestinationNode, isTonesNode};