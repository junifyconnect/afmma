# AI-First Modular Monolith Architecture

**AFMMA**는 AI 협업 개발에 최적화된 소프트웨어 구조를 실험하고 정리하기 위한 레퍼런스 아키텍처입니다.

이 레포지토리는 단순한 주문 토이 프로젝트가 아닙니다. 앞으로의 설계 방향에 대한 작고 실행 가능한 지침서입니다. 핵심 목표는 **명확한 모듈 경계**, **작은 컨텍스트**, **반복 가능한 패턴**, **AI 코딩 에이전트를 위한 자동 가드레일**입니다.

---

## 이 템플릿으로 새 프로젝트 시작하기

GitHub의 **"Use this template"** 버튼으로 새 레포 만든 뒤:

```bash
# 1. 클론 후 의존성 설치
git clone <your-new-repo> my-project
cd my-project
npm install

# 2. package.json 의 "name" 을 새 프로젝트 이름으로 변경

# 3. 샘플 도메인(order/user/notification) 은 패턴 학습용.
#    필요 없으면 modules/, scenarios/, app/orders, use-cases/ 비우고 시작.

# 4. 첫 모듈 만들기
npm run new:module <module-name>

# 5. 아키텍처 규칙 검증
npm run check
```

### 모듈 추가

```bash
npm run new:module payment
```

`modules/payment/` 아래 `index.ts`, `internal/{domain,data,actions}/` stub이 생깁니다.
도메인 타입, repository, action을 채운 뒤 `npm run check` 로 규칙 위반 확인.

### 핵심 명령어

| 명령어 | 역할 |
| --- | --- |
| `npm run dev` | Next.js 개발 서버 (port 3030) |
| `npm run check` | typecheck + lint + 아키텍처 검증 |
| `npm run new:module <name>` | 새 모듈 stub 생성 |
| `npm run scenario:order` | 주문 흐름 시나리오 실행 |
| `npm run scenario:failure` | 실패/재시도 시나리오 실행 |

---

## 왜 AFMMA인가?

AI 코딩 에이전트는 기존 패턴을 따라 작은 범위의 코드를 수정하는 데 강합니다. 하지만 코드베이스에 아래 문제가 있으면 품질이 빠르게 떨어집니다.

- 책임이 불분명한 폴더
- 의미 없는 `utils`, `helpers`, `common`
- 숨겨진 side effect
- 약한 import 경계
- 너무 넓은 public API
- 문서와 실제 코드 규칙의 불일치

AFMMA는 아키텍처를 **AI가 실수하지 않게 만드는 가드레일**로 봅니다.

좋은 구조의 기준은 “아키텍처적으로 얼마나 순수한가?”가 아니라 다음 질문에 가깝습니다.

```text
AI가 다음 기능을 추가할 때 올바른 위치를 쉽게 찾는가?
AI가 한 번에 읽어야 하는 컨텍스트가 작게 유지되는가?
AI가 금지된 import를 하려고 하면 자동으로 막히는가?
AI가 기존 패턴을 복사해서 안정적으로 확장할 수 있는가?
```

목표는 멋진 아키텍처가 아니라, **AI가 계속 기능을 추가해도 코드베이스가 진흙탕이 되지 않는 구조**입니다.

---

## 핵심 구조

```text
app/        Next.js 라우트, 페이지, 레이아웃, server action, UI 조합
use-cases/  여러 모듈을 조합하는 워크플로우
modules/    독립된 도메인 모듈
shared/     도메인을 모르는 공통 인프라
```

의존 방향은 위에서 아래로만 허용합니다.

```text
app -> use-cases -> modules -> shared
app -> modules    // 단일 모듈만 사용하는 경우에만 허용
```

`modules/*` 내부에서는 다른 모듈을 import하지 않습니다. 두 개 이상의 모듈을 동기적으로 조합해야 하면 `use-cases/`에 둡니다. 실패해도 메인 흐름에 영향을 주지 않는 부수효과는 이벤트로 연결합니다.

---

## 레포지토리 구조

```text
mini-order/
├── app/                    Next.js 라우트/UI 레이어
├── use-cases/              모듈 조합 워크플로우
├── modules/                독립 도메인 모듈
│   ├── order/
│   ├── user/
│   └── notification/
├── shared/                 도메인 무관 공통 인프라
│   └── events/             이벤트 버스 + in-memory outbox
├── scenarios/              실행 가능한 동작 시나리오
├── scripts/                아키텍처 검증 스크립트
├── docs/
│   └── ARCHITECTURE.md     상세 아키텍처 문서
└── AGENTS.md               AI 코딩 에이전트용 짧은 작업 규칙
```

---

## 핵심 규칙

### 1. 모듈은 독립적이다

모듈 내부에서 허용되는 import는 다음뿐입니다.

- 자기 모듈의 `internal/**`
- `shared/**`
- 외부 패키지

모듈은 다른 모듈, `app/`, `use-cases/`, `scenarios/`를 import하지 않습니다.

---

### 2. public API는 의도적으로만 노출한다

외부 호출자는 반드시 아래 파일을 통해서만 모듈을 사용합니다.

```text
modules/<module>/index.ts
```

노출하면 안 되는 것:

- repository
- private mapper
- internal helper
- 구현 디테일

외부에서 진짜 필요한 capability만 export합니다.

---

### 3. 여러 모듈을 조합하면 `use-cases/`로 간다

두 개 이상의 모듈을 동기적으로 조합하는 흐름은 `use-cases/`에 둡니다.

예시:

```ts
import { findUserById } from '@/modules/user';
import { createOrder } from '@/modules/order';
import { runWithOutbox } from '@/shared/events/run-with-outbox';

export async function createOrderForKnownUser(input: Input) {
  return runWithOutbox(async () => {
    const user = await findUserById(input.userId);
    if (!user) throw new Error(`User not found: ${input.userId}`);

    return createOrder({
      userId: user.userId,
      productId: input.productId,
      amount: input.amount,
    });
  });
}
```

`use-cases/`는 모듈 조합과 workflow orchestration을 담당합니다. UI, 라우팅, form parsing, 직접 DB 접근은 하지 않습니다.

---

### 4. 부수효과는 이벤트로 연결한다

모듈은 이벤트를 발행할 수 있습니다. 부수효과를 소유한 다른 모듈이 그 이벤트를 구독합니다.

```text
order 모듈        -> order.created 발행
notification 모듈 -> order.created 구독
```

이벤트는 outbox에 쌓이고, application/use-case boundary에서 `runWithOutbox()`를 통해 flush됩니다.

---

### 5. `shared`는 쓰레기통이 아니다

아래와 같은 파일은 만들지 않습니다.

```text
shared/utils.ts
shared/helpers.ts
shared/types.ts
shared/constants.ts
```

대신 역할이 드러나는 인프라 폴더를 사용합니다.

```text
shared/events/
shared/db/
shared/logger/
shared/ui/
```

`shared/ui`는 도메인 의미가 없는 컴포넌트만 둡니다.

예:

```text
Button
Modal
TextField
Spinner
```

반대로 `OrderList`, `UserBadge`처럼 도메인 의미가 있는 UI는 소유 모듈 안에 둡니다.

---

## AI-First 개발 루프

기능을 추가할 때는 아래 순서로 판단합니다.

1. 단일 모듈 기능인지, 여러 모듈 조합인지 판단한다.
2. 단일 모듈 기능이면 `modules/<module>/internal/actions/`에 둔다.
3. 여러 모듈을 동기적으로 조합하면 `use-cases/`에 둔다.
4. 모듈 public API만 사용한다.
5. 가장 작은 합리적 파일 집합만 수정한다.
6. 작업 후 검증을 실행한다.

```bash
npm run check
```

이 명령은 다음을 순서대로 실행합니다.

```text
typecheck -> lint -> module verification
```

동작 변경이 있으면 관련 시나리오도 실행합니다.

```bash
npm run scenario:order
npm run scenario:failure
```

---

## 자동 가드레일

이 레포지토리는 여러 층의 가드레일을 둡니다.

| 가드레일 | 목적 |
| --- | --- |
| TypeScript | 타입 안정성 |
| ESLint boundaries | import 방향 강제 |
| `scripts/verify-modules.ts` | 아키텍처 규칙 검증 |
| `AGENTS.md` | AI 에이전트용 작업 규칙 |
| `docs/ARCHITECTURE.md` | 사람을 위한 상세 설계 문서 |
| scenarios | 실행 가능한 동작 예시 |

`verify-modules.ts`는 다음을 검증합니다.

- 모듈 간 직접 의존 금지
- 모듈이 상위 레이어를 import하는지 여부
- repository 등 public API 누출 여부
- `shared/utils.ts` 같은 dumping-ground 파일 존재 여부
- 모듈 내부에서 outbox boundary를 직접 조작하는지 여부
- side-effect-only module import 여부
- 순환 의존성
- 이벤트 발행/구독 현황

---

## 실행 방법

의존성 설치:

```bash
npm install
```

개발 서버 실행:

```bash
npm run dev
```

전체 검증:

```bash
npm run check
```

시나리오 실행:

```bash
npm run scenario:order
npm run scenario:failure
```

---

## 문서

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 상세 아키텍처 설명
- [`AGENTS.md`](AGENTS.md) — AI 코딩 에이전트용 짧은 작업 규칙
- [`use-cases/README.md`](use-cases/README.md) — use-case 레이어 규칙

---

## 현재 상태

이 레포지토리는 **AFMMA 1.0 reference direction**입니다.

일부러 작은 예제로 유지합니다. 목적은 많은 기능을 보여주는 것이 아니라, 구조적 규칙이 잘 보이도록 하는 것입니다.

향후 확장 후보:

- module/use-case 스캐폴딩 템플릿
- TypeScript AST 기반 아키텍처 검증
- DB 기반 repository 예제
- payment, inventory, shipment 같은 추가 모듈
- module action/use-case 테스트 예제

---

## 철학

AFMMA의 출발점은 단순합니다.

> AI 협업 개발에서 아키텍처는 우아함을 위한 것이 아니라, 올바른 변경은 쉽게 만들고 잘못된 변경은 어렵게 만드는 장치다.

AI가 올바른 위치를 찾고, 기존 패턴을 따르고, 경계를 어기면 즉시 막히는 구조라면 코드베이스는 더 빠르게 진화하면서도 형태를 유지할 수 있습니다.
