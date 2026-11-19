import { StrumPattern } from '../types';

export const STRUM_PATTERNS: Record<string, StrumPattern> = {
  'folk-rock': {
    id: 'folk-rock',
    name: 'Classic Folk & Pop (D - D U - U D U)',
    timeSignature: '4/4',
    description: 'En popüler akustik gitar ritmi. Bob Dylan, Oasis, Ed Sheeran tarzı doğal akış.',
    defaultBpm: 104,
    beats: [
      { id: 'b0', step: 0, type: 'down', accent: true, velocity: 0.95 },
      { id: 'b1', step: 2, type: 'rest', accent: false, velocity: 0 },
      { id: 'b2', step: 4, type: 'down', accent: false, velocity: 0.8 },
      { id: 'b3', step: 6, type: 'up', accent: false, velocity: 0.65 },
      { id: 'b4', step: 8, type: 'rest', accent: false, velocity: 0 },
      { id: 'b5', step: 10, type: 'up', accent: false, velocity: 0.7 },
      { id: 'b6', step: 12, type: 'down', accent: true, velocity: 0.85 },
      { id: 'b7', step: 14, type: 'up', accent: false, velocity: 0.6 }
    ]
  },
  'fingerpicking-travis': {
    id: 'fingerpicking-travis',
    name: 'Travis Fingerpicking (Arpej)',
    timeSignature: '4/4',
    description: 'Başparmak bas vuruşları ile işaret/orta parmak arpejlerinin birleşimi.',
    defaultBpm: 92,
    beats: [
      { id: 'b0', step: 0, type: 'bass', accent: true, velocity: 0.9 },
      { id: 'b1', step: 2, type: 'treble', accent: false, velocity: 0.65 },
      { id: 'b2', step: 4, type: 'bass', accent: false, velocity: 0.75 },
      { id: 'b3', step: 6, type: 'treble', accent: false, velocity: 0.7 },
      { id: 'b4', step: 8, type: 'bass', accent: true, velocity: 0.85 },
      { id: 'b5', step: 10, type: 'treble', accent: false, velocity: 0.65 },
      { id: 'b6', step: 12, type: 'bass', accent: false, velocity: 0.75 },
      { id: 'b7', step: 14, type: 'treble', accent: false, velocity: 0.7 }
    ]
  },
  'percussive-groove': {
    id: 'percussive-groove',
    name: 'Modern Akustik Perküsif (Chuck / Slap)',
    timeSignature: '4/4',
    description: 'Gövdeye ve tellere avuç içiyle vurarak perküsyon ritmi katan modern stil.',
    defaultBpm: 112,
    beats: [
      { id: 'b0', step: 0, type: 'down', accent: true, velocity: 0.9 },
      { id: 'b1', step: 2, type: 'up', accent: false, velocity: 0.6 },
      { id: 'b2', step: 4, type: 'mute', accent: true, velocity: 1.0 }, // Slap / Chuck
      { id: 'b3', step: 6, type: 'up', accent: false, velocity: 0.65 },
      { id: 'b4', step: 8, type: 'down', accent: false, velocity: 0.75 },
      { id: 'b5', step: 10, type: 'up', accent: false, velocity: 0.65 },
      { id: 'b6', step: 12, type: 'mute', accent: true, velocity: 1.0 }, // Slap / Chuck
      { id: 'b7', step: 14, type: 'up', accent: false, velocity: 0.7 }
    ]
  },
  'ballad-arpeggio': {
    id: 'ballad-arpeggio',
    name: 'Duygusal Slow Ballad (6/8 Hissi)',
    timeSignature: '4/4',
    description: 'Yumuşak tel dokunuşları, romantik ve derin beste yazımı için ideal.',
    defaultBpm: 76,
    beats: [
      { id: 'b0', step: 0, type: 'bass', accent: true, velocity: 0.95 },
      { id: 'b1', step: 2, type: 'treble', accent: false, velocity: 0.55 },
      { id: 'b2', step: 4, type: 'treble', accent: false, velocity: 0.6 },
      { id: 'b3', step: 6, type: 'down', accent: false, velocity: 0.7 },
      { id: 'b4', step: 8, type: 'treble', accent: false, velocity: 0.6 },
      { id: 'b5', step: 10, type: 'treble', accent: false, velocity: 0.55 },
      { id: 'b6', step: 12, type: 'down', accent: true, velocity: 0.8 },
      { id: 'b7', step: 14, type: 'up', accent: false, velocity: 0.6 }
    ]
  },
  'rumba-spanish': {
    id: 'rumba-spanish',
    name: 'Flamenko / Akustik Rumba Riff',
    timeSignature: '4/4',
    description: 'Hızlı parmak süpürmeleri ve enerjik İspanyol/Akdeniz gitar ritmi.',
    defaultBpm: 118,
    beats: [
      { id: 'b0', step: 0, type: 'down', accent: true, velocity: 1.0 },
      { id: 'b1', step: 3, type: 'up', accent: false, velocity: 0.7 },
      { id: 'b2', step: 6, type: 'mute', accent: true, velocity: 0.9 },
      { id: 'b3', step: 8, type: 'down', accent: false, velocity: 0.8 },
      { id: 'b4', step: 11, type: 'up', accent: false, velocity: 0.7 },
      { id: 'b5', step: 14, type: 'mute', accent: true, velocity: 0.9 }
    ]
  }
};
