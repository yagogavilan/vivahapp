"""
Gera os sons da respiração guiada (sem direitos autorais de terceiros):
inspire (tom que sobe), solte (tom que desce), segure (sino suave), fim (acorde)
e mar (ruído marrom com ondas lentas, em loop). Uso: python3 scripts/generate-sounds.py
"""
import wave
from pathlib import Path

import numpy as np

SR = 22050
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'sounds'
OUT.mkdir(parents=True, exist_ok=True)


def save(name, x, gain=0.5):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    data = (x * 32767).astype(np.int16)
    with wave.open(str(OUT / name), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def envelope(n, attack=0.15, release=0.35):
    t = np.linspace(0, 1, n)
    a = np.clip(t / attack, 0, 1)
    r = np.clip((1 - t) / release, 0, 1)
    return np.sin(a * np.pi / 2) * np.sin(r * np.pi / 2)


def glide(f0, f1, seconds):
    n = int(SR * seconds)
    f = np.geomspace(f0, f1, n)
    phase = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(phase) + 0.25 * np.sin(2 * phase) + 0.08 * np.sin(3 * phase)
    return tone * envelope(n)


def bell(freqs, seconds, decay):
    n = int(SR * seconds)
    t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * t) * (0.6 ** k) for k, f in enumerate(freqs))
    x += 0.15 * np.sin(2 * np.pi * freqs[0] * 2.76 * t) * np.exp(-t * decay * 3)
    return x * np.exp(-t * decay) * np.clip(t / 0.01, 0, 1)


save('inspire.wav', glide(196, 294, 0.9), 0.35)
save('solte.wav', glide(294, 196, 1.1), 0.35)
save('segure.wav', bell([392], 1.4, 3.2), 0.3)
fim = bell([523.25], 2.4, 1.6)
off = int(SR * 0.25)
second = bell([659.25], 2.4, 1.6)[: len(fim) - off]
fim[off:off + len(second)] += second
save('fim.wav', fim, 0.4)

# Mar: ruído marrom (passa-baixa) com ondas de ~9 s; as pontas se cruzam para o loop não "pular".
rng = np.random.default_rng(7)
secs = 24
n = SR * secs
brown = np.cumsum(rng.normal(0, 1, n + SR))
brown -= np.convolve(brown, np.ones(2000) / 2000, mode='same')
t = np.arange(n + SR) / SR
waves = 0.35 + 0.65 * (0.5 - 0.5 * np.cos(2 * np.pi * t / 8))
x = brown * waves
fade = SR
x[:fade] = x[:fade] * np.linspace(0, 1, fade) + x[n:n + fade] * np.linspace(1, 0, fade)
save('mar.wav', x[:n], 0.25)
print('sons em', OUT)
