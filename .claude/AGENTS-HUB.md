# Agents & compétences installés (hub open source)

Généré le 2026-11-06 — **92 sous-agents**, **45 compétences**.
Aucun agent ne nécessite de clé API : ce sont des prompts/policies locaux exécutés par la session.

## Sous-agents par domaine

### design (8)

`design-system-architect` · `ui-designer` · `brand-guardian` · `visual-storyteller` · `whimsy-injector` · `design-bridge` · `ui-visual-validator` · `frontend-designer`

### ux (3)

`ux-researcher` · `ux-microcopy-reviewer` · `ui-ux-tester`

### codeur (8)

`frontend-developer` · `mobile-developer` · `fullstack-developer` · `backend-developer` · `rapid-prototyper` · `mobile-app-builder` · `code-refactorer` · `typescript-pro`

### backend (6)

`backend-architect` · `database-architect` · `backend-security-coder` · `sql-pro` · `microservices-architect` · `auth-integration-engineer`

### api (5)

`api-designer` · `graphql-architect` · `websocket-engineer` · `webhook-engineer` · `api-tester`

### securite (4)

`security-auditor` · `threat-modeling-expert` · `compliance-mapper` · `supply-chain-auditor`

### pentest (15)

`penetration-tester` · `engagement-planner` · `attack-planner` · `web-hunter` · `api-security` · `mobile-pentester` · `code-auditor` · `threat-modeler` · `risk-scorer` · `fix-verifier` · `report-generator` · `vuln-scanner` · `credential-tester` · `password-auditor` · `poc-validator`

### tester (5)

`test-automator` · `test-writer-fixer` · `qa-expert` · `tdd-orchestrator` · `test-results-analyzer`

### interface (2)

`accessibility-expert` · `accessibility-tester`

### optimisation (5)

`performance-engineer` · `performance-benchmarker` · `observability-engineer` · `performance-monitor` · `workflow-optimizer`

### planification (10)

`project-manager` · `product-manager` · `sprint-prioritizer` · `backlog-grooming` · `project-shipper` · `studio-producer` · `experiment-tracker` · `assumption-mapping` · `prd-writer` · `project-task-planner`

### orchestration (11)

`agent-organizer` · `task-distributor` · `workflow-orchestrator` · `multi-agent-coordinator` · `agent-installer` · `codebase-orchestrator` · `error-coordinator` · `context-manager` · `memory-curator` · `knowledge-synthesizer` · `swarm-orchestrator`

### revue (6)

`code-reviewer` · `architect-reviewer` · `surgeon-reviewer` · `ponder-auditor` · `debugger` · `error-detective`

### documentation (4)

`technical-writer` · `content-quality-editor` · `ai-writing-auditor` · `scrum-master`

## Compétences (skills)

`adaptive-layout` · `accessibility-as-code` · `design-review-workflow` · `design-visual-parity` · `design-system-structure` · `performance-budgets` · `motion-and-animation` · `forms-and-input` · `ui-states-and-feedback` · `ui-component-library` · `navigation-and-routing` · `screen-contracts` · `persistence-and-migrations` · `data-export-and-restore` · `settings-and-preferences` · `dates-streaks-and-statistics` · `local-notifications` · `quality-gates` · `tdd-workflow` · `unit-and-component-tests` · `golden-and-snapshot-tests` · `typescript-and-lint-rules` · `react-components-and-hooks` · `react-native-conventions-index` · `state-management-zustand` · `async-safety` · `value-objects-money-and-units` · `web-support` · `expo-prebuild-and-config-plugins` · `permissions-and-system-prompts` · `audio-and-haptics-feedback` · `troubleshooting-playbook` · `git-commits-and-reporting` · `ci-pipeline-and-gates` · `app-startup-and-bootstrap` · `spec-traceability` · `naming-conventions` · `privacy-and-store-declarations` · `e2e-maestro` · `crash-reporting-and-observability` · `icons-app-icon-and-splash` · `architecture-and-boundaries` · `dependency-management` · `superdesign` · `project-architect`

## Provenance

| Dépôt | Licence | Commit |
| --- | --- | --- |
| wshobson/agents | MIT | 4bde316 |
| VoltAgent/awesome-claude-code-subagents | MIT | ed74d11 |
| contains-studio/agents | non déclarée | a5a480c |
| 0xSteph/pentest-ai-agents | MIT | e5d7aa0 |
| iannuttall/claude-agents | MIT | f7df2c3 |
| mustafakendiguzel/claude-code-ui-agents | MIT | e224ca0 |

Détail machine : `.claude/agents-hub.json`.

## Mode d’emploi

```bash
npm run agents              # liste les agents par domaine
npm run agents -- find "design de bouton"   # qui sait faire quoi
npm run agents -- plan design ui code       # ordre d’attaque conseillé
npm run agents:doctor       # vérifie l’intégrité de l’installation
```

Dans la session de coding, on invoque un sous-agent par son nom (Task/subagent),
ou on laisse la session en convoquer plusieurs en parallèle. Les compétences
se chargent à la demande depuis `.claude/skills/<nom>/SKILL.md`.

## Correspondance avec la mission GBECHE

| Besoin | Agents à convoquer | Compétences |
| --- | --- | --- |
| Design « waouh », liquid glass | `ui-designer`, `design-system-architect`, `brand-guardian` | `design-system-structure`, `design-visual-parity`, `superdesign` |
| UI/UX, textes, parcours | `ux-researcher`, `ux-microcopy-reviewer`, `ui-ux-tester` | `ui-states-and-feedback`, `ui-component-library` |
| Code app (Expo/RN) | `mobile-developer`, `frontend-developer`, `typescript-pro` | `react-components-and-hooks`, `typescript-and-lint-rules`, `screen-contracts` |
| Backend, base locale | `backend-architect`, `database-architect`, `sql-pro` | `persistence-and-migrations`, `value-objects-money-and-units` |
| Performances, jank | `performance-engineer`, `performance-benchmarker` | `performance-budgets`, `motion-and-animation` |
| Responsivité / tablettes | `frontend-developer`, `ui-designer` | `adaptive-layout`, `web-support` |
| Accessibilité | `accessibility-expert`, `accessibility-tester` | `accessibility-as-code` |
| Tests | `test-automator`, `test-writer-fixer`, `qa-expert` | `tdd-workflow`, `unit-and-component-tests`, `golden-and-snapshot-tests` |
| Sécurité, pentest de notre app | `security-auditor`, `threat-modeling-expert`, `penetration-tester`, `mobile-pentester` | `quality-gates`, `privacy-and-store-declarations` |
| Planification | `project-manager`, `product-manager`, `backlog-grooming` | `project-architect`, `spec-traceability` |
| Revue avant livraison | `code-reviewer`, `architect-reviewer`, `debugger` | `quality-gates`, `git-commits-and-reporting` |

## Règles d’usage

- **Aucune clé API** : ce sont des prompts et des politiques locales ; ils tournent dans la session.
- **Pentest** : uniquement sur notre propre application. Les agents offensifs (`web-hunter`,
  `api-security`, `mobile-pentester`…) ne doivent jamais viser un tiers.
- Les sources sont figées aux commits ci-dessus ; pour mettre à jour, relancer le script
  d’installation après un nouveau `git clone`.
- Les `templates/`, `examples/` et `tests/` des compétences sont volontairement exclus pour
  garder le dépôt léger : c’est la doctrine, pas les fixtures, qui nous intéresse.
