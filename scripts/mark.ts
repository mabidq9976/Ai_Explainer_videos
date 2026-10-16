/** Records a step's state for the dashboard. Usage: npm run mark <slug> <step> <running|done|failed> ["note"] */
import { requireSlug } from "./lib/paths.ts";
import { setStep, STEPS, type Step } from "./lib/status.ts";

const slug = requireSlug();
const [, step, state, note] = process.argv.slice(2);
if (!STEPS.includes(step as Step) || !["running", "done", "failed", "idle"].includes(state)) {
  console.error(`Usage: npm run mark <slug> <${STEPS.join("|")}> <running|done|failed> [note]`);
  process.exit(1);
}
setStep(slug, step as Step, state as any, note ? { note } : {});
console.log(`${slug}: ${step} → ${state}`);
