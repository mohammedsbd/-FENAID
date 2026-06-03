type TranslationArgs = Record<string, string | number>;

const dictionary: Record<string, string> = {};

export function t(key: string, fallback?: string, params?: TranslationArgs) {
  const template = dictionary[key] || fallback || key;
  if (!params) return template;

  return Object.entries(params).reduce(
    (result, [paramKey, value]) => result.replaceAll(`{${paramKey}}`, String(value)),
    template,
  );
}
