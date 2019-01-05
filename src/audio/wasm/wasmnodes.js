// Appended to the end of the compiled module

class WebASMHeapAudio {
    constructor(module, bufferLength = 128, maxChannels = 32) {
        this.module = module;
        this.bufferLength = bufferLength;
        this.maxChannels = maxChannels;

        this.mallocHeap();
    }

    mallocHeap() {
        let sampleByteSize = Float32Array.BYTES_PER_ELEMENT;
        let heapUnitSize = Uint16Array.BYTES_PER_ELEMENT;
        let channelByteSize = this.bufferLength * sampleByteSize;
        let totalHeapSize = this.maxChannels * channelByteSize;

        let heapPointer = this.heapPointer = this.module._malloc(totalHeapSize);
        this.channels = [];

        for (let i = 0; i < this.maxChannels; i++) {
            let startPointer = (heapPointer + channelByteSize * i);
            let endPointer = (startPointer + channelByteSize) >> 2;
            startPointer >>= 2;

            this.channels.push(this.module.HEAPF32.subarray(startPointer, endPointer));
        }
    }

    getChannelBuffer(i) {
        if (i >= this.maxChannels) return;
        return this.channels[i];
    }

    freeMalloc() {
        this.module._free(this.heapPointer);
    }
}

const bufferc = new WebASMHeapAudio(Module, 128, 2);
const kernel = new Module.InvertSignal();

class TestProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
    }

    process(inputs, outputs, parameters) {
        let input = inputs[0];
        let output = outputs[0];

        let channelCount = input.length;

        for (let channel = 0; channel < channelCount; ++channel) {
            bufferc.channels[channel].set(input[channel]);
        }

        kernel.processHeap(bufferc.heapPointer, channelCount);

        for (let channel = 0; channel < channelCount; ++channel) {
            output[channel].set(bufferc.channels[channel]);
        }

        return true;
    }
}

registerProcessor("test", TestProcessor);