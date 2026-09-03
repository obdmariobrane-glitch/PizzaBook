import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Lang, Translation } from './translations';

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: Translation };
const LanguageContext = createContext<Ctx>({ lang: 'hr', setLang: () => {}, t: translations.hr });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('hr');

  useEffect(() => {
    AsyncStorage.getItem('lang').then(v => {
      if (v === 'hr' || v === 'en' || v === 'de') setLangState(v);
    });
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem('lang', l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useT = () => useContext(LanguageContext);
