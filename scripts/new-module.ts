/**
 * 새 모듈 stub 생성기.
 *
 * 사용법:
 *   npm run new:module <name>
 *
 * 예:
 *   npm run new:module payment
 *
 * 만들어지는 구조:
 *   modules/<name>/
 *     index.ts
 *     internal/
 *       domain/<name>.types.ts
 *       data/<name>.repository.ts
 *       actions/create-<name>.ts
 *
 * 모듈 추가 후:
 *   1. domain/<name>.types.ts 에서 도메인 타입 정의
 *   2. data/ 에서 영속성 구현
 *   3. actions/ 에서 도메인 액션 작성
 *   4. index.ts 에서 public API export
 *   5. 이벤트 발행 시 shared/events/catalog.ts 에 이벤트 이름 등록
 *   6. npm run check 로 아키텍처 규칙 검증
 */
import { mkdir, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

function toPascal(name: string): string {
  return name
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const raw = process.argv[2];
  if (!raw) {
    console.error("Usage: npm run new:module <name>");
    console.error("Example: npm run new:module payment");
    process.exit(1);
  }

  const name = raw.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    console.error(`Invalid module name: ${raw}`);
    console.error("Use lowercase letters, digits, and hyphens. Must start with a letter.");
    process.exit(1);
  }

  const moduleDir = join(ROOT, "modules", name);
  if (await pathExists(moduleDir)) {
    console.error(`Module already exists: modules/${name}`);
    process.exit(1);
  }

  const Pascal = toPascal(name);

  await mkdir(join(moduleDir, "internal", "domain"), { recursive: true });
  await mkdir(join(moduleDir, "internal", "data"), { recursive: true });
  await mkdir(join(moduleDir, "internal", "actions"), { recursive: true });

  await writeFile(
    join(moduleDir, "internal", "domain", `${name}.types.ts`),
    `export type ${Pascal} = {
  ${name}Id: string;
  // TODO: 도메인 필드 정의
};

export type ${Pascal}Id = string;
`,
  );

  await writeFile(
    join(moduleDir, "internal", "data", `${name}.repository.ts`),
    `import type { ${Pascal}, ${Pascal}Id } from '../domain/${name}.types';

const store = new Map<${Pascal}Id, ${Pascal}>();

export const ${name}Repository = {
  async create(item: ${Pascal}): Promise<${Pascal}> {
    store.set(item.${name}Id, item);
    return item;
  },

  async findById(id: ${Pascal}Id): Promise<${Pascal} | null> {
    return store.get(id) ?? null;
  },
};
`,
  );

  await writeFile(
    join(moduleDir, "internal", "actions", `create-${name}.ts`),
    `import { ulid } from 'ulid';
import { ${name}Repository } from '../data/${name}.repository';
import type { ${Pascal} } from '../domain/${name}.types';

/**
 * TODO: 입력 타입과 비즈니스 로직 작성.
 * 부수효과는 emit() 으로 이벤트 발행. 이벤트 이름은
 * shared/events/catalog.ts 에 먼저 등록.
 */
export async function create${Pascal}(input: { /* TODO */ }): Promise<${Pascal}> {
  const item: ${Pascal} = {
    ${name}Id: ulid(),
    // TODO: 도메인 필드 채우기
  };

  await ${name}Repository.create(item);

  return item;
}
`,
  );

  await writeFile(
    join(moduleDir, "index.ts"),
    `export { create${Pascal} } from './internal/actions/create-${name}';
export type { ${Pascal}, ${Pascal}Id } from './internal/domain/${name}.types';
`,
  );

  console.log(`Created module: modules/${name}`);
  console.log("");
  console.log("Next steps:");
  console.log(`  1. modules/${name}/internal/domain/${name}.types.ts — 도메인 타입 정의`);
  console.log(`  2. modules/${name}/internal/actions/create-${name}.ts — 비즈니스 로직`);
  console.log(`  3. modules/${name}/index.ts — public API 조정`);
  console.log(`  4. 이벤트 발행 시: shared/events/catalog.ts 에 이름 등록`);
  console.log(`  5. npm run check`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
