// Valibot schemas for the four agent-served JSON files. Parsed at build time
// so a renamed/dropped field on the agent fails the portfolio build with a
// clear path-of-blame, not silent stringified `undefined` in production HTML.

import * as v from "valibot";

const Url = v.pipe(v.string(), v.url());

const InlineToken = v.union([
  v.string(),
  v.object({ em: v.string() }),
  v.object({ code: v.string() }),
  v.object({ link: v.string(), url: Url }),
]);
const Paragraph = v.array(InlineToken);

const Ref = v.object({
  text: v.string(),
  url: v.optional(Url),
});

export const Profile = v.object({
  name: v.string(),
  preferredName: v.optional(v.string()),
  role: v.string(),
  location: v.string(),
  availability: v.string(),
  tagline: v.string(),
  summary: v.string(),
  contact: v.object({
    primaryChannel: v.string(),
    linkedin: Url,
    github: Url,
    portfolio: Url,
  }),
  stack: v.record(v.string(), v.array(v.string())),
  focus: v.optional(v.object({
    current: v.optional(v.string()),
    areas: v.optional(v.array(v.string())),
    trajectory: v.optional(v.string()),
  })),
  hero: v.optional(v.object({
    lead: v.string(),
    body: v.string(),
    statusLabel: v.string(),
  })),
  about: v.optional(v.object({
    headline: v.string(),
    paragraphs: v.array(v.string()),
  })),
  currentRole: v.optional(v.object({
    title: v.string(),
    employer: v.object({ name: v.string(), url: Url }),
    since: v.string(),
    yearsLabel: v.string(),
  })),
  // The grounding-only fields below are tolerated but not consumed by render.
  workflow: v.optional(v.unknown()),
  credentials: v.optional(v.unknown()),
});

export const WorkPayload = v.object({
  items: v.array(v.object({
    title: v.string(),
    tagline: v.string(),
    body: v.array(Paragraph),
    tags: v.array(v.string()),
    category: v.string(),
    period: v.string(),
  })),
});

export const ExperiencePayload = v.object({
  intro: v.optional(v.string()),
  rows: v.array(v.object({
    years: v.string(),
    title: v.string(),
    titleClient: v.optional(Ref),
    company: Ref,
    companySuffix: v.optional(v.string()),
    companyExtra: v.optional(v.object({
      text: v.string(),
      url: v.optional(Url),
      joiner: v.optional(v.string()),
    })),
    location: v.optional(v.string()),
    paragraphs: v.array(Paragraph),
  })),
});

export const CommunityPayload = v.object({
  sections: v.array(v.object({ id: v.string(), label: v.string() })),
  items: v.array(v.object({
    bucket: v.string(),
    date: v.string(),
    title: v.string(),
    org: Ref,
    venue: v.optional(v.string()),
    body: v.array(Paragraph),
    links: v.optional(v.array(v.object({ label: v.string(), url: Url }))),
  })),
});

export type Profile = v.InferOutput<typeof Profile>;
export type WorkPayload = v.InferOutput<typeof WorkPayload>;
export type ExperiencePayload = v.InferOutput<typeof ExperiencePayload>;
export type CommunityPayload = v.InferOutput<typeof CommunityPayload>;

// Format a Valibot issue as a build-readable line.
export function formatIssues(filename: string, issues: ReadonlyArray<v.BaseIssue<unknown>>): string {
  const lines = issues.slice(0, 10).map((iss) => {
    const path = (iss.path ?? []).map((p) => p.key).join(".") || "<root>";
    return `  • ${path}: ${iss.message}`;
  });
  return `[portfolio build] ${filename} failed schema validation:\n${lines.join("\n")}`;
}
