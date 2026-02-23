/**
 * Shared sound utilities for kitchen and delivery alerts.
 * Generates WAV beeps programmatically — no external audio files required.
 */

// ── WAV generation ────────────────────────────────────────────────────────────

function generateBeepWav(frequency: number, durationSec: number): string {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationSec);

  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  // RIFF header
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');

  // fmt chunk
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);  // PCM
  view.setUint16(22, 1, true);  // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  // data chunk
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Square wave — louder and more piercing than sine
    const sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 0.9 : -0.9;
    // Fade out last 20%
    const fade = i > numSamples * 0.8 ? (numSamples - i) / (numSamples * 0.2) : 1;
    view.setInt16(44 + i * 2, Math.floor(sample * fade * 32767), true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(binary);
}

// ── URL cache ─────────────────────────────────────────────────────────────────

let kitchenUrl: string | null = null;
let deliveryUrl: string | null = null;

export function getBeepUrl(type: 'kitchen' | 'delivery'): string {
  if (type === 'kitchen') {
    if (!kitchenUrl) kitchenUrl = generateBeepWav(1200, 0.15); // aigu — 3 bips
    return kitchenUrl;
  }
  if (!deliveryUrl) deliveryUrl = generateBeepWav(800, 0.2); // grave — 2 bips
  return deliveryUrl;
}

// ── Playback ──────────────────────────────────────────────────────────────────

export async function playAlarm(type: 'kitchen' | 'delivery'): Promise<void> {
  try {
    const url = getBeepUrl(type);
    const count = type === 'kitchen' ? 3 : 2; // 3 bips cuisine, 2 bips livraison
    for (let i = 0; i < count; i++) {
      const audio = new Audio(url);
      audio.volume = 1.0;
      await audio.play();
      await new Promise<void>((r) => setTimeout(r, 250));
    }
  } catch (err) {
    console.warn(`[sound] Audio play failed (${type}):`, err);
  }
}

// ── Mobile audio unlock ───────────────────────────────────────────────────────
// iOS/Android require a user gesture before audio can play.
// Call this once at app startup to register listeners.

export function initAudioUnlock(): void {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    try {
      // Attempt a silent play to prime the audio context
      const a = new Audio(getBeepUrl('kitchen'));
      a.volume = 0.01;
      a.play().then(() => a.pause()).catch(() => {});
    } catch { /* ignore */ }
    document.removeEventListener('click', unlock);
    document.removeEventListener('touchstart', unlock);
  };
  document.addEventListener('click', unlock, { passive: true });
  document.addEventListener('touchstart', unlock, { passive: true });
}
