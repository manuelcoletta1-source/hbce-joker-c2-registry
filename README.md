# hbce-joker-c2-registry

Sovereign append-only public registry for **HBCE JOKER-C2**.

This repository publishes **public, hash-only** governance artifacts:
- signed snapshots
- monthly append-only ledger (public view)
- keyring (public keys + rotation metadata)
- revocations list
- registry head pointer (current state)

Design principles:
- EU-first posture
- audit-first
- fail-closed verification model
- evidence-by-design
- GDPR-min: **no personal data** in the public registry

## Repository layout
registry/ _meta/          # head pointer (current state) genesis/        # genesis act (immutable) keys/           # public keys + keyring revocations/    # revocations list snapshots/      # dated snapshots (signed) ledger/         # monthly ledger files (public view) manifests/      # release pack manifests (signed)
## Notes

- Private keys must never be committed.
- Public keys are allowed (by design).
- Signatures (`.sig`) and digests (`.sha256`) are part of the registry contract.
