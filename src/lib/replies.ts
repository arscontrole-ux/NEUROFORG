// Moteur d'inférence local simulé — génère des réponses françaises
// contextualisées, ensuite diffusées token par token par la vue Chat.

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function topicOf(prompt: string): string {
  const clean = prompt.replace(/[?!.\n]+/g, " ").trim();
  const words = clean.split(" ").filter((w) => w.length > 3);
  return words.slice(0, 6).join(" ") || "ce sujet";
}

export interface GenOptions {
  temperature: number;
  systemPrompt: string;
}

export function generateReply(prompt: string, opts: GenOptions): string {
  const p = prompt.toLowerCase();
  const sys = opts.systemPrompt.toLowerCase();
  const concise = sys.includes("concis") || sys.includes("court") || opts.temperature < 0.3;
  const topic = topicOf(prompt);

  // — salutations —
  if (/^(bonjour|salut|hello|bonsoir|coucou|yo|hey)\b/.test(p)) {
    return pick([
      `Bonjour ! 👋 Je tourne **entièrement sur votre machine** — aucun octet ne quitte votre GPU. Comment puis-je vous aider aujourd'hui ?`,
      `Salut ! Ravi de vous lire. Je suis chargé en mémoire locale et prêt à générer : rédaction, code, analyse, brainstorming… que faisons-nous ?`,
      `Bonsoir ! Les poids sont chauds, la VRAM est prête. Posez votre question, je m'occupe du reste — en circuit fermé, comme toujours.`,
    ]);
  }

  // — identité —
  if (/(qui es[- ]tu|t'es qui|tu es qui|ton nom|présente[- ]toi|c'est quoi ce modèle)/.test(p)) {
    return `Je suis un **modèle de langage exécuté en local** via NEUROFORGE. Concrètement :

- mes poids (format **GGUF**) sont stockés sur votre disque ;
- l'inférence tourne sur votre GPU/CPU — aucune requête cloud ;
- mes paramètres d'échantillonnage (température, top-p…) sont réglables dans le panneau de droite.

Vous pouvez me télécharger en plusieurs parties, me mettre en pause, me recharger : tout reste sur votre machine.`;
  }

  // — blagues —
  if (/(blague|humour|marrant|drôle|rigol)/.test(p)) {
    return pick([
      `Pourquoi les développeurs confondent Halloween et Noël ? Parce que **OCT 31 == DEC 25**. 🎃

(jeu de mots en base 8 et base 10 — je sors, je retourne dans ma VRAM)`,
      `Un GPU entre dans un bar et commande 10 000 verres. Le barman : « Sérieusement ? » Le GPU : « Oui, je prends tout **en parallèle** ».`,
      `— Combien de tokens faut-il pour changer une ampoule ?
— Aucun : c'est un problème de **context window**, elle était déjà grillée avant le prompt.`,
    ]);
  }

  // — poésie —
  if (/(poème|poesie|poésie|des vers|écris.*vers)/.test(p)) {
    return `Voici quelques vers générés localement, à température ${opts.temperature.toLocaleString("fr-FR")} :

*Dans le silence des ventilateurs,*
*trente milliards de multiplications*
*tissent des phrases, des lueurs —*
*une pensée sans connexion.*

*Point de cloud, point de serveur lointain :*
*juste du silicium, votre machine,*
*et des mots qui naissent en chemin,*
*pesés en Go, comptés en racines.*`;
  }

  // — code —
  if (/(code|fonction|function|python|javascript|typescript|react|sql|regex|api|bug|erreur|script|composant)/.test(p)) {
    if (/(python|py\b)/.test(p)) {
      return `Voici une base propre en **Python** :

\`\`\`python
from pathlib import Path

def lire_lignes(chemin: str) -> list[str]:
    """Lit un fichier et retourne ses lignes non vides."""
    p = Path(chemin)
    if not p.exists():
        raise FileNotFoundError(f"Fichier introuvable : {chemin}")
    return [l.strip() for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]

if __name__ == "__main__":
    for ligne in lire_lignes("donnees.txt"):
        print(ligne)
\`\`\`

Points clés : **type hints**, gestion d'erreur explicite, et encodage UTF-8 forcé (indispensable sous Windows). Dites-moi si vous voulez la version async ou une variante pandas.`;
    }
    if (/(javascript|typescript|react|ts\b|js\b)/.test(p)) {
      return `Voici une implémentation **TypeScript / React** :

\`\`\`tsx
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
\`\`\`

Le \`cleanup\` dans \`useEffect\` évite les fuites de timers — l'erreur classique. Je peux l'adapter en hook de fetch avec annulation \`AbortController\` si besoin.`;
    }
    return `Voici une structure générique et robuste :

\`\`\`ts
async function avecReprise<T>(
  fn: () => Promise<T>,
  tentatives = 3,
  delai = 500
): Promise<T> {
  for (let i = 0; i < tentatives; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === tentatives - 1) throw e;
      await new Promise((r) => setTimeout(r, delai * 2 ** i)); // backoff exponentiel
    }
  }
  throw new Error("inatteignable");
}
\`\`\`

Le **backoff exponentiel** est le même principe que le téléchargement multi-parties : en cas d'échec, on reprend sans tout recommencer. Précisez le langage et je vous fais une version sur mesure.`;
  }

  // — explication —
  if (/(explique|c'est quoi|comment (ça|ca) marche|pourquoi|différence|difference)/.test(p)) {
    const base = `Bonne question. Voici comment je décompose **${topic}** :

1. **Le principe** — on isole d'abord l'idée centrale : ce que le concept fait, et surtout ce qu'il ne fait pas.
2. **Le mécanisme** — ensuite le fonctionnement interne, étape par étape, comme un pipeline : entrée → transformation → sortie.
3. **En pratique** — enfin les cas d'usage réels, avec leurs compromis (performance, complexité, maintenance).

> L'intuition clé : la plupart des systèmes complexes ne sont que des systèmes simples répétés avec discipline.`;
    return concise ? base.split("\n\n")[0] + "\n\n" + base.split("\n\n")[1] : base + `\n\nVoulez-vous que je creuse un point en particulier — le mécanisme, ou les cas pratiques ?`;
  }

  // — remerciements —
  if (/^(merci|super|parfait|génial|top)\b/.test(p)) {
    return pick([
      `Avec plaisir ! C'est exactement pour ça que je tourne en local : disponible 24/7, zéro latence réseau, zéro fuite de données. 🫡`,
      `De rien ! N'hésitez pas à enchaîner — ma fenêtre de contexte se souvient de toute notre conversation.`,
    ]);
  }

  // — défaut : réponse structurée qui reprend le sujet —
  const variants = [
    `Intéressant. Prenons **${topic}** et déroulons le raisonnement.

D'abord, le cadrage : la question se joue à deux niveaux — ce qui est *techniquement possible* et ce qui est *souhaitable en pratique*. Trop de réponses confondent les deux.

Ensuite, les faits : dans la grande majorité des cas observés, 80 % du résultat vient de 20 % des causes. Identifier ces leviers tôt évite des semaines d'efforts dispersés.

Enfin, ma recommandation : **commencez petit, mesurez, itérez**. Un prototype imparfait qui tourne vaut mieux qu'une architecture parfaite sur le papier.

${concise ? "" : "Souhaitez-vous que je développe un axe en particulier, ou que je propose un plan d'action concret ?"}`,
    `Voici mon analyse sur **${topic}**, générée avec une température de ${opts.temperature.toLocaleString("fr-FR")} :

- **Constat** — le sujet est plus simple qu'il n'y paraît une fois débarrassé du jargon. Trois variables dominent réellement le résultat.
- **Levier principal** — c'est presque toujours la qualité des entrées. Garbage in, garbage out : aucun réglage fin ne compense des données médiocres.
- **Piège classique** — optimiser prématurément. On polit les 2 derniers pourcents pendant que les 20 premiers pourcents restent à capturer.

En résumé : simplifiez d'abord, mesurez ensuite, optimisez en dernier. C'est contre-intuitif, et c'est précisément pour ça que ça marche.`,
    `Sujet riche ! Sur **${topic}**, je vois trois angles complémentaires :

1. **L'angle technique** — ce que les outils permettent aujourd'hui, et leurs limites réelles (pas celles des brochures).
2. **L'angle humain** — l'adoption réelle, qui dépend plus de la friction quotidienne que des fonctionnalités.
3. **L'angle temporel** — ce qui sera encore vrai dans deux ans versus ce qui est un effet de mode.

Ma synthèse : misez sur les fondamentaux stables, gardez une veille légère sur le reste. Et gardez vos données en local — vous êtes bien placé pour le savoir. 😄`,
  ];
  return pick(variants);
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.round(text.length / 3.6));
}
