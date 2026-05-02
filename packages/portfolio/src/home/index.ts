// Tier-1 home page initialisers. Imported by boot.ts immediately after
// content paint — small, synchronous, no network.

import { initFooterYear } from "./footer-year.js";
import { initNav } from "./nav.js";
import { initReveals } from "./reveals.js";
import { initSweep } from "./sweep.js";
import { initTuiStream } from "./tui-stream.js";

initFooterYear();
initNav();
initReveals();
initSweep();
initTuiStream();
