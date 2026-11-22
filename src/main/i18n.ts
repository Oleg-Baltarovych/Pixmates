// Minimal i18next for main-process strings (tray, notices). Full UI i18n with a language setting lands in M5.
// Flat keys (`keySeparator: false`) so `tray.size` and `tray.size.s` can both be strings.
import i18next, { type TFunction } from 'i18next';
import en from '../i18n/locales/en.json';
import uk from '../i18n/locales/uk.json';

export type Locale = 'uk' | 'en';
export type MessageKey = keyof typeof uk;

export function createTranslator(lng: Locale): (key: MessageKey, values?: Record<string, string>) => string {
  const instance = i18next.createInstance();
  void instance.init({
    lng,
    fallbackLng: 'uk',
    resources: { uk: { translation: uk }, en: { translation: en } },
    keySeparator: false,
    nsSeparator: false,
    initAsync: false,
    interpolation: { escapeValue: false }, // native menus, not HTML
    returnNull: false,
  });
  const t: TFunction = instance.t;
  return (key, values) => t(key, values ?? {});
}
