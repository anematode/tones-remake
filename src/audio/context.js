// This is the actual audio context that everything in TONES will use

let Context = new AudioContext();
let destinationNode = Context.destination;

export {Context, destinationNode};