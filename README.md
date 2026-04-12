<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c55a05e7-31ba-44fc-89d3-48f0dfdfab8b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` in `.env.local` to your Gemini API key
   The app still supports the legacy `API_KEY` alias internally, but `GEMINI_API_KEY` is the canonical name.
3. Run the app:
   `npm run dev`

## Deployment Security Note

- Do not pass `GEMINI_API_KEY` as a Docker build argument or Dockerfile `ENV`.
- Build-time injection bakes secrets into image layers/history.
- Keep production secrets in Secret Manager and only inject them at runtime via a backend/proxy service.
