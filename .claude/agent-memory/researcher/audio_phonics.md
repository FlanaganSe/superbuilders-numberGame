---
name: audio_phonics
description: Audio strategy for phonics/spelling game: TTS vs pre-recorded findings, Web Speech API iOS bugs, Howler sprite architecture, multimodal learning evidence
type: project
---

Pre-recorded human voice is the correct choice for phonics audio (ages 5-8). Web Speech API is ruled out for iPad Safari.

**Key facts**:
- Web Speech API on iOS Safari has production-blocking bugs: soft mute silences TTS but not Howler/WebAudio; SpeechSynthesis stops mid-speech when Safari is backgrounded; GC hazard on SpeechSynthesisUtterance objects; unreliable voice selection (55 reported, 36 usable).
- No TTS system (browser or cloud) can produce phoneme-pure isolated consonants (/b/ not /buh/). This is the fundamental phonics precision requirement from Letters and Sounds (UK DfE 2007).
- All leading phonics apps (Teach Your Monster to Read, Homer, Phonics Hero) use pre-recorded human voice for phonemes.
- Howler.js sprite is the right architecture for ~60 phonics clips (20 phonemes + 28 target words + ~10 phrases). sound-manager.ts comment at line 27-30 explicitly anticipates migration to sprite.
- Mayer temporal contiguity: letter phoneme must play within ~500ms of camera detecting a correct tile placement.
- For pre-readers (5-6 year olds), audio is the primary encoding channel — visual text is secondary. "Your word is CAT" at round start is a prerequisite, not a polish concern.
- Target word corpus is fixed and small: 20 distinct letters, 28 words (src/engine/spelling-words.ts). Recording scope is ~1-2 hours.

**Why:** Dual coding theory + Mayer multimedia learning theory both predict that simultaneous visual+auditory encoding produces better retention than either alone. For emergent readers who cannot decode text, audio is the only channel that makes the target legible.

**How to apply:** When planning audio for spelling game, always start from pre-recorded sprite approach. Don't revisit Web Speech API on iOS unless Apple fixes the backgrounding and soft-mute bugs. Neural cloud TTS (ElevenLabs etc.) is acceptable for instruction phrases only, not for isolated phonemes.
