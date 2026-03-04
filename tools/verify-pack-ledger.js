import fs from "node:fs";
import crypto from "node:crypto";

function die(msg){ process.stderr.write(String(msg)+"\n"); process.exit(1); }
function sha256Hex(buf){ return crypto.createHash("sha256").update(buf).digest("hex"); }

const argv = process.argv.slice(2);
if (argv.length < 1) die("Usage: node tools/verify-pack-ledger.js <path-to-ledger.jsonl>");

const ledgerAbs = argv[0];
if (!fs.existsSync(ledgerAbs)) die("FAIL: ledger not found");

const lines = fs.readFileSync(ledgerAbs, "utf8").trimEnd().split("\n").filter(Boolean);
if (lines.length < 1) die("FAIL: empty ledger");

let prev = null;

for (let i=0;i<lines.length;i++){
  let obj;
  try{ obj = JSON.parse(lines[i]); } catch { die("FAIL: JSON_INVALID at line " + (i+1)); }

  if (i===0){
    if (obj.entry_hash !== "GENESIS") die("FAIL: missing GENESIS");
    prev = obj.entry_hash;
    continue;
  }

  if (obj.prev_entry_hash !== prev) die("FAIL: CHAIN_BROKEN at line " + (i+1));
  if (!obj.entry_hash || typeof obj.entry_hash !== "string") die("FAIL: missing entry_hash at line " + (i+1));

  // Minimal sanity: entry_hash looks like sha256 hex
  if (!/^[0-9a-f]{64}$/i.test(obj.entry_hash)) die("FAIL: bad entry_hash format at line " + (i+1));

  prev = obj.entry_hash;
}

process.stdout.write("PASS_LEDGER lines=" + lines.length + " head=" + prev + "\n");
