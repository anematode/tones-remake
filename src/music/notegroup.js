import {KeyboardNote} from "./keyboardnote.js";
import * as utils from "../utils.js";

/* A note group abstracts the concept of a sequence of notes into a relatively easily manipulatible object.
It is constructed by passing an array of KeyboardNotes (optional), or otherwise manipulating these notes using the
addNote, deleteNote, deleteNoteIf, translateX, scaleX, reverse, transpose, apply, snip, join, clone, add, and repeat
functions. The first and third of these are the most useful by far. */

/*
Relevant .tex files: keyboardnote_development.tex (1)
Written by anematode, 1/3/2019
 */


class KeyboardNoteGroup {
    constructor(notes = []) {
        utils.assert(Array.isArray(notes), "KeyboardNoteGroup takes an array in its constructor.");
        this.notes = notes;
        this._sorted = false; // internal variable used to keep track of whether the notes are sorted so it doesn't have to sort extra
    }

    // Sort the group by starting times; this is important for most of the algorithms
    sort() {
        this.notes.sort((n1, n2) => n1.start - n2.start);
        this._sorted = true;

        return this;
    }

    // add a note to this group
    addNote(note, clone = false) {
        this.notes.push(clone ? note.clone() : note);
        this._sorted = false;
        return this;
    }

    // delete a note, given the note itself (it doesn't do a deepEquals!!)
    deleteNote(note) {
        //if (!this._sorted) {
            return this.deleteNoteIf(n => n === note);
        /*} else { // TODO discuss with brandon if this is necessary
            let max = this.notes.length;

            if (this.notes[0] === note) {
                this.notes.splice(0, 1);
                for (let i = 0; i < max - 1; i++) {
                    if (this.notes[i] === note) {
                        this.notes.splice(0, 1);
                    } else break;
                }
                return true;
            }

            let min = 0;
            let i,note;

            while (true) { // binary search
                let i = (min + max + 1) >> 1;
                let note_c = this.notes[i];

                if (note_c.start > note.start)
                    max = i;
                else if (note_c.start < note.start)
                    min = i;
                else
                    break;

                if (max - min <= 2)
                    return false;
            }

            let del_s, del_e; // delete between del_s and del_e
            for (del_s = i - 1; del_s >= 0; del_s--) {
                if (this.notes[del_s] !== note) {
                    break;
                }
            }

            del_s++;

            for (del_e = i + 1; del_e < this.notes.length; del_e++) {
                if (this.notes[del_e] !== note) {
                    break;
                }
            }

            this.notes.splice(del_s, del_e - del_s);
            return true;
        }*/
    }

    // delete a note if it satisfies a certain function
    deleteNoteIf(func) {
        let deletedAny = false;
        for (let i = this.notes.length - 1; i >= 0; i--) {
            let note = this.notes[i];

            if (func(note)) {
                this.notes.splice(i, 1); // remove the note
                deletedAny = true;
            }
        }
        return deletedAny;
    }

    // translate the group by x units
    translateX(x) {
        this.notes.forEach(note => note.translateX(x));
        return this;
    }

    // scale the group relative to the origin
    scaleX(x) {
        utils.assert(x > 0, "Scale factor must be positive.");
        this.notes.forEach(note => note.scaleX(x));
        return this;
    }

    // number of notes in the group
    get noteCount() {
        return this.notes.length;
    }

    // reverse the notes in the group, putting the first note at x = 0
    reverse() {
        if (!this._sorted) this.sort();

        let x = this.maxX();
        this.notes.forEach(note => note.start = (x - note.end));
        this.notes.reverse(); // the notes will be in the exact wrong order: worst case for quicksort! meh, just flip it
    }

    // transpose the group by some number of semitones
    transpose(semitones) {
        this.notes.forEach(note => note.transpose(semitones));
        return this;
    }

    // apply a function to all notes
    apply(func) {
        this.notes.forEach(func);

        this.sort();

        return this;
    }

    // test whether a function is true for any notes
    some(func) {
        return this.notes.some(func);
    }

    // test whether a function is true for all notes
    all(func) {
        return this.notes.every(func);
    }

    // get all notes which satisfy the function
    select(func) {
        return this.notes.filter(func);
    }

    // minimum x value of the group
    minX() {
        if (!this._sorted) this.sort();
        return this.noteCount > 0 ? this.notes[0].start : NaN
    }

    // maximum x value of the group
    maxX() {
        if (!this._sorted) this.sort();
        let maxX = -Infinity;

        for (let i = 0; i < this.notes.length; i++) {
            let end = this.notes[i].end;
            if (end > maxX)
                maxX = end;
        }

        return maxX === -Infinity ? NaN : maxX;
    }

    // total length of the group (min to max)
    length() {
        return this.maxX() - this.minX();
    }

    // minimum pitch (lowest note)
    minPitch() {
        let minP = Infinity;
        for (let i = 0; i < this.notes.length; i++) {
            let p = this.notes[i].pitch;
            if (p < minP)
                minP = p;
        }
        return minP === Infinity ? NaN : minP;
    }

    // maximum pitch (highest note)
    maxPitch() {
        let maxP = -Infinity;
        for (let i = 0; i < this.notes.length; i++) {
            let p = this.notes[i].pitch;
            if (p > maxP)
                maxP = p;
        }
        return maxP === -Infinity ? NaN : maxP;
    }

    // generator returning notes between start_x and end_x, trimming them if necessary
    * generateNotes(start_x = -Infinity, end_x = Infinity) {
        utils.assert(start_x < end_x, "start_x must be less than end_x");

        if (end_x < this.minX()) // a quick check, also sorts it if it isn't sorted
            return;

        for (let i = 0; i < this.notes.length; i++) {
            let note = this.notes[i];
            let start = note.start, end = note.end;

            if (end <= start_x) // note we reject === as well so there won't be odd zero length notes being returned lol
                continue;

            if (start >= end_x) // there's not gonna be any more notes past here!
                return;

            if (start_x < start && end < end_x) {
                yield note;
                continue;
            }

            if (start_x > start)
                start = start_x;
            if (end_x < end)
                end = end_x;

            let note_clone = note.clone();
            note_clone.start = start;
            note_clone.end = end;

            yield note_clone;
        }
    }

    // returns a new group containing a portion (from start_x to end_x) of the group
    snip(start_x = -Infinity, end_x = Infinity) {
        utils.assert(start_x < end_x, "start_x must be less than end_x");

        let group = new KeyboardNoteGroup();

        if (end_x < this.minX()) // a quick check, also sorts it if it isn't sorted
            return group;

        for (let i = 0; i < this.notes.length; i++) {
            let note = this.notes[i];
            let start = note.start, end = note.end;

            if (end <= start_x || start >= end_x) // note we reject === as well so there won't be odd zero length notes being returned lol
                continue;

            note = note.clone();

            if (start < start_x && end < end_x) {
                group.addNote(note);
                continue;
            }

            if (start_x > start)
                start = start_x;
            if (end_x < end)
                end = end_x;

            note.start = start;
            note.end = end;

            group.addNote(note);
        }

        return group;
    }

    // join another group to this one at x = offsetX
    join(group, clone=true, offsetX = this.maxX()) {
        // if clone is true, then we clone each of the new elements, otherwise we just take and add them directly
        group.notes.forEach(note => {
            if (clone)
                note = note.clone();
            note.start += offsetX;
            this.addNote(note);
        });

        this._sorted = false;
        return this;
    }

    // clone this NoteGroup, notes and all
    clone() {
        let group = new KeyboardNoteGroup(this.notes.map(note => note.clone()));
        group._sorted = this._sorted;
        return group;
    }

    // same as join, but returns a separate, new group
    add(group, offsetX = this.maxX()) {
        let ret_group = this.clone();

        ret_group.join(group, true, offsetX);

        return ret_group;
    }

    // repeat this notegroup "times" number of times with a spacing of repeatX. repeatX can also be an array with
    // length times - 1, specifying the spacing at each repeat
    repeat(times, repeatX = this.maxX()) {
        let isArr = Array.isArray(repeatX);

        utils.assert(!isArr || repeatX.length === times - 1, "repeatX array must have a length of times - 1");
        let start_l = this.noteCount;
        let offset_x = 0;

        for (let i = 0; i < times - 1; i++) {
            offset_x += isArr ? repeatX[i] : repeatX;

            for (let j = 0; j < start_l; j++) {
                let note = this.notes[j].clone();
                note.translateX(offset_x);
                this.addNote(note);
            }
        }

        return this;
    }

    // convert the note group to a JSON format
    toJSON() {
        return {n: this.notes.map(n => n.toJSON()), s: this._sorted};
    }

    // create a note group from the JSON format
    static fromJSON(json) {
        let group = new KeyboardNoteGroup(json.n.map(noteJN => KeyboardNote.fromJSON(noteJN)));
        group._sorted = json.s;
        return group;
    }

    // remove intersecting notes from the NoteGroup, first choosing the longest notes of notes that start at the exact
    // same time and have the same pitch, then trimming intersecting notes of the same pitch

    removeIntersections() {
        if (!this._sorted) this.sort();

        // step 1: set all but one for completely coincident notes (notes with the same pitch and start) to null
        let notes = this.notes;
        let ps_index = 0;
        let prev_start = 0;
        let dict = {};
        let extraEgg = false;
        let pitches = {};

        for (let i = 0; i < notes.length || (extraEgg = !extraEgg); i++) { // extraEgg allows us to do a special loop at i = notes.length to take care of the last batch of start values
            let start = extraEgg ? Infinity : notes[i].start;

            if (start !== prev_start) { // whenever the start value changes
                prev_start = start;
                dict = {};
                let needs_assessment = {};

                for (let j = ps_index; j < i; j++) { // this range of indices all have the same start value, so any coincident notes will be here
                    let note = notes[j];

                    if (dict[note.pitch] !== undefined) { // keeps track of whether a pitch has been seen before here and makes a list of all the pitches in this region
                        dict[note.pitch].push(j);
                        needs_assessment[note.pitch] = true; // this only happens if there's more than one of a pitch
                    } else {
                        dict[note.pitch] = [j];
                    }
                }

                for (let pitch in needs_assessment) { // for each pitch that has at least one duplicate...
                    if (!needs_assessment.hasOwnProperty(pitch)) continue;

                    let notes_p = dict[pitch];
                    let keep_l;
                    let max_length = -Infinity;

                    for (let l = 0; l < notes_p.length; l++) { // find the relevant note with longest length; store its index's index in keep_l
                        let length = notes[notes_p[l]].length;
                        if (length > max_length) {
                            max_length = length;
                            keep_l = l;
                        }
                    }

                    for (let l = 0; l < notes_p.length; l++) {
                        if (l === keep_l) { // this note is going to remain (since it's longest), let's keep track of it for step 2
                            let index = notes_p[l];
                            let pitch = notes[index].pitch; // keep track for the whole group: pitches have notes when?

                            if (pitches[pitch] !== undefined)
                                pitches[pitch].push(index);
                            else
                                pitches[pitch] = [index];
                            continue;
                        }

                        notes[notes_p[l]] = null; // set discarded notes to null to be cleared later (don't splice them now, because that will mess up the indices)
                    }
                }

                for (let pitch in dict) {
                    if (!dict.hasOwnProperty(pitch)) continue;
                    let notes = dict[pitch];

                    if (notes.length === 1) { // not assessed previously, because there aren't coincident notes of this pitch in this range
                        if (pitches[pitch] !== undefined) // again, keep track of the notes for step 2
                            pitches[pitch].push(notes[0]);
                        else
                            pitches[pitch] = [notes[0]];
                    }
                }

                if (extraEgg) // not necessary but gives me peace of mind
                    break;

                ps_index = i;
            }
        }

        // step 2: go through each pitch and trim them

        for (let pitch in pitches) { // for each pitch that exists in the note group...
            if (!pitches.hasOwnProperty(pitch)) continue;
            let note_indices = pitches[pitch];

            if (note_indices.length <= 1) continue; // if there's only one of that note, there won't be intersections, so continue on your merry way

            let prev_end = -Infinity;

            for (let i = 0; i < note_indices.length; i++) {
                let note = notes[note_indices[i]]; // for each note with that pitch...

                if (note.start < prev_end) { // if the start of this note lies in the range of the previous note... (note we use a strict comparison)
                    notes[note_indices[i - 1]].end = note.start; // trim the previous note to make its end = this note's start
                    // note that i >= 1 is guaranteed because nothing is smaller than -Infinity
                }

                prev_end = note.end;
            }
        }


        // step 3: remove all nulls
        this.deleteNoteIf(note => note === null);

        return this;
    }
}

export {KeyboardNoteGroup};