import { useUIStore } from '../store/uiStore';
import { translations, TranslationKey } from './translations';

export function useTranslation() {
  const language = useUIStore((state) => state.language);
  
  const t = (key: TranslationKey): string => {
    return translations[language][key] || key;
  };
  
  return { t, language };
}










