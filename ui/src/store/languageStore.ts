import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language } from '../locales';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

// 브라우저 언어 감지
const getBrowserLanguage = (): Language => {
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('ko')) {
    return 'ko';
  }
  return 'en'; // 기본값은 영어
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: getBrowserLanguage(),
      setLanguage: (language: Language) => set({ language }),
    }),
    {
      name: 'language-storage',
    }
  )
);
