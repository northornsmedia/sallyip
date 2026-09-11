"""
verify-input-dependence.py

Runs real inference through the trained 36.28M parameter Wav2Lip ONNX model
to numerically and visually prove speech-input dependence.

Compares:
A: Silence
B: Speech input ("Patent")
C: Speech input ("Freedom to operate")
"""

import os
import numpy as np
from PIL import Image
import onnxruntime as ort

def create_mel_spectrogram(duration_sec=0.2, freq_peaks=[300, 2500], volume=1.0):
    """
    Synthesize an 80-band log-Mel spectrogram matching [1, 1, 80, 16] shape.
    """
    n_mels = 80
    time_steps = 16
    mel = np.full((1, 1, n_mels, time_steps), -11.5129, dtype=np.float32) # silence baseline log(1e-5)

    if volume > 0:
        for f in freq_peaks:
            # Approximate mel bin index: 80 * (log10(1 + f/700) / log10(1 + 7600/700))
            mel_bin = int(80.0 * (np.log10(1.0 + f / 700.0) / np.log10(1.0 + 7600.0 / 700.0)))
            mel_bin = max(0, min(n_mels - 1, mel_bin))
            for b in range(max(0, mel_bin - 3), min(n_mels, mel_bin + 4)):
                weight = np.exp(-0.5 * ((b - mel_bin) / 1.5) ** 2)
                for t in range(time_steps):
                    temporal_mod = 0.7 + 0.3 * np.sin(t * 0.8)
                    mel[0, 0, b, t] = max(mel[0, 0, b, t], float(-2.0 + 4.0 * weight * temporal_mod * volume))

    return mel

def run_test():
    model_path = 'public/models/sally/wav2lip.onnx'
    session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])

    # 1. Prepare Sally 96x96 reference face from avatar image
    avatar_path = 'public/images/sally_human_avatar.jpg'
    img = Image.open(avatar_path).convert('RGB')
    
    # Sally's face is centered in 512x512; crop 96x96 around mouth/jaw
    # Center mouth is (256, 352) -> crop bounds [208, 304, 304, 400]
    face_crop = img.crop((208, 304, 304, 400)).resize((96, 96), Image.Resampling.LANCZOS)
    face_np = np.array(face_crop, dtype=np.float32) / 255.0 # [96, 96, 3] in [0, 1]
    
    # Transpose to [3, 96, 96]
    face_chw = np.transpose(face_np, (2, 0, 1))

    # Mask lower half (y from 48 to 96)
    masked_chw = face_chw.copy()
    masked_chw[:, 48:, :] = 0.0

    # Build 6-channel input: [1, 6, 96, 96]
    vid_tensor = np.concatenate([face_chw, masked_chw], axis=0)
    vid_tensor = np.expand_dims(vid_tensor, axis=0).astype(np.float32)

    # 2. Synthesize audio Mel inputs:
    # A: Silence
    mel_silence = create_mel_spectrogram(volume=0.0)
    # B: "Patent" (Open vowel 'a' ~ 800Hz / 1800Hz)
    mel_patent = create_mel_spectrogram(freq_peaks=[800, 1800], volume=1.0)
    # C: "Freedom to operate" (Dynamic sibilants and vowels ~ 400Hz, 1200Hz, 3200Hz)
    mel_fto = create_mel_spectrogram(freq_peaks=[400, 1200, 3200], volume=1.0)

    # 3. Run model inference for each
    out_silence = session.run(['gen'], {'mel': mel_silence, 'vid': vid_tensor})[0] # [1, 3, 96, 96]
    out_patent = session.run(['gen'], {'mel': mel_patent, 'vid': vid_tensor})[0]
    out_fto = session.run(['gen'], {'mel': mel_fto, 'vid': vid_tensor})[0]

    # Convert to 8-bit RGB [0..255]
    img_silence = np.clip(out_silence[0] * 255.0, 0, 255).astype(np.uint8)
    img_patent = np.clip(out_patent[0] * 255.0, 0, 255).astype(np.uint8)
    img_fto = np.clip(out_fto[0] * 255.0, 0, 255).astype(np.uint8)

    # Save images
    os.makedirs('scratch', exist_ok=True)
    Image.fromarray(np.transpose(img_silence, (1, 2, 0))).save('scratch/output_silence.png')
    Image.fromarray(np.transpose(img_patent, (1, 2, 0))).save('scratch/output_patent.png')
    Image.fromarray(np.transpose(img_fto, (1, 2, 0))).save('scratch/output_fto.png')

    # 4. Compute Mean Absolute Pixel Difference (MAPD) in 0-255 range and L1 latent diff
    diff_silence_patent = np.mean(np.abs(img_silence.astype(float) - img_patent.astype(float)))
    diff_silence_fto = np.mean(np.abs(img_silence.astype(float) - img_fto.astype(float)))
    diff_patent_fto = np.mean(np.abs(img_patent.astype(float) - img_fto.astype(float)))

    # Compute lower-face region specific difference (y from 48 to 96) where mouth moves
    mouth_diff_silence_patent = np.mean(np.abs(img_silence[:, 48:, :].astype(float) - img_patent[:, 48:, :].astype(float)))
    mouth_diff_silence_fto = np.mean(np.abs(img_silence[:, 48:, :].astype(float) - img_fto[:, 48:, :].astype(float)))
    mouth_diff_patent_fto = np.mean(np.abs(img_patent[:, 48:, :].astype(float) - img_fto[:, 48:, :].astype(float)))

    print("=" * 60)
    print("SPEECH-INPUT DEPENDENCE VALIDATION RESULTS")
    print("=" * 60)
    print(f"Output Shape:                          {out_silence.shape}")
    print(f"Output Dynamic Range:                  [{out_silence.min():.4f}, {out_silence.max():.4f}]")
    print("\n--- Full Patch Mean Absolute Pixel Difference (0-255 scale) ---")
    print(f"Silence vs. 'Patent':                  {diff_silence_patent:.2f} pixels")
    print(f"Silence vs. 'Freedom to operate':      {diff_silence_fto:.2f} pixels")
    print(f"'Patent' vs. 'Freedom to operate':     {diff_patent_fto:.2f} pixels")
    print("\n--- Lower-Face (Mouth Region) Mean Absolute Pixel Difference ---")
    print(f"Silence vs. 'Patent' (Mouth):          {mouth_diff_silence_patent:.2f} pixels")
    print(f"Silence vs. 'Freedom to operate' (Mouth): {mouth_diff_silence_fto:.2f} pixels")
    print(f"'Patent' vs. 'Freedom to operate' (Mouth): {mouth_diff_patent_fto:.2f} pixels")
    print("=" * 60)
    print("Saved visual verification frames to:")
    print("  scratch/output_silence.png")
    print("  scratch/output_patent.png")
    print("  scratch/output_fto.png")

if __name__ == '__main__':
    run_test()
