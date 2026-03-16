// src/lib/icon-registry.ts
import React from "react";
import * as Lucide from "lucide-react";
import { raw } from "express";

// Component type for icons we render
export type IconComponent = React.ComponentType<{ className?: string }>;

// In-memory cache so we don’t recreate components repeatedly
const cache = new Map<string, IconComponent>();

// Optional: allowed hosts for url: icons (security). Keep empty to disable remote icons by default.
let allowedIconHosts: Set<string> = new Set();

// Optional runtime mapping overrides (e.g., from a config JSON or window.__ICON_MAP__)
let runtimeMap: Record<string, string> = {};

// Default alias map (you can keep it minimal and rely on specs)
const aliasMap: Record<string, string> = {
  // Practical examples:
  "home": "lucide:Monitor",
  "dashboard": "lucide:Monitor",
};

// Register runtime mapping (e.g., from server config), no rebuild needed.
export function setIconMap(map: Record<string, string>) {
  runtimeMap = { ...runtimeMap, ...map };
  cache.clear();
}

// Restrict which hosts are allowed for url: icons (VAPT). Empty = none allowed.
export function setAllowedIconHosts(hosts: string[]) {
  allowedIconHosts = new Set(hosts.map(h => h.toLowerCase()));
  cache.clear();
}

function sanitizeSpec(spec?: string) {
  if (!spec) return "";
  return String(spec).slice(0, 256).trim();
}

function toPascalCase(name: string) {
  return name
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}


export function resolveIconComponent(spec?: string): IconComponent {
  const raw = sanitizeSpec(spec);
  if (cache.has(raw)) return cache.get(raw)!;

  // Runtime overrides first: e.g., map "pi pi-home" -> "lucide:Home"
  const mapped = sanitizeSpec(runtimeMap[raw]) || raw;

  // 1) PrimeIcons CSS: "pi pi-..."
  if (/^pi(\s|$)|^pi-/.test(mapped)) {
    const cls = mapped;
    const PrimeIcon: IconComponent = ({ className }) => (
      <i className={`${cls} ${className || ""}`} aria-hidden="true" />
    );
    cache.set(raw, PrimeIcon);
    return PrimeIcon;
  }

  // 2) url: external SVG/PNG (only if allowed for security)
  if (/^url:/i.test(mapped)) {
    try {
      const url = mapped.slice(4).trim();
      const u = new URL(url, window.location.origin);
      if (allowedIconHosts.size > 0 && !allowedIconHosts.has(u.host.toLowerCase())) {
        // fallback if host not allowed
        cache.set(raw, Lucide.Monitor);
        return Lucide.Monitor;
      }
      const ImgIcon: IconComponent = ({ className }) => (
        <img
          src={u.href}
          className={className}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      );
      cache.set(raw, ImgIcon);
      return ImgIcon;
    } catch {
      cache.set(raw, Lucide.Monitor);
      return Lucide.Monitor;
    }
  }

  // 3) lucide:Name
  if (/^lucide:/i.test(mapped)) {
    const nameRaw = mapped.split(":")[1] || "";
    const name = toPascalCase(nameRaw);
    const Cmp = (Lucide as any)[name];
    if (typeof Cmp === "function") {
      cache.set(raw, Cmp);
      return Cmp;
    }
  }

  // 4) Direct Lucide component name (e.g., "Monitor", "UserPlus")
  const direct = toPascalCase(mapped);
  if ((Lucide as any)[direct]) {
    const Cmp = (Lucide as any)[direct];
    cache.set(raw, Cmp);
    return Cmp;
  }

  // 5) Alias → resolve again (e.g., "home" -> "lucide:Monitor")
  const alias = aliasMap[mapped.toLowerCase()];
  if (alias) {
    const Cmp = resolveIconComponent(alias);
    cache.set(raw, Cmp);
    return Cmp;
  }

  // 6) Fallback
  cache.set(raw, Lucide.Monitor);
  return Lucide.Monitor;
}