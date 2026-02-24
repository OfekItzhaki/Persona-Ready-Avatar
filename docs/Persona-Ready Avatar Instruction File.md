# Project B: Persona-Ready Avatar (Voice + UI)

## 1. Core Concept
A "Body" for the AI. It fetches the text from Project A and handles the visual/auditory delivery.

## 2. Customizable Visuals
- **Avatar Selection:** UI allows switching between different avatars (e.g., Male Doctor, Female Professor) via Ready Player Me URLs or GLB files.
- **Dynamic TTS:** Uses the language returned by the Brain to select the correct Azure Neural voice.

## 3. Tech Stack
- Framework: Next.js + Tailwind CSS.
- 3D Engine: react-three-fiber / Three.js.
- Voice/Lip-Sync: Azure Speech SDK (for Audio + Visemes).

## 4. UI Features
- **Persona Switcher:** A dropdown to select which 'Agent' to talk to (fetched from Project A).
- **Transcript:** Real-time text display.
- **Visual Sync:** High-fidelity mouth movement driven by Azure Viseme IDs.

## 5. Connection Logic
- Fetch available agents from `Project A /api/agents`.
- On Submit: Call `Project A /api/chat`, receive text, then trigger local TTS.
