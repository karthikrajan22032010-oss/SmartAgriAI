// ============================================================
// AI SERVICE — Google Gemini AI farming recommendations
// API key is NEVER exposed to the frontend.
// Falls back to rule-based logic when no API key is configured.
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { AIRecommendationRequest, AIRecommendationResponse } from '../types';
import {
  classifySoil,
  classifyTemperature,
  classifyHumidity,
  classifyWaterLevel,
} from './irrigationService';
import { logger } from '../utils/logger';

let genAI: GoogleGenerativeAI | null = null;
let aiAvailable = false;

// Initialize Gemini client
if (config.aiApiKey && config.aiApiKey !== 'YOUR_GEMINI_API_KEY') {
  genAI = new GoogleGenerativeAI(config.aiApiKey);
  aiAvailable = true;
  logger.info('✅ Gemini AI initialized');
} else {
  logger.warn('⚠️  No AI API key configured — using rule-based recommendations');
}

/**
 * Build a language-specific system prompt for Gemini.
 */
function buildPrompt(req: AIRecommendationRequest): string {
  const lang =
    req.language === 'ta' ? 'Tamil'
    : req.language === 'hi' ? 'Hindi'
    : 'English';

  return `You are an expert AI smart agriculture assistant. Analyze the following real-time sensor data from a smart farm and provide actionable farming recommendations.

SENSOR DATA:
- Soil Moisture Sensor 1: ${req.soil1 ?? 'N/A'}%
- Soil Moisture Sensor 2: ${req.soil2 ?? 'N/A'}%
- Average Soil Moisture: ${req.soilAverage}%
- Temperature: ${req.temperature}°C
- Humidity: ${req.humidity}%
- Water Level: ${req.waterLevel}%
- Light Level (ADC): ${req.light}

THRESHOLDS:
- Soil: DRY < 30% | MODERATE 30-60% | GOOD > 60%
- Temperature: NORMAL < 30°C | WARNING 30-35°C | HIGH > 35°C
- Humidity: LOW < 40% | NORMAL 40-70% | HIGH > 70%
- Water: CRITICAL < 10% | LOW < 20% | SAFE >= 20%

IMPORTANT: Respond ONLY in ${lang} language (except for the JSON field names which must remain in English).
IMPORTANT: Return ONLY valid JSON with exactly this structure, no extra text:

{
  "soilStatus": "VERY_DRY | MODERATE | WET | UNKNOWN",
  "irrigation": "START | STOP | MAINTAIN",
  "urgency": "LOW | MEDIUM | HIGH | CRITICAL",
  "recommendation": "Main recommendation text in ${lang}",
  "reason": "Explanation in ${lang}",
  "actions": ["Action 1 in ${lang}", "Action 2 in ${lang}", "Action 3 in ${lang}"],
  "temperatureStatus": "NORMAL | WARNING | HIGH | UNKNOWN",
  "humidityStatus": "LOW | NORMAL | HIGH | UNKNOWN",
  "waterStatus": "SAFE | LOW | CRITICAL | UNKNOWN"
}`;
}

/**
 * Rule-based fallback recommendation when AI is unavailable.
 */
function getRuleBasedRecommendation(req: AIRecommendationRequest): AIRecommendationResponse {
  const soilStatus = classifySoil(req.soilAverage);
  const tempStatus = classifyTemperature(req.temperature);
  const humStatus = classifyHumidity(req.humidity);
  const waterStatus = classifyWaterLevel(req.waterLevel);

  const lang = req.language || 'en';

  // Determine irrigation action
  let irrigation: 'START' | 'STOP' | 'MAINTAIN' = 'MAINTAIN';
  let urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

  if (req.waterLevel < 20) {
    irrigation = 'STOP';
    urgency = 'CRITICAL';
  } else if (req.soilAverage < 30) {
    irrigation = 'START';
    urgency = req.soilAverage < 20 ? 'CRITICAL' : 'HIGH';
  } else if (req.soilAverage >= 60) {
    irrigation = 'STOP';
    urgency = 'LOW';
  }

  if (req.temperature > 35) urgency = urgency === 'LOW' ? 'HIGH' : urgency;

  // Localized messages
  const messages: Record<string, Record<string, string>> = {
    en: {
      dryRec: 'Irrigation is recommended. Soil moisture is critically low.',
      normalRec: 'Soil moisture is adequate. Monitor conditions regularly.',
      wetRec: 'Soil is sufficiently moist. Pause irrigation.',
      waterWarn: 'Water level is low. Refill the tank before irrigation.',
      tempWarn: 'High temperature detected. Ensure crops have adequate water.',
      dryAction1: 'Start irrigation immediately',
      dryAction2: 'Monitor soil moisture closely',
      dryAction3: 'Check water tank level',
      normalAction1: 'Maintain current conditions',
      normalAction2: 'Monitor soil and weather',
      normalAction3: 'Schedule next irrigation check',
    },
    ta: {
      dryRec: 'நீர்ப்பாசனம் பரிந்துரைக்கப்படுகிறது. மண் ஈரப்பதம் மிகவும் குறைவாக உள்ளது.',
      normalRec: 'மண் ஈரப்பதம் போதுமானது. நிலைமைகளை தொடர்ந்து கவனியுங்கள்.',
      wetRec: 'மண் போதுமான ஈரமாக உள்ளது. நீர்ப்பாசனத்தை நிறுத்துங்கள்.',
      waterWarn: 'நீர் மட்டம் குறைவாக உள்ளது. நீர்ப்பாசனத்திற்கு முன் தொட்டியை நிரப்புங்கள்.',
      tempWarn: 'அதிக வெப்பநிலை கண்டறியப்பட்டது. பயிர்களுக்கு போதுமான நீர் உள்ளதை உறுதிசெய்யுங்கள்.',
      dryAction1: 'உடனடியாக நீர்ப்பாசனத்தை தொடங்குங்கள்',
      dryAction2: 'மண் ஈரப்பதத்தை தொடர்ந்து கண்காணிக்கவும்',
      dryAction3: 'நீர் தொட்டி அளவை சரிபாருங்கள்',
      normalAction1: 'தற்போதைய நிலைமைகளை பராமரிக்கவும்',
      normalAction2: 'மண் மற்றும் வானிலையை கண்காணிக்கவும்',
      normalAction3: 'அடுத்த நீர்ப்பாசன சோதனையை திட்டமிடுங்கள்',
    },
    hi: {
      dryRec: 'सिंचाई की सिफारिश की जाती है। मिट्टी की नमी बहुत कम है।',
      normalRec: 'मिट्टी की नमी पर्याप्त है। नियमित रूप से स्थितियों की निगरानी करें।',
      wetRec: 'मिट्टी पर्याप्त रूप से नम है। सिंचाई रोकें।',
      waterWarn: 'पानी का स्तर कम है। सिंचाई से पहले टैंक भरें।',
      tempWarn: 'उच्च तापमान का पता चला। सुनिश्चित करें कि फसलों में पर्याप्त पानी हो।',
      dryAction1: 'तुरंत सिंचाई शुरू करें',
      dryAction2: 'मिट्टी की नमी पर कड़ी नजर रखें',
      dryAction3: 'पानी टैंक का स्तर जांचें',
      normalAction1: 'वर्तमान स्थितियों को बनाए रखें',
      normalAction2: 'मिट्टी और मौसम की निगरानी करें',
      normalAction3: 'अगली सिंचाई जांच निर्धारित करें',
    },
  };

  const m = messages[lang] || messages.en;
  const isDry = req.soilAverage < 30;
  const isWet = req.soilAverage >= 60;

  const recommendation =
    req.waterLevel < 20
      ? m.waterWarn
      : req.temperature > 35
      ? m.tempWarn
      : isDry
      ? m.dryRec
      : isWet
      ? m.wetRec
      : m.normalRec;

  const actions = isDry
    ? [m.dryAction1, m.dryAction2, m.dryAction3]
    : [m.normalAction1, m.normalAction2, m.normalAction3];

  return {
    soilStatus,
    irrigation,
    urgency,
    recommendation,
    reason: `Average soil: ${req.soilAverage}%, Water: ${req.waterLevel}%, Temp: ${req.temperature}°C`,
    actions,
    temperatureStatus: tempStatus,
    humidityStatus: humStatus,
    waterStatus,
  };
}

/**
 * Get AI farming recommendation.
 * Uses Gemini if available, falls back to rule-based logic.
 */
export async function getAIRecommendation(
  req: AIRecommendationRequest
): Promise<AIRecommendationResponse> {
  // Try Gemini AI first
  if (genAI && aiAvailable) {
    try {
      const model = genAI.getGenerativeModel({ model: config.aiModel });
      const prompt = buildPrompt(req);
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');

      const parsed = JSON.parse(jsonMatch[0]) as AIRecommendationResponse;
      logger.info('AI recommendation generated via Gemini', { urgency: parsed.urgency });
      return parsed;
    } catch (err) {
      logger.error('Gemini AI error — falling back to rule-based', {
        error: (err as Error).message,
      });
    }
  }

  // Fallback to rule-based
  logger.info('Using rule-based AI recommendation');
  return getRuleBasedRecommendation(req);
}

export function isAIAvailable(): boolean {
  return aiAvailable;
}
