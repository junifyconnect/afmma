/**
 * Spring Modulith의 ApplicationModules.verify() TS 흉내.
 *
 * 하는 일:
 *   1. modules/ 하위 각 모듈 식별
 *   2. 모듈 간 의존성 그래프 추출 (import문 분석)
 *   3. 순환 의존성 감지
 *   4. 각 모듈의 canvas 출력 (public API, 소비 이벤트, 발행 이벤트)
 *   5. AI가 자주 깨뜨리는 아키텍처 규칙 검증
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const MODULES_DIR = join(ROOT, "modules");
const PROJECT_SOURCE_DIRS = [
  "app",
  "use-cases",
  "modules",
  "shared",
  "scenarios",
  "scripts",
];

type ModuleName = string;

type ModuleInfo = {
  name: ModuleName;
  publicApi: string[]; // index.ts에서 export하는 이름들
  dependencies: Set<ModuleName>; // 이 모듈이 import하는 다른 모듈들
  emitsEvents: string[]; // emit('...')로 발행하는 이벤트
  consumesEvents: string[]; // on('...')로 구독하는 이벤트
};

const IMPORT_RE =
  /import\s+(?:type\s+)?(?:[\w*{},\s]+\s+from\s+)?['"]([^'"]+)['"]/g;
const IMPORT_DETAIL_RE =
  /import\s+(?:type\s+)?([\w*{},\s]+)\s+from\s+['"]([^'"]+)['"]/g;
const SIDE_EFFECT_IMPORT_RE = /^\s*import\s+['"](@\/modules\/[^'"]+)['"];?/gm;
const EXPORT_RE =
  /^export\s+(?:type\s+)?\{([^}]+)\}|^export\s+(?:async\s+)?(?:function|const|class|type)\s+(\w+)/gm;
const EXPORT_LINE_RE = /^\s*export\s+.*$/gm;
const EMIT_RE = /\bemit\(\s*['"]([^'"]+)['"]/g;
const ON_RE = /\bon\(\s*['"]([^'"]+)['"]/g;

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir: string): Promise<string[]> {
  if (!(await pathExists(dir))) return [];

  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
      out.push(full);
  }
  return out;
}

async function walkProjectSources(): Promise<string[]> {
  const files: string[] = [];
  for (const dir of PROJECT_SOURCE_DIRS) {
    files.push(...(await walk(join(ROOT, dir))));
  }
  return files;
}

function displayPath(file: string): string {
  return file.replace(ROOT, "");
}

/** modules에서 outer 레이어(app/use-cases/scenarios) import를 위반으로 탐지 */
const OUTER_LAYER_PREFIXES = ["@/app/", "@/use-cases/", "@/scenarios/"];

async function detectLayerViolations(modules: ModuleInfo[]): Promise<string[]> {
  const violations: string[] = [];
  for (const m of modules) {
    const moduleDir = join(MODULES_DIR, m.name);
    const files = await walk(moduleDir);
    for (const file of files) {
      const src = await readFile(file, "utf8");
      for (const match of src.matchAll(IMPORT_RE)) {
        const spec = match[1];
        if (OUTER_LAYER_PREFIXES.some((p) => spec.startsWith(p))) {
          violations.push(`  ${m.name}: ${displayPath(file)} → ${spec}`);
        }
      }
    }
  }
  return violations;
}

async function detectModulePublicApiLeaks(
  moduleNames: ModuleName[],
): Promise<string[]> {
  const violations: string[] = [];

  for (const name of moduleNames) {
    const indexFile = join(MODULES_DIR, name, "index.ts");
    if (!(await pathExists(indexFile))) continue;

    const src = await readFile(indexFile, "utf8");
    for (const match of src.matchAll(EXPORT_LINE_RE)) {
      const line = match[0];
      if (/repository/i.test(line)) {
        violations.push(
          `  ${displayPath(indexFile)}: repository export is not allowed → ${line.trim()}`,
        );
      }
      if (/internal\/(data|helpers?|mappers?|utils?)/i.test(line)) {
        violations.push(
          `  ${displayPath(indexFile)}: implementation detail export is suspicious → ${line.trim()}`,
        );
      }
    }
  }

  return violations;
}

async function detectForbiddenSharedFiles(): Promise<string[]> {
  const forbidden = [
    "shared/utils.ts",
    "shared/helpers.ts",
    "shared/common.ts",
    "shared/types.ts",
    "shared/constants.ts",
  ];

  const violations: string[] = [];
  for (const path of forbidden) {
    const full = join(ROOT, path);
    if (await pathExists(full)) {
      violations.push(
        `  ${path} is a dumping-ground file. Prefer a named infrastructure folder.`,
      );
    }
  }
  return violations;
}

async function detectModuleOutboxBoundaryViolations(
  modules: ModuleInfo[],
): Promise<string[]> {
  const forbiddenNames = [
    "flushOutbox",
    "runWithOutbox",
    "retryFailed",
    "printOutbox",
  ];
  const violations: string[] = [];

  for (const m of modules) {
    const files = await walk(join(MODULES_DIR, m.name));
    for (const file of files) {
      const src = await readFile(file, "utf8");
      for (const match of src.matchAll(IMPORT_DETAIL_RE)) {
        const imported = match[1];
        const spec = match[2];
        if (!spec.startsWith("@/shared/events/")) continue;

        const usedForbidden = forbiddenNames.filter((name) =>
          new RegExp(`\\b${name}\\b`).test(imported),
        );
        for (const name of usedForbidden) {
          violations.push(
            `  ${m.name}: ${displayPath(file)} imports ${name} from ${spec}`,
          );
        }
      }
    }
  }

  return violations;
}

async function detectSideEffectModuleImports(): Promise<string[]> {
  const violations: string[] = [];
  for (const file of await walkProjectSources()) {
    const src = await readFile(file, "utf8");
    for (const match of src.matchAll(SIDE_EFFECT_IMPORT_RE)) {
      violations.push(
        `  ${displayPath(file)} → ${match[1]} (use an explicit registration/function call instead)`,
      );
    }
  }
  return violations;
}

function resolveModuleFromImport(
  spec: string,
  fromModule: ModuleName,
): ModuleName | null {
  const m = spec.match(/^@\/modules\/([^/]+)/);
  if (!m) return null;
  const target = m[1];
  return target === fromModule ? null : target;
}

async function collectModuleInfo(name: ModuleName): Promise<ModuleInfo> {
  const moduleDir = join(MODULES_DIR, name);
  const files = await walk(moduleDir);

  const info: ModuleInfo = {
    name,
    publicApi: [],
    dependencies: new Set(),
    emitsEvents: [],
    consumesEvents: [],
  };

  for (const file of files) {
    const src = await readFile(file, "utf8");
    const isPublicIndex = file.endsWith(`${name}/index.ts`);

    // public API: index.ts의 export 추출
    if (isPublicIndex) {
      for (const match of src.matchAll(EXPORT_RE)) {
        if (match[1]) {
          // export { a, b, c }
          match[1]
            .split(",")
            .map(
              (s) =>
                s
                  .trim()
                  .split(/\s+as\s+/)
                  .pop()!,
            )
            .forEach((name) => {
              if (name) info.publicApi.push(name);
            });
        } else if (match[2]) {
          info.publicApi.push(match[2]);
        }
      }
    }

    // imports → 의존성
    for (const match of src.matchAll(IMPORT_RE)) {
      const dep = resolveModuleFromImport(match[1], name);
      if (dep) info.dependencies.add(dep);
    }

    // emit/on 호출 추출 (이벤트 카탈로그)
    for (const match of src.matchAll(EMIT_RE)) info.emitsEvents.push(match[1]);
    for (const match of src.matchAll(ON_RE)) info.consumesEvents.push(match[1]);
  }

  info.emitsEvents = [...new Set(info.emitsEvents)];
  info.consumesEvents = [...new Set(info.consumesEvents)];
  return info;
}

function detectCycles(modules: ModuleInfo[]): ModuleName[][] {
  const graph = new Map<ModuleName, Set<ModuleName>>();
  for (const m of modules) graph.set(m.name, m.dependencies);

  const cycles: ModuleName[][] = [];
  const stack: ModuleName[] = [];
  const onStack = new Set<ModuleName>();
  const visited = new Set<ModuleName>();

  function dfs(node: ModuleName) {
    if (onStack.has(node)) {
      const idx = stack.indexOf(node);
      cycles.push([...stack.slice(idx), node]);
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    onStack.add(node);
    stack.push(node);
    for (const next of graph.get(node) ?? []) dfs(next);
    stack.pop();
    onStack.delete(node);
  }

  for (const m of modules) dfs(m.name);
  return cycles;
}

function printGraph(modules: ModuleInfo[]) {
  console.log("\n┌─ Module Dependency Graph ──────────────────────────────");
  for (const m of modules) {
    const deps = [...m.dependencies];
    if (deps.length === 0) {
      console.log(`│  ${m.name}  (no module deps)`);
    } else {
      console.log(`│  ${m.name}  →  ${deps.join(", ")}`);
    }
  }
  console.log("└────────────────────────────────────────────────────────\n");
}

function printCanvas(m: ModuleInfo) {
  console.log(`┌─ Module: ${m.name} ─────────────────────────────────`);
  console.log(
    `│  public API: ${m.publicApi.length ? m.publicApi.join(", ") : "(none)"}`,
  );
  console.log(
    `│  depends on: ${m.dependencies.size ? [...m.dependencies].join(", ") : "(none)"}`,
  );
  console.log(
    `│  emits:      ${m.emitsEvents.length ? m.emitsEvents.join(", ") : "(none)"}`,
  );
  console.log(
    `│  consumes:   ${m.consumesEvents.length ? m.consumesEvents.join(", ") : "(none)"}`,
  );
  console.log("└──────────────────────────────────────────────────────");
}

function failIfAny(title: string, violations: string[]): void {
  if (violations.length === 0) return;

  console.error(`\n❌ ${title}:`);
  for (const v of violations) console.error(v);
  process.exit(1);
}

async function main() {
  const entries = await readdir(MODULES_DIR, { withFileTypes: true });
  const moduleNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const modules: ModuleInfo[] = [];
  for (const name of moduleNames) {
    modules.push(await collectModuleInfo(name));
  }

  console.log(
    `📦 ${modules.length} modules found: ${modules.map((m) => m.name).join(", ")}`,
  );

  printGraph(modules);

  for (const m of modules) printCanvas(m);

  const cycles = detectCycles(modules);
  failIfAny(
    "Circular dependencies detected",
    cycles.map((cycle) => `   ${cycle.join(" → ")}`),
  );

  const moduleDependencyViolations = modules
    .filter((m) => m.dependencies.size > 0)
    .map(
      (m) =>
        `  ${m.name} imports module public API: ${[...m.dependencies].join(", ")}`,
    );
  failIfAny(
    "Module-to-module dependencies are forbidden",
    moduleDependencyViolations,
  );

  failIfAny(
    "Layer violations — modules cannot depend on app/use-cases/scenarios",
    await detectLayerViolations(modules),
  );
  failIfAny(
    "Module public API leaks detected",
    await detectModulePublicApiLeaks(moduleNames),
  );
  failIfAny(
    "Forbidden shared dumping-ground files detected",
    await detectForbiddenSharedFiles(),
  );
  failIfAny(
    "Modules must not manage outbox boundary operations",
    await detectModuleOutboxBoundaryViolations(modules),
  );
  failIfAny(
    "Side-effect-only module imports detected",
    await detectSideEffectModuleImports(),
  );

  // 이벤트 정합성 검증: 어떤 모듈이 발행한 이벤트를 아무도 안 받으면 경고
  const allEmitted = new Set(modules.flatMap((m) => m.emitsEvents));
  const allConsumed = new Set(modules.flatMap((m) => m.consumesEvents));
  const orphanEmits = [...allEmitted].filter((e) => !allConsumed.has(e));
  const orphanConsumes = [...allConsumed].filter((e) => !allEmitted.has(e));

  if (orphanEmits.length) {
    console.warn(`\n⚠️  emitted but never consumed: ${orphanEmits.join(", ")}`);
  }
  if (orphanConsumes.length) {
    console.warn(
      `⚠️  consumed but never emitted: ${orphanConsumes.join(", ")}`,
    );
  }

  console.log("\n✅ Module verification passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
