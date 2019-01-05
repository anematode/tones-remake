// Heavily inspired by https://github.com/GoogleChromeLabs/web-audio-samples/blob/master/audio-worklet/design-pattern/wasm

#include "emscripten/bind.h"

using namespace emscripten;

const int channelSize = 128 * sizeof(float);

class InvertSignal {
 public:
  InvertSignal() {}

  void processHeap(uintptr_t start_ptr, unsigned channel_count) {
    float* buffer_start = reinterpret_cast<float*>(start_ptr);

    float* end = buffer_start + channelSize * channel_count;
    for (float* index = buffer_start; index < end; ++index) {
      *index = 1 / *index;
    }
  }
};

EMSCRIPTEN_BINDINGS(CLASS_InvertSignal) {
  class_<InvertSignal>("InvertSignal").constructor().function("processHeap", &InvertSignal::processHeap, allow_raw_pointers());
}