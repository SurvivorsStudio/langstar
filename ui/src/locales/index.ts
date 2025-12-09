import ko from './ko.json';
import en from './en.json';

export type Language = 'ko' | 'en';

export const translations = {
  ko,
  en
};

export const languages = [
  { code: 'ko' as Language, name: '한국어', flag: '🇰🇷' },
  { code: 'en' as Language, name: 'English', flag: '🇺🇸' }
];

export default translations;
