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

export interface AskQuestionRequest {
  question: string;
  sensorData?: {
    soilAverage?: number | null;
    soil1?: number | null;
    soil2?: number | null;
    temperature?: number | null;
    humidity?: number | null;
    waterLevel?: number | null;
    light?: number | null;
  };
  language?: string;
}

export interface AskQuestionResponse {
  answer: string;
  rainForecast?: {
    probability: number;
    alert: string;
    advice: string;
  };
  suggestedActions?: string[];
}

export async function askAIQuestion(req: AskQuestionRequest): Promise<AskQuestionResponse> {
  const lang = req.language === 'ta' ? 'Tamil' : req.language === 'hi' ? 'Hindi' : 'English';
  const sensors = req.sensorData || {};
  
  // Calculate rain probability based on humidity
  const hum = sensors.humidity !== null && sensors.humidity !== undefined ? Number(sensors.humidity) : 60;
  let rainProb = 15;
  if (hum < 40) rainProb = Math.round(hum * 0.35);
  else if (hum < 65) rainProb = Math.round(20 + (hum - 40) * 1.2);
  else if (hum < 80) rainProb = Math.round(50 + (hum - 65) * 1.8);
  else rainProb = Math.min(98, Math.round(77 + (hum - 80) * 1.05));

  let rainAlert = rainProb > 70 ? 'HIGH_RAIN_ALERT' : rainProb > 40 ? 'MODERATE_RAIN_POSSIBILITY' : 'LOW_RAIN_CHANCE';
  let rainAdvice = rainProb > 70 
    ? 'High humidity indicates rain is very likely. Delay manual irrigation to conserve water and prevent waterlogging.'
    : rainProb > 40 
    ? 'Moderate cloudiness and humidity. Monitor soil moisture before starting pump.'
    : 'Clear and dry weather expected. Ensure regular irrigation cycle.';

  if (genAI && aiAvailable) {
    try {
      const model = genAI.getGenerativeModel({ model: config.aiModel });
      const prompt = `You are an expert AI Agricultural Consultant and Smart Farm Assistant.
A farmer has asked you a question about their farm. Answer clearly, accurately, and politely with actionable advice.

CURRENT FARM SENSOR DATA:
- Soil Moisture: ${sensors.soilAverage ?? 'N/A'}% (Sensor 1: ${sensors.soil1 ?? 'N/A'}%, Sensor 2: ${sensors.soil2 ?? 'N/A'}%)
- Temperature: ${sensors.temperature ?? 'N/A'}°C
- Humidity: ${sensors.humidity ?? 'N/A'}%
- Calculated Rain Probability: ${rainProb}% (${rainAlert})
- Water Tank Level: ${sensors.waterLevel ?? 'N/A'}%
- Light Intensity: ${sensors.light ?? 'N/A'} ADC

FARMER'S QUESTION:
"${req.question}"

INSTRUCTIONS:
1. Respond in ${lang} language.
2. Use clear formatting, bullet points, and emojis.
3. Incorporate their live sensor data directly if relevant to the question.
4. Keep the response practical, direct, and farmer-friendly.`;

      const result = await model.generateContent(prompt);
      const answer = result.response.text().trim();
      return {
        answer,
        rainForecast: {
          probability: rainProb,
          alert: rainAlert,
          advice: rainAdvice
        }
      };
    } catch (err) {
      logger.error('Gemini Q&A error, falling back to rule-based', { error: (err as Error).message });
    }
  }

  // Fallback intelligent response generator
  const q = req.question.toLowerCase();
  let fallbackAnswer = '';

  if (q.includes('rain') || q.includes('rainy') || q.includes('weather') || q.includes('மழை') || q.includes('बारिश')) {
    if (lang === 'Tamil') {
      fallbackAnswer = `🌧️ **மழை சாத்தியக்கூறு கணிப்பு:**\n- தற்போதைய ஈரப்பதம்: **${sensors.humidity ?? 65}%**\n- மழை வாய்ப்பு: **${rainProb}%**\n- பரிந்துரை: ${rainProb > 65 ? 'மழை பெய்வதற்கான அதிக வாய்ப்புள்ளது. நீர்ப்பாசனத்தை தற்காலிகமாக ஒத்திவைக்கவும்.' : 'மழை வாய்ப்பு குறைவு. வழக்கமான நீர்ப்பாசனத்தை தொடரலாம்.'}`;
    } else if (lang === 'Hindi') {
      fallbackAnswer = `🌧️ **बारिश की संभावना का अनुमान:**\n- वर्तमान आर्द्रता (Humidity): **${sensors.humidity ?? 65}%**\n- बारिश की संभावना: **${rainProb}%**\n- सलाह: ${rainProb > 65 ? 'बारिश की संभावना अधिक है। पानी बचाने के लिए सिंचाई को कुछ समय के लिए रोकें।' : 'बारिश की संभावना कम है। नियमित सिंचाई जारी रखें।'}`;
    } else {
      fallbackAnswer = `🌧️ **Rain Forecast & Possibility Alert:**\n- Current Humidity: **${sensors.humidity ?? 65}%**\n- Calculated Rain Probability: **${rainProb}%**\n- Advisory: ${rainAdvice}`;
    }
  } else if (q.includes('pump') || q.includes('water') || q.includes('irrigation') || q.includes('பாசனம்') || q.includes('सिंचाई')) {
    if (lang === 'Tamil') {
      fallbackAnswer = `💧 **நீர்ப்பாசன ஆலோசனை:**\n- மண் ஈரப்பதம்: **${sensors.soilAverage ?? 50}%**\n- நீர் தொட்டி அளவு: **${sensors.waterLevel ?? 60}%**\n- நிலை: ${(sensors.soilAverage ?? 50) < 30 ? 'மண் வறண்டுள்ளது. மோட்டாரை இயக்கவும்.' : 'மண் ஈரப்பதம் போதுமானது.'}`;
    } else if (lang === 'Hindi') {
      fallbackAnswer = `💧 **सिंचाई सलाह:**\n- मिट्टी की नमी: **${sensors.soilAverage ?? 50}%**\n- पानी की टंकी स्तर: **${sensors.waterLevel ?? 60}%**\n- सलाह: ${(sensors.soilAverage ?? 50) < 30 ? 'मिट्टी सूखी है, पंप चालू करने की सिफारिश की जाती है।' : 'मिट्टी में पर्याप्त नमी है।'}`;
    } else {
      fallbackAnswer = `💧 **Irrigation Advisory:**\n- Soil Moisture: **${sensors.soilAverage ?? 50}%**\n- Water Tank Level: **${sensors.waterLevel ?? 60}%**\n- Pump Recommendation: ${(sensors.soilAverage ?? 50) < 30 ? 'Soil is dry (< 30%). Start irrigation.' : 'Soil moisture is optimal. Irrigation not required right now.'}`;
    }
  } else {
    if (lang === 'Tamil') {
      fallbackAnswer = `🌱 **விவசாய வழிகாட்டுதல்:**\nஉங்கள் பண்ணை நிலைமைகள்:\n- மண் ஈரப்பதம்: **${sensors.soilAverage ?? 50}%**\n- வெப்பநிலை: **${sensors.temperature ?? 28}°C**\n- காற்றின் ஈரப்பதம்: **${sensors.humidity ?? 60}%**\n- மழை வாய்ப்பு: **${rainProb}%**\nபயிர்களை ஆரோக்கியமாக பராமரிக்க வழக்கமான கண்காணிப்பை தொடரவும்.`;
    } else if (lang === 'Hindi') {
      fallbackAnswer = `🌱 **कृषि मार्गदर्शन:**\nआपके खेत की वर्तमान स्थिति:\n- मिट्टी की नमी: **${sensors.soilAverage ?? 50}%**\n- तापमान: **${sensors.temperature ?? 28}°C**\n- आर्द्रता (Humidity): **${sensors.humidity ?? 60}%**\n- बारिश की संभावना: **${rainProb}%**\nफसलों के अच्छे स्वास्थ्य के लिए नियमित निगरानी रखें।`;
    } else {
      fallbackAnswer = `🌱 **Smart Agri Assistant Insight:**\n- Soil Moisture: **${sensors.soilAverage ?? 50}%**\n- Temperature: **${sensors.temperature ?? 28}°C**\n- Humidity: **${sensors.humidity ?? 60}%**\n- Rain Probability: **${rainProb}%**\n\nFor your question "*${req.question}*", keep soil moisture balanced between 40%-65% and monitor rain forecasts before irrigating.`;
    }
  }

  return {
    answer: fallbackAnswer,
    rainForecast: {
      probability: rainProb,
      alert: rainAlert,
      advice: rainAdvice
    }
  };
}
