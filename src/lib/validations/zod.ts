import { z } from "zod";

// Zod probes `new Function()` to enable its JIT; our CSP (no 'unsafe-eval')
// blocks that and the browser reports a violation. Jitless mode skips the probe.
z.config({ jitless: true });

export { z };
