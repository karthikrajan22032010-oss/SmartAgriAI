import React, { useState } from 'react';
import { BrainCircuit, Send, Sparkles, MessageSquare, CloudRain, Droplets, ArrowRight } from 'lucide-react';
import { useSensors, useAIRecommendation } from '../hooks';
import { useLanguage } from '../i18n';
import { AIRecommendationPanel } from '../components/AIRecommendationPanel';
import { Language } from '../types';
import * as api from '../services/api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  rainForecast?: {
    probability: number;
    alert: string;
    advice: string;
  };
}

export function AIAssistantPage() {
  const { t, language } = useLanguage();
  const { data: sensors } = useSensors(5000);
  const { recommendation, loading, error, getRecommendation } = useAIRecommendation();

  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: language === 'ta'
        ? 'வணக்கம்! நான் உங்கள் AI விவசாய ஆலோசகர். உங்கள் பண்ணை சென்சார் வாசிப்புகளின் அடிப்படையில் கேள்விகளைக் கேட்கலாம் (மழை வாய்ப்பு, பாசனம், உரம், பூச்சி மேலாண்மை).'
        : language === 'hi'
        ? 'नमस्ते! मैं आपका AI कृषि सलाहकार हूँ। आप अपने खेत के सेंसर डेटा के आधार पर कोई भी प्रश्न पूछ सकते हैं (बारिश, सिंचाई, फसल देखभाल)।'
        : 'Hello! I am your AI Smart Farming Assistant. You can ask me any questions about your crops, soil moisture, rain probability, or optimal irrigation times.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);

  const quickQuestions = language === 'ta' ? [
    '🌧️ தற்போதைய காற்றில் உள்ள ஈரப்பதத்தை வைத்து இன்று மழை பெய்யுமா?',
    '💧 இப்போது நீர்ப்பாசன மோட்டாரை ஆன் செய்ய வேண்டுமா?',
    '🌾 தற்போதைய மண் ஈரப்பதத்திற்கு ஏற்ற சிறந்த பயிர்கள் எவை?',
    '☀️ இன்றைய வெப்பநிலைக்கு பயிர் பாதுகாப்பு குறிப்புகள்'
  ] : language === 'hi' ? [
    '🌧️ क्या आज आर्द्रता (Humidity) के अनुसार बारिश होगी?',
    '💧 क्या मुझे अभी पानी का पंप चालू करना चाहिए?',
    '🌾 वर्तमान मिट्टी की नमी के लिए कौन सी फसलें सबसे अच्छी हैं?',
    '☀️ उच्च तापमान में फसलों की देखभाल कैसे करें?'
  ] : [
    '🌧️ Will it rain today based on current humidity?',
    '💧 Should I start the irrigation pump right now?',
    '🌾 What are the best crops for current soil moisture?',
    '☀️ Crop protection tips for current temperature & light'
  ];

  const handleSendQuestion = async (textToSend?: string) => {
    const text = textToSend || question;
    if (!text.trim() || isAsking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setIsAsking(true);

    try {
      const res = await api.askAIQuestion(text, sensors || undefined, language as Language);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.answer,
        rainForecast: res.rainForecast,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: 'Sorry, I encountered an error answering your question. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="page-content">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.4rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
          <BrainCircuit size={24} color="var(--accent-green)" />
          {t.aiAssistant}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
          AI-powered farming intelligence, live rain probability estimation, and expert Q&A
        </p>
      </div>

      {/* Current Sensor Context */}
      {sensors && (
        <div className="card fade-in" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Live Sensor Context</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {[
              { label: t.soilMoisture, value: `${sensors.soilAverage?.toFixed(1) ?? '--'}%` },
              { label: t.temperature, value: `${sensors.temperature?.toFixed(1) ?? '--'}°C` },
              { label: t.humidity, value: `${sensors.humidity?.toFixed(1) ?? '--'}%` },
              { label: t.waterLevel, value: `${sensors.waterLevel?.toFixed(1) ?? '--'}%` },
              { label: t.light, value: `${sensors.light?.toFixed(0) ?? '--'} ADC` },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-green)', fontFamily: 'Outfit, sans-serif' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive AI Chat / Ask Questions */}
      <div className="card fade-in" style={{ marginBottom: 24, border: '1px solid var(--border)' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <MessageSquare size={18} color="var(--accent-green)" />
          <span className="card-title">{t.askAI}</span>
        </div>

        {/* Quick Suggestion Chips */}
        <div style={{ padding: '14px 0 6px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              className="btn btn-ghost btn-sm"
              onClick={() => handleSendQuestion(q)}
              disabled={isAsking}
              style={{
                fontSize: '0.78rem',
                borderRadius: '16px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                color: 'var(--text-primary)',
                textAlign: 'left'
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Message List */}
        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          padding: '14px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: msg.sender === 'user' ? 'var(--accent-green-dark, #065f46)' : '#101c15',
                color: '#fff',
                padding: '12px 16px',
                borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                border: msg.sender === 'user' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-line'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.72rem', color: msg.sender === 'user' ? '#a7f3d0' : 'var(--accent-green)', marginBottom: 4 }}>
                {msg.sender === 'user' ? 'You' : '🤖 Agri AI Assistant'} • {msg.timestamp}
              </div>
              <div>{msg.text}</div>
            </div>
          ))}
          {isAsking && (
            <div style={{
              alignSelf: 'flex-start',
              background: '#101c15',
              padding: '10px 16px',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Sparkles size={16} className="spinning" color="var(--accent-green)" />
              {t.aiTyping}
            </div>
          )}
        </div>

        {/* Input & Send */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuestion();
          }}
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 10,
            paddingTop: 12,
            borderTop: '1px solid var(--border)'
          }}
        >
          <input
            type="text"
            className="input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t.askAIPlaceholder}
            disabled={isAsking}
            style={{
              flex: 1,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#fff',
              fontSize: '0.9rem'
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isAsking || !question.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 18px' }}
          >
            <Send size={16} />
            <span>{t.askAIButton}</span>
          </button>
        </form>
      </div>

      {/* Advisory Panel */}
      <AIRecommendationPanel
        recommendation={recommendation}
        loading={loading}
        error={error}
        sensorData={sensors}
        onFetch={(data, lang) => getRecommendation(data, lang as Language)}
      />
    </div>
  );
}
