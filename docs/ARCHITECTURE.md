# Architecture — Modular Monolith

이 프로젝트는 **모듈러 모노리스**다. 단일 배포 단위 안에서 도메인을 모듈로 강하게 격리한다.
한 줄 요약: **모듈은 독립이고, 모듈을 조합하는 곳은 따로 있다.**

핵심 가치:

1. **AI 친화**: 어떤 흐름이든 한 파일 안에서 전체가 보인다.
2. **떼낼 수 있는 경계**: 모듈은 언제든 별도 서비스로 분리 가능해야 한다.
3. **변경 영향 범위 추적 가능**: 모듈 시그니처 변경 시 영향받는 호출처가 명확해야 한다.

---

## 4-Layer 구조

```
app/         라우트 (UI 조합, action 바인딩)
use-cases/   모듈 조합 (동기 트랜잭션, 보상 로직)
modules/     단일 도메인 (자기 책임만, 내부는 자유)
shared/      인프라 (디자인 시스템, db, utils, events)
```

### 호출 방향

**위 → 아래만 허용.** 같은 레이어 내 수평 import는 금지 (예외는 아래 참조).

```
app   ──▶  use-cases ──▶  modules ──▶  shared
  └──────────────────────────▲              ▲
                             │              │
                       (단일 모듈만 쓸 때    │
                        use-cases 생략 가능) │
                                            │
                              (어디서든 shared 사용 가능)
```

---

## 각 레이어의 책임

### `app/` — 라우트

- Next.js App Router 라우트, layout, page, route handler
- form ↔ server action 바인딩
- UI 조합

**금지:**
- 비즈니스 로직 작성
- 모듈 2개 이상 직접 조합 (→ use-cases로)
- 모듈 internal 직접 import (public API만)

### `use-cases/` — 모듈 조합

- 모듈 여러 개를 조합한 워크플로우
- 트랜잭션 경계 관리
- 실패 시 보상 트랜잭션 (compensation)
- 같은 흐름이 두 번째 호출 지점에서 필요해지면 여기로 끌어올린다.

**금지:**
- UI / 라우팅 / form 처리
- DB 직접 접근 (반드시 module을 통해)

**언제 만드나:**
- 모듈 2개 이상의 public API를 조합해야 할 때
- 같은 흐름이 라우트 2개 이상에서 필요할 때

### `modules/` — 단일 도메인

- 한 도메인의 모든 것: domain types, repository, actions, UI 컴포넌트, listeners
- 내부 구조(`internal/`)는 모듈마다 자유. 단 외부 노출은 반드시 `index.ts`로.

**구조 (권장):**
```
modules/<domain>/
  index.ts                  ← public API (이것만 외부 노출)
  internal/
    domain/<x>.types.ts     ← 도메인 타입
    data/<x>.repository.ts  ← 영속성
    actions/<x>.ts          ← 도메인 액션
    ui/<X>.tsx              ← UI 컴포넌트
    listeners/<x>.ts        ← 이벤트 listener (있다면)
```

**도메인 UI export:**
- `OrderList`, `UserBadge`처럼 모듈 capability를 표현하는 UI는 모듈 public API로 노출해도 된다.
- 도메인 의미가 있으면 `shared/ui`로 빼지 말고 소유 모듈 안에 둔다.
- 단, public API가 너무 커지거나 client/server component 경계가 흐려지거나 UI-only import 수요가 많아지면 `modules/<domain>/ui.ts`로 분리한다.
- `shared/ui`는 `Button`, `Modal`, `TextField`, `Spinner`처럼 도메인 무관 컴포넌트만 둔다.

**금지:**
- 다른 모듈의 `internal/` 직접 import
- **다른 모듈의 public API(index.ts) import도 금지** ⚠️
  - 모듈은 자기 자신 + shared만 안다.
  - 다른 모듈이 필요하면 → use-cases가 조합하거나, 이벤트로 통신.
- shared에 도메인 지식 누출

### `shared/` — 인프라

- 도메인을 0% 모르는 코드만
- 디자인 시스템 (Button, Modal 등 도메인 무관 UI)
- DB 클라이언트, 로거, 이벤트 버스, 유틸, 공통 타입

**금지:**
- 도메인 타입 (`Order`, `User` 등)
- 비즈니스 로직
- 다른 레이어 import (shared는 최하층)

---

## 모듈 간 통신: 2가지 패턴

모듈은 다른 모듈을 직접 import하지 않는다. 대신 두 가지 방법이 있다.

### 패턴 1: 이벤트 (비동기, fire-and-forget)

부수효과성 작업은 이벤트로. 발행자는 누가 듣는지 모른다.

```ts
// modules/order/internal/actions/create-order.ts
import { emit } from '@/shared/events/bus';

export async function createOrder(input) {
  const order = await orderRepository.create({...});
  emit('order.created', { orderId: order.orderId, ... });
  return order;
}

// modules/notification/internal/listeners/order-created.ts
import { on } from '@/shared/events/bus';
on('order.created', async (payload) => {
  await sendOrderNotification(payload);
});
```

**Outbox 패턴**: 이벤트는 트랜잭션 커밋 후 `runWithOutbox()` boundary helper를 통해 일괄 발송된다. 저수준 검증/테스트에서는 `flushOutbox()`를 직접 호출할 수 있다. 실패는 `retryFailed()`로 재시도한다 (멱등성 보장).

**언제 쓰나:**
- 알림 발송, 로그 적재, 캐시 무효화, 검색 인덱스 업데이트 등
- 실패해도 메인 흐름에 영향 없는 부수효과
- 결과값이 필요 없는 일

### 패턴 2: use-cases (동기, 결과값/트랜잭션 필요)

여러 모듈의 결과를 조합하거나, 트랜잭션 경계가 모듈을 가로지를 때.

```ts
// use-cases/createOrderWithPayment.ts
import { processPayment, refundPayment } from '@/modules/payment';
import { createOrder } from '@/modules/order';

export async function createOrderWithPayment(input) {
  const payment = await processPayment(input);
  try {
    return await createOrder({ ...input, paymentId: payment.id });
  } catch (e) {
    await refundPayment(payment.id);  // 보상 트랜잭션
    throw e;
  }
}
```

**언제 쓰나:**
- 모듈 2개 이상의 결과를 동기적으로 조합해야 할 때
- 실패 시 보상 트랜잭션이 필요할 때
- 같은 흐름을 라우트/시나리오 여러 곳에서 재사용할 때

---

## 의사 결정 트리

새 기능을 만들 때:

```
모듈 1개로 끝나는가?
├─ YES → 모듈 안의 action으로 작성. app은 모듈 public을 직접 호출.
└─ NO  → 모듈 여러 개 필요
        │
        부수효과/알림성인가?
        ├─ YES → 이벤트 emit + 다른 모듈에서 listener
        └─ NO  → use-cases에 워크플로우 작성. app은 use-case 호출.
```

---

## 룰 요약 (eslint로 강제)

| from         | allow                                  |
| ------------ | -------------------------------------- |
| `app`        | `use-cases`, `module-public`, `shared` |
| `use-case`   | `module-public`, `shared`              |
| `module-public`   | 자기 `module-internal`, `shared`        |
| `module-internal` | 자기 `module-internal`, `shared`        |
| `shared`     | `shared`                               |

- 다른 모듈의 `internal/` import 금지 (어디서든)
- 다른 모듈의 public(index.ts) import도 모듈에서는 금지 (use-cases와 app만 가능)
- shared는 도메인 무지 (다른 레이어 import 불가)

---

## 디렉토리 컨벤션

```
mini-order/
├── app/                        라우트
├── use-cases/                  모듈 조합 워크플로우
│   └── <workflow-name>.ts
├── modules/
│   └── <domain>/
│       ├── index.ts            public API
│       └── internal/
│           ├── domain/
│           ├── data/
│           ├── actions/
│           ├── ui/
│           └── listeners/
├── shared/
│   ├── events/                 이벤트 버스 + outbox
│   ├── ui/                     디자인 시스템
│   └── ...                     db, utils, types 등
├── scenarios/                  E2E 시나리오 (use-case와 같은 권한)
├── scripts/                    빌드/검증 스크립트
└── docs/
    └── ARCHITECTURE.md         이 문서
```

---

## FAQ

**Q. use-cases가 점점 많아지면?**
→ 도메인별로 폴더 나눠도 됨 (`use-cases/order/`, `use-cases/payment/`). 단 use-case끼리 import는 금지 (수평 import 룰).

**Q. 두 모듈이 같은 타입을 써야 한다면?**
→ shared에 올릴 후보. 단 도메인 무관해야 함. 진짜 도메인 타입이면 이벤트 payload나 use-case 인터페이스로 변환.

**Q. 모듈 떼서 마이크로서비스로 갈 때?**
→ 모듈 폴더 통째로 들어내고, use-cases는 API 호출로 변환, 이벤트는 메시지 큐로 변환. 직접 import 안 했기 때문에 가능.

**Q. 라우트에서 use-case를 안 거치고 모듈 직접 호출해도 되나?**
→ YES. 단일 모듈이면 OK. 모듈 2개 이상 조합이 필요해지는 순간 use-case로 끌어올린다.

**Q. use-case 안에서 다른 use-case 호출?**
→ 금지. 수평 import는 어디서든 금지. 공통 흐름이 필요하면 모듈 안의 action으로 내리거나, 더 큰 use-case로 합친다.
