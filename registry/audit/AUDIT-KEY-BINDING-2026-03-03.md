# HBCE Joker-C2 — Key Binding Audit
Date: 2026-03-03
Scope: Dynamic registry-bound key validation (fail-closed)

## Objective
Verify that Joker-C2 execution is cryptographically bound to the active key
declared in the registry and that mismatch triggers deterministic fail-closed behavior.

## Registry Active Key
sha256:
3ac274ed4b5b735adbf3523a387c8c4925d685d0a0790170d7c9142c1b612305

Manifest:
HBCE-JOKER-C2-KEYRING-1

---

## Test 1 — Valid Key (Expected PASS)

Command:
node cli.js --smoke

Result:
SMOKE_OK key_sha256=3ac274ed4b5b735adbf3523a387c8c4925d685d0a0790170d7c9142c1b612305

---

## Test 2 — Invalid Key (Expected FAIL)

Command:
export JOKER_C2_KEY_SHA256=0000000000000000000000000000000000000000000000000000000000000000
node cli.js --smoke

Result:
FAIL_CLOSED: ACTIVE_KEY_MISMATCH_FAIL_CLOSED

---

## Conclusion

Joker-C2 execution is cryptographically bound to the active registry key.
Any mismatch results in deterministic fail-closed behavior.

Audit status: PASS
