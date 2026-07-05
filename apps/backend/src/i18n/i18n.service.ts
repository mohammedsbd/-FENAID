import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { getLocale } from './i18n.context';

type LocaleMap = Record<string, string | Record<string, unknown>>;

@Injectable()
export class I18nService implements OnModuleInit {
  private readonly logger = new Logger(I18nService.name);
  private locales: Record<string, LocaleMap> = {};

  onModuleInit() {
    const localesDir = path.join(__dirname, 'locales');
    for (const file of fs.readdirSync(localesDir)) {
      if (file.endsWith('.json')) {
        const locale = file.replace('.json', '');
        const content = fs.readFileSync(path.join(localesDir, file), 'utf-8');
        this.locales[locale] = JSON.parse(content);
        this.logger.log(`Loaded locale: ${locale}`);
      }
    }
  }

  t(key: string, params?: Record<string, unknown>, locale?: string): string {
    const lang = locale || getLocale();
    const map = this.locales[lang] || this.locales['en'] || {};
    const template = this.resolveKey(map, key);
    if (template === undefined) return key;
    if (!params) return template as string;
    return (template as string).replace(/\{(\w+)\}/g, (_, k) =>
      params[k]?.toString() ?? `{${k}}`,
    );
  }

  private resolveKey(map: LocaleMap, key: string): unknown {
    const parts = key.split('.');
    let current: unknown = map;
    for (const part of parts) {
      if (typeof current !== 'object' || current === null) return undefined;
      current = (current as LocaleMap)[part];
    }
    return current;
  }
}
