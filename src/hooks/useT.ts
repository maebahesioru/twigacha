import { useGameStore } from "@/store/useGameStore";
import { translations } from "@/lib/i18n";

export function useT() {
  const lang = useGameStore(s => s.lang);
  return translations[lang];
}
