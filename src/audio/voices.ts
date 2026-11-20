const voices = new Set<AudioScheduledSourceNode>();

export function trackVoice<T extends AudioScheduledSourceNode>(source: T): T {
  voices.add(source);
  source.addEventListener(
    "ended",
    () => {
      voices.delete(source);
      source.disconnect();
    },
    { once: true },
  );
  return source;
}

export function stopAllVoices(): void {
  for (const source of voices) {
    try {
      source.stop();
    } catch {
      /* already ended */
    }
  }
  voices.clear();
}
