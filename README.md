# Study Buddy

A study companion that runs AI **on your own device when it can and falls back to the cloud when it can't**, built for #BuildHybridAI 2026 with **Firebase AI Logic hybrid inference**.

## The problem
Students in places with slow or unreliable internet, like Nepal, still need help understanding their notes. Cloud-only AI fails the moment the connection drops, and it sends their private notes to a server.

## What it does
- **Explain or summarize** any question or notes, using an AI buddy.
- **Short questions run on-device** (fast, free, private, works offline).
- **Long notes go to the cloud** for more power.
- **Offline fallback:** if the cloud is unreachable, long notes are split into chunks and summarized on-device, with an honest label saying the summary may miss details.
- **Mood themes** (Calm, Energetic, Stressed) change the colors, the animal face and the tone of the AI's answers.
- **Focus timer** that pauses when the student leaves the page, with **animal badges** earned for staying focused.
- Every answer shows whether it came from the device (🏠) or the cloud (☁️).

## How it uses Firebase AI Logic
`app.js` initializes Firebase AI Logic with the Gemini Developer API and calls `getGenerativeModel` with hybrid inference modes:
- `InferenceMode.PREFER_ON_DEVICE` for short input (falls back to the cloud automatically)
- `InferenceMode.ONLY_IN_CLOUD` for long input
- `InferenceMode.ONLY_ON_DEVICE` for the chunked offline summary

The response's `inferenceSource` tells the app which path answered. App Check (debug provider) protects the AI backend.

## Platform
Web, Chrome on desktop (on-device inference uses Chrome's built-in model).

## Run it yourself
1. Create a Firebase project on the free Spark plan, add a web app, and enable **AI Logic** with the **Gemini Developer API**.
2. Replace `firebaseConfig` in `app.js` with your own.
3. Serve the folder locally (for example the VS Code **Live Server** extension, or `python -m http.server 8000`) and open it in Chrome.
4. Open the browser console, copy the `AppCheck debug token`, and add it in Firebase console under **App Check > Apps > Manage debug tokens**.

## License
Apache 2.0