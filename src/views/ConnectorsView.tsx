import { Icon } from "../components/icons";
import type { IconName } from "../components/icons";

interface Connector {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  color: string;
  badge: string;
  url: string;
  features: string[];
}

const CONNECTORS: Connector[] = [
  {
    id: "github",
    name: "GitHub Pages",
    description: "Déploiement automatisé avec CI/CD. Build et publication en 45 secondes à chaque push sur main.",
    icon: "download",
    color: "#f0f6fc",
    badge: "CI/CD",
    url: "/connectors/github.html",
    features: ["GitHub Actions", "Auto-deploy", "SSL gratuit", "CDN global"],
  },
  {
    id: "cloudflare",
    name: "Cloudflare Pages",
    description: "Distribution mondiale sur 300+ data centers. Latence ultra-faible, bande passante illimitée.",
    icon: "net",
    color: "#f48120",
    badge: "Edge Global",
    url: "/connectors/cloudflare.html",
    features: ["300+ data centers", "< 50ms latence", "Preview deployments", "DDoS protection"],
  },
  {
    id: "netlify",
    name: "Netlify",
    description: "Fonctions serverless, formulaires intégrés et edge functions. Déploiement continu depuis Git.",
    icon: "server",
    color: "#00c7b7",
    badge: "Serverless",
    url: "/connectors/netlify.html",
    features: ["Netlify Functions", "Forms intégrés", "Edge Functions", "Identity"],
  },
  {
    id: "mcp",
    name: "MCP",
    description: "Model Context Protocol — connectez NEUROFORGE à Claude Desktop, Cursor et tous les clients MCP.",
    icon: "cpu",
    color: "#8b5cf6",
    badge: "AI Tools",
    url: "/connectors/mcp.html",
    features: ["Claude Desktop", "Cursor IDE", "Tools & Resources", "JSON-RPC 2.0"],
  },
];

export function ConnectorsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-extrabold text-[22px] tracking-tight">Connecteurs & Intégrations</h2>
        <p className="text-dim text-[13px] mt-1">
          Déployez NEUROFORGE sur vos plateformes préférées et connectez-le à vos outils IA
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CONNECTORS.map((c) => (
          <a
            key={c.id}
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="panel p-5 flex flex-col gap-3 transition-all duration-200 hover:border-line2 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-18px_rgba(0,0,0,.7)] group"
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${c.color}15`, color: c.color }}
              >
                <Icon name={c.icon} size={24} />
              </div>
              <span
                className="font-mono text-[10.5px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: `${c.color}20`, color: c.color }}
              >
                {c.badge}
              </span>
            </div>

            <div>
              <h3 className="font-display font-bold text-[16px] mb-1">{c.name}</h3>
              <p className="text-dim text-[13px] leading-relaxed">{c.description}</p>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-auto">
              {c.features.map((f) => (
                <span key={f} className="chip !text-[10.5px]">
                  {f}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 text-ember2 font-semibold text-[13px] pt-2 border-t border-line/50 group-hover:gap-3 transition-all">
              Configurer {c.name}
              <Icon name="arrowRight" size={14} />
            </div>
          </a>
        ))}
      </div>

      <div className="panel p-5 border-teal/25">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-teal/15 border border-teal/35 flex items-center justify-center text-teal shrink-0">
            <Icon name="shield" size={20} />
          </div>
          <div>
            <h3 className="font-display font-bold text-[15px] mb-1">Sécurité & Confidentialité</h3>
            <p className="text-dim text-[13px] leading-relaxed">
              Tous les connecteurs respectent la philosophie NEUROFORGE : <span className="text-teal font-semibold">100% local</span>. 
              Vos modèles et données ne quittent jamais votre machine. Les déploiements sont publics mais l'inférence reste locale.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
