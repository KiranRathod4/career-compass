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

/* ---------------- Company Insider Intelligence ---------------- */
export const aiCompanyInsider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyName: string; roleFocus?: string; location?: string }) => d)
  .handler(async ({ data }) => {
    const tool = {
      type: "function",
      function: {
        name: "company_insider",
        description: "Insider intelligence on a company's hiring process for engineering candidates in India.",
        parameters: {
          type: "object",
          properties: {
            overview: { type: "string", description: "2-3 line snapshot of the company and what they look for." },
            interview_rounds: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  focus: { type: "string", description: "What this round tests" },
                  tips: { type: "string", description: "1-line practical tip" },
                },
                required: ["name", "focus"],
              },
            },
            commonly_asked: { type: "array", items: { type: "string" }, description: "5-8 specific questions/topics frequently asked" },
            tech_stack_signals: { type: "array", items: { type: "string" }, description: "Technologies/skills they value" },
            culture_signals: { type: "array", items: { type: "string" }, description: "Cultural traits and what they care about" },
            red_flags: { type: "array", items: { type: "string" }, description: "Things that get candidates rejected" },
            two_week_plan: { type: "array", items: { type: "string" }, description: "5-7 concrete prep actions for the next 2 weeks" },
          },
          required: ["overview", "interview_rounds", "commonly_asked", "tech_stack_signals", "culture_signals", "red_flags", "two_week_plan"],
        },
      },
    };
    return await callAI(
      [
        { role: "system", content: "You are an insider sharing how a company hires engineers in India. Be specific and current. If unsure, prefer common patterns at companies of similar size/domain. Never fabricate named individuals." },
        { role: "user", content: `Company: ${data.companyName}\nRole focus: ${data.roleFocus || "Software Engineer / Intern"}\nLocation: ${data.location || "India"}` },
      ],
      tool,
    );
  });

/* ---------------- Track Interview Questions ---------------- */
export const aiTrackQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { trackName: string; skillLevel?: string }) => d)
  .handler(async ({ data }) => {
    const tool = {
      type: "function",
      function: {
        name: "track_questions",
        description: "Generate interview questions for a custom learning track.",
        parameters: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  category: { type: "string" },
                  difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
                },
                required: ["question", "category", "difficulty"],
              },
            },
          },
          required: ["questions"],
        },
      },
    };
    return await callAI(
      [
        { role: "system", content: "You generate realistic interview questions for Indian tech company hiring (Amazon, Flipkart, Razorpay, Zomato, mid-stage startups). Mix difficulty (3 Easy, 4 Medium, 3 Hard). Use practical categories drawn from the track topic. No fluff." },
        { role: "user", content: `Generate exactly 10 interview questions for someone preparing "${data.trackName}" (${data.skillLevel || "Intermediate"} level).` },
      ],
      tool,
    );
  });

