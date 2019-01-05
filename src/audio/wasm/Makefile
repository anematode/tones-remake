build:
	@emcc --bind -O2 -s WASM=1 -s BINARYEN_ASYNC_COMPILATION=0 -s SINGLE_FILE=1 wasmnodes.cc -o compiled.module.js
	@rm -f wasmnodes.module.js
	@cat compiled.module.js wasmnodes.js >> wasmnodes.module.js

clean:
	@rm -f compiled.module.js wasmnodes.module.js