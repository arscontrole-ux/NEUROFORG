# 🔌 NEUROFORGE — Connecteurs & Intégrations

Déployez NEUROFORGE sur vos plateformes préférées et connectez-le à vos outils IA.

## 📦 Plateformes de déploiement

### 🐙 GitHub Pages
**CI/CD automatisé · Build en 45 secondes**

- Déploiement automatique à chaque push sur `main`
- GitHub Actions configuré
- SSL gratuit et CDN global
- URL : `https://VOTRE_USER.github.io/neuroforge/`

👉 [Guide de configuration](public/connectors/github.html)

---

### ☁️ Cloudflare Pages
**Edge Global · 300+ data centers**

- Distribution mondiale avec latence < 50ms
- Bande passante illimitée
- Preview deployments pour chaque PR
- DDoS protection incluse
- URL : `https://votre-projet.pages.dev`

👉 [Guide de configuration](public/connectors/cloudflare.html)

---

### 🔷 Netlify
**Serverless · Fonctions & Formulaires**

- Netlify Functions (serverless)
- Formulaires intégrés sans backend
- Edge Functions (Deno/JavaScript)
- Deploy Previews pour chaque PR
- URL : `https://nom-aléatoire.netlify.app`

👉 [Guide de configuration](public/connectors/netlify.html)

---

## 🤖 Intégrations IA

### 🔮 MCP (Model Context Protocol)
**Connectez NEUROFORGE à Claude, Cursor et plus**

Le **Model Context Protocol** est un standard ouvert créé par Anthropic pour connecter des modèles IA à des outils externes. Avec MCP, NEUROFORGE devient un **serveur de contexte** accessible par :

- 🤖 **Claude Desktop** — utilisez vos modèles locaux dans Claude
- 💻 **Cursor IDE** — intégrez l'inférence locale dans votre éditeur
- 🔧 **Outils MCP** — n'importe quel client compatible
- 🌐 **API REST** — exposition HTTP/JSON pour vos scripts

#### Configuration rapide

**1. Activez le serveur MCP dans NEUROFORGE**
```bash
# Dans l'onglet Système → Serveur local
MCP_PORT=3333
MCP_TRANSPORT=stdio|http
```

**2. Configurez Claude Desktop**
```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "neuroforge": {
      "command": "npx",
      "args": ["-y", "@neuroforge/mcp-server"],
      "env": {
        "NEUROFORGE_URL": "http://localhost:1234",
        "NEUROFORGE_MODEL": "llama-3.1-8b-instruct:Q4_K_M"
      }
    }
  }
}
```

**3. Utilisez vos modèles locaux**
```javascript
// Appel MCP depuis Claude Desktop
{
  "method": "tools/call",
  "params": {
    "name": "neuroforge_infer",
    "arguments": {
      "prompt": "Explique le téléchargement multi-parties",
      "model": "llama-3.1-8b-instruct:Q4_K_M",
      "temperature": 0.7
    }
  }
}
```

👉 [Guide complet MCP](public/connectors/mcp.html)

---

## 🚀 Déploiement rapide

### Option 1 : GitHub Pages (recommandé)
```bash
# 1. Créez un dépôt GitHub
git init
git add .
git commit -m "Initial NEUROFORGE"
git remote add origin https://github.com/VOTRE_USER/neuroforge.git
git push -u origin main

# 2. Activez GitHub Pages dans Settings → Pages
# Source : Deploy from a branch → gh-pages

# 3. Le workflow CI/CD se déclenche automatiquement
```

### Option 2 : Netlify CLI
```bash
# Installation
npm install -g netlify-cli

# Développement local
netlify dev

# Déploiement
netlify deploy --prod
```

### Option 3 : Cloudflare CLI
```bash
# Installation
npm install -g wrangler

# Login
wrangler login

# Déploiement
wrangler pages deploy dist
```

---

## 🔒 Sécurité & Confidentialité

Tous les connecteurs respectent la philosophie NEUROFORGE :

- ✅ **100% local** — vos modèles ne quittent jamais votre machine
- ✅ **Open source** — code vérifiable et auditable
- ✅ **Pas de tracking** — aucune télémétrie envoyée
- ✅ **SSL/TLS** — chiffrement de bout en bout
- ✅ **Self-hosted** — vous contrôlez l'infrastructure

---

## 📚 Documentation

- [Page d'accueil](public/connectors/index.html) — vue d'ensemble des connecteurs
- [GitHub](public/connectors/github.html) — configuration CI/CD
- [Cloudflare](public/connectors/cloudflare.html) — edge computing global
- [Netlify](public/connectors/netlify.html) — serverless & fonctions
- [MCP](public/connectors/mcp.html) — intégration IA locale

---

## 🛠 Support

- **Documentation** : [neuroforge.dev/docs](https://neuroforge.dev/docs)
- **GitHub** : [github.com/neuroforge](https://github.com/neuroforge)
- **Discord** : [discord.gg/neuroforge](https://discord.gg/neuroforge)

---

**NEUROFORGE** · Studio IA 100% local · v0.9.4
