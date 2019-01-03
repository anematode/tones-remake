import {KeyboardNote} from "./keyboardnote.js";
import * as utils from "../utils.js";

class KeyboardNoteGroup {
    constructor(notes = []) {
        utils.assert(Array.isArray(notes), "KeyboardNoteGroup takes an array in its constructor.");
        this.notes = notes;
        this._sorted = false;
    }

    sort() {
        this.notes.sort((n1, n2) => n1.start - n2.start);
        this._sorted = true;

        return this;
    }

    addNote(note, clone = false) {
        this.notes.push(clone ? note.clone() : note);
        this._sorted = false;
        return this;
    }

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

    translateX(x) {
        this.notes.forEach(note => note.translateX(x));
        return this;
    }

    scaleX(x) {
        utils.assert(x > 0, "Scale factor must be positive.");
        this.notes.forEach(note => note.scaleX(x));
        return this;
    }

    get noteCount() {
        return this.notes.length;
    }

    reverse() {
        if (!this._sorted) this.sort();

        let x = this.maxX();
        this.notes.forEach(note => note.start = (x - note.end));
        this.notes.reverse();
    }

    transpose(semitones) {
        this.notes.forEach(note => note.transpose(semitones));
        return this;
    }

    apply(func) {
        this.notes.forEach(func);

        this.sort();

        return this;
    }

    some(func) {
        return this.notes.some(func);
    }

    all(func) {
        return this.notes.every(func);
    }

    minX() {
        if (!this._sorted) this.sort();
        return this.noteCount > 0 ? this.notes[0].start : NaN
    }

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

    length() {
        return this.maxX() - this.minX();
    }

    minPitch() {
        let minP = Infinity;
        for (let i = 0; i < this.notes.length; i++) {
            let p = this.notes[i].pitch;
            if (p < minP)
                minP = p;
        }
        return minP === Infinity ? NaN : minP;
    }

    maxPitch() {
        let maxP = -Infinity;
        for (let i = 0; i < this.notes.length; i++) {
            let p = this.notes[i].pitch;
            if (p > maxP)
                maxP = p;
        }
        return maxP === -Infinity ? NaN : maxP;
    }

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

    join(group, clone=true, offsetX = this.maxX()) {
        group.notes.forEach(note => {
            if (clone)
                note = note.clone();
            note.start += offsetX;
            this.addNote(note);
        });

        this._sorted = false;
        return this;
    }

    clone() {
        let group = new KeyboardNoteGroup(this.notes.map(note => note.clone()));
        group._sorted = this._sorted;
        return group;
    }

    add(group, offsetX = this.maxX()) {
        let ret_group = this.clone();

        ret_group.join(group, true, offsetX);

        return ret_group;
    }

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

    toJSON() {
        return {n: this.notes.map(n => n.toJSON()), s: this._sorted};
    }

    static fromJSON(json) {
        let group = new KeyboardNoteGroup(json.n.map(noteJN => KeyboardNote.fromJSON(noteJN)));
        group._sorted = json.s;
        return group;
    }

    // TODO add intersection detection algorithm
}

export {KeyboardNoteGroup};