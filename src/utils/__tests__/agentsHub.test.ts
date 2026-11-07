/**
 * Garde-fou du « club d'agents » (.claude/agents + .claude/skills).
 *
 * Ces fichiers sont du texte versionné : s'ils sont tronqués, renommés ou
 * dupliqués, les sous-agents cessent d'être invocables sans erreur visible.
 * Ce test vérifie l'intégrité de l'installation à chaque `npm test`.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const agentsDir = path.join(root, '.claude/agents');
const skillsDir = path.join(root, '.claude/skills');

type Agent = { file: string; name: string; description: string };

function readAgents(): Agent[] {
  return fs
    .readdirSync(agentsDir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const txt = fs.readFileSync(path.join(agentsDir, file), 'utf8');
      const fm = (txt.match(/^---\n([\s\S]*?)\n---/) || [])[1] || '';
      const field = (k: string) =>
        ((fm.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) || [])[1] || '')
          .replace(/^["']|["']$/g, '')
          .trim();
      return { file, name: field('name'), description: field('description') };
    });
}

describe('club d’agents open source', () => {
  it('installe au moins 80 sous-agents', () => {
    expect(fs.existsSync(agentsDir)).toBe(true);
    expect(readAgents().length).toBeGreaterThanOrEqual(80);
  });

  it('donne à chaque agent un nom identique à son fichier et une description', () => {
    const problems = readAgents()
      .filter((a) => !a.description || a.name !== a.file.replace(/\.md$/, ''))
      .map((a) => a.file);
    expect(problems).toEqual([]);
  });

  it('n’a aucun nom d’agent en double', () => {
    const names = readAgents().map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('couvre les métiers demandés (design, UI/UX, code, API, sécurité, tests, perf, planification)', () => {
    const names = new Set(readAgents().map((a) => a.name));
    const requis = [
      'ui-designer',
      'design-system-architect',
      'ux-researcher',
      'frontend-developer',
      'mobile-developer',
      'backend-architect',
      'api-designer',
      'security-auditor',
      'penetration-tester',
      'test-automator',
      'performance-engineer',
      'accessibility-expert',
      'project-manager',
      'code-reviewer',
    ];
    expect(requis.filter((r) => !names.has(r))).toEqual([]);
  });

  it('installe des compétences avec un SKILL.md valide', () => {
    const skills = fs.readdirSync(skillsDir);
    expect(skills.length).toBeGreaterThanOrEqual(30);
    for (const s of skills) {
      const file = path.join(skillsDir, s, 'SKILL.md');
      expect(fs.existsSync(file)).toBe(true);
      const fm = fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
      expect(fm).not.toBeNull();
      expect(fm?.[1]).toMatch(/^name:/m);
      expect(fm?.[1]).toMatch(/^description:/m);
    }
  });

  it('conserve le manifeste synchronisé avec les fichiers présents', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, '.claude/agents-hub.json'), 'utf8'));
    const onDisk = readAgents().map((a) => a.name).sort();
    const inManifest = manifest.agents.map((a: { slug: string }) => a.slug).sort();
    expect(inManifest).toEqual(onDisk);
  });
});
