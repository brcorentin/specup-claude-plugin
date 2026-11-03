# specup-workflow — plugin Claude Code `dw`

Marketplace Claude Code personnelle contenant un seul plugin, **`dw`** : un workflow de développement multi-agents réutilisable sur des monorepos TypeScript (NestJS, Next.js, Postgres, Turborepo).

- Tickets : **Linear** (serveur MCP officiel, OAuth).
- Code : **git** uniquement (fetch, pull, branches, commits, push).
- PR : abstraction **forge** configurée par projet (`.claude/workflow.json` → `forge`), GitHub MCP par défaut.
- Exécution : Claude Code en local (abonnement Max), aucune clé d'API.

```
.claude-plugin/marketplace.json     marketplace "specup-workflow"
plugins/dw/
  .claude-plugin/plugin.json        plugin "dw"
  agents/                           product-engineer, em, dev, qa, doc
  skills/                           bootstrap, epic, spec, run, ask, doc
  hooks/                            garde-fous (guard.mjs) et notifications (notify.mjs)
  .mcp.json                         serveurs MCP linear et github
  templates/                        epic, spec-technique, ticket, rapport-qa, pr, adr, doc-module
  reference/                        schéma workflow.json, machine à états, conventions docs, adaptateurs forge
```

## Prérequis

- Claude Code ≥ 2.1.295, connecté avec ton abonnement (`claude` puis `/login`).
- `git` et **Node.js ≥ 20** dans le `PATH` (les hooks sont des scripts Node, cross-platform).
- Sous Windows : Git for Windows (fournit Git Bash, utilisé par Claude Code).
- Docker (pour Postgres des tests d'intégration des projets cibles).
- Côté **Linear**, pour chaque équipe utilisée (`/dw:bootstrap` affiche la checklist) :
  - les statuts du workflow : Backlog, Product Ready, Todo, In Progress, In QA, QA Failed, Ready for Review, Done (ou tes propres noms, mappés dans `.claude/workflow.json`) ;
  - l'intégration GitHub activée, avec « passer à Done au merge de la PR ». Sans elle, aucun bloqueur n'atteint Done et `/dw:run` ne trouve jamais de ticket prêt ;
  - recommandé : « auto-close parent issues », pour qu'une user story passe à Done quand tous ses tickets le sont.

## Installation

### Depuis le clone local (développement du plugin)

```bash
claude plugin marketplace add C:/Users/coren/dev/specup-claude-plugin
claude plugin install dw@specup-workflow
```

Une marketplace ajoutée depuis un dossier local est lue **en place** : une modification des fichiers du plugin est prise en compte par `/reload-plugins` dans une session ouverte, ou au démarrage de la session suivante.

Pour tester sans installer : `claude --plugin-dir C:/Users/coren/dev/specup-claude-plugin/plugins/dw`.

### Depuis GitHub (repo privé, autre machine)

Le repo est privé : Claude Code le clone avec **tes identifiants git** (clé SSH ou credential manager). Vérifie d'abord que `git clone` du repo fonctionne dans un terminal.

```bash
claude plugin marketplace add <owner>/<repo>          # ex. corentinbras/specup-claude-plugin
claude plugin install dw@specup-workflow
```

## Mise à jour

```bash
claude plugin marketplace update specup-workflow    # récupère le dernier commit de la marketplace
claude plugin update dw@specup-workflow             # met à jour le plugin installé
```

Dans une session : `/plugin` → onglet **Installed** → `dw`, puis `/reload-plugins`.

Côté auteur : incrémente `version` dans `plugins/dw/.claude-plugin/plugin.json` à chaque release, sinon les installations depuis GitHub restent sur la version précédente.

## Réinstallation sur une nouvelle machine

1. Installer Claude Code, git, Node.js ≥ 20, Docker ; `claude` puis `/login`.
2. Vérifier l'accès git au repo privé (`git clone` de test).
3. `claude plugin marketplace add <owner>/<repo>` puis `claude plugin install dw@specup-workflow`.
4. Recréer la variable d'environnement `GITHUB_PERSONAL_ACCESS_TOKEN` (voir ci-dessous).
5. Ouvrir `claude`, lancer `/mcp` et s'authentifier sur Linear.
6. Dans chaque projet, rien à réinstaller : `.claude/workflow.json`, `.claude/settings.json`, `CLAUDE.md` et `docs/` sont versionnés dans le projet.

Aucun secret n'est stocké dans ce repo ni dans les projets : le token GitHub vit dans une variable d'environnement de la machine, la session Linear dans le stockage sécurisé de Claude Code.

## Authentification des serveurs MCP

Le plugin déclare deux serveurs dans `plugins/dw/.mcp.json`. Ils apparaissent dans `/mcp` sous `plugin:dw:linear` et `plugin:dw:github`.

### Linear (OAuth)

1. Lancer `claude` dans n'importe quel dossier.
2. `/mcp` → `plugin:dw:linear` → **Authenticate** → valider dans le navigateur.

Si tu as déjà un connecteur Linear ailleurs (claude.ai, config utilisateur), les agents `dw` n'utilisent que `plugin:dw:linear`.

### GitHub (Personal Access Token)

Le serveur MCP distant de GitHub ne propose pas l'OAuth à Claude Code : il faut un PAT. Le plugin ne charge que les outils de lecture et de création de PR (en-tête `X-MCP-Tools`) ; l'outil de merge n'est pas exposé. En plus, le hook `guard.mjs` refuse tout outil MCP de forge dont le nom contient `merge`, `accept` ou `approve`, sauf les outils de lecture.

1. GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate new token.
   - Repository access : uniquement les repos des projets.
   - Permissions : **Contents : Read-only**, **Pull requests : Read and write**, Metadata : Read-only (imposé).
   - Expiration : 90 jours conseillés.
2. Définir la variable d'environnement **utilisateur** `GITHUB_PERSONAL_ACCESS_TOKEN` :
   - Windows (PowerShell) : `[Environment]::SetEnvironmentVariable('GITHUB_PERSONAL_ACCESS_TOKEN', '<token>', 'User')` puis rouvrir le terminal.
   - macOS / Linux : `export GITHUB_PERSONAL_ACCESS_TOKEN=<token>` dans `~/.zshrc` ou `~/.bashrc`.
3. Relancer `claude`, puis `/mcp` : `plugin:dw:github` doit être **connected**.

Le push et le pull n'utilisent pas ce token : ils passent par tes identifiants git habituels.

## Utilisation dans un projet

| Commande | Rôle | Gate humain |
| :- | :- | :- |
| `/dw:bootstrap` | Repo existant : scanne et génère `CLAUDE.md`, `.claude/workflow.json`, `.claude/settings.json`, `docs/`, labels Linear, et te fait choisir le Project Linear de travail (existant, nouveau, ou aucun). Projet vide : discovery produit, ADR de stack, puis tickets Fondations dans un Project existant ou créé (« Fondations » proposé). | Validation avant écriture ; validation de la stack avant tout code |
| `/dw:epic` | Session avec le product-engineer → Project Linear + user stories | Validation du Project |
| `/dw:spec <project>` | L'em écrit la spec technique, les ADR et les tickets | Validation avant le dev |
| `/dw:run` | Boucle séquentielle : ticket prêt → dev → qa (≤ 3 allers-retours) → suivant ; récapitulatif des PR à relire | Relecture et merge des PR |
| `/dw:ask <question>` | Répond depuis `docs/` en citant les fichiers | — |
| `/dw:doc [project]` | Avec un Project : doc de fin de Project. Sans argument : met `docs/modules/` à jour pour les tickets mergés pas encore documentés. Ouvre une PR de documentation. (`/dw:run` le fait aussi automatiquement au démarrage.) | Relecture de la PR |

Rien n'est jamais poussé sur la branche de base : bootstrap, doc produit, spec et doc de modules arrivent chacun par une PR que tu merges. Merge la PR de bootstrap avant `/dw:epic`, celle de la doc produit avant `/dw:spec`, et celle de la spec avant `/dw:run`.

Garde-fous (hook `guard.mjs`, actif uniquement dans les projets qui ont un `.claude/workflow.json`) : pas de force-push, pas de push sur la branche de base, pas de suppression hors du repo, pas de merge via MCP. En cas d'erreur interne, le hook refuse l'appel par sécurité.

Détails : `plugins/dw/reference/` (schéma de `workflow.json`, machine à états Linear, conventions de documentation, adaptateurs forge).

## Développement du plugin

```bash
claude plugin validate .                 # marketplace + plugin
claude plugin validate plugins/dw --strict
node --test plugins/dw/hooks/scripts/guard.test.mjs   # tests des garde-fous
```
