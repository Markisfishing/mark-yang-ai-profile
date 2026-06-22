const PROFILE_CONTEXT = `
Mark Yang / 楊祐瑜 is seeking an AI Application Engineering Internship with a FinTech-oriented direction.

Core positioning:
- Chinese name: 楊祐瑜
- English name: Mark Yang
- Target role: AI Application Engineering Intern | FinTech-Oriented
- Education: Intelligent Computing and Big Data, Chung Yuan Christian University
- GitHub: https://github.com/Markisfishing
- Email: y7632457@gmail.com
- Phone: 0979-982-811
- Certification: 證券商業務員 / Securities Specialist license

Personality and work style:
- Willing to learn
- Able to work under pressure
- Communicates well
- Responsible
- Cooperates well with different people
- Adaptable in real-world situations
- If given a clear learning direction, Mark is willing to invest effort both during work time and after work, often fully committing to improvement.

FinTech motivation:
- Mark is interested in financial markets and wants to apply what he has learned in real workplace environments.
- He wants to understand how his current abilities can adapt to professional environments.
- He sees many repeated processes in finance that can be improved through AI, automation, and data-driven tools.

Technical strengths:
- AI agent development
- Machine learning
- Python
- Data preprocessing
- LLM workflows
- Prompt design
- Gradio dashboards
- Knowledge Tracing
- GraphCodeBERT
- Social network analysis
- NetworkX
- Basic financial market knowledge

Growth areas:
- Mark is still improving coding fluency and database skills. When asked about weaknesses, frame them constructively as growth areas. Do not hide them, but explain that he is actively improving through projects, practice, and structured learning.

AI Tutor project:
- An AI Agent-based programming learning assistant.
- Goal: help students understand programming concepts, analyze learning progress, and receive more personalized learning support.
- Mark contributed to overall system architecture planning, prompt design, and LLM response flow.
- The project shows his ability to reason through tasks, decide which code components are needed, and integrate different parts into a working AI application.
- Technologies: Python, LLM workflows, Gradio, Knowledge Tracing, AI tutor response design.

QSearch SNA project:
- Full title: Viral Social Media Post Prediction & Strategy Analysis.
- One-line summary: training models to predict which social media posts may gain high future traffic.
- Mark worked on data cleaning, model comparison, and direction-setting as the team leader.
- As team leader, he researched ahead, planned the project direction, and arranged weekly progress.
- The project designed a weighted interaction index: Reaction x 1 + Comment x 13.5 + Share x 20.
- A post is labeled viral_top5 if its interaction score ranks in the top 5% within the same month and category.
- The project compared Logistic Regression against LightGBM.
- LightGBM results: Test AUC 0.7227, Test AP 0.1731, Top-1,000 Hit Rate 54.9%.
- The output combines predictive ranking with interpretable content recommendations using Support, Viral Rate, Lift, interaction composition, and original-post evidence.

Experience:
- Administrative support assistant: document organization, administrative tasks, campus event coordination, internal communication.
- Accounting firm assistant: document handling, data organization, basic administrative support.
- Overseas English volunteer service in Cambodia: teaching activities, material preparation, local interaction, communication, adaptability, teamwork.
`;

const SYSTEM_PROMPT = `
You are AI Profile Agent, a bilingual resume assistant for Mark Yang / 楊祐瑜.

Your role is to answer questions about Mark's resume, projects, skills, education, certifications, work experience, FinTech motivation, personality, and contact information.

Answer in the same language as the user when possible. Keep responses concise, confident, professional, and recruiter-friendly. Be positive but do not exaggerate or invent facts.

Use only the provided profile context. If information is unavailable, say:
"目前履歷中沒有列出這項資訊，建議直接聯絡 Mark 確認。"

For unrelated questions, politely redirect the user back to Mark's profile, AI projects, skills, FinTech motivation, or contact information.

When appropriate, encourage the user to contact Mark by email or phone for more details.

Profile context:
${PROFILE_CONTEXT}
`;

module.exports = async function handler(req, res) {
  setJsonHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== "POST") {
    res.writeHead(405);
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  try {
    const body = await readJson(req);
    const messages = normalizeMessages(body.messages);
    const provider = (process.env.AI_PROVIDER || "groq").toLowerCase();
    const reply = provider === "openai"
      ? await callOpenAI(messages)
      : await callGroq(messages);

    res.writeHead(200);
    res.end(JSON.stringify({ reply }));
  } catch (error) {
    const status = error.statusCode || 500;
    res.writeHead(status);
    res.end(JSON.stringify({
      error: error.publicMessage || "AI Profile Agent is temporarily unavailable."
    }));
  }
};

async function callGroq(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw publicError(500, "GROQ_API_KEY is not configured on the server.");
  }

  return callChatCompletions({
    url: "https://api.groq.com/openai/v1/chat/completions",
    apiKey,
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    messages
  });
}

async function callOpenAI(messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw publicError(500, "OPENAI_API_KEY is not configured on the server.");
  }

  return callChatCompletions({
    url: "https://api.openai.com/v1/chat/completions",
    apiKey,
    model: process.env.AI_MODEL || "set-AI_MODEL-in-env",
    messages
  });
}

async function callChatCompletions({ url, apiKey, model, messages }) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages
      ]
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw publicError(response.status, data.error?.message || "The AI provider rejected the request.");
  }

  return data.choices?.[0]?.message?.content?.trim()
    || "目前履歷中沒有列出這項資訊，建議直接聯絡 Mark 確認。";
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => message && ["user", "assistant"].includes(message.role))
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: String(message.content || "").slice(0, 1200)
    }));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 15000) {
        reject(publicError(413, "Message is too long."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(publicError(400, "Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function publicError(statusCode, publicMessage) {
  const error = new Error(publicMessage);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  return error;
}
