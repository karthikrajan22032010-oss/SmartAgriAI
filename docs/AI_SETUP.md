# AI Service Setup Guide

## Google Gemini (Recommended — Free Tier Available)

1. Go to: https://aistudio.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key

Edit `backend/.env`:
```
AI_API_KEY=your_gemini_api_key_here
AI_MODEL=gemini-1.5-flash
```

## Without an API Key

The system uses **rule-based recommendations** when no API key is set.
Rule-based recommendations work for all 3 languages (EN/TA/HI) and cover:
- Soil moisture analysis
- Irrigation decisions
- Water level warnings
- Temperature alerts

## AI Features

- Recommendations in **English, Tamil, Hindi**
- Language follows the UI language selector
- AI key is **never exposed to the browser**
- All AI calls go through the backend `/api/ai/recommendation`

## API Security

The AI API key is stored in `backend/.env` and only used server-side.
The frontend never has access to this key.

## Cost Estimate (Gemini)

- `gemini-1.5-flash` is free up to 1500 requests/day (as of 2024)
- Each dashboard recommendation = 1 request
- At 1 recommendation per 5 minutes = 288 requests/day — well within free tier
