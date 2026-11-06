#!/usr/bin/env node
/**
 * AGENTS HUB — petit routeur pour le club d'agents de GBECHE.
 *
 *   node scripts/agents-hub.mjs list                 # tous les agents par domaine
 *   node scripts/agents-hub.mjs find "design bouton" # agents compétents pour une tâche
 *   node scripts/agents-hub.mjs plan design ui ux    # équipe conseillée, dans l'ordre
 *   node scripts/agents-hub.mjs doctor               # vérifie l'intégrité de l'installation
 *
 * Tout est local : aucune requête réseau, aucune clé API.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AGENTS_DIR = path.join(ROOT, '.claude/agents');
const SKILLS_DIR = path.join(ROOT, '.claude/skills');
const MANIFEST = path.join(ROOT, '.claude/agents-hub.json');

/** Ordre d'invocation recommandé pour une feature complète. */
const WORKFLOW = [
  'product-manager',
  'project-manager',
  'architect-reviewer',
  'design-system-architect',
  'ui-designer',
  'ux-microcopy-reviewer',
  'mobile-developer',
  'frontend-developer',
  'test-automator',
  'accessibility-expert',
  'performance-engineer',
  'code-reviewer',
  'security-auditor',
  'technical-writer',
];

const readManifest = () => (fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { agents: [], skills: [] });

function readAgents() {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  return fs
    .readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const txt = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
      const fm = (txt.match(/^---\n([\s\S]*?)\n---/) || [])[1] || '';
      const field = (k) => ((fm.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) || [])[1] || '').replace(/^["']|["']$/g, '').trim();
      return { slug: f.replace(/\.md$/, ''), name: field('name'), description: field('description') };
    });
}

function skills() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs
    .readdirSync(SKILLS_DIR)
    .filter((s) => fs.existsSync(path.join(SKILLS_DIR, s, 'SKILL.md')))
    .map((s) => {
      const txt = fs.readFileSync(path.join(SKILLS_DIR, s, 'SKILL.md'), 'utf8');
      const fm = (txt.match(/^---\n([\s\S]*?)\n---/) || [])[1] || '';
      const d = ((fm.match(/^description:\s*(.+)$/m) || [])[1] || '').replace(/^["']|["']$/g, '');
      return { slug: s, description: d };
    });
}

const normalize = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function score(entry, terms) {
  const hay = normalize(`${entry.slug} ${entry.description}`);
  return terms.reduce((acc, t) => (hay.includes(t) ? acc + (entry.slug.includes(t) ? 3 : 1) : acc), 0);
}

const cmd = process.argv[2] || 'list';
const args = process.argv.slice(3);
const manifest = readManifest();

if (cmd === 'list') {
  const byRole = {};
  for (const a of manifest.agents) (byRole[a.role] ||= []).push(a.slug);
  console.log(`\n${manifest.agents.length} sous-agents · ${manifest.skills.length} compétences\n`);
  for (const [role, list] of Object.entries(byRole)) {
    console.log(`  ${role.padEnd(15)} ${list.join(', ')}`);
  }
  console.log('\n  skills          ' + manifest.skills.map((s) => s.name).join(', ') + '\n');
} else if (cmd === 'find') {
  const terms = normalize(args.join(' ')).split(/\s+/).filter(Boolean);
  if (!terms.length) {
    console.error('usage: agents-hub.mjs find "mots-clés"');
    process.exit(1);
  }
  const hits = [...readAgents()]
    .map((a) => ({ ...a, score: score(a, terms) }))
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const skillHits = skills()
    .map((s) => ({ ...s, score: score(s, terms) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  console.log('\nAgents :');
  if (!hits.length) console.log('  (aucun — essaie des mots plus génériques)');
  for (const h of hits) console.log(`  ★${h.score}  ${h.slug.padEnd(26)} ${h.description.slice(0, 96)}`);
  console.log('\nCompétences :');
  if (!skillHits.length) console.log('  (aucune)');
  for (const s of skillHits) console.log(`  ★${s.score}  ${s.slug}`);
  console.log('');
} else if (cmd === 'plan') {
  const wanted = args.length ? new Set(args) : null;
  console.log('\nOrdre d’attaque recommandé :\n');
  const steps = WORKFLOW.filter((s) => !wanted || [...wanted].some((w) => s.includes(w)));
  (steps.length ? steps : WORKFLOW).forEach((s, i) => {
    const exists = fs.existsSync(path.join(AGENTS_DIR, `${s}.md`));
    console.log(`  ${String(i + 1).padStart(2)}. ${s}${exists ? '' : '  (non installé)'}`);
  });
  console.log('\nPuis vérifier : npm run typecheck && npm test && node scripts/audit.js\n');
} else if (cmd === 'doctor') {
  const agents = readAgents();
  const problems = [];
  const seen = new Map();
  for (const a of agents) {
    if (!a.name) problems.push(`${a.slug}: name manquant`);
    if (!a.description) problems.push(`${a.slug}: description manquante`);
    if (a.name && a.name !== a.slug) problems.push(`${a.slug}: name « ${a.name} » ne correspond pas au fichier`);
    if (seen.has(a.name)) problems.push(`${a.slug}: doublon de ${seen.get(a.name)}`);
    seen.set(a.name, a.slug);
  }
  const sk = skills();
  if (!sk.length) problems.push('aucune compétence installée');
  console.log(`\nagents: ${agents.length} · skills: ${sk.length} · problèmes: ${problems.length}`);
  problems.forEach((p) => console.log('  ✗ ' + p));
  console.log(problems.length ? '' : '  ✓ installation saine\n');
  process.exit(problems.length ? 1 : 0);
} else {
  console.error('commandes: list | find <mots> | plan [domaines] | doctor');
  process.exit(1);
}
