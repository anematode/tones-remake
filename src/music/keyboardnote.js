import * as utils from "../utils.js";

const isNumeric = utils.isNumeric;

// Terminology

// 0 -> C-1, 1 -> C#-1, etc., like MIDI in scientific pitch notation
// Black notes are named as a sharp by default
// Sharp -> #, Double sharp -> ##, Flat -> b, Double flat -> bb

/* Name of notes in the chromatic scale */
const octave_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/* Mod function allowing proper result for negative numbers */
function mod(n, m) {
    return ((n % m) + m) % m;
}

/* Note to scientific pitch notation */
function noteToName(note) {
    return octave_names[mod(note, 12)] + String(parseInt(note / 12) - 1);
}

/* Number of semitones corresponding with each letter; C is base note */
const letter_nums = {
    "C": 0,
    "D": 2,
    "E": 4,
    "F": 5,
    "G": 7,
    "A": 9,
    "B": 11
};

/* Number of semitones corresponding with each accidental */
const accidental_offsets = {
    "#": 1,
    "##": 2,
    "B": -1,
    "BB": -2,
    "b" : -1,
    "bb": -2,
    "s": 1,
    "ss" : 2,
    "S": 1,
    "SS": 2
};

/* Convert a note name to a numerical note */
function nameToNote(name) {
    //                letter   accidental  -?  number
    let groups = /^([ABCDEFG])(#|##|B|BB|S|SS)?(-)?([0-9]+)$/.exec(name.toUpperCase().trim());

    try {
        return letter_nums[groups[1]] +                           // semitone offset of note without accidental
            (groups[2] ? accidental_offsets[groups[2]] : 0) +     // semitone offset of accidental
            (groups[3] ? -12 : 12) * (parseInt(groups[4])) + 12;  // octave offset of note
    } catch (e) {
        throw new Error("Invalid note");
    }
}

/* Allowed names for various interval types */
const augmented_names = ["A", "AUG", "AUGMENTED"];
const diminished_names = ["D", "DIM", "DIMIN", "DIMINISHED"];
const perfect_names = ["P", "PERF", "PERFECT"];

/* Return the quality of an interval (i.e. major, minor, diminished, perfect, augmented) given its name */
function getIntervalQuality(desc) {
    desc = desc.trim();

    if (desc[0] === "m" || desc[0] === "M") {
        // Interval is major or minor

        let desc_upper = desc.toUpperCase();

        if (desc_upper.includes("MIN")) {
            return "min";
        } else if (desc_upper.includes("MAJ")) {
            return "maj";
        } else if (desc[0] === "m" && desc.length === 1) { // If name of interval is lowercase m, it's minor
            return "min";
        } else if (desc[0] === "M" && desc.length === 1) { // If uppercase, it's major
            return "maj";
        } else {
            throw new Error("Invalid interval");
        }
    }

    let desc_upper = desc.toUpperCase();
    if (augmented_names.includes(desc_upper))
        return "aug";
    if (diminished_names.includes(desc_upper))
        return "dim";
    if (perfect_names.includes(desc_upper))
        return "perf";

    throw new Error("Invalid interval");
}

/* Get the nominal size of an interval (not in semitones) */
function getIntervalSize(ord) {
    switch (ord) {
        case "one": case "first": case "1st": case "unison":
        return 1;
        case "two": case "second": case "2nd":
        return 2;
        case "three": case "third": case "3rd":
        return 3;
        case "four": case "fourth":
        return 4;
        case "five": case "fifth":
        return 5;
        case "six": case "sixth":
        return 6;
        case "seven": case "seventh":
        return 7;
        case "eight": case "eighth": case "octave":
        return 8;
        case "nine": case "ninth":
        return 9;
        case "ten": case "tenth":
        return 10;
        case "eleven": case "eleventh":
        return 11;
        case "twelve": case "twelfth":
        return 12;
        case "thirteen": case "thirteenth":
        return 13;
        case "fourteen": case "fourteenth":
        return 14;
        case "fifteen": case "fifteenth":
        return 15;
        case "sixteen": case "sixteenth":
        return 16;
        case "seventeen": case "seventeenth":
        return 17;
        case "eighteen": case "eighteenth":
        return 18;
        case "nineteen": case "nineteenth":
        return 19;
        case "twenty": case "twentieth":
        return 20;
    }

    //              number  ord
    let groups = /^([0-9]+)(th|)?$/.exec(ord);

    if (groups) {
        return parseInt(groups[1]);
    }
    return null;
}

/* Convert interval name to numerical interval */
function nameToInterval(name) {
    name = name.trim();
    let upper_name = name.toUpperCase();

    if (upper_name === "TT" || upper_name === "tritone")
        return KeyboardIntervals.tritone;
    if (upper_name === "unison")
        return KeyboardIntervals.unison;
    if (upper_name === "octave")
        return KeyboardIntervals.octave;

    //               quality       interval
    let groups = /^([A-Za-z]+)\s*([A-Za-z0-9]+)$/.exec(name);

    if (!groups)
        throw new Error("Invalid interval.");

    let quality = getIntervalQuality(groups[1]);
    let value = getIntervalSize(groups[2]);

    if (!isNumeric(value) || !quality || !value)
        throw new Error("Invalid interval.");

    let m_value = value % 7;            // offset from the octave
    let s_value = parseInt(value / 7);  // number of octaves

    if ([4, 5, 1].includes(value % 7)) { // fourths, fifths, unisons
        value = s_value * 12;

        switch (m_value) {
            case 4: // fourth
                value += 5;
                break;
            case 5: // fifth
                value += 7;
                break;
            case 1: // unison
            default:
        }

        switch (quality) {
            case "dim":
                return new KeyboardInterval(value - 1);
            case "aug":
                return new KeyboardInterval(value + 1);
            case "perf":
                return new KeyboardInterval(value);
            default:
            case "min":
            case "maj":
                throw new Error("Invalid interval.");
        }
    } else { // seconds, thirds, sixths, sevenths
        value = s_value * 12;

        switch (m_value) {
            case 0: // seventh
                value += 11;
                break;
            case 2: // second
                value += 2;
                break;
            case 3: // third
                value += 4;
                break;
            case 6: // sixth
                value += 9;
                break;
        }

        switch (quality) {
            case "dim":
                return new KeyboardInterval(value - 2);
            case "aug":
                return new KeyboardInterval(value + 1);
            case "min":
                return new KeyboardInterval(value - 1);
            case "maj":
                return new KeyboardInterval(value);
            default:
            case "perf":
                throw new Error("Invalid interval.");
        }
    }
}

const numericalIntervals = [["P", 1], ["m", 2], ["M", 2], ["m", 3], ["M", 3], ["P", 4], ["A", 4], ["P", 5], ["m", 6], ["M", 6], ["m", 7], ["M", 7]];

/* Convert numerical interval to name */
function intervalToName(interval_size) {
    let s_value = interval_size % 12;
    let m_value = parseInt(interval_size / 12);

    let interval = numericalIntervals[s_value];


    let value = m_value * 7 + interval[1];

    return interval[0] + String(value);
}

/* Common keyboard intervals */
const KeyboardIntervals = {
    unison: 0,
    minor_second: 1,
    major_second: 2,
    minor_third: 3,
    major_third: 4,
    perfect_fourth: 5,
    tritone: 6,
    perfect_fifth: 7,
    minor_sixth: 8,
    major_sixth: 9,
    minor_seventh: 10,
    major_seventh: 11,
    octave: 12
};

Object.freeze(KeyboardIntervals);

/* Notes C0 to G9, notes for easy access; sharps are s instead of # */
const KeyboardPitches = {};

for (let i = 12; i < 128; i++) {
    KeyboardPitches[noteToName(i).replace("#", "s")] = i;
}

Object.freeze(KeyboardPitches);

function noteTo12TET(note, a4 = 440) {
    return a4 * Math.pow(2, (note - 69) / 12);
}

export {nameToNote, noteToName, KeyboardPitches, KeyboardIntervals, nameToInterval, intervalToName, noteTo12TET};