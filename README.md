# 제이 (제주 이주민 · Jeju Migrant Workers) — 서버

제주 이주노동자 임금체불 대응 앱 **제이(제주 이주민 · Jeju Migrant Workers)** 의 백엔드. NestJS로 구축했으며, 쌓인 근무 기록으로 **임금체불 진정서 초안을 자동 생성**하고, **커뮤니티 글을 다국어로 번역**하는 API를 제공한다.

- 클라이언트: [Jeju-Migrant-Workers](https://github.com/gsmin02/Jeju-Migrant-Workers) (Flutter)
- 프레임워크: NestJS 10 (TypeScript)
- LLM: Google Gemini (`gemini-2.5-flash`) 또는 Anthropic Claude — 키가 없으면 준비된 샘플로 폴백

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/health` | 헬스체크 → `{ "ok": true }` |
| POST | `/api/complaint` | 진정서 생성 |
| POST | `/api/translate` | 커뮤니티 글 다국어 번역 |

### `POST /api/complaint`

요청 바디:
```json
{
  "name": "Bibek",
  "nationality": "네팔",
  "lang": "ne",
  "promisedWage": "월 220만원",
  "unpaidPeriod": "2026년 5월 ~ 6월",
  "logs": [
    { "date": "6월 30일", "in": "07:00", "out": "18:30", "src": "GPS" }
  ]
}
```

응답:
```json
{
  "complaint_ko": "임금체불 진정서 ...",
  "summary_native": "This is a draft wage-theft complaint ...",
  "fallback": false
}
```

- `complaint_ko` — 고용노동부 제출용 한국어 진정서 초안 (관련 법령 조문 포함, "참고용 초안" 고지 포함)
- `summary_native` — 사용자 모국어(`lang`) 요약 + 제출·상담 안내
- `fallback` — LLM 호출 실패 시 `true` (준비된 샘플 반환)

### `POST /api/translate`

여러 문자열(글 제목·본문·AI답변 등)을 대상 언어로 한 번에 번역한다. 클라이언트는 결과를 Supabase `post_translations`에 캐시해, 같은 글·같은 언어를 다시 볼 때는 LLM을 재호출하지 않는다.

요청 바디:
```json
{
  "texts": ["사장이 \"다음 달에 준다\"만 반복해요", "2달째 월급을 안 주는데 계속 미뤄요."],
  "target": "en"
}
```

응답:
```json
{
  "translations": ["The boss keeps saying \"next month\"", "I haven't been paid for 2 months."],
  "fallback": false
}
```

- `texts` — 번역할 문자열 배열, `target` — 대상 언어 코드(`ko`/`en`/`vi`/`id`/`ne`)
- `translations` — 입력과 같은 순서·길이의 번역 배열
- `fallback` — LLM 호출 실패 시 `true` (원문을 그대로 반환)

## 실행

```bash
npm install
cp .env.example .env      # GEMINI_API_KEY 또는 ANTHROPIC_API_KEY 입력
npm run start             # http://localhost:8080
# 개발: npm run start:dev  (watch)
# 배포: npm run build && npm run start:prod
```

## Docker

```bash
cp .env.example .env            # 키 입력 (없으면 샘플 폴백)

# docker compose (권장)
docker compose up --build       # http://localhost:8080

# 또는 순수 docker
docker build -t jeju-migrant-workers-server .
docker run -d --env-file .env -p 8080:8080 jeju-migrant-workers-server
```

- 멀티스테이지 빌드(빌드/런타임 분리)로 이미지 경량화 (node:22-slim 기반)
- `HEALTHCHECK`로 `/api/health` 자동 감시 → `docker ps` 에서 `healthy` 표시
- `.env`는 이미지에 포함되지 않으며 런타임에 `--env-file`/`env_file`로 주입

## 구조

```
src/
├── main.ts                       # 부트스트랩 (CORS, 포트 8080)
├── app.module.ts                 # 루트 모듈 (ConfigModule 전역)
├── complaint/
│   ├── complaint.module.ts
│   ├── complaint.controller.ts   # GET /api/health, POST /api/complaint
│   ├── complaint.service.ts      # Gemini/Claude 호출 + 폴백
│   └── complaint.dto.ts          # 요청/응답 타입
└── translate/
    ├── translate.module.ts
    ├── translate.controller.ts   # POST /api/translate
    ├── translate.service.ts      # Gemini/Claude 호출 + 폴백(원문 반환)
    └── translate.dto.ts          # 요청/응답 타입
```

> ⚠️ 생성물은 참고용 초안이며 법률 자문이 아니다. 제출 전 고용노동부 1350 또는 제주외국인노동자지원센터(064-712-1141) 확인 안내를 문서에 포함한다.
