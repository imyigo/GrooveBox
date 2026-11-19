import { BodyPreset } from '../types';

export const GUITAR_PRESETS: BodyPreset[] = [
  {
    id: 'dreadnought',
    name: 'Martin D-28 Dreadnought',
    description: 'Dolgun baslar, güçlü projeksiyon ve sıcak gövde tınısı. Beste yazımının standardı.',
    bodySize: 'dreadnought',
    brightness: 0.7,
    bodyResonance: 0.85,
    reverbWet: 0.25,
    chorusWet: 0.0,
    strumSpeedMs: 24
  },
  {
    id: 'taylor-parlor',
    name: 'Taylor 814ce Grand Auditorium',
    description: 'Kristal berraklığında tizler, modern parlaklık ve dengeli tel ayrımı.',
    bodySize: 'parlor',
    brightness: 0.9,
    bodyResonance: 0.65,
    reverbWet: 0.35,
    chorusWet: 0.15,
    strumSpeedMs: 20
  },
  {
    id: 'gibson-jumbo',
    name: 'Gibson SJ-200 Jumbo King',
    description: 'Devasa gövde rezonansı, derin alt frekanslar ve dolgun akor hacmi.',
    bodySize: 'jumbo',
    brightness: 0.6,
    bodyResonance: 0.95,
    reverbWet: 0.3,
    chorusWet: 0.05,
    strumSpeedMs: 28
  },
  {
    id: 'twelve-string-shimmer',
    name: '12-String Shimmer Acoustic',
    description: 'Çiftlenmiş oktav telleri, parıltılı koro (chorus) ve geniş stereo akustik alan.',
    bodySize: 'twelve-string',
    brightness: 0.95,
    bodyResonance: 0.75,
    reverbWet: 0.45,
    chorusWet: 0.4,
    strumSpeedMs: 32
  }
];
