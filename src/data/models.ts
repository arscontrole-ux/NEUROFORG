import type { ModelDef } from "../types";

export interface QuantDef {
  id: string;
  factor: number; // Go par milliard de paramètres
  note: string;
}

export const QUANTS: QuantDef[] = [
  { id: "Q4_K_M", factor: 0.58, note: "Recommandé · excellent rapport qualité / poids" },
  { id: "Q5_K_M", factor: 0.69, note: "Plus précis, légèrement plus lourd" },
  { id: "Q8_0", factor: 1.06, note: "Quantification quasi sans perte" },
  { id: "FP16", factor: 2.05, note: "Poids complet — réservé aux grosses GPUs" },
];

export const MODELS: ModelDef[] = [
  {
    id: "llama-3.1-8b-instruct",
    name: "Llama 3.1 8B Instruct",
    org: "Meta",
    params: 8,
    arch: "Llama 3.1",
    context: "128k",
    tps: 42,
    tags: ["polyvalent", "français", "instruct"],
    desc: "Le polyvalent de référence pour le chat, la rédaction et l'analyse. Très à l'aise en français.",
    hue: 24,
  },
  {
    id: "mistral-7b-v0.3",
    name: "Mistral 7B v0.3",
    org: "Mistral AI",
    params: 7,
    arch: "Mistral",
    context: "32k",
    tps: 47,
    tags: ["français", "rapide", "instruct"],
    desc: "Compact et vif, excellent en français grâce à son tokenizer multilingue enrichi.",
    hue: 174,
  },
  {
    id: "phi-3.5-mini",
    name: "Phi-3.5 Mini",
    org: "Microsoft",
    params: 3.8,
    arch: "Phi-3",
    context: "128k",
    tps: 82,
    tags: ["léger", "raisonnement"],
    desc: "Petit par la taille, grand par le raisonnement. Idéal pour tester l'inférence locale.",
    hue: 205,
  },
  {
    id: "gemma-2-9b-it",
    name: "Gemma 2 9B IT",
    org: "Google",
    params: 9,
    arch: "Gemma 2",
    context: "8k",
    tps: 38,
    tags: ["polyvalent", "instruct"],
    desc: "Solide sur les tâches d'instruction, avec une génération structurée très propre.",
    hue: 258,
  },
  {
    id: "qwen2.5-coder-7b",
    name: "Qwen2.5 Coder 7B",
    org: "Alibaba",
    params: 7,
    arch: "Qwen2.5",
    context: "128k",
    tps: 44,
    tags: ["code", "complétion"],
    desc: "Spécialiste du code : complétion, refactorisation et explication sur 90+ langages.",
    hue: 145,
  },
  {
    id: "deepseek-r1-distill-7b",
    name: "DeepSeek R1 Distill 7B",
    org: "DeepSeek",
    params: 7,
    arch: "R1 Distill",
    context: "128k",
    tps: 40,
    tags: ["raisonnement", "maths"],
    desc: "Raisonnement pas-à-pas distillé de R1. Pense avant de répondre, littéralement.",
    hue: 210,
  },
  {
    id: "llama-3.2-3b-instruct",
    name: "Llama 3.2 3B Instruct",
    org: "Meta",
    params: 3,
    arch: "Llama 3.2",
    context: "128k",
    tps: 88,
    tags: ["léger", "rapide", "edge"],
    desc: "Conçu pour l'embarqué : tourne confortablement sur CPU avec une latence minimale.",
    hue: 35,
  },
  {
    id: "mixtral-8x7b-v0.1",
    name: "Mixtral 8×7B v0.1",
    org: "Mistral AI",
    params: 46.7,
    arch: "MoE",
    context: "32k",
    tps: 9,
    tags: ["MoE", "expert", "lourd"],
    desc: "Mixture-of-Experts : 46,7 MdP dont 12,9 actifs par token. Le poids lourd du catalogue.",
    hue: 320,
  },
  {
    id: "starcoder2-3b",
    name: "StarCoder2 3B",
    org: "BigCode",
    params: 3,
    arch: "StarCoder2",
    context: "16k",
    tps: 95,
    tags: ["code", "léger"],
    desc: "Complétion de code ultra-rapide, entraîné sur The Stack v2 (600+ langages).",
    hue: 55,
  },
  {
    id: "nous-hermes-2-mistral",
    name: "Nous Hermes 2",
    org: "Nous Research",
    params: 7,
    arch: "Mistral",
    context: "32k",
    tps: 45,
    tags: ["créatif", "rôle", "français"],
    desc: "Fine-tune créatif sur base Mistral : jeux de rôle, fiction et tonalités variées.",
    hue: 280,
  },
  {
    id: "codellama-13b",
    name: "Code Llama 13B",
    org: "Meta",
    params: 13,
    arch: "Llama 2",
    context: "100k",
    tps: 24,
    tags: ["code", "infilling"],
    desc: "Génération et remplissage de code (FIM) avec une fenêtre de 100k tokens.",
    hue: 95,
  },
  {
    id: "yi-1.5-9b-chat",
    name: "Yi 1.5 9B Chat",
    org: "01.AI",
    params: 9,
    arch: "Yi 1.5",
    context: "200k",
    tps: 36,
    tags: ["long contexte", "multilingue"],
    desc: "Fenêtre de contexte de 200k tokens : avale des documents entiers sans broncher.",
    hue: 190,
  },
];

export function quantDef(id: string): QuantDef {
  return QUANTS.find((q) => q.id === id) ?? QUANTS[0];
}

export function sizeBytes(m: ModelDef, quantId: string): number {
  const q = quantDef(quantId);
  return Math.round(m.params * q.factor * 1024 * 1024 * 1024);
}

export function vramBytes(m: ModelDef, quantId: string): number {
  return Math.round(sizeBytes(m, quantId) * 1.15 + 512 * 1024 * 1024);
}

export function modelById(id: string): ModelDef | undefined {
  return MODELS.find((m) => m.id === id);
}

export function splitKey(key: string): { modelId: string; quant: string } {
  const i = key.indexOf(":");
  return { modelId: key.slice(0, i), quant: key.slice(i + 1) };
}

export function keyLabel(key: string): string {
  const { modelId, quant } = splitKey(key);
  const m = modelById(modelId);
  return m ? `${m.name} · ${quant}` : key;
}
