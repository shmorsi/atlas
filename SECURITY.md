# Security

ATLAS is a single-user research app. It has no accounts and no authentication.

- The development and production servers bind to `127.0.0.1`. Do not publish the process on `0.0.0.0` or a LAN address.
- Docker must be published as `127.0.0.1:8000:8000`. Inside the container the process listens on all interfaces so Docker can forward that port. The host prefix is what keeps it on this machine.
- `TrustedHostMiddleware` allows `127.0.0.1`, `localhost`, and `testserver`.
- POST, PUT, and PATCH bodies larger than 4,000,000 bytes are rejected. A mutation whose `Origin` is not this host, or the local Vite dev origin, is rejected.
- Checkpoint loads use `weights_only=True` and the CPU device.
- This repository does not contain cloud credentials or API tokens.

Report a vulnerability through [private vulnerability reporting](https://github.com/shmorsi/atlas/security/advisories) for this repository. Do not open a public issue for an unfixed security bug.
