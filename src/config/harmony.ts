import { GUITAR_CHORDS, CHROMATIC_NOTES, noteSemitone } from "./chords";
import { getDiatonicChords, MUSICAL_SCALES } from "./scales";
import { SongSection } from "../types";

export function mapMidiToKey(
  midi: number,
  oldRoot: string,
  oldScaleId: string,
  newRoot: string,
  newScaleId: string,
): number {
  const oldScale = MUSICAL_SCALES[oldScaleId].intervals;
  const newScale = MUSICAL_SCALES[newScaleId].intervals;
  const relative = midi - noteSemitone(oldRoot);
  const octave = Math.floor(relative / 12);
  const pitch = ((relative % 12) + 12) % 12;
  let degree = 0;
  let distance = Infinity;
  oldScale.forEach((n, i) => {
    if (Math.abs(n - pitch) < distance) {
      degree = i;
      distance = Math.abs(n - pitch);
    }
  });
  return Math.max(
    0,
    Math.min(
      127,
      octave * 12 +
        noteSemitone(newRoot) +
        newScale[Math.min(degree, newScale.length - 1)],
    ),
  );
}

export function changeSongKey(
  sections: SongSection[],
  oldRoot: string,
  oldScaleId: string,
  newRoot: string,
  newScaleId: string,
): SongSection[] {
  const oldDegrees = getDiatonicChords(oldRoot, oldScaleId);
  const newDegrees = getDiatonicChords(newRoot, newScaleId);
  return sections.map((section) => ({
    ...section,
    chords: section.chords.map((id) => {
      const chord = GUITAR_CHORDS[id];
      const pitch = noteSemitone(chord.root);
      let degree = oldDegrees.findIndex(
        (d) => noteSemitone(GUITAR_CHORDS[d.chordId].root) === pitch,
      );
      if (degree < 0) {
        const nearest =
          mapMidiToKey(60 + pitch, oldRoot, oldScaleId, oldRoot, oldScaleId) %
          12;
        degree = oldDegrees.findIndex(
          (d) => noteSemitone(GUITAR_CHORDS[d.chordId].root) === nearest,
        );
      }
      return newDegrees[Math.max(0, degree)].chordId;
    }),
  }));
}

export function canonicalRoot(root: number): string {
  return CHROMATIC_NOTES[((root % 12) + 12) % 12];
}
