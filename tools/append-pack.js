import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function die(msg){ process.stderr.write(String(msg)+"\n"); process.exit(1); }
function sha256Hex(buf){ return crypto.createHash("sha256").update(buf).digest("hex"); }

function canonicalJson(obj){
  const stable = (v)=>{
    if (v===null || typeof v!=="object") return v;
    if (Array.isArray(v)) return v.map(stable);
    const out={};
    for (const k of Object.keys(v).sort()) out[k]=stable(v[k]);
    return out;
  };
  return JSON.stringify(stable(obj), null, 2) + "\n";
}

function readJson(p){
  try{ return JSON.parse(fs.readFileSync(p,"utf8")); } catch { return null; }
}

function tailLine(p){
  if (!fs.existsSync(p)) return null;
  const s = fs.readFileSync(p,"utf8").trimEnd();
  if (!s) return null;
  const lines = s.split("\n");
  return lines[lines.length-1] || null;
}

function computePackEntryHash(packDirAbs){
  const manifestObj = readJson(path.join(packDirAbs,"PACK_MANIFEST.json"));
  const resultObj   = readJson(path.join(packDirAbs,"RESULT.json"));
  const chainObj    = readJson(path.join(packDirAbs,"CHAIN_ENTRY.json"));
  if (!manifestObj || !resultObj || !chainObj) die("FAIL_CLOSED: PACK_JSON_INVALID");

  // HBCE preimage: remove refs.entry_hash/blob_sha256 and chain.entry_hash
  const m = JSON.parse(JSON.stringify(manifestObj));
  if (m.refs){ delete m.refs.entry_hash; delete m.refs.blob_sha256; }
  const c = JSON.parse(JSON.stringify(chainObj));
  delete c.entry_hash;

  const mSha = sha256Hex(Buffer.from(canonicalJson(m),"utf8"));
  const rSha = sha256Hex(Buffer.from(canonicalJson(resultObj),"utf8"));
  const cSha = sha256Hex(Buffer.from(canonicalJson(c),"utf8"));

  const signingBlob = Buffer.from([mSha,rSha,cSha].join("\n")+"\n","utf8");
  const entryHash = sha256Hex(signingBlob);

  return { entryHash, mSha, rSha, cSha, manifestObj, resultObj, chainObj };
}

const argv = process.argv.slice(2);
if (argv.length < 2){
  die("Usage: node tools/append-pack.js <path-to-pack-dir> <path-to-ledger.jsonl>");
}

const packDirAbs = path.resolve(process.cwd(), argv[0]);
const ledgerAbs  = path.resolve(process.cwd(), argv[1]);

if (!fs.existsSync(packDirAbs)) die("FAIL_CLOSED: PACK_DIR_NOT_FOUND");

const { entryHash, mSha, rSha, cSha, manifestObj, resultObj, chainObj } = computePackEntryHash(packDirAbs);
const entryFromDir = path.basename(packDirAbs);

if (entryFromDir !== entryHash) die("FAIL_CLOSED: PACK_DIR_HASH_MISMATCH");
if (chainObj?.entry_hash && chainObj.entry_hash !== entryHash) die("FAIL_CLOSED: CHAIN_ENTRY_HASH_MISMATCH");
if (manifestObj?.refs?.entry_hash && manifestObj.refs.entry_hash !== entryHash) die("FAIL_CLOSED: MANIFEST_ENTRY_HASH_MISMATCH");

// ledger prev must match last entry_hash
const last = tailLine(ledgerAbs);
if (!last) die("FAIL_CLOSED: LEDGER_EMPTY (missing GENESIS?)");
const lastObj = JSON.parse(last);
const expectedPrev = lastObj?.entry_hash;
if (!expectedPrev) die("FAIL_CLOSED: LEDGER_CORRUPT");

const now = new Date().toISOString();
const nextHeight = (typeof lastObj.height === "number" ? lastObj.height + 1 : null);
if (nextHeight === null) die("FAIL_CLOSED: LEDGER_CORRUPT height");

const lineObj = {
  v: "HBCE-PACK-LEDGER-1",
  height: nextHeight,
  ts: now,
  entry_hash: entryHash,
  prev_entry_hash: expectedPrev,
  pack: {
    entry_hash: entryHash,
    kind: manifestObj?.kind || null,
    proto: manifestObj?.proto || null,
    issuer: manifestObj?.issuer || null,
    created_at: manifestObj?.created_at || null,
    status: resultObj?.status || null
  },
  blob_sha256: { PACK_MANIFEST: mSha, RESULT: rSha, CHAIN_ENTRY: cSha }
};

fs.mkdirSync(path.dirname(ledgerAbs), { recursive:true });
fs.appendFileSync(ledgerAbs, JSON.stringify(lineObj) + "\n", "utf8");

process.stdout.write("APPENDED height=" + nextHeight + " entry_hash=" + entryHash + "\n");
