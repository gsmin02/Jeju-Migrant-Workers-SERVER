import { Injectable, Logger } from '@nestjs/common';
import {
  ComplaintResponse,
  GenerateComplaintDto,
  WorkLogDto,
} from './complaint.dto';

const LANG_NAME: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  ne: 'नेपाली',
};

@Injectable()
export class ComplaintService {
  private readonly logger = new Logger(ComplaintService.name);

  private get claudeKey(): string | null {
    const k = process.env.ANTHROPIC_API_KEY ?? '';
    return k.startsWith('sk-ant-') ? k : null;
  }

  private get geminiKey(): string | null {
    const k = process.env.GEMINI_API_KEY ?? '';
    return /^(AIza|AQ\.)/.test(k) ? k : null;
  }

  async generate(body: GenerateComplaintDto): Promise<ComplaintResponse> {
    try {
      if (!this.claudeKey && !this.geminiKey) throw new Error('no api key');
      const text = await this.callLlm(body);
      const cleaned = text.replace(/^```(json)?\s*|\s*```$/g, '').trim();
      const parsed = JSON.parse(cleaned) as ComplaintResponse;
      if (!parsed.complaint_ko) throw new Error('bad shape');
      return { ...parsed, fallback: false };
    } catch (e) {
      this.logger.warn(`complaint 폴백: ${(e as Error).message}`);
      return { ...FALLBACK, fallback: true };
    }
  }

  private buildPrompts(body: GenerateComplaintDto): { sys: string; user: string } {
    const {
      name = 'Bibek',
      nationality = '네팔',
      lang = 'en',
      workplace = { name: '한라양식', type: '양식장(어업)', region: '서귀포시 성산읍' },
      promisedWage = '',
      unpaidPeriod = '',
      logs = [],
    } = body;
    const logLines = logs
      .map(
        (l: WorkLogDto) =>
          `- ${l.date}: ${l.in}~${l.out} · ${l.workplace ?? workplace.name} (${l.src})`,
      )
      .join('\n');
    const nativeName = LANG_NAME[lang] ?? 'English';
    const sys = `너는 대한민국 고용노동부(지방고용노동관서)에 제출할 "임금체불 진정서" 초안을 작성하는 보조자다.
반드시 아래 JSON 형식으로만 답하라 (다른 텍스트·코드펜스 금지):
{"complaint_ko":"<한국어 진정서 전문>","summary_native":"<${nativeName}로 쓴 요약과 다음 단계 안내>"}

진정서 구성: 제목(임금체불 진정서) / 진정인(성명·국적, 연락처는 "추후 기재") / 피진정인(사업장명·업종·소재지, 대표자 성명 미상 가능) / 진정 취지 / 진정 이유(근무 사실·약속 임금·미지급 내역을 기록 근거와 함께 서술) / 관련 법령(근로기준법 제36조 금품청산, 제17조 근로조건 명시, 제48조 임금명세서, 임금채권보장법 제7조의2 간이대지급금) / 첨부(GPS 출퇴근 기록 ${logs.length}건, 채용공고 사본 등) / 작성일·서명란.
사실만 쓰고 과장·추정 금지. 마지막 줄에 반드시: "※ 본 문서는 AI가 생성한 참고용 초안입니다. 제출 전 고용노동부 상담(1350) 또는 제주외국인노동자지원센터(064-712-1141)에서 확인하세요."
summary_native에는: 이 문서가 무엇인지, 어디에 어떻게 제출하는지(노동포털 온라인 또는 관할 노동지청 방문), 1350·064-712-1141 상담 안내를 포함하라.`;
    const user = `진정인: ${name} (${nationality})
사업장: ${workplace.name} · ${workplace.type} · ${workplace.region}
약속 임금: ${promisedWage}
미지급 기간: ${unpaidPeriod}
GPS 출퇴근 기록 (${logs.length}건, 최근 순):
${logLines || '- (기록 없음)'}`;
    return { sys, user };
  }

  private async callLlm(body: GenerateComplaintDto): Promise<string> {
    const { sys, user } = this.buildPrompts(body);
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
              maxOutputTokens: 3000,
            },
          }),
        },
      );
      if (!resp.ok) throw new Error(`gemini ${resp.status}: ${await resp.text()}`);
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
        max_tokens: 3000,
        system: sys,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!resp.ok) throw new Error(`claude ${resp.status}: ${await resp.text()}`);
    const data = (await resp.json()) as any;
    return data?.content?.[0]?.text ?? '';
  }
}

/** LLM 키가 없거나 실패 시 반환하는 준비된 샘플 (데모 보험) */
const FALLBACK: ComplaintResponse = {
  complaint_ko: `임금체불 진정서

진정인: Bibek (네팔) · 연락처: 추후 기재
피진정인: 한라양식 (양식장·어업) · 제주특별자치도 서귀포시 성산읍 · 대표자 성명 미상

[진정 취지]
피진정인이 진정인에게 지급하지 아니한 임금 합계 4,400,000원(2026년 5월~6월분 월급 각 2,200,000원)을 지급하도록 조치하여 주시기 바랍니다.

[진정 이유]
1. 진정인은 2025년 5월경부터 피진정인 사업장에서 양식장 관리 업무에 종사하여 왔습니다.
2. 근로계약서는 작성·교부되지 않았으나, 월 2,200,000원의 임금을 약정하였습니다.
3. 피진정인은 2026년 5월분부터 임금을 지급하지 않고 있으며, 수 회 지급을 요청하였으나 "다음 달에 주겠다"는 답변만 반복하고 있습니다.
4. 진정인은 GPS 기반 출퇴근 기록 91건을 보유하고 있으며, 동일 사업장에서 근무한 동료 노동자들의 기록과 시간·장소 패턴이 일치하여 근무 사실을 교차 입증할 수 있습니다.

[관련 법령] 근로기준법 제36조(금품 청산)·제17조(근로조건의 명시)·제48조(임금명세서), 임금채권보장법 제7조의2(간이대지급금)

[첨부] 1. GPS 출퇴근 기록 91건  2. 채용공고 사본 1부

2026년 7월 2일   진정인: Bibek (서명)

※ 본 문서는 AI가 생성한 참고용 초안입니다. 제출 전 고용노동부 상담(1350) 또는 제주외국인노동자지원센터(064-712-1141)에서 확인하세요.`,
  summary_native: `This is a draft wage-theft complaint (진정서) to the Korean Ministry of Employment and Labor. It claims 4,400,000 KRW of unpaid wages for May–June 2026, backed by your 91 GPS work records. How to submit: online at the Labor Portal (labor.moel.go.kr) or visit the local labor office. Free help: call 1350 (multilingual) or Jeju Migrant Worker Support Center 064-712-1141. This draft is for reference — have it checked before submitting.`,
  fallback: true,
};
