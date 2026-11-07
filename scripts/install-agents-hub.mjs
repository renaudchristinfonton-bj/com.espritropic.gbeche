#!/usr/bin/env node
/**
 * Installe le « club d'agents » GBECHE (.claude/agents + .claude/skills)
 * à partir de dépôts GitHub 100 % open source.
 *
 *   node scripts/install-agents-hub.mjs            # clone puis installe
 *   node scripts/install-agents-hub.mjs --local    # réutilise .agents-hub/
 *
 * Aucun agent ne demande de clé API : ce sont des prompts et des policies
 * locales. Le script ne fait que télécharger du texte et le copier.
 *
 * Les dépôts sont clonés dans .agents-hub/ (ignoré par git, supprimable).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const REPO = process.argv.find((a) => a.startsWith('--repo='))?.slice(7) || ROOT_DIR;

// --- 0. Récupération des dépôts --------------------------------------------
const LOCAL = process.argv.includes('--local');
const HUB = path.join(ROOT_DIR, '.agents-hub');

const REPOS = [
  ['wshobson/agents', 'wshobson-agents'],
  ['VoltAgent/awesome-claude-code-subagents', 'awesome-claude-code-subagents'],
  ['contains-studio/agents', 'contains-studio-agents'],
  ['0xSteph/pentest-ai-agents', 'pentest-ai-agents'],
  ['iannuttall/claude-agents', 'claude-agents'],
  ['mustafakendiguzel/claude-code-ui-agents', 'claude-code-ui-agents'],
  ['zakariaf/ReactNative-Skills', 'ReactNative-Skills'],
  ['superdesigndev/superdesign-skill', 'superdesign-skill'],
  ['ersinkoc/project-architect', 'project-architect'],
];

if (!LOCAL) {
  fs.mkdirSync(HUB, { recursive: true });
  for (const [repo, dir] of REPOS) {
    const dest = path.join(HUB, dir);
    if (fs.existsSync(dest)) { console.log(`= ${repo} (déjà cloné)`); continue; }
    process.stdout.write(`↓ ${repo}… `);
    try {
      execFileSync('git', ['clone', '--depth', '1', '--quiet', `https://github.com/${repo}.git`, dest], { stdio: 'ignore' });
      console.log('ok');
    } catch {
      console.log('ÉCHEC (ignoré)');
    }
  }
}

const AGENTS_DIR = path.join(REPO, '.claude/agents');
const SKILLS_DIR = path.join(REPO, '.claude/skills');

/** Sources : ordre = priorité de résolution des homonymes. */
const SOURCES = [
  { key: 'wshobson', dir: 'wshobson-agents', glob: 'plugins/*/agents', repo: 'wshobson/agents', license: 'MIT', sha: '4bde316' },
  { key: 'volt', dir: 'awesome-claude-code-subagents', glob: 'categories/*', repo: 'VoltAgent/awesome-claude-code-subagents', license: 'MIT', sha: 'ed74d11' },
  { key: 'studio', dir: 'contains-studio-agents', glob: '{design,engineering,product,project-management,testing}', repo: 'contains-studio/agents', license: 'non déclarée', sha: 'a5a480c' },
  { key: 'pentest', dir: 'pentest-ai-agents', glob: 'agents', repo: '0xSteph/pentest-ai-agents', license: 'MIT', sha: 'e5d7aa0' },
  { key: 'ian', dir: 'claude-agents', glob: 'agents', repo: 'iannuttall/claude-agents', license: 'MIT', sha: 'f7df2c3' },
  { key: 'uiprompts', dir: 'claude-code-ui-agents', glob: 'prompts/*', repo: 'mustafakendiguzel/claude-code-ui-agents', license: 'MIT', sha: 'e224ca0' },
];

/**
 * Sélection curatée : rôle demandé -> slugs acceptés (le premier trouvé gagne).
 * Couvre design, UI/UX, code, backend, API, sécurité, pentest, tests, interface,
 * optimisation, responsivité, planification, plus revue/orchestration/documentation.
 */
const ROLE_MAP = {
  design: ['design-system-architect', 'ui-designer', 'brand-guardian', 'visual-storyteller', 'whimsy-injector', 'design-bridge', 'ui-visual-validator', 'frontend-designer'],
  ux: ['ux-researcher', 'ux-microcopy-reviewer', 'ui-ux-tester', 'ui-designer'],
  codeur: ['frontend-developer', 'mobile-developer', 'fullstack-developer', 'backend-developer', 'rapid-prototyper', 'mobile-app-builder', 'code-refactorer', 'typescript-pro'],
  backend: ['backend-architect', 'database-architect', 'backend-security-coder', 'sql-pro', 'microservices-architect', 'auth-integration-engineer'],
  api: ['api-designer', 'graphql-architect', 'websocket-engineer', 'webhook-engineer', 'api-tester'],
  securite: ['security-auditor', 'threat-modeling-expert', 'security-compliance', 'compliance-mapper', 'supply-chain-auditor'],
  pentest: ['penetration-tester', 'engagement-planner', 'attack-planner', 'web-hunter', 'api-security', 'mobile-pentester', 'code-auditor', 'threat-modeler', 'risk-scorer', 'fix-verifier', 'report-generator', 'vuln-scanner', 'credential-tester', 'password-auditor', 'poc-validator'],
  tester: ['test-automator', 'test-writer-fixer', 'qa-expert', 'tdd-orchestrator', 'test-results-analyzer', 'api-tester'],
  interface: ['accessibility-expert', 'accessibility-tester', 'ui-visual-validator', 'ui-ux-tester'],
  optimisation: ['performance-engineer', 'performance-benchmarker', 'observability-engineer', 'performance-monitor', 'workflow-optimizer'],
  responsivite: ['frontend-developer', 'ui-designer', 'mobile-developer'],
  planification: ['project-architect', 'project-manager', 'product-manager', 'sprint-prioritizer', 'backlog-grooming', 'project-shipper', 'studio-producer', 'experiment-tracker', 'assumption-mapping', 'prd-writer', 'project-task-planner'],
  orchestration: ['agent-organizer', 'task-distributor', 'workflow-orchestrator', 'multi-agent-coordinator', 'agent-installer', 'codebase-orchestrator', 'error-coordinator', 'context-manager', 'memory-curator', 'knowledge-synthesizer', 'swarm-orchestrator'],
  revue: ['code-reviewer', 'architect-reviewer', 'surgeon-reviewer', 'ponder-auditor', 'debugger', 'error-detective', 'security-auditor'],
  documentation: ['technical-writer', 'content-quality-editor', 'ai-writing-auditor', 'scrum-master'],
};

const SKILLS_RN = [
  'adaptive-layout', 'accessibility-as-code', 'design-review-workflow', 'design-visual-parity',
  'design-system-structure', 'performance-budgets', 'motion-and-animation', 'forms-and-input',
  'ui-states-and-feedback', 'ui-component-library', 'navigation-and-routing', 'screen-contracts',
  'persistence-and-migrations', 'data-export-and-restore', 'settings-and-preferences',
  'dates-streaks-and-statistics', 'local-notifications', 'quality-gates', 'tdd-workflow',
  'unit-and-component-tests', 'golden-and-snapshot-tests', 'typescript-and-lint-rules',
  'react-components-and-hooks', 'react-native-conventions-index', 'state-management-zustand',
  'error-handling-and-typed-results', 'async-safety', 'value-objects-money-and-units',
  'motion-and-animation', 'web-support', 'expo-prebuild-and-config-plugins', 'permissions-and-system-prompts',
  'audio-and-haptics-feedback', 'troubleshooting-playbook', 'git-commits-and-reporting',
  'ci-pipeline-and-gates', 'app-startup-and-bootstrap', 'spec-traceability', 'naming-conventions',
  'privacy-and-store-declarations', 'e2e-maestro', 'crash-reporting-and-observability',
  'icons-app-icon-and-splash', 'architecture-and-boundaries', 'dependency-management',
];

const EXTRA_SKILLS = [
  { dir: 'superdesign-skill/skills/superdesign', name: 'superdesign' },
  { dir: 'project-architect', name: 'project-architect' },
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

/** Expansion minimale d'un segment glob `*` dans un chemin. */
function expand(dirs) {
  const out = [];
  for (const d of dirs) {
    if (!d.includes('*')) { out.push(d); continue; }
    const parts = d.split('/');
    let bases = ['/'];
    for (const part of parts) {
      if (!part) continue;
      const next = [];
      for (const b of bases) {
        if (part.includes('*')) {
          const re = new RegExp('^' + part.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
          if (!fs.existsSync(b)) continue;
          for (const e of fs.readdirSync(b, { withFileTypes: true })) {
            if (e.isDirectory() && re.test(e.name)) next.push(path.join(b, e.name));
          }
        } else next.push(path.join(b, part));
      }
      bases = next;
    }
    out.push(...bases);
  }
  return out;
}

function readFrontmatter(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { fm: null, body: txt };
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return { fm, body: txt };
}

const slugOf = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

// --- 1. Collecte des agents disponibles -------------------------------------
const pool = new Map(); // slug -> {file, source, description, body}
for (const src of SOURCES) {
  const base = path.join(HUB, src.dir);
  const dirs = expand(
    (src.glob.includes('{') ? src.glob.replace(/[{}]/g, '').split(',') : [src.glob]).map((d) => path.join(base, d))
  );
  for (const d of dirs) {
    for (const f of walk(d)) {
      const slug = slugOf(path.basename(f, '.md'));
      if (!slug || slug === 'readme' || slug === 'contributing') continue;
      const { fm } = readFrontmatter(f);
      if (!fm || !fm.description) continue; // pas un vrai sous-agent
      // 1re source gagne (ordre de priorité) ; on garde une trace des variantes.
      if (!pool.has(slug)) pool.set(slug, { file: f, ...src, description: fm.description });
    }
  }
}

// --- 2. Sélection par rôle ---------------------------------------------------
fs.mkdirSync(AGENTS_DIR, { recursive: true });
const installed = [];
const taken = new Set();
const roleOf = new Map();

for (const [role, slugs] of Object.entries(ROLE_MAP)) {
  for (const slug of slugs) {
    if (taken.has(slug)) { roleOf.get(slug).push(role); continue; }
    const hit = pool.get(slug);
    if (!hit) continue;
    const { fm, body } = readFrontmatter(hit.file);
    // Normalise le name pour qu'il colle au nom de fichier (certains dépôts
    // préfixent par le plugin, ex. `ui-design-ui-designer`).
    const fixed = body.replace(/^---\n([\s\S]*?)\n---\n/, (all, head) =>
      '---\n' + head.split('\n').map((l) => (/^name:/.test(l) ? `name: ${slug}` : l)).join('\n') + '\n---\n');
    fs.writeFileSync(path.join(AGENTS_DIR, `${slug}.md`), fixed, 'utf8');
    taken.add(slug);
    roleOf.set(slug, [role]);
    installed.push({
      slug, role, source: hit.repo, license: hit.license, sha: hit.sha,
      description: (fm.description || hit.description || '').slice(0, 150),
    });
  }
}

// --- 3. Compétences (skills) -------------------------------------------------
fs.mkdirSync(SKILLS_DIR, { recursive: true });
const skills = [];
function copySkill(srcDir, name) {
  const dest = path.join(SKILLS_DIR, name);
  if (!fs.existsSync(path.join(srcDir, 'SKILL.md'))) return false;
  fs.cpSync(srcDir, dest, {
    recursive: true,
    filter: (s) => !/(^|\/)(tests?|node_modules|\.git|examples?|templates?)(\/|$)/.test(s) && !/\.(png|jpe?g|zip|mp4|gif)$/i.test(s),
  });
  const { fm } = readFrontmatter(path.join(dest, 'SKILL.md'));
  const files = walk(dest).length;
  skills.push({ name, files, description: (fm?.description || '').slice(0, 120) });
  return true;
}
for (const s of new Set(SKILLS_RN)) {
  copySkill(path.join(HUB, 'ReactNative-Skills/skills', s), s);
}
for (const s of EXTRA_SKILLS) copySkill(path.join(HUB, s.dir), s.name);

// --- 4. Manifeste ------------------------------------------------------------
const manifest = {
  note: 'Sous-agents et compétences 100% open source, textuels, sans clé API.',
  sources: SOURCES.map(({ repo, license, sha }) => ({ repo, license, sha })),
  agents: installed,
  skills,
};
fs.writeFileSync(path.join(REPO, '.claude/agents-hub.json'), JSON.stringify(manifest, null, 2));

// Index lisible par domaine
const byRole = {};
for (const a of installed) (byRole[a.role] ||= []).push(a.slug);
const lines = [
  '# Agents & compétences installés (hub open source)',
  '',
  `Installé par \`node scripts/install-agents-hub.mjs\` — **${installed.length} sous-agents**, **${skills.length} compétences**.`,
  'Aucun agent ne nécessite de clé API : ce sont des prompts/policies locaux exécutés par la session.',
  '',
  '## Sous-agents par domaine',
  '',
];
for (const [role, list] of Object.entries(byRole)) {
  lines.push(`### ${role} (${list.length})`, '', list.map((s) => `\`${s}\``).join(' · '), '');
}
lines.push('## Compétences (skills)', '', skills.map((s) => `\`${s.name}\``).join(' · '), '');
lines.push('## Provenance', '', '| Dépôt | Licence | Commit |', '| --- | --- | --- |');
for (const s of manifest.sources) lines.push(`| ${s.repo} | ${s.license} | ${s.sha} |`);
lines.push('', `Détail machine : \`.claude/agents-hub.json\`.`, '');
lines.push(
  '## Mode d’emploi',
  '',
  '```bash',
  'npm run agents              # liste les agents par domaine',
  'npm run agents -- find "design de bouton"   # qui sait faire quoi',
  'npm run agents -- plan design ui code       # ordre d’attaque conseillé',
  'npm run agents:doctor       # vérifie l’intégrité de l’installation',
  '```',
  '',
  'Dans la session de coding, on invoque un sous-agent par son nom (Task/subagent),',
  'ou on laisse la session en convoquer plusieurs en parallèle. Les compétences',
  'se chargent à la demande depuis `.claude/skills/<nom>/SKILL.md`.',
  '',
  '## Correspondance avec la mission GBECHE',
  '',
  '| Besoin | Agents à convoquer | Compétences |',
  '| --- | --- | --- |',
  '| Design « waouh », liquid glass | `ui-designer`, `design-system-architect`, `brand-guardian` | `design-system-structure`, `design-visual-parity`, `superdesign` |',
  '| UI/UX, textes, parcours | `ux-researcher`, `ux-microcopy-reviewer`, `ui-ux-tester` | `ui-states-and-feedback`, `ui-component-library` |',
  '| Code app (Expo/RN) | `mobile-developer`, `frontend-developer`, `typescript-pro` | `react-components-and-hooks`, `typescript-and-lint-rules`, `screen-contracts` |',
  '| Backend, base locale | `backend-architect`, `database-architect`, `sql-pro` | `persistence-and-migrations`, `value-objects-money-and-units` |',
  '| Performances, jank | `performance-engineer`, `performance-benchmarker` | `performance-budgets`, `motion-and-animation` |',
  '| Responsivité / tablettes | `frontend-developer`, `ui-designer` | `adaptive-layout`, `web-support` |',
  '| Accessibilité | `accessibility-expert`, `accessibility-tester` | `accessibility-as-code` |',
  '| Tests | `test-automator`, `test-writer-fixer`, `qa-expert` | `tdd-workflow`, `unit-and-component-tests`, `golden-and-snapshot-tests` |',
  '| Sécurité, pentest de notre app | `security-auditor`, `threat-modeling-expert`, `penetration-tester`, `mobile-pentester` | `quality-gates`, `privacy-and-store-declarations` |',
  '| Planification | `project-manager`, `product-manager`, `backlog-grooming` | `project-architect`, `spec-traceability` |',
  '| Revue avant livraison | `code-reviewer`, `architect-reviewer`, `debugger` | `quality-gates`, `git-commits-and-reporting` |',
  '',
  '## Règles d’usage',
  '',
  '- **Aucune clé API** : ce sont des prompts et des politiques locales ; ils tournent dans la session.',
  '- **Pentest** : uniquement sur notre propre application. Les agents offensifs (`web-hunter`,',
  '  `api-security`, `mobile-pentester`…) ne doivent jamais viser un tiers.',
  '- Les sources sont figées aux commits ci-dessus ; pour mettre à jour, relancer le script',
  '  d’installation après un nouveau `git clone`.',
  '- Les `templates/`, `examples/` et `tests/` des compétences sont volontairement exclus pour',
  '  garder le dépôt léger : c’est la doctrine, pas les fixtures, qui nous intéresse.',
  '',
);
fs.writeFileSync(path.join(REPO, '.claude/AGENTS-HUB.md'), lines.join('\n'));

console.log(`agents: ${installed.length} | skills: ${skills.length}`);
console.log(`agents sans fichier manquant: ${installed.filter((a) => !fs.existsSync(path.join(AGENTS_DIR, a.slug + '.md'))).length}`);
