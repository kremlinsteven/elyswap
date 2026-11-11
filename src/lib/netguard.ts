/*
 * Outbound fetch guard for URLs that come from chain data (agent cards). Anyone can put any link on chain, so the server only
 * connects to public addresses: the host name is resolved, every answer is checked, and the connection is made to the checked
 * address itself (a custom lookup on the socket), so a second DNS answer (rebinding) cannot swap in a private one.
 */
import { lookup as dnsLookup } from "node:dns";
import { isIP } from "node:net";

/** Normalises a host: lower case, no trailing dots, no brackets. */
export function normalHost(host: string): string {
  return host.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.+$/, "");
}

/** Host names that never resolve to the public internet. Literal IPs are refused too: a card link must name a host. */
export function isPublicHostName(host: string): boolean {
  const h = normalHost(host);
  if (!h || !h.includes(".")) return false;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".home.arpa")) return false;
  if (isIP(h)) return false;
  return /^[a-z0-9.-]+$/.test(h);
}

function v4Parts(ip: string): number[] | null {
  const p = ip.split(".").map(Number);
  return p.length === 4 && p.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? p : null;
}

/** True for any address that is not plain public unicast: loopback, private, link-local, CGNAT, ULA, mapped, multicast, reserved. */
export function isBlockedIp(ip: string): boolean {
  const a = normalHost(ip);
  const fam = isIP(a);
  if (fam === 4) {
    const p = v4Parts(a);
    if (!p) return true;
    const [x, y] = p;
    if (x === 0 || x === 10 || x === 127) return true;
    if (x === 169 && y === 254) return true; // link-local, cloud metadata
    if (x === 172 && y >= 16 && y <= 31) return true;
    if (x === 192 && y === 168) return true;
    if (x === 100 && y >= 64 && y <= 127) return true; // CGNAT
    if (x === 192 && y === 0 && (p[2] === 0 || p[2] === 2)) return true;
    if (x === 198 && (y === 18 || y === 19)) return true;
    if (x === 198 && y === 51 && p[2] === 100) return true;
    if (x === 203 && y === 0 && p[2] === 113) return true;
    if (x >= 224) return true; // multicast + reserved + broadcast
    return false;
  }
  if (fam === 6) {
    if (a === "::" || a === "::1") return true;
    // IPv4-mapped / translated forms carry an IPv4 address: refuse them outright rather than parse every spelling.
    if (a.startsWith("::ffff:") || a.startsWith("64:ff9b:") || /^::(\d+\.){3}\d+$/.test(a)) return true;
    const first = parseInt(a.split(":")[0] || "0", 16);
    if ((first & 0xfe00) === 0xfc00) return true; // ULA fc00::/7
    if ((first & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
    if ((first & 0xff00) === 0xff00) return true; // multicast
    if (first === 0x2001 && a.split(":")[1] === "db8") return true; // documentation
    return false;
  }
  return true;
}

type LookupCb = (err: NodeJS.ErrnoException | null, address: string | { address: string; family: number }[], family?: number) => void;

/** A dns.lookup replacement for sockets: resolves, refuses if ANY answer is blocked, and hands back only checked addresses. */
export function guardedLookup(hostname: string, options: { all?: boolean } | number | undefined, cb: LookupCb) {
  dnsLookup(normalHost(hostname), { all: true }, (err, list) => {
    if (err) return cb(err, "");
    const addrs = (list as { address: string; family: number }[]) ?? [];
    if (!addrs.length || addrs.some((x) => isBlockedIp(x.address))) {
      const e = new Error("Refused: the host resolves to a non-public address.") as NodeJS.ErrnoException;
      e.code = "EREFUSED_PRIVATE";
      return cb(e, "");
    }
    if (typeof options === "object" && options?.all) return cb(null, addrs);
    cb(null, addrs[0].address, addrs[0].family);
  });
}
