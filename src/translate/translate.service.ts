import { Injectable, Logger } from '@nestjs/common';
import { TranslateDto, TranslateResponse } from './translate.dto';

const LANG_NAME: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  ne: 'नेपाली',
};

@Injectable()
export class TranslateService {
  private readonly logger = new Logger(TranslateService.name);

  private get claudeKey(): string | null {
    const k = process.env.ANTHROPIC_API_KEY ?? '';
    return k.startsWith('sk-ant-') ? k : null;
  }

  private get geminiKey(): string | null {
    const k = process.env.GEMINI_API_KEY ?? '';
    return /^(AIza|AQ\.)/.test(k) ? k : null;
  }

  async translate(body: TranslateDto): Promise<TranslateResponse> {
    const texts = (body.texts ?? []).map((t) => t ?? '');
    const target = body.target ?? 'en';
    // 번역할 내용이 없으면 그대로 반환
    if (texts.length === 0 || texts.every((t) => t.trim() === '')) {
      return { translations: texts, fallback: false };
    }
    try {
      if (!this.claudeKey && !this.geminiKey) throw new Error('no api key');
      const text = await this.callLlm(texts, target);
      const cleaned = text.replace(/^```(json)?\s*|\s*```$/g, '').trim();
      const parsed = JSON.parse(cleaned) as unknown;
      const arr = Array.isArray(parsed)
        ? parsed
        : (parsed as { translations?: unknown[] })?.translations;
      if (!Array.isArray(arr) || arr.length !== texts.length) {
        throw new Error('bad shape');
      }
      return { translations: arr.map((s) => String(s)), fallback: false };
    } catch (e) {
      this.logger.warn(`translate 폴백: ${(e as Error).message}`);
      // 실패 시 원문을 그대로 돌려줘 앱이 최소한 원문은 보여줄 수 있게 한다.
      return { translations: texts, fallback: true };
    }
  }

  private buildPrompts(
    texts: string[],
    target: string,
  ): { sys: string; user: string } {
    const name = LANG_NAME[target] ?? 'English';
    const sys = `You are a professional translator for a Jeju (Korea) migrant-worker community app. Translate each string in the user's JSON array into ${name}. Keep translations natural and concise, preserve meaning and tone, and keep proper nouns and place names. Respond ONLY with a JSON array of translated strings, in the same order and with the same length as the input — no extra text, no code fences, no explanations.`;
    const user = JSON.stringify(texts);
    return { sys, user };
  }

  private async callLlm(texts: string[], target: string): Promise<string> {
    const { sys, user } = this.buildPrompts(texts, target);
    if (this.geminiKey) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiKey}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: sys }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              maxOutputTokens: 2000,
            },
          }),
        },
      );
      if (!resp.ok) {
        throw new Error(`gemini ${resp.status}: ${await resp.text()}`);
      }
      const data = (await resp.json()) as any;
      return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    }
    // Claude
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.claudeKey as string,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 2000,
        system: sys,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!resp.ok) {
      throw new Error(`claude ${resp.status}: ${await resp.text()}`);
    }
    const data = (await resp.json()) as any;
    return data?.content?.[0]?.text ?? '';
  }
}
