# use-cases/

모듈 2개 이상을 조합하는 워크플로우 레이어.

자세한 규칙은 [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) 참고.

## 한 줄 룰

- 모듈 public API만 import 가능 (`@/modules/<x>`)
- shared import 가능
- 다른 use-case import 금지 (수평 import 금지)
- UI / 라우팅 / DB 직접 접근 금지

## 파일 구조

```
use-cases/
  <workflow-name>.ts        파일 1개 = 워크플로우 1개
```

규모가 커지면 도메인별 폴더로 나눠도 됨 (`use-cases/order/...`).
