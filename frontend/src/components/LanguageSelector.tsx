import React from 'react';
import { useLanguage } from '../i18n';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="lang-selector">
      <button
        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
        onClick={() => setLanguage('en')}
        title="English"
      >
        EN
      </button>
      <button
        className={`lang-btn ${language === 'ta' ? 'active' : ''}`}
        onClick={() => setLanguage('ta')}
        title="தமிழ்"
      >
        தமிழ்
      </button>
      <button
        className={`lang-btn ${language === 'hi' ? 'active' : ''}`}
        onClick={() => setLanguage('hi')}
        title="हिन्दी"
      >
        हिं
      </button>
    </div>
  );
}
