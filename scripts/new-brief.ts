/** Creates topics/inbox/<slug>.md from the brief template. Usage: npm run new <slug> [--pillar=GEO] [--format=explainer] [--length=45] */
import fs from "node:fs";
import { r } from "./lib/paths.ts";

export function briefTemplate(o: { slug: string; pillar?: string; format?: string; length?: number; topic?: string; angle?: string; points?: string[]; sources?: string[]; cta?: string }) {
  return `---
slug: ${o.slug}
pillar: ${o.pillar ?? "GEO"}              # SEO | GEO | AIO
format: ${o.format ?? "explainer"}        # explainer | myth-bust | tutorial | news-take | comparison
length: ${o.length ?? 45}               # target seconds
---
## Topic
${o.topic ?? ""}

## My angle
${o.angle ?? "One or two sentences of your own opinion. Required."}

## Key points
${(o.points?.length ? o.points : ["..."]).map((p) => `- ${p}`).join("\n")}

## Sources
${(o.sources?.length ? o.sources : ["https://... : what this source proves"]).map((s) => `- ${s}`).join("\n")}

## CTA
${o.cta ?? "Follow for one GEO tip a day"}
`;
}

if (process.argv[1]?.endsWith("new-brief.ts")) {
  const slug = process.argv[2];
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    console.error("Usage: npm run new <kebab-case-slug>");
    process.exit(1);
  }
  const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
  const file = r("topics", "inbox", `${slug}.md`);
  if (fs.existsSync(file)) {
    console.error(`topics/inbox/${slug}.md already exists`);
    process.exit(1);
  }
  fs.writeFileSync(file, briefTemplate({ slug, pillar: arg("pillar"), format: arg("format"), length: arg("length") ? +arg("length")! : undefined }));
  console.log(`Created topics/inbox/${slug}.md — fill in the topic and your angle, then run /draft ${slug}`);
}
