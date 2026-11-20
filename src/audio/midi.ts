export type MidiAction =
  | { type: "on" | "off"; note: number; velocity: number }
  | { type: "panic" }
  | { type: "sustain"; down: boolean };
export function parseMidi(data: ArrayLike<number>): MidiAction | null {
  if (data.length < 3) return null;
  const status = data[0] & 0xf0,
    note = data[1],
    velocity = data[2];
  if (
    !Number.isInteger(note) ||
    note < 0 ||
    note > 127 ||
    !Number.isInteger(velocity) ||
    velocity < 0 ||
    velocity > 127
  )
    return null;
  if (status === 0x90)
    return { type: velocity ? "on" : "off", note, velocity: velocity / 127 };
  if (status === 0x80) return { type: "off", note, velocity: 0 };
  if (status === 0xb0 && note === 64)
    return { type: "sustain", down: velocity >= 64 };
  if (status === 0xb0 && (note === 120 || note === 123))
    return { type: "panic" };
  return null;
}
