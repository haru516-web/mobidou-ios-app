import type { Env, VerifiedTransaction } from "./types.ts";

const encoder = new TextEncoder();
type DerElement = { tag: number; start: number; contentStart: number; contentEnd: number; end: number };
type Certificate = {
  der: Uint8Array;
  tbs: Uint8Array;
  signature: Uint8Array;
  signatureOid: string;
  issuer: Uint8Array;
  subject: Uint8Array;
  spki: Uint8Array;
  notBefore: Date;
  notAfter: Date;
  isCa: boolean;
  canSignCertificates: boolean | null;
  canSignData: boolean | null;
};

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const fromBase64Url = (value: string): Uint8Array => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - (normalized.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

export function randomToken(byteLength = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function hashSecret(secret: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function equalSecretHash(expected: string, actual: string): boolean {
  if (expected.length !== actual.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) mismatch |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  return mismatch === 0;
}

function readElement(bytes: Uint8Array, start: number): DerElement {
  if (start + 2 > bytes.length) throw new Error("Truncated ASN.1 data");
  const tag = bytes[start];
  let cursor = start + 1;
  const firstLength = bytes[cursor++];
  let length = firstLength;
  if ((firstLength & 0x80) !== 0) {
    const count = firstLength & 0x7f;
    if (count === 0 || count > 4 || cursor + count > bytes.length) throw new Error("Invalid ASN.1 length");
    length = 0;
    for (let i = 0; i < count; i += 1) length = length * 256 + bytes[cursor++];
  }
  const contentStart = cursor;
  const contentEnd = contentStart + length;
  if (contentEnd > bytes.length) throw new Error("ASN.1 value is truncated");
  return { tag, start, contentStart, contentEnd, end: contentEnd };
}

function children(bytes: Uint8Array, parent: DerElement): DerElement[] {
  const result: DerElement[] = [];
  for (let cursor = parent.contentStart; cursor < parent.contentEnd;) {
    const child = readElement(bytes, cursor);
    if (child.end > parent.contentEnd) throw new Error("ASN.1 child exceeds parent bounds");
    result.push(child);
    cursor = child.end;
  }
  return result;
}

function elementBytes(bytes: Uint8Array, element: DerElement): Uint8Array {
  return bytes.slice(element.start, element.end);
}

function contentBytes(bytes: Uint8Array, element: DerElement): Uint8Array {
  return bytes.slice(element.contentStart, element.contentEnd);
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}

function oidValue(bytes: Uint8Array): string {
  const element = readElement(bytes, 0);
  if (element.tag !== 0x06 || element.end !== bytes.length || element.contentStart === element.contentEnd) throw new Error("Invalid ASN.1 OID");
  const values: number[] = [];
  let current = 0;
  for (let i = element.contentStart; i < element.contentEnd; i += 1) {
    const byte = bytes[i];
    current = current * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) { values.push(current); current = 0; }
  }
  if (current !== 0 || values.length === 0) throw new Error("Invalid ASN.1 OID encoding");
  const first = values.shift()!;
  const firstArc = first < 40 ? 0 : first < 80 ? 1 : 2;
  return [firstArc, first - firstArc * 40, ...values].join(".");
}

function parseAsn1Date(bytes: Uint8Array, element: DerElement): Date {
  const value = new TextDecoder().decode(contentBytes(bytes, element));
  let year: number; let rest: string;
  if (element.tag === 0x17) {
    const shortYear = Number(value.slice(0, 2));
    year = shortYear >= 50 ? 1900 + shortYear : 2000 + shortYear;
    rest = value.slice(2);
  } else if (element.tag === 0x18) {
    year = Number(value.slice(0, 4));
    rest = value.slice(4);
  } else throw new Error("Unsupported X.509 time format");
  const digits = rest.replace(/Z$/, "").replace(/\.\d+$/, "");
  if (!/^\d{10,12}$/.test(digits) || !value.endsWith("Z")) throw new Error("Unsupported X.509 time encoding");
  const padded = digits.padEnd(12, "0");
  const date = new Date(Date.UTC(year, Number(padded.slice(0, 2)) - 1, Number(padded.slice(2, 4)),
    Number(padded.slice(4, 6)), Number(padded.slice(6, 8)), Number(padded.slice(8, 10))));
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid X.509 date");
  return date;
}

function extensionProperties(bytes: Uint8Array, extension: DerElement): { oid: string; value: Uint8Array } {
  const fields = children(bytes, extension);
  const oid = oidValue(elementBytes(bytes, fields[0]));
  const octetString = fields.find((field) => field.tag === 0x04);
  if (!octetString) throw new Error("X.509 extension has no value");
  return { oid, value: contentBytes(bytes, octetString) };
}

function parseCertificate(der: Uint8Array): Certificate {
  const outer = readElement(der, 0);
  const parts = children(der, outer);
  if (outer.tag !== 0x30 || parts.length !== 3) throw new Error("Malformed X.509 certificate");
  const [tbsElement, algorithmElement, signatureElement] = parts;
  const tbsFields = children(der, tbsElement);
  let offset = tbsFields[0]?.tag === 0xa0 ? 1 : 0;
  const serial = tbsFields[offset++];
  const tbsAlgorithm = tbsFields[offset++];
  const issuerElement = tbsFields[offset++];
  const validityElement = tbsFields[offset++];
  const subjectElement = tbsFields[offset++];
  const spkiElement = tbsFields[offset++];
  if (!serial || !tbsAlgorithm || !issuerElement || !validityElement || !subjectElement || !spkiElement || signatureElement.tag !== 0x03) {
    throw new Error("Malformed X.509 certificate fields");
  }
  const validity = children(der, validityElement);
  const algOid = oidValue(elementBytes(der, children(der, algorithmElement)[0]));
  const tbsAlgOid = oidValue(elementBytes(der, children(der, tbsAlgorithm)[0]));
  if (algOid !== tbsAlgOid) throw new Error("X.509 signature algorithms do not match");
  const signatureBytes = contentBytes(der, signatureElement);
  if (signatureBytes[0] !== 0) throw new Error("Unsupported X.509 signature bit padding");
  let isCa = false;
  let canSignCertificates: boolean | null = null;
  let canSignData: boolean | null = null;
  for (const extensionContainer of tbsFields.filter((field) => field.tag === 0xa3)) {
    const extensionSequence = children(der, extensionContainer)[0];
    for (const extension of children(der, extensionSequence)) {
      const parsed = extensionProperties(der, extension);
      const valueElement = readElement(parsed.value, 0);
      if (parsed.oid === "2.5.29.19") {
        const basicFields = children(parsed.value, valueElement);
        isCa = basicFields.some((field) => field.tag === 0x01 && contentBytes(parsed.value, field)[0] !== 0);
      } else if (parsed.oid === "2.5.29.15") {
        const bits = contentBytes(parsed.value, valueElement);
        canSignData = bits.length > 1 && (bits[1] & 0x80) !== 0;
        canSignCertificates = bits.length > 1 && (bits[1] & 0x04) !== 0;
      }
    }
  }
  return {
    der,
    tbs: elementBytes(der, tbsElement),
    signature: signatureBytes.slice(1),
    signatureOid: algOid,
    issuer: elementBytes(der, issuerElement),
    subject: elementBytes(der, subjectElement),
    spki: elementBytes(der, spkiElement),
    notBefore: parseAsn1Date(der, validity[0]),
    notAfter: parseAsn1Date(der, validity[1]),
    isCa,
    canSignCertificates,
    canSignData
  };
}

function keyInfo(spki: Uint8Array): { type: "EC" | "RSA"; curve?: string } {
  const root = readElement(spki, 0);
  const [algorithm] = children(spki, root);
  const fields = children(spki, algorithm);
  const algorithmOid = oidValue(elementBytes(spki, fields[0]));
  if (algorithmOid === "1.2.840.10045.2.1") {
    const curveOid = oidValue(elementBytes(spki, fields[1]));
    if (curveOid === "1.2.840.10045.3.1.7") return { type: "EC", curve: "P-256" };
    if (curveOid === "1.3.132.0.34") return { type: "EC", curve: "P-384" };
  }
  if (algorithmOid === "1.2.840.113549.1.1.1") return { type: "RSA" };
  throw new Error("Unsupported X.509 public key algorithm");
}

function ecdsaDerToRaw(signature: Uint8Array, coordinateLength: number): Uint8Array {
  const root = readElement(signature, 0);
  const [rElement, sElement] = children(signature, root);
  const normalize = (element: DerElement): Uint8Array => {
    let value = contentBytes(signature, element);
    while (value.length > 1 && value[0] === 0) value = value.slice(1);
    if (value.length > coordinateLength) throw new Error("ECDSA signature integer is too large");
    const output = new Uint8Array(coordinateLength);
    output.set(value, coordinateLength - value.length);
    return output;
  };
  const r = normalize(rElement);
  const s = normalize(sElement);
  const output = new Uint8Array(coordinateLength * 2);
  output.set(r);
  output.set(s, coordinateLength);
  return output;
}

async function verifyCertificate(child: Certificate, issuer: Certificate): Promise<boolean> {
  const key = keyInfo(issuer.spki);
  if (key.type === "EC") {
    const hash = child.signatureOid === "1.2.840.10045.4.3.2" ? "SHA-256" :
      child.signatureOid === "1.2.840.10045.4.3.3" ? "SHA-384" : null;
    if (!hash || !key.curve) return false;
    const coordinateLength = key.curve === "P-256" ? 32 : 48;
    const publicKey = await crypto.subtle.importKey("spki", asArrayBuffer(issuer.spki), { name: "ECDSA", namedCurve: key.curve }, false, ["verify"]);
    return crypto.subtle.verify({ name: "ECDSA", hash }, publicKey, asArrayBuffer(ecdsaDerToRaw(child.signature, coordinateLength)), asArrayBuffer(child.tbs));
  }
  const hash = child.signatureOid === "1.2.840.113549.1.1.11" ? "SHA-256" :
    child.signatureOid === "1.2.840.113549.1.1.12" ? "SHA-384" : null;
  if (!hash) return false;
  const publicKey = await crypto.subtle.importKey("spki", asArrayBuffer(issuer.spki), { name: "RSASSA-PKCS1-v1_5", hash }, false, ["verify"]);
  return crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, asArrayBuffer(child.signature), asArrayBuffer(child.tbs));
}

function pemCertificates(pem: string): Certificate[] {
  const matches = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) ?? [];
  return matches.map((entry) => parseCertificate(Uint8Array.from(atob(entry.replace(/-----[^-]+-----|\s/g, "")), (character) => character.charCodeAt(0))));
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function validateChain(x5c: string[], rootsPem: string, now = new Date()): Promise<Certificate> {
  if (x5c.length === 0 || x5c.length > 6) throw new Error("JWS certificate chain is missing or too long");
  const chain = x5c.map((entry) => parseCertificate(Uint8Array.from(atob(entry), (character) => character.charCodeAt(0))));
  const roots = pemCertificates(rootsPem);
  if (roots.length === 0) throw new Error("No Apple root certificates are configured");
  for (const certificate of [...chain, ...roots]) {
    if (now < certificate.notBefore || now > certificate.notAfter) throw new Error("Certificate is outside its validity period");
  }
  if (chain[0].isCa || chain[0].canSignData === false) throw new Error("JWS signing certificate is not permitted to sign data");
  for (let i = 0; i < chain.length - 1; i += 1) {
    const child = chain[i];
    const issuer = chain[i + 1];
    if (!sameBytes(child.issuer, issuer.subject) || !issuer.isCa || issuer.canSignCertificates === false || !(await verifyCertificate(child, issuer))) {
      throw new Error("JWS certificate chain signature is invalid");
    }
  }
  const last = chain[chain.length - 1];
  let trusted = false;
  for (const root of roots) {
    if (sameBytes(last.der, root.der) && root.isCa) { trusted = true; break; }
    if (sameBytes(last.issuer, root.subject) && root.isCa && root.canSignCertificates !== false && await verifyCertificate(last, root)) {
      trusted = true;
      break;
    }
  }
  if (!trusted) throw new Error("JWS certificate chain does not terminate at a configured Apple root");
  return chain[0];
}

/** Verifies a compact ES256 JWS and validates every x5c link to configured trust roots. */
export async function verifySignedPayload(jws: string, env: Pick<Env, "APPLE_ROOT_CERTIFICATES" | "APPLE_BUNDLE_ID">): Promise<Record<string, unknown>> {
  const parts = jws.split(".");
  if (parts.length !== 3) throw new Error("Malformed compact JWS");
  const header = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[0]))) as { alg?: string; x5c?: string[] };
  if (header.alg !== "ES256" || !Array.isArray(header.x5c) || header.x5c.some((cert) => typeof cert !== "string")) {
    throw new Error("Only ES256 JWS with an x5c chain is accepted");
  }
  if (!env.APPLE_ROOT_CERTIFICATES) throw new Error("APPLE_ROOT_CERTIFICATES is not configured");
  const leaf = await validateChain(header.x5c, env.APPLE_ROOT_CERTIFICATES);
  const key = keyInfo(leaf.spki);
  if (key.type !== "EC" || key.curve !== "P-256") throw new Error("StoreKit JWS signing key must be P-256");
  const publicKey = await crypto.subtle.importKey("spki", asArrayBuffer(leaf.spki), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const validSignature = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" }, publicKey, asArrayBuffer(fromBase64Url(parts[2])), encoder.encode(`${parts[0]}.${parts[1]}`)
  );
  if (!validSignature) throw new Error("JWS signature is invalid");
  const payload: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[1])));
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("JWS payload must be an object");
  const record = payload as Record<string, unknown>;
  if (typeof record.bundleId === "string" && (!env.APPLE_BUNDLE_ID || record.bundleId !== env.APPLE_BUNDLE_ID)) {
    throw new Error("Unexpected app bundle ID");
  }
  return record;
}

/** Verifies StoreKit transaction fields in addition to the signed certificate chain. */
export async function verifySignedTransaction(jws: string, env: Pick<Env, "APPLE_ROOT_CERTIFICATES" | "APPLE_BUNDLE_ID">): Promise<VerifiedTransaction> {
  const payload = await verifySignedPayload(jws, env);
  if (typeof payload.transactionId !== "string" || typeof payload.productId !== "string" ||
      typeof payload.bundleId !== "string" || typeof payload.purchaseDate !== "number") {
    throw new Error("JWS transaction payload is incomplete");
  }
  if (!env.APPLE_BUNDLE_ID || payload.bundleId !== env.APPLE_BUNDLE_ID) throw new Error("Unexpected app bundle ID");
  return {
    transactionId: payload.transactionId,
    ...(typeof payload.originalTransactionId === "string" ? { originalTransactionId: payload.originalTransactionId } : {}),
    productId: payload.productId,
    bundleId: payload.bundleId,
    purchaseDate: payload.purchaseDate,
    ...(typeof payload.expiresDate === "number" ? { expiresDate: payload.expiresDate } : {}),
    ...(typeof payload.revocationDate === "number" ? { revocationDate: payload.revocationDate } : {})
  };
}
