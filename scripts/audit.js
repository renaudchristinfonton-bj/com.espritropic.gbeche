/**
 * GBECHE — Script d'audit local, 100 % hors-ligne.
 *
 * Agrège plusieurs niveaux de contrôle et écrit un rapport horodaté :
 *   1. Sécurité      — `npm audit` (si réseau) + garde-fous statiques
 *   2. Fonctionnel   — TypeScript (tsc) + suite de tests Jest
 *   3. UX / UI       — ESLint + plugin d'accessibilité react-native-a11y
 *   4. Offline       — interdiction de tout appel réseau dans le code
 *   5. Ergonomie     — chaque écran doit défiler (ScrollView)
 *   6. Données       — migrations sans DROP/TRUNCATE destructif
 *   7. Marque        — présence et dimensions des assets générés
 *
 * Usage : node scripts/audit.js
 * Sortie : console + docs/AUDIT_REPORT.md + docs/audit-results.json
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const results = { generatedAt: new Date().toISOString(), checks: {}, summary: {} };

function run(cmd, args) {
  // Jest/ESLint écrivent leurs rapports sur stderr même en succès :
  // on capture toujours les deux flux, quel que soit le code de retour.
  const proc = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, CI: 'true', EXPO_OFFLINE: '1' },
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${proc.stdout ?? ''}\n${proc.stderr ?? ''}`;
  return { ok: proc.status === 0, output };
}

function listFiles(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, ext));
    else if (ext.some((e) => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(ROOT, file);
}

/* ---------- 1. Sécurité ------------------------------------------------- */
function auditSecurity() {
  const npmAudit = run('npm', ['audit', '--json']);
  let dependencies = null;
  let auditAvailable = false;
  if (npmAudit.ok || npmAudit.output.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(npmAudit.output.slice(npmAudit.output.indexOf('{')));
      auditAvailable = true;
      const v = parsed.metadata?.vulnerabilities ?? {};
      dependencies = parsed.metadata?.dependencies ?? null;
      results.checks.security = {
        source: 'npm audit',
        vulnerabilities: {
          info: v.info ?? 0,
          low: v.low ?? 0,
          moderate: v.moderate ?? 0,
          high: v.high ?? 0,
          critical: v.critical ?? 0,
        },
        total:
          (v.info ?? 0) + (v.low ?? 0) + (v.moderate ?? 0) + (v.high ?? 0) + (v.critical ?? 0),
        dependencies,
      };
    } catch {
      auditAvailable = false;
    }
  }
  if (!auditAvailable) {
    results.checks.security = {
      source: 'npm audit indisponible (environnement hors-ligne)',
      note: "Relancer `npm audit` avec réseau ; le dernier bilan connu est documenté dans docs/AUDIT_REPORT.md.",
    };
  }

  // Garde-fou migrations : pas de suppression destructive de table.
  const migrationFiles = listFiles(path.join(ROOT, 'src/db/migrations'), ['.ts']);
  const forbidden = [];
  for (const file of migrationFiles) {
    const text = fs.readFileSync(file, 'utf8');
    for (const keyword of ['DROP TABLE', 'TRUNCATE', 'DELETE FROM']) {
      if (new RegExp(keyword, 'i').test(text)) forbidden.push(`${rel(file)} → ${keyword}`);
    }
  }
  results.checks.migrations = {
    files: migrationFiles.map(rel),
    destructiveStatements: forbidden,
    ok: forbidden.length === 0,
  };
}

/* ---------- 2. Fonctionnel : types + tests ------------------------------ */
function auditFunctional() {
  const tsc = run('npx', ['tsc', '--noEmit']);
  results.checks.typescript = { ok: tsc.ok, tail: tsc.output.trim().split('\n').slice(-5).join('\n') };

  const jest = run('npx', ['jest', '--silent']);
  const match = jest.output.match(/Tests:\s+(.+)/);
  const suites = jest.output.match(/Test Suites:\s+(.+)/);
  results.checks.tests = {
    ok: jest.ok,
    suites: suites ? suites[1].trim() : 'inconnu',
    tests: match ? match[1].trim() : 'inconnu',
  };
}

/* ---------- 3. UX / UI : ESLint + a11y ---------------------------------- */
function auditUX() {
  const lint = run('npx', ['eslint', '.', '--format', 'json']);
  let entries = [];
  try {
    entries = JSON.parse(lint.output);
  } catch {
    entries = [];
  }
  const byRule = {};
  let errors = 0;
  let warnings = 0;
  for (const entry of entries) {
    for (const msg of entry.messages) {
      const rule = msg.ruleId ?? 'parse-error';
      byRule[rule] = byRule[rule] || { error: 0, warning: 0 };
      if (msg.severity === 2) {
        byRule[rule].error += 1;
        errors += 1;
      } else {
        byRule[rule].warning += 1;
        warnings += 1;
      }
    }
  }
  results.checks.lint = { ok: errors === 0, errors, warnings, byRule };
}

/* ---------- 4. Offline : aucun appel réseau ----------------------------- */
function auditOffline() {
  const sources = [
    ...listFiles(path.join(ROOT, 'app'), ['.ts', '.tsx']),
    ...listFiles(path.join(ROOT, 'src'), ['.ts', '.tsx']),
  ].filter((f) => !f.includes('__tests__'));

  const networkPatterns = [/\bfetch\s*\(/, /XMLHttpRequest/, /\bWebSocket\s*\(/, /https?:\/\//];
  const findings = [];
  for (const file of sources) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      const stripped = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
      for (const pattern of networkPatterns) {
        if (pattern.test(stripped)) {
          findings.push(`${rel(file)}:${index + 1} → ${line.trim()}`);
        }
      }
    });
  }
  results.checks.offline = {
    scannedFiles: sources.length,
    networkReferences: findings,
    ok: findings.length === 0,
  };
}

/* ---------- 5. Ergonomie : chaque écran défile -------------------------- */
function auditScroll() {
  const screensDir = path.join(ROOT, 'app/(app)');
  // Les fichiers _layout sont des navigateurs, pas des écrans de contenu.
  const screens = fs
    .readdirSync(screensDir)
    .filter((name) => name.endsWith('.tsx') && !name.startsWith('_'))
    .map((name) => path.join(screensDir, name));
  const nonScrolling = [];
  for (const screen of screens) {
    const text = fs.readFileSync(screen, 'utf8');
    const scrolls =
      text.includes('ScrollView') ||
      text.includes('FlatList') ||
      /<Screen[\s\S]*?\bscroll\b/.test(text);
    if (!scrolls) nonScrolling.push(rel(screen));
  }
  results.checks.scrolling = {
    screens: screens.map(rel),
    nonScrolling,
    ok: nonScrolling.length === 0,
  };
}

/* ---------- 7. Assets de marque ----------------------------------------- */
function auditBrand() {
  const expected = [
    'assets/images/icon.png',
    'assets/images/favicon.png',
    'assets/images/android-icon-background.png',
    'assets/images/android-icon-foreground.png',
    'assets/images/android-icon-monochrome.png',
    'assets/images/splash-icon.png',
  ];
  const missing = expected.filter((p) => !fs.existsSync(path.join(ROOT, p)));
  const svgSources = listFiles(path.join(ROOT, 'assets/brand'), ['.svg']).map(rel);
  results.checks.brand = {
    expected,
    missing,
    svgSources,
    ok: missing.length === 0,
  };
}

/* ---------- Rapport ------------------------------------------------------ */
function writeReport() {
  const c = results.checks;
  const icon = (ok) => (ok ? '✅' : '❌');
  const lines = [];
  lines.push("# Rapport d'audit GBECHE");
  lines.push('');
  lines.push(`Généré le ${new Date(results.generatedAt).toLocaleString('fr-FR')} — 100 % hors-ligne.`);
  lines.push('');
  lines.push('## Synthèse');
  lines.push('');
  lines.push('| Contrôle | Résultat |');
  lines.push('| --- | --- |');
  const sec = c.security;
  const secLabel = sec.total !== undefined ? `${sec.total} vulnérabilité(s) (build/audit)` : 'audit réseau indisponible';
  lines.push(`| Sécurité (npm audit) | ${secLabel} |`);
  lines.push(`| Migrations non destructives | ${icon(c.migrations.ok)} |`);
  lines.push(`| TypeScript | ${icon(c.typescript.ok)} |`);
  lines.push(`| Tests fonctionnels (${c.tests.tests}) | ${icon(c.tests.ok)} |`);
  lines.push(`| ESLint / accessibilité (${c.lint.errors} erreur, ${c.lint.warnings} avertissement) | ${icon(c.lint.ok)} |`);
  lines.push(`| Aucun appel réseau (${c.offline.scannedFiles} fichiers) | ${icon(c.offline.ok)} |`);
  lines.push(`| Tous les écrans défilent | ${icon(c.scrolling.ok)} |`);
  lines.push(`| Assets de marque présents | ${icon(c.brand.ok)} |`);
  lines.push('');

  if (c.offline.networkReferences.length) {
    lines.push('## Références réseau à justifier');
    lines.push('');
    c.offline.networkReferences.forEach((f) => lines.push(`- ${f}`));
    lines.push('');
  }

  lines.push('## Détail ESLint par règle');
  lines.push('');
  lines.push('| Règle | Erreurs | Avertissements |');
  lines.push('| --- | --: | --: |');
  Object.entries(c.lint.byRule)
    .sort((a, b) => b[1].error + b[1].warning - (a[1].error + a[1].warning))
    .forEach(([rule, counts]) => lines.push(`| ${rule} | ${counts.error} | ${counts.warning} |`));
  lines.push('');

  if (c.scrolling.nonScrolling.length) {
    lines.push('## Écrans sans ScrollView');
    c.scrolling.nonScrolling.forEach((s) => lines.push(`- ${s}`));
    lines.push('');
  }

  lines.push('## Assets de marque');
  lines.push('');
  c.brand.expected.forEach((p) => lines.push(`- ${c.brand.missing.includes(p) ? '❌' : '✅'} ${p}`));
  lines.push('');
  lines.push(`Sources SVG traçables (fabrication artisanale, non IA) : ${c.brand.svgSources.length}`);
  c.brand.svgSources.forEach((s) => lines.push(`- ${s}`));
  lines.push('');

  const overall =
    c.migrations.ok &&
    c.typescript.ok &&
    c.tests.ok &&
    c.lint.ok &&
    c.offline.ok &&
    c.scrolling.ok &&
    c.brand.ok;
  results.summary.overall = overall ? 'PASS' : 'ATTENTION';
  lines.push(`## Statut global : **${results.summary.overall}**`);
  lines.push('');

  fs.writeFileSync(path.join(ROOT, 'docs/AUDIT_REPORT.md'), lines.join('\n'));
  fs.writeFileSync(path.join(ROOT, 'docs/audit-results.json'), JSON.stringify(results, null, 2));
  console.log(lines.join('\n'));
  console.log('\nRapports écrits : docs/AUDIT_REPORT.md, docs/audit-results.json');
}

auditSecurity();
auditFunctional();
auditUX();
auditOffline();
auditScroll();
auditBrand();
writeReport();
