#!/bin/zsh
set -euo pipefail

ROOT="/Users/earthondev/Desktop/OpenClaw-bot-review"
OUT_DIR="$ROOT/public/assets/pixel-office"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$OUT_DIR"

python3 - "$TMP_DIR" <<'PY'
from __future__ import annotations

import math
import os
import random
import sys
import wave
from array import array

TMP_DIR = sys.argv[1]
SR = 44_100


def midi_freq(midi: int) -> float:
    return 440.0 * (2.0 ** ((midi - 69) / 12.0))


def oscillator(kind: str, phase: float) -> float:
    p = (phase / (2.0 * math.pi)) % 1.0
    if kind == "sine":
        return math.sin(phase)
    if kind == "triangle":
        return 1.0 - 4.0 * abs(p - 0.5)
    if kind == "saw":
        return 2.0 * p - 1.0
    if kind == "square":
        return 1.0 if p < 0.5 else -1.0
    if kind == "organ":
        return (
            0.60 * math.sin(phase)
            + 0.25 * math.sin(phase * 2.0)
            + 0.10 * math.sin(phase * 3.0)
            + 0.05 * math.sin(phase * 4.0)
        )
    if kind == "horn":
        return 0.65 * (2.0 * p - 1.0) + 0.35 * (1.0 - 4.0 * abs(p - 0.5))
    if kind == "bell":
        return (
            0.55 * math.sin(phase)
            + 0.25 * math.sin(phase * 2.01)
            + 0.12 * math.sin(phase * 3.97)
            + 0.08 * math.sin(phase * 5.43)
        )
    return math.sin(phase)


def env(t: float, dur: float, attack: float, decay: float, sustain: float, release: float) -> float:
    attack = max(0.002, min(attack, dur * 0.25))
    decay = max(0.005, min(decay, dur * 0.35))
    release = max(0.01, min(release, dur * 0.45))
    sustain_len = max(0.0, dur - attack - decay - release)
    if t < 0.0 or t >= dur:
        return 0.0
    if t < attack:
        return t / attack
    t -= attack
    if t < decay:
        return 1.0 - (1.0 - sustain) * (t / decay)
    t -= decay
    if t < sustain_len:
        return sustain
    t -= sustain_len
    return sustain * max(0.0, 1.0 - (t / release))


def make_buffers(duration: float) -> tuple[array, array]:
    total = int(duration * SR)
    return array("f", [0.0]) * total, array("f", [0.0]) * total


def add_note(
    left: array,
    right: array,
    start: float,
    dur: float,
    midi: int,
    vol: float,
    kind: str = "sine",
    pan: float = 0.0,
    vibrato_hz: float = 0.0,
    vibrato_depth: float = 0.0,
    tremolo_hz: float = 0.0,
):
    start_idx = max(0, int(start * SR))
    end_idx = min(len(left), int((start + dur) * SR))
    freq = midi_freq(midi)
    phase = 0.0
    pan_left = 0.5 - pan * 0.32
    pan_right = 0.5 + pan * 0.32
    for idx in range(start_idx, end_idx):
        t = (idx - start_idx) / SR
        vib = 1.0 + vibrato_depth * math.sin(2.0 * math.pi * vibrato_hz * t) if vibrato_hz else 1.0
        phase += 2.0 * math.pi * (freq * vib) / SR
        amplitude = env(
            t,
            dur,
            attack=0.015 if kind != "bell" else 0.003,
            decay=0.18 if kind in {"organ", "horn"} else 0.10,
            sustain=0.72 if kind in {"organ", "horn"} else 0.48,
            release=0.24 if kind in {"organ", "horn"} else 0.16,
        )
        trem = 0.92 + 0.08 * math.sin(2.0 * math.pi * tremolo_hz * t) if tremolo_hz else 1.0
        sample = oscillator(kind, phase) * vol * amplitude * trem
        left[idx] += sample * pan_left
        right[idx] += sample * pan_right


def add_chord(
    left: array,
    right: array,
    start: float,
    dur: float,
    root_midi: int,
    intervals: list[int],
    vol: float,
    kind: str,
    spread: float = 0.55,
):
    pans = [-spread, -spread / 2.0, spread / 2.0, spread]
    for i, interval in enumerate(intervals):
        note = root_midi + interval
        pan = pans[min(i, len(pans) - 1)]
        add_note(left, right, start, dur, note, vol, kind=kind, pan=pan, vibrato_hz=4.0, vibrato_depth=0.0015)


def add_rain(left: array, right: array, vol: float, seed: int):
    rng = random.Random(seed)
    slow_l = 0.0
    slow_r = 0.0
    for idx in range(len(left)):
        w_l = rng.uniform(-1.0, 1.0)
        w_r = rng.uniform(-1.0, 1.0)
        slow_l = slow_l * 0.988 + w_l * 0.012
        slow_r = slow_r * 0.988 + w_r * 0.012
        hiss_l = (w_l - slow_l) * vol
        hiss_r = (w_r - slow_r) * vol
        left[idx] += hiss_l
        right[idx] += hiss_r


def add_brush_hit(left: array, right: array, start: float, dur: float, vol: float, seed: int, pan: float = 0.0):
    rng = random.Random(seed)
    start_idx = max(0, int(start * SR))
    end_idx = min(len(left), int((start + dur) * SR))
    last = 0.0
    pan_left = 0.5 - pan * 0.30
    pan_right = 0.5 + pan * 0.30
    for idx in range(start_idx, end_idx):
        t = (idx - start_idx) / SR
        amp = env(t, dur, 0.002, 0.03, 0.30, min(0.12, dur * 0.4))
        white = rng.uniform(-1.0, 1.0)
        last = last * 0.72 + white * 0.28
        sample = (white - last) * vol * amp
        left[idx] += sample * pan_left
        right[idx] += sample * pan_right


def write_wav(path: str, left: array, right: array):
    with wave.open(path, "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SR)
        frames = bytearray()
        for l_sample, r_sample in zip(left, right):
            l = max(-1.0, min(1.0, l_sample))
            r = max(-1.0, min(1.0, r_sample))
            frames.extend(int(l * 32767.0).to_bytes(2, "little", signed=True))
            frames.extend(int(r * 32767.0).to_bytes(2, "little", signed=True))
        wav.writeframes(frames)


def build_night_watch() -> str:
    tempo = 68.0
    beat = 60.0 / tempo
    duration = beat * 64
    left, right = make_buffers(duration)
    add_rain(left, right, 0.010, seed=19039)

    progression = [
        (50, [0, 3, 7], 38, [38, 45, 41, 36]),
        (46, [0, 4, 7], 34, [34, 41, 38, 33]),
        (43, [0, 3, 7], 31, [31, 38, 34, 29]),
        (45, [0, 4, 7, 10], 33, [33, 40, 37, 32]),
    ]

    for bar in range(16):
        start = bar * beat * 4
        root, chord, bass_root, walk = progression[bar % len(progression)]
        add_chord(left, right, start, beat * 3.9, root, chord, 0.058, "organ")
        add_note(left, right, start, beat * 1.3, bass_root, 0.16, kind="triangle", pan=-0.15)
        add_note(left, right, start + beat * 1.5, beat * 0.9, walk[1], 0.105, kind="triangle", pan=-0.05)
        add_note(left, right, start + beat * 2.4, beat * 0.8, walk[2], 0.095, kind="triangle", pan=0.0)
        add_note(left, right, start + beat * 3.2, beat * 0.7, walk[3], 0.085, kind="triangle", pan=0.08)

        add_brush_hit(left, right, start + beat * 1.0, 0.14, 0.020, seed=bar * 31 + 5, pan=-0.1)
        add_brush_hit(left, right, start + beat * 3.0, 0.16, 0.024, seed=bar * 31 + 11, pan=0.1)

    lead_phrases = [
        (2, [69, 72, 74]),
        (6, [67, 69, 72]),
        (10, [69, 72, 76]),
        (14, [67, 69, 71]),
    ]
    for bar, notes in lead_phrases:
        start = bar * beat * 4 + beat * 1.1
        for idx, note in enumerate(notes):
            add_note(
                left,
                right,
                start + idx * beat * 0.75,
                beat * 0.95,
                note,
                0.070,
                kind="horn",
                pan=0.16,
                vibrato_hz=5.5,
                vibrato_depth=0.0025,
            )

    path = os.path.join(TMP_DIR, "batcave-night-watch.wav")
    write_wav(path, left, right)
    return path


def build_terminal_pulse() -> str:
    tempo = 82.0
    beat = 60.0 / tempo
    duration = beat * 72
    left, right = make_buffers(duration)
    add_rain(left, right, 0.007, seed=8742)

    progression = [
        (52, [0, 3, 7], 40, [40, 47, 43, 38]),
        (48, [0, 3, 7], 36, [36, 43, 40, 35]),
        (50, [0, 4, 7], 38, [38, 45, 42, 37]),
        (47, [0, 3, 7], 35, [35, 42, 38, 33]),
    ]

    for bar in range(18):
        start = bar * beat * 4
        root, chord, bass_root, pulse_notes = progression[bar % len(progression)]
        add_chord(left, right, start, beat * 3.8, root, chord, 0.044, "organ", spread=0.62)
        for step, note in enumerate(pulse_notes):
            add_note(
                left,
                right,
                start + step * beat,
                beat * 0.7,
                note,
                0.115 if step == 0 else 0.090,
                kind="triangle",
                pan=-0.10 + step * 0.04,
                tremolo_hz=2.6,
            )
        add_brush_hit(left, right, start + beat * 1.5, 0.11, 0.015, seed=bar * 17 + 2, pan=0.15)
        add_brush_hit(left, right, start + beat * 3.5, 0.13, 0.019, seed=bar * 17 + 7, pan=-0.15)

    motif = [76, 79, 83, 81]
    for section in range(0, 18, 3):
        start = section * beat * 4 + beat * 0.5
        for idx, note in enumerate(motif):
            add_note(
                left,
                right,
                start + idx * beat * 0.9,
                beat * 0.55,
                note,
                0.052,
                kind="bell",
                pan=0.20,
                vibrato_hz=4.0,
                vibrato_depth=0.0010,
            )

    path = os.path.join(TMP_DIR, "batcave-terminal-pulse.wav")
    write_wav(path, left, right)
    return path


print(build_night_watch())
print(build_terminal_pulse())
PY

ffmpeg -y -i "$TMP_DIR/batcave-night-watch.wav" \
  -af "aecho=0.86:0.70:180|520:0.24|0.12,highpass=f=38,lowpass=f=2600,volume=0.82" \
  -q:a 3 \
  "$OUT_DIR/batcave-night-watch.mp3" >/dev/null 2>&1

ffmpeg -y -i "$TMP_DIR/batcave-terminal-pulse.wav" \
  -af "aecho=0.88:0.72:140|460:0.20|0.10,highpass=f=42,lowpass=f=3200,volume=0.84" \
  -q:a 3 \
  "$OUT_DIR/batcave-terminal-pulse.mp3" >/dev/null 2>&1

echo "Generated noir Batcave playlist:"
echo "  $OUT_DIR/batcave-night-watch.mp3"
echo "  $OUT_DIR/batcave-terminal-pulse.mp3"
