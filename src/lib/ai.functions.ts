import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callAI(messages: any[], tool?: any) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const body: any = { model: MODEL, messages };
  if (tool) {
    body.tools = [tool];
    body.tool_choice = { type: "function", function: { name: tool.function.name } };
  }
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("Rate limit hit. Try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings.");
  if (!res.ok) throw new Error(`AI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  if (tool) {
    const args = msg?.tool_calls?.[0]?.function?.arguments;
    return args ? JSON.parse(args) : null;
  }
  return msg?.content ?? "";
}

/* ---------------- Daily Planner ---------------- */
export const aiDailyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { context: string }) => d)
  .handler(async ({ data }) => {
    const tool = {
      type: "function",
      function: {
        name: "daily_plan",
        description: "Return a focused daily plan with time blocks.",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string", description: "One-line Hinglish encouragement (e.g. 'Aaj 4 ghante deep work karte hain, bas.')" },
            blocks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  start_time: { type: "string", description: "HH:MM 24h" },
                  end_time: { type: "string", description: "HH:MM 24h" },
                  task: { type: "string" },
                  category: { type: "string", enum: ["DSA","Aptitude","SQL","DevOps","QA","Job Apps","Project","Class","Break","Other"] },
                },
                required: ["start_time","end_time","task","category"],
              },
            },
          },
          required: ["summary","blocks"],
        },
      },
    };
    return await callAI(
      [
        { role: "system", content: "You are Taiyaar, a placement coach for Indian engineering students. Plan realistically. Include breaks. Use friendly Hinglish in the summary only." },
        { role: "user", content: `Plan today.\n\nContext:\n${data.context}` },
      ],
      tool,
    );
  });

/* ---------------- Overload Detector ---------------- */
export const aiOverload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { context: string }) => d)
  .handler(async ({ data }) => {
    const tool = {
      type: "function",
      function: {
        name: "overload_check",
        description: "Detect burnout / overload risk from recent activity.",
        parameters: {
          type: "object",
          properties: {
            risk: { type: "string", enum: ["low","medium","high"] },
            score: { type: "number", description: "0-100, higher = more overloaded" },
            signals: { type: "array", items: { type: "string" } },
            advice: { type: "string", description: "Short Hinglish advice, 1-2 sentences" },
          },
          required: ["risk","score","signals","advice"],
        },
      },
    };
    return await callAI(
      [
        { role: "system", content: "You analyze a student's last 14 days of tracker data. Be honest but kind. Output Hinglish advice." },
        { role: "user", content: data.context },
      ],
      tool,
    );
  });

/* ---------------- Placement Probability ---------------- */
export const aiProbability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { context: string }) => d)
  .handler(async ({ data }) => {
    const tool = {
      type: "function",
      function: {
        name: "probability_score",
        description: "Estimate probability of getting an offer based on current profile and pipeline.",
        parameters: {
          type: "object",
          properties: {
            probability: { type: "number", description: "0-100" },
            confidence: { type: "string", enum: ["low","medium","high"] },
            strengths: { type: "array", items: { type: "string" } },
            gaps: { type: "array", items: { type: "string" } },
            next_actions: { type: "array", items: { type: "string" }, description: "3 concrete next steps" },
          },
          required: ["probability","confidence","strengths","gaps","next_actions"],
        },
      },
    };
    return await callAI(
      [
        { role: "system", content: "You estimate placement offer probability for Indian engineering students. Be calibrated, not optimistic. Use evidence." },
        { role: "user", content: data.context },
      ],
      tool,
    );
  });

/* ---------------- Resume Review ---------------- */
export const aiResumeReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { resume: string; targetRole?: string }) => d)
  .handler(async ({ data }) => {
    const tool = {
      type: "function",
      function: {
        name: "resume_review",
        description: "Review a resume and return actionable feedback.",
        parameters: {
          type: "object",
          properties: {
            score: { type: "number", description: "0-100 overall" },
            ats_score: { type: "number", description: "0-100 ATS friendliness" },
            strengths: { type: "array", items: { type: "string" } },
            weaknesses: { type: "array", items: { type: "string" } },
            bullet_rewrites: {
              type: "array",
              items: {
                type: "object",
                properties: { before: { type: "string" }, after: { type: "string" } },
                required: ["before","after"],
              },
            },
            missing_keywords: { type: "array", items: { type: "string" } },
          },
          required: ["score","ats_score","strengths","weaknesses","bullet_rewrites","missing_keywords"],
        },
      },
    };
    return await callAI(
      [
        { role: "system", content: "You are a senior tech recruiter reviewing resumes for Indian engineering students applying for SDE/intern roles. Be specific, blunt, and actionable. Use STAR + metrics." },
        { role: "user", content: `Target role: ${data.targetRole || "Software Engineer"}\n\nResume:\n${data.resume}` },
      ],
      tool,
    );
  });

/* ---------------- Custom Track Roadmap ---------------- */
export const aiTrackRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { trackName: string; skillLevel: string; targetType?: string; why?: string }) => d)
  .handler(async ({ data }) => {
    const tool = {
      type: "function",
      function: {
        name: "track_roadmap",
        description: "Generate a structured learning roadmap with sections and topics.",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string", description: "1-2 line Hinglish encouragement about the track." },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section_name: { type: "string" },
                  topics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        topic_name: { type: "string" },
                        notes: { type: "string", description: "1-line what to learn / why" },
                        resource_url: { type: "string", description: "Optional best free resource link" },
                      },
                      required: ["topic_name"],
                    },
                  },
                },
                required: ["section_name", "topics"],
              },
            },
          },
          required: ["summary", "sections"],
        },
      },
    };
    return await callAI(
      [
        { role: "system", content: "You generate practical, no-fluff learning roadmaps for Indian engineering students. Keep sections to 4-7 and 5-10 topics per section. Prefer free resources (YouTube, official docs, NeetCode, GfG)." },
        { role: "user", content: `Track: ${data.trackName}\nLevel: ${data.skillLevel}\nTarget: ${data.targetType || "general placement"}\nWhy: ${data.why || "skill upgrade"}` },
      ],
      tool,
    );
  });
