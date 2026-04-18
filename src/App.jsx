import { useState, useEffect, useRef } from "react";

// Q8 (format) removed — output is always chat-first, export offered after
const QUESTIONS = [
  {
    id: "topic",
    label: "01 — Topic",
    question: "What topic would you like the foresight report to cover?",
    hint: "e.g. 'AI regulation in financial services', 'The future of urban housing in Southeast Asia', 'Climate adaptation in coastal cities'",
    placeholder: "Describe your topic...",
  },
  {
    id: "region",
    label: "02 — Region",
    question: "Which country or region should the report be contextualised for?",
    hint: "The report will include a dedicated section on this geography's specific risks, opportunities, and strategic bets.",
    placeholder: "e.g. Singapore, European Union, Southeast Asia...",
  },
  {
    id: "domestic",
    label: "03 — Primary Domestic Stakeholder",
    question: "Who is the primary domestic stakeholder group this report is written from the perspective of?",
    hint: "e.g. resident workforce, local financial institutions, domestic manufacturers, public sector agencies",
    placeholder: "Describe the domestic stakeholder group...",
  },
  {
    id: "external",
    label: "04 — Primary External Stakeholder",
    question: "Who is the key external or connected stakeholder group?",
    hint: "The counterpart whose relationship with the domestic stakeholder shapes the dynamics — e.g. foreign investors, multinational technology companies, regional trading partners",
    placeholder: "Describe the external stakeholder group...",
  },
  {
    id: "secondary",
    label: "05 — Secondary Stakeholders",
    question: "Are there any secondary stakeholder groups to consider?",
    hint: "These receive lighter treatment — referenced where relevant across scenarios. You can say 'none' to keep the focus tight.",
    placeholder: "e.g. 'None' or list groups like employment intermediaries, regulators...",
  },
  {
    id: "orgType",
    label: "06 — Organisation Type",
    question: "What type of organisation are the strategic recommendations written for?",
    hint: "The 'What to Bet On' sections will be tailored to this organisation operating in your chosen region.",
    placeholder: "e.g. government agency, sovereign wealth fund, financial services firm...",
  },
  {
    id: "pages",
    label: "07 — Report Length",
    question: "How long should the report be?",
    hint: "Target page count for the main body, excluding annexes. Minimum 5 pages — most reports run 15–40 pages. Longer = more depth, more quantified projections, richer recommendations.",
    placeholder: "e.g. 10, 20, 30...",
  },
];

const ACKS = [
  (v) => `Good starting point. "${v}" sits at the intersection of powerful structural forces — there's rich material to work with here.`,
  (v) => `${v} — an excellent lens. The region's specific dynamics will sharpen the scenarios considerably.`,
  (v) => `Understood. ${v} front and centre — the report will be written from their perspective throughout.`,
  (v) => `Got it. The relationship between your domestic stakeholders and ${v} will be a central tension running through the scenarios.`,
  (v) => v.toLowerCase() === "none"
    ? `Keeping the focus tight — no secondary stakeholders. The analysis will be sharper for it.`
    : `Good addition. ${v} will add useful texture woven naturally throughout the scenarios.`,
  (v) => `Noted. The 'What to Bet On' sections will be tailored for ${v} operating in your chosen region.`,
  (v) => `Understood — a ${v}-page report. ${
    parseInt(v) <= 10
      ? "Crisp, high-signal prose with the most essential analysis distilled into each section."
      : parseInt(v) <= 20
      ? "Solid depth per section with well-quantified projections and clear recommendations."
      : "Rich, detailed analysis with extensive data points and granular recommendations throughout."
  } Your report is ready to generate.`,
];

const SYSTEM_PROMPT = `You are the Strategic Foresight Engine — a world-class strategic analyst and expert researcher. Your task is to produce bespoke strategic foresight reports.

REPORT GENERATION INSTRUCTIONS:
Generate the report according to the format below. Calibrate depth to the target page count:
- 5-10 pages: 1-2 paragraphs per subsection, 3-4 bets per scenario
- 11-20 pages: 3-4 paragraphs per subsection, 4-5 bets per scenario
- 21-30 pages: 4-5 paragraphs per subsection, 5-6 bets per scenario
- 31-40 pages: 5-6 paragraphs per subsection, 6-7 bets per scenario, additional data points and named sources

FORMAT: Write the full report in markdown. Use # for title, ## for sections, ### for subsections. Write all body sections in full flowing prose - no bullet points. Include scenario comparison as a markdown table.

REPORT CONTENT STRUCTURE:

1. EXECUTIVE SUMMARY
Synthesis of key findings. Include a comparative table: Dimension | Optimistic | Baseline | Disruptive, across 5-7 dimensions.

2. A DECADE IN CONTEXT
Major developments and structural shifts over the past 10 years. Identify 4-8 converging forces shaping the next decade. Draw on real, named institutional reports and data sources.

3. SCENARIO FRAMEWORK AND METHODOLOGY
Driving-forces methodology, 10-year horizon, geographic scope, probability weighting (Optimistic ~25%, Baseline ~50%, Disruptive ~25%).

4. SCENARIO ONE: OPTIMISTIC
Overview, Key Characteristics, Critical Enablers, Scenario Signposts, What to Bet On for orgType, What to Bet On for Government, Secondary Stakeholder Considerations.

5. SCENARIO TWO: BASELINE
Same structure. Genuinely distinct from Optimistic.

6. SCENARIO THREE: DISRUPTIVE
Same structure, replacing Critical Enablers with Triggers and Warning Signs. Materially more severe than Baseline.

7. [REGION] IN FOCUS
Baseline Snapshot, Spotlight Data Points, Structural Assessment.

8. [REGION]-SPECIFIC SCENARIO IMPLICATIONS
For each scenario: implications for domestic stakeholder, external stakeholder, secondary stakeholders, What to Bet On for orgType in region, What to Bet On for region Government.

ANNEX A: DRIVING FORCES BY SCENARIO
Optimistic / Baseline / Disruptive. Per force: name, description, implication, real source with URL.

ANNEX B: BIBLIOGRAPHY
Region-specific sources, major institutional reports, academic research, other key sources. Real verifiable URLs. Minimum 16 entries.

QUALITY STANDARDS:
- Write as a senior strategy partner presenting to C-suite or ministerial audience
- Scenarios must have genuinely distinct causal logics
- Every quantified claim must have a named source
- Every recommendation must be specific and actionable`;

function buildUserPrompt(answers) {
  return `Please generate a strategic foresight report with the following parameters:

Topic: ${answers.topic}
Region: ${answers.region}
Primary Domestic Stakeholder: ${answers.domestic}
Primary External Stakeholder: ${answers.external}
Secondary Stakeholders: ${answers.secondary}
Organisation Type (for recommendations): ${answers.orgType}
Target Length: ${answers.pages} pages (main body, excluding annexes)

Generate the complete report now, following all format and quality instructions precisely.`;
}

function renderMarkdown(text) {
  if (!text) return "";
  const lines = text.split("\n");
  let html = "";
  let inTable = false;
  let tableRows = [];

  const flushTable = () => {
    if (tableRows.length < 2) {
      html += tableRows.map(r => `<p>${r}</p>`).join("");
      tableRows = []; inTable = false; return;
    }
    const headers = tableRows[0].split("|").map(c => c.trim()).filter(Boolean);
    const body = tableRows.slice(2);
    let t = `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>`;
    body.forEach(row => {
      const cells = row.split("|").map(c => c.trim()).filter(Boolean);
      if (cells.length) t += `<tr>${cells.map(c => `<td>${c}</td>`).join("")}</tr>`;
    });
    t += "</tbody></table></div>";
    html += t; tableRows = []; inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("|")) { inTable = true; tableRows.push(line); continue; }
    if (inTable) flushTable();
    if (line.startsWith("# "))        html += `<h1>${line.slice(2)}</h1>`;
    else if (line.startsWith("## "))  html += `<h2>${line.slice(3)}</h2>`;
    else if (line.startsWith("### ")) html += `<h3>${line.slice(4)}</h3>`;
    else if (line.startsWith("#### "))html += `<h4>${line.slice(5)}</h4>`;
    else if (line.trim() === "")      html += "<br/>";
    else {
      const p = line
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, "<code>$1</code>");
      html += `<p>${p}</p>`;
    }
  }
  if (inTable) flushTable();
  return html;
}

function ExportPanel({ reportText, answers, onDismiss }) {
  const [docxLoading, setDocxLoading] = useState(false);
  const [pptxLoading, setPptxLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportError, setExportError] = useState("");

  const handleExport = async (endpoint, filename, mimeType, setLoading) => {
    setLoading(true);
    setExportError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: reportText, topic: answers.topic, region: answers.region }),
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = new Blob([await res.arrayBuffer()], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      if (err.name !== "AbortError") setExportError(err.message);
    }
    setLoading(false);
  };

  const handleDocx = () => handleExport(
    "/api/generate-docx", "foresight-report.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    setDocxLoading
  );
  const handlePptx = () => handleExport(
    "/api/generate-pptx", "foresight-report.pptx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    setPptxLoading
  );
  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="export-panel">
      <div className="export-inner">
        <div className="export-header">
          <div className="export-icon">✦</div>
          <div>
            <div className="export-title">Your report is complete</div>
            <div className="export-sub">Export as a formatted file</div>
          </div>
        </div>

        {exportError && <div className="export-error">{exportError}</div>}

        <div className="export-options">
          <button className="export-option-btn" onClick={handleDocx} disabled={docxLoading || pptxLoading}>
            <div className="export-option-icon">{docxLoading ? "⏳" : "📄"}</div>
            <div className="export-option-body">
              <div className="export-option-label">Word Document (.docx)</div>
              <div className="export-option-desc">{docxLoading ? "Generating — this takes a few seconds…" : "Colour-coded scenario sections, comparison table, and annex styling."}</div>
            </div>
          </button>
          <button className="export-option-btn" onClick={handlePptx} disabled={docxLoading || pptxLoading}>
            <div className="export-option-icon">{pptxLoading ? "⏳" : "📊"}</div>
            <div className="export-option-body">
              <div className="export-option-label">PowerPoint Deck (.pptx)</div>
              <div className="export-option-desc">{pptxLoading ? "Generating — this takes a few seconds…" : "7-slide executive deck — scenarios, region in focus, and closing."}</div>
            </div>
          </button>
        </div>

        <div className="export-actions">
          <button className="export-copy-btn" onClick={handleCopy}>
            {copied ? "✓ Copied to clipboard" : "Copy report text"}
          </button>
          <button className="export-dismiss-btn" onClick={onDismiss}>
            Continue reading ↓
          </button>
        </div>
      </div>
    </div>
  );
}
export default function App() {
  const [phase, setPhase] = useState("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [inputVal, setInputVal] = useState("");
  const [ackText, setAckText] = useState("");
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formValues, setFormValues] = useState(() =>
    Object.fromEntries(QUESTIONS.map(q => [q.id, ""]))
  );

  const inputRef = useRef(null);
  const streamRef = useRef("");

  useEffect(() => {
    if (phase === "intake" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [phase, currentQ]);

  const displayText = report;

  const handleAnswer = () => {
    if (!inputVal.trim()) return;
    const q = QUESTIONS[currentQ];
    const newAnswers = { ...answers, [q.id]: inputVal.trim() };
    setAnswers(newAnswers);
    setAckText(ACKS[currentQ](inputVal.trim()));
    setInputVal("");
    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => { setAckText(""); setCurrentQ(currentQ + 1); }, 2200);
    } else {
      setTimeout(() => { setAckText(""); setPhase("confirm"); }, 2200);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAnswer(); }
  };

  const handleFormSubmit = () => {
    if (!QUESTIONS.every(q => formValues[q.id].trim())) return;
    setAnswers(Object.fromEntries(QUESTIONS.map(q => [q.id, formValues[q.id].trim()])));
    setPhase("confirm");
  };

const generateReport = async () => {
  setPhase("generating");
  setProgress(0);
  setReport(""); setShowExport(false);
  streamRef.current = "";

  const iv = setInterval(() => setProgress(p => Math.min(p + Math.random() * 2.5, 92)), 800);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(answers) }],
      }),
    });

    clearTimeout(timeout);
    clearInterval(iv);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API error ${res.status}: ${errText}`);
    }

    // Switch to report view and stream in text as it arrives
    setProgress(100);
    setPhase("report");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split("\n");
      sseBuffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (
            evt.type === "content_block_delta" &&
            evt.delta?.type === "text_delta" &&
            evt.delta?.text
          ) {
            streamRef.current += evt.delta.text;
            setReport(streamRef.current);
          }
        } catch { /* skip malformed lines */ }
      }
    }

    setTimeout(() => setShowExport(true), 600);

  } catch (err) {
    clearTimeout(timeout);
    clearInterval(iv);
    if (err.name === "AbortError") {
      setError("The request timed out. Please try again.");
    } else {
      setError(err.message);
    }
    setPhase("error");
  }
};

  const restart = () => {
    setPhase("intro"); setCurrentQ(0); setAnswers({});
    setInputVal(""); setAckText(""); setReport("");
    setError(""); setProgress(0); setShowExport(false);
    setFormValues(Object.fromEntries(QUESTIONS.map(q => [q.id, ""])));
    streamRef.current = "";
  };

  const handleCopyToolbar = () => {
    navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --navy:#0D1B3E;--navy-mid:#1A2F5A;--navy-light:#243B72;
          --gold:#C8A84B;--gold-light:#E8C96A;
          --cream:#F5F0E8;--text:#1A1A2E;--text-mid:#4A5568;
          --white:#FFFFFF;--green:#1B5E20;--blue:#0D47A1;--red:#B71C1C;
          --shadow:0 4px 24px rgba(13,27,62,0.12);
        }
        html,body{height:100%;background:var(--navy);font-family:'DM Sans',sans-serif}
        #root{min-height:100vh;display:flex;flex-direction:column}

        .app-shell{
          min-height:100vh;
          background:linear-gradient(160deg,#0D1B3E 0%,#0A1428 60%,#060D1F 100%);
          display:flex;flex-direction:column;position:relative;overflow:hidden;
        }
        .app-shell::before{
          content:'';position:fixed;top:-20%;right:-10%;width:500px;height:500px;
          background:radial-gradient(circle,rgba(200,168,75,0.06) 0%,transparent 70%);
          pointer-events:none;z-index:0;
        }
        .app-shell::after{
          content:'';position:fixed;bottom:-10%;left:-5%;width:400px;height:400px;
          background:radial-gradient(circle,rgba(13,71,161,0.08) 0%,transparent 70%);
          pointer-events:none;z-index:0;
        }

        .header{
          position:relative;z-index:10;padding:18px 20px 14px;
          border-bottom:1px solid rgba(200,168,75,0.15);
          display:flex;align-items:center;gap:12px;
          background:rgba(13,27,62,0.6);backdrop-filter:blur(12px);flex-shrink:0;
        }
        .header-emblem{
          width:34px;height:34px;
          background:linear-gradient(135deg,var(--gold),var(--gold-light));
          border-radius:8px;display:flex;align-items:center;justify-content:center;
          font-size:15px;flex-shrink:0;box-shadow:0 2px 10px rgba(200,168,75,0.3);
        }
        .header-text{flex:1;min-width:0}
        .header-title{font-family:'Playfair Display',serif;font-size:14px;font-weight:700;color:var(--white);line-height:1.2}
        .header-sub{font-size:10px;color:rgba(200,168,75,0.65);letter-spacing:.08em;text-transform:uppercase;margin-top:2px}
        .restart-btn{
          background:rgba(200,168,75,0.1);border:1px solid rgba(200,168,75,0.3);
          color:var(--gold);font-size:11px;font-family:'DM Sans',sans-serif;
          padding:6px 12px;border-radius:20px;cursor:pointer;transition:all .2s;
          white-space:nowrap;flex-shrink:0;
        }
        .restart-btn:hover{background:rgba(200,168,75,0.2)}

        .content-area{flex:1;position:relative;z-index:5;display:flex;flex-direction:column;overflow:hidden}

        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:translateX(0)}}

        /* INTRO */
        .intro-screen{
          flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
          padding:28px 24px 40px;text-align:center;animation:fadeUp .6s ease both;overflow-y:auto;
        }
        .intro-badge{
          display:inline-flex;align-items:center;gap:6px;
          background:rgba(200,168,75,0.1);border:1px solid rgba(200,168,75,0.28);
          border-radius:20px;padding:5px 14px;font-size:10px;color:var(--gold);
          letter-spacing:.1em;text-transform:uppercase;margin-bottom:24px;
        }
        .intro-title{font-family:'Playfair Display',serif;font-size:clamp(30px,8vw,46px);font-weight:900;color:var(--white);line-height:1.1;margin-bottom:8px}
        .intro-title span{color:var(--gold)}
        .intro-subtitle{font-family:'Playfair Display',serif;font-size:clamp(13px,3.5vw,17px);color:rgba(255,255,255,0.5);font-style:italic;margin-bottom:28px;line-height:1.5;max-width:320px}
        .intro-cards{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;width:100%;max-width:380px;margin-bottom:24px}
        .intro-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px 8px;text-align:center}
        .intro-card-icon{font-size:18px;margin-bottom:6px}
        .intro-card-label{font-size:10px;color:rgba(255,255,255,0.45);line-height:1.3}

        .intro-flow{display:flex;flex-direction:column;gap:8px;width:100%;max-width:360px;margin-bottom:32px}
        .flow-step{display:flex;align-items:flex-start;gap:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:12px 14px;text-align:left}
        .flow-num{width:22px;height:22px;border-radius:50%;background:rgba(200,168,75,0.18);border:1px solid rgba(200,168,75,0.38);color:var(--gold);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
        .flow-text{font-size:12px;color:rgba(255,255,255,0.62);line-height:1.5}
        .flow-text strong{color:rgba(255,255,255,0.88);font-weight:600}

        .primary-btn{
          background:linear-gradient(135deg,var(--gold),var(--gold-light));
          color:var(--navy);border:none;font-family:'DM Sans',sans-serif;
          font-size:15px;font-weight:700;padding:15px 36px;border-radius:50px;
          cursor:pointer;transition:all .25s;box-shadow:0 4px 20px rgba(200,168,75,0.35);
          width:100%;max-width:300px;
        }
        .primary-btn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(200,168,75,0.45)}
        .primary-btn:active{transform:translateY(0)}

        /* INTAKE */
        .intake-screen{flex:1;display:flex;flex-direction:column;padding:20px 20px 0;overflow:hidden}
        .progress-track{display:flex;gap:4px;margin-bottom:22px}
        .progress-pip{height:3px;flex:1;border-radius:2px;background:rgba(255,255,255,0.1);transition:background .3s}
        .progress-pip.done{background:var(--gold)}
        .progress-pip.active{background:rgba(200,168,75,0.45)}
        .question-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:20px 18px;margin-bottom:14px;animation:slideIn .32s ease both}
        .question-label{font-size:10px;color:var(--gold);letter-spacing:.12em;text-transform:uppercase;font-weight:600;margin-bottom:9px}
        .question-text{font-family:'Playfair Display',serif;font-size:16px;color:var(--white);line-height:1.4;margin-bottom:9px;font-weight:700}
        .question-hint{font-size:12px;color:rgba(255,255,255,0.38);line-height:1.55;font-style:italic}
        .ack-bubble{background:rgba(200,168,75,0.09);border:1px solid rgba(200,168,75,0.2);border-radius:14px 14px 14px 4px;padding:13px 16px;font-size:13px;color:rgba(255,255,255,0.78);line-height:1.55;margin-bottom:14px;animation:fadeUp .28s ease both}
        .ack-bubble::before{content:'✦';color:var(--gold);font-size:9px;margin-right:7px}
        .input-area{margin-top:auto;padding:0 0 18px}
        .input-wrapper{display:flex;gap:10px;align-items:flex-end;background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.11);border-radius:14px;padding:11px 11px 11px 15px;transition:border-color .2s}
        .input-wrapper:focus-within{border-color:rgba(200,168,75,0.42);background:rgba(255,255,255,0.08)}
        .text-input{flex:1;background:transparent;border:none;outline:none;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--white);line-height:1.5;resize:none;min-height:22px;max-height:96px;overflow-y:auto}
        .text-input::placeholder{color:rgba(255,255,255,0.26)}
        .send-btn{width:34px;height:34px;background:linear-gradient(135deg,var(--gold),var(--gold-light));border:none;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;font-size:14px;color:var(--navy);font-weight:700}
        .send-btn:hover{transform:scale(1.06);box-shadow:0 2px 10px rgba(200,168,75,0.4)}
        .send-btn:disabled{opacity:.3;cursor:not-allowed;transform:none}

        /* FORM */
        .form-screen{flex:1;overflow-y:auto;padding:22px 20px 32px;animation:fadeUp .38s ease both}
        .form-heading{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--white);margin-bottom:5px}
        .form-sub{font-size:13px;color:rgba(255,255,255,0.42);margin-bottom:22px;line-height:1.55}
        .form-fields{display:flex;flex-direction:column;gap:18px;margin-bottom:22px}
        .form-field-label{font-size:10px;color:var(--gold);letter-spacing:.12em;text-transform:uppercase;font-weight:600;margin-bottom:5px}
        .form-field-q{font-size:14px;color:var(--white);font-weight:600;margin-bottom:4px;line-height:1.4}
        .form-field-hint{font-size:11px;color:rgba(255,255,255,0.35);font-style:italic;line-height:1.5;margin-bottom:8px}
        .form-field-input{width:100%;background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.11);border-radius:11px;padding:10px 13px;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--white);outline:none;transition:border-color .2s;resize:none;display:block;box-sizing:border-box}
        .form-field-input:focus{border-color:rgba(200,168,75,0.42);background:rgba(255,255,255,0.08)}
        .form-field-input::placeholder{color:rgba(255,255,255,0.26)}

        /* CONFIRM */
        .confirm-screen{flex:1;padding:22px 20px 28px;overflow-y:auto;animation:fadeUp .38s ease both}
        .confirm-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--white);margin-bottom:5px}
        .confirm-sub{font-size:13px;color:rgba(255,255,255,0.42);margin-bottom:20px;line-height:1.55}
        .brief-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:14px;overflow:hidden;margin-bottom:14px}
        .brief-row{display:flex;padding:11px 15px;border-bottom:1px solid rgba(255,255,255,0.055);gap:12px;align-items:flex-start}
        .brief-row:last-child{border-bottom:none}
        .brief-label{font-size:10px;color:var(--gold);letter-spacing:.1em;text-transform:uppercase;font-weight:600;min-width:76px;padding-top:2px;flex-shrink:0}
        .brief-value{font-size:13px;color:rgba(255,255,255,0.82);line-height:1.5;flex:1}

        .confirm-output-note{background:rgba(200,168,75,0.07);border:1px solid rgba(200,168,75,0.2);border-radius:12px;padding:13px 15px;margin-bottom:18px;display:flex;align-items:flex-start;gap:10px}
        .confirm-output-note-icon{font-size:14px;flex-shrink:0;margin-top:1px}
        .confirm-output-note-text{font-size:12px;color:rgba(255,255,255,0.6);line-height:1.6}
        .confirm-output-note-text strong{color:rgba(200,168,75,0.9);font-weight:600}

        .confirm-actions{display:flex;gap:10px}
        .secondary-btn{flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.11);color:rgba(255,255,255,0.65);font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;padding:13px;border-radius:50px;cursor:pointer;transition:all .2s}
        .secondary-btn:hover{background:rgba(255,255,255,0.09)}
        .generate-btn{flex:2;background:linear-gradient(135deg,var(--gold),var(--gold-light));border:none;color:var(--navy);font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;padding:13px;border-radius:50px;cursor:pointer;transition:all .25s;box-shadow:0 4px 16px rgba(200,168,75,0.28)}
        .generate-btn:hover{transform:translateY(-1px);box-shadow:0 6px 22px rgba(200,168,75,0.4)}

        /* GENERATING */
        .generating-screen{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;text-align:center}
        @keyframes pulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(200,168,75,0.2)}50%{transform:scale(1.05);box-shadow:0 0 0 12px rgba(200,168,75,0)}}
        .gen-emblem{width:70px;height:70px;border-radius:50%;background:rgba(200,168,75,0.1);border:2px solid rgba(200,168,75,0.3);display:flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:22px;animation:pulse 2s ease-in-out infinite}
        .gen-title{font-family:'Playfair Display',serif;font-size:22px;color:var(--white);margin-bottom:7px;font-weight:700}
        .gen-sub{font-size:13px;color:rgba(255,255,255,0.42);margin-bottom:30px;line-height:1.6;max-width:290px}
        .gen-sub strong{color:rgba(200,168,75,0.85);font-weight:600}
        .progress-bar-track{width:100%;max-width:280px;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;margin-bottom:9px}
        .progress-bar-fill{height:100%;background:linear-gradient(90deg,var(--gold),var(--gold-light));border-radius:2px;transition:width .5s ease}
        .progress-pct{font-size:11px;color:rgba(200,168,75,0.55);letter-spacing:.08em}
        .gen-steps{margin-top:28px;display:flex;flex-direction:column;gap:8px;width:100%;max-width:300px}
        .gen-step{display:flex;align-items:center;gap:10px;font-size:12px;color:rgba(255,255,255,0.3);text-align:left;transition:color .3s}
        .gen-step.active{color:rgba(255,255,255,0.72)}
        .gen-step-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.12);flex-shrink:0;transition:background .3s}
        .gen-step.active .gen-step-dot{background:var(--gold);box-shadow:0 0 7px rgba(200,168,75,0.5)}

        /* REPORT */
        .report-screen{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
        .report-toolbar{padding:11px 18px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:10px;background:rgba(13,27,62,0.65);backdrop-filter:blur(8px);flex-shrink:0}
        .report-title-sm{font-family:'Playfair Display',serif;font-size:12px;font-weight:700;color:rgba(255,255,255,0.65);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .copy-btn{background:rgba(200,168,75,0.1);border:1px solid rgba(200,168,75,0.28);color:var(--gold);font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;padding:6px 12px;border-radius:18px;cursor:pointer;transition:all .2s;white-space:nowrap;flex-shrink:0}
        .copy-btn:hover{background:rgba(200,168,75,0.18)}
        .copy-btn.copied{background:rgba(27,94,32,0.2);border-color:rgba(27,94,32,0.4);color:#81C784}
        .report-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;background:var(--cream)}
        .report-body{padding:26px 20px 80px;color:var(--text)}
        .report-body h1{font-family:'Playfair Display',serif;font-size:24px;font-weight:900;color:var(--navy);line-height:1.2;margin-bottom:6px;margin-top:0}
        .report-body h2{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:var(--navy);margin-top:30px;margin-bottom:10px;padding-bottom:7px;border-bottom:2px solid rgba(13,27,62,0.11);line-height:1.3}
        .report-body h3{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;color:var(--navy-mid);margin-top:18px;margin-bottom:7px;text-transform:uppercase;letter-spacing:.06em}
        .report-body h4{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:var(--text-mid);margin-top:13px;margin-bottom:5px}
        .report-body p{font-size:14px;line-height:1.75;color:var(--text);margin-bottom:11px}
        .report-body strong{font-weight:600;color:var(--navy)}
        .report-body em{font-style:italic;color:var(--text-mid)}
        .report-body code{background:rgba(13,27,62,0.06);padding:2px 5px;border-radius:4px;font-size:12px;font-family:monospace}
        .report-body br{display:block;margin-bottom:5px;content:''}
        .table-wrap{overflow-x:auto;margin:18px 0;border-radius:9px;box-shadow:var(--shadow);-webkit-overflow-scrolling:touch}
        .report-body table{width:100%;min-width:480px;border-collapse:collapse;font-size:12px;background:var(--white)}
        .report-body th{background:var(--navy);color:var(--white);font-weight:600;padding:9px 11px;text-align:left;font-family:'DM Sans',sans-serif;letter-spacing:.03em}
        .report-body td{padding:8px 11px;border-bottom:1px solid rgba(0,0,0,0.055);vertical-align:top;line-height:1.5;color:var(--text)}
        .report-body tr:nth-child(even) td{background:rgba(13,27,62,0.022)}
        .report-body tr:last-child td{border-bottom:none}
@keyframes blink{50%{opacity:0}}
.streaming-cursor{display:inline-block;width:7px;height:15px;background:var(--navy);border-radius:1px;animation:blink .8s step-end infinite;vertical-align:text-bottom;margin-left:2px}
        /* EXPORT PANEL */
        .export-panel{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(13,27,62,0.98) 0%,rgba(13,27,62,0.95) 100%);border-top:1px solid rgba(200,168,75,0.22);backdrop-filter:blur(16px);z-index:50;animation:slideUp .4s cubic-bezier(.16,1,.3,1) both}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        .export-inner{padding:20px 20px 28px}
        .export-header{display:flex;align-items:flex-start;gap:12px;margin-bottom:16px}
        .export-icon{width:32px;height:32px;border-radius:50%;background:rgba(200,168,75,0.14);border:1px solid rgba(200,168,75,0.3);display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--gold);flex-shrink:0}
        .export-title{font-family:'Playfair Display',serif;font-size:17px;font-weight:700;color:var(--white);line-height:1.2}
        .export-sub{font-size:12px;color:rgba(255,255,255,0.42);margin-top:3px}
        .export-options{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}
        .export-option{display:flex;align-items:flex-start;gap:11px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:11px;padding:12px 14px}
        .export-option-icon{font-size:18px;flex-shrink:0;margin-top:1px}
        .export-option-label{font-size:13px;font-weight:600;color:var(--white);margin-bottom:3px}
        .export-option-desc{font-size:11px;color:rgba(255,255,255,0.42);line-height:1.5}
        .export-option-btn{display:flex;align-items:flex-start;gap:11px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:11px;padding:12px 14px;cursor:pointer;text-align:left;transition:all .2s;width:100%}
	.export-option-btn:hover:not(:disabled){background:rgba(255,255,255,0.09);border-color:rgba(200,168,75,0.35)}
	.export-option-btn:disabled{opacity:.55;cursor:not-allowed}
	.export-error{background:rgba(183,28,28,0.15);border:1px solid rgba(183,28,28,0.3);border-radius:8px;padding:10px 12px;font-size:12px;color:#FF8A80;margin-bottom:12px}
	.export-notice{display:flex;align-items:flex-start;gap:9px;background:rgba(200,168,75,0.07);border:1px solid rgba(200,168,75,0.18);border-radius:10px;padding:11px 13px;margin-bottom:16px}
        .export-notice-icon{font-size:13px;color:var(--gold);flex-shrink:0;margin-top:1px}
        .export-notice-text{font-size:12px;color:rgba(255,255,255,0.55);line-height:1.6}
        .export-notice-text strong{color:rgba(200,168,75,0.85);font-weight:600}
        .export-actions{display:flex;flex-direction:column;gap:9px}
        .export-copy-btn{background:linear-gradient(135deg,var(--gold),var(--gold-light));border:none;color:var(--navy);font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;padding:13px;border-radius:50px;cursor:pointer;transition:all .22s;box-shadow:0 3px 14px rgba(200,168,75,0.3)}
        .export-copy-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(200,168,75,0.4)}
        .export-dismiss-btn{background:transparent;border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);font-family:'DM Sans',sans-serif;font-size:13px;padding:11px;border-radius:50px;cursor:pointer;transition:all .2s}
        .export-dismiss-btn:hover{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.75)}

        /* ERROR */
        .error-screen{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;text-align:center}
        .error-icon{font-size:38px;margin-bottom:14px}
        .error-title{font-family:'Playfair Display',serif;font-size:20px;color:var(--white);margin-bottom:9px}
        .error-msg{font-size:13px;color:rgba(255,255,255,0.42);margin-bottom:26px;line-height:1.6;max-width:290px}
      `}</style>

      <div className="app-shell">
        <header className="header">
          <div className="header-emblem">⬡</div>
          <div className="header-text">
            <div className="header-title">Strategic Foresight Engine</div>
            <div className="header-sub">Three Scenarios · Ten-Year Horizon</div>
          </div>
          {(phase === "form" || phase === "confirm" || phase === "report" || phase === "error") && (
            <button className="restart-btn" onClick={restart}>↺ New Report</button>
          )}
        </header>

        <div className="content-area">

          {/* INTRO */}
          {phase === "intro" && (
            <div className="intro-screen">
              <div className="intro-badge">✦ AI-Powered Foresight</div>
              <h1 className="intro-title">Bespoke<br /><span>Strategic</span><br />Foresight</h1>
              <p className="intro-subtitle">Research-grounded reports. Three scenarios. Ten-year horizon.</p>
              <div className="intro-cards">
                <div className="intro-card"><div className="intro-card-icon">🔭</div><div className="intro-card-label">3 Distinct Scenarios</div></div>
                <div className="intro-card"><div className="intro-card-icon">🌍</div><div className="intro-card-label">Region-Specific Analysis</div></div>
                <div className="intro-card"><div className="intro-card-icon">♟️</div><div className="intro-card-label">Actionable Strategy</div></div>
              </div>
              <div className="intro-flow">
                <div className="flow-step">
                  <div className="flow-num">1</div>
                  <div className="flow-text"><strong>One form</strong> — topic, region, stakeholders, organisation type, and target length</div>
                </div>
                <div className="flow-step">
                  <div className="flow-num">2</div>
                  <div className="flow-text"><strong>Full report generated here</strong> — streamed live into this screen for immediate reading</div>
                </div>
                <div className="flow-step">
                  <div className="flow-num">3</div>
                  <div className="flow-text"><strong>Export to Word or PowerPoint</strong> — offered once your report is complete</div>
                </div>
              </div>
              <button className="primary-btn" onClick={() => setPhase("form")}>Begin Your Report →</button>
            </div>
          )}

          {/* FORM */}
          {phase === "form" && (
            <div className="form-screen">
              <div className="form-heading">Your Report Brief</div>
              <p className="form-sub">Complete all fields below, then generate your report.</p>
              <div className="form-fields">
                {QUESTIONS.map(q => (
                  <div key={q.id}>
                    <div className="form-field-label">{q.label}</div>
                    <div className="form-field-q">{q.question}</div>
                    <div className="form-field-hint">{q.hint}</div>
                    {q.id === "pages" ? (
                      <input
                        type="number"
                        className="form-field-input"
                        placeholder={q.placeholder}
                        value={formValues[q.id]}
                        onChange={e => setFormValues(v => ({ ...v, [q.id]: e.target.value }))}
                        min="5"
                        max="40"
                      />
                    ) : (
                      <textarea
                        className="form-field-input"
                        placeholder={q.placeholder}
                        value={formValues[q.id]}
                        onChange={e => setFormValues(v => ({ ...v, [q.id]: e.target.value }))}
                        rows={2}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="confirm-output-note" style={{marginBottom:18}}>
                <div className="confirm-output-note-icon">📋</div>
                <div className="confirm-output-note-text">
                  Your report will be <strong>written here first</strong> so you can read it immediately. Once complete, you'll be offered the option to export as a <strong>Word document</strong> or <strong>PowerPoint deck</strong>.
                </div>
              </div>
              <div className="confirm-actions">
                <button className="secondary-btn" onClick={restart}>Start Over</button>
                <button
                  className="generate-btn"
                  onClick={handleFormSubmit}
                  disabled={!QUESTIONS.every(q => formValues[q.id].trim())}
                >
                  Review & Generate →
                </button>
              </div>
            </div>
          )}

          {/* CONFIRM */}
          {phase === "confirm" && (
            <div className="confirm-screen">
              <div className="confirm-title">Your Report Brief</div>
              <p className="confirm-sub">Review your answers below, then generate the report.</p>
              <div className="brief-card">
                {[
                  ["Topic", answers.topic],
                  ["Region", answers.region],
                  ["Dom. Stakeholder", answers.domestic],
                  ["Ext. Stakeholder", answers.external],
                  ["Secondary", answers.secondary],
                  ["Written For", answers.orgType],
                  ["Length", `${answers.pages} pages (main body)`],
                ].map(([label, value]) => (
                  <div className="brief-row" key={label}>
                    <div className="brief-label">{label}</div>
                    <div className="brief-value">{value}</div>
                  </div>
                ))}
              </div>
              <div className="confirm-output-note">
                <div className="confirm-output-note-icon">📋</div>
                <div className="confirm-output-note-text">
                  Your report will be <strong>written here first</strong> so you can read it immediately. Once complete, you'll be offered the option to export as a <strong>Word document</strong> or <strong>PowerPoint deck</strong>.
                </div>
              </div>
              <div className="confirm-actions">
                <button className="secondary-btn" onClick={restart}>Start Over</button>
                <button className="generate-btn" onClick={generateReport}>Generate Report →</button>
              </div>
            </div>
          )}

          {/* GENERATING SPINNER */}
          {phase === "generating" && (
            <div className="generating-screen">
              <div className="gen-emblem">⬡</div>
              <div className="gen-title">Generating Your Report</div>
              <p className="gen-sub">Researching context, modelling scenarios, and writing your bespoke strategic analysis. <strong>This takes 30–60 seconds</strong> — please keep the app open.</p>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="progress-pct">{Math.round(progress)}%</div>
              <div className="gen-steps">
                {[
                  ["Researching context and evidence base", 0],
                  ["Modelling three scenario logics", 20],
                  ["Writing Executive Summary and Decade in Context", 35],
                  ["Building scenario narratives and bets", 55],
                  ["Analysing region-specific implications", 72],
                  ["Compiling annexes and bibliography", 88],
                ].map(([label, threshold]) => (
                  <div className={`gen-step ${progress >= threshold ? "active" : ""}`} key={label}>
                    <div className="gen-step-dot" /><span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REPORT VIEW */}
          {phase === "report" && (
            <div className="report-screen">
              <div className="report-toolbar">
                <div className="report-title-sm">{answers.topic} · {answers.region}</div>
                <button className={`copy-btn${copied ? " copied" : ""}`} onClick={handleCopyToolbar}>
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <div className="report-scroll">
                <div className="report-body" dangerouslySetInnerHTML={{
                  __html: renderMarkdown(displayText) + (showExport ? "" : '<span class="streaming-cursor"></span>')
                }} />
              </div>
              {showExport && (
                <ExportPanel
  						reportText={report}
  						answers={answers}
  						onDismiss={() => setShowExport(false)}
		/>
              )}
            </div>
          )}

          {/* ERROR */}
          {phase === "error" && (
            <div className="error-screen">
              <div className="error-icon">⚠️</div>
              <div className="error-title">Something went wrong</div>
              <p className="error-msg">{error}</p>
              <button className="primary-btn" onClick={restart}>Try Again</button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
