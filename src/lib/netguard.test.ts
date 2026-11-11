import { test } from "node:test";
import assert from "node:assert/strict";
import { guardedLookup, isBlockedIp, isPublicHostName, normalHost } from "./netguard";

test("private, loopback, link-local, CGNAT, ULA and mapped addresses are blocked", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "100.127.255.255", "0.0.0.0", "224.0.0.1", "255.255.255.255", "::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:8.8.8.8", "64:ff9b::a00:1", "ff02::1", "2001:db8::1", "not-an-ip"]) assert.equal(isBlockedIp(ip), true, ip);
});

test("public unicast addresses pass", () => {
  for (const ip of ["8.8.8.8", "104.20.46.209", "172.32.0.1", "100.128.0.1", "2606:4700::1111"]) assert.equal(isBlockedIp(ip), false, ip);
});

test("host names: trailing dots stripped, local names and literal IPs refused", () => {
  assert.equal(normalHost("Example.COM.."), "example.com");
  assert.equal(isPublicHostName("example.com."), true);
  for (const h of ["localhost", "localhost.", "a.localhost", "printer.local", "x.internal", "127.0.0.1", "[::1]", "169.254.169.254", "intranet", ""]) assert.equal(isPublicHostName(h), false, h);
});

test("guarded lookup refuses a name that resolves to loopback", async () => {
  const err = await new Promise<NodeJS.ErrnoException | null>((res) => guardedLookup("localhost", {}, (e) => res(e)));
  assert.ok(err);
});
