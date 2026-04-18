import pptxgen from "pptxgenjs";

export const config = { maxDuration: 30 };

const NAVY = "0D1B3E", GOLD = "C8A84B", WHITE = "FFFFFF", MID = "8892A4";
const GREEN = "1B5E20", BLUE = "0D47A1", RED = "B71C1C";

function extractSections(markdown) {
  const lines = markdown.split("\n");
  const sections = {};
  let current = null, mainTitle = "";
  for (const line of lines) {
    if (line.startsWith("# ") && !mainTitle) { mainTitle = line.slice(2).trim(); }
    else if (line.startsWith("## "))         { current = line.slice(3).trim(); sections[current] = []; }
    else if (current && line.trim() && !line.startsWith("#") && !line.startsWith("|"))
      sections[current].push(line.trim());
  }
  return { mainTitle, sections };
}

function findSection(sections, keyword) {
  const key = Object.keys(sections).find(k => k.toUpperCase().includes(keyword.toUpperCase()));
  return key ? sections[key] : [];
}

function blurb(lines, max = 320) {
  const t = lines.join(" ").replace(/\*\*/g, "").replace(/\*/g, "");
  return t.length > max ? t.slice(0, max).trim() + "…" : t;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const raw = await new Promise((resolve, reject) => {
    let d = ""; req.on("data", c => d += c); req.on("end", () => resolve(d)); req.on("error", reject);
  });
  const { report, topic, region } = JSON.parse(raw);
  const { mainTitle, sections } = extractSections(report);

  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";

  const darkSlide = () => { const s = pres.addSlide(); s.background = { color: NAVY }; s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:0.25, h:5.625, fill:{color:GOLD}, line:{color:GOLD} }); return s; };
  const lightSlide = (title, color = NAVY) => {
    const s = pres.addSlide(); s.background = { color: "F8F9FC" };
    s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.07, fill:{color}, line:{color} });
    s.addText(title, { x:0.5, y:0.18, w:9, h:0.58, fontSize:20, bold:true, color, fontFace:"Calibri" });
    return s;
  };

  // Slide 1 — Title
  const s1 = darkSlide();
  s1.addText(topic || mainTitle || "Strategic Foresight Report", { x:0.45, y:0.9, w:9.3, h:1.6, fontSize:36, bold:true, color:WHITE, fontFace:"Calibri" });
  s1.addText(`A ${region || ""} Strategic Foresight Report`, { x:0.45, y:2.6, w:9, h:0.5, fontSize:17, color:GOLD, fontFace:"Calibri", italic:true });
  s1.addText("Three Scenarios  ·  Ten-Year Horizon", { x:0.45, y:3.2, w:9, h:0.4, fontSize:13, color:MID, fontFace:"Calibri" });

  // Slide 2 — Executive Summary
  const s2 = lightSlide("Executive Summary");
  s2.addText(blurb(findSection(sections, "EXECUTIVE"), 420), { x:0.5, y:0.95, w:9, h:1.9, fontSize:13, color:"2D3748", fontFace:"Calibri", valign:"top" });
  [["OPTIMISTIC","~25%",GREEN],["BASELINE","~50%",BLUE],["DISRUPTIVE","~25%",RED]].forEach(([lbl,prob,col],i) => {
    const x = 0.5 + i * 3.1;
    s2.addShape(pres.shapes.RECTANGLE, { x, y:3.05, w:2.9, h:2.1, fill:{color:col}, line:{color:col} });
    s2.addText(lbl,  { x:x+0.1, y:3.12, w:2.7, h:0.38, fontSize:11, bold:true, color:WHITE, fontFace:"Calibri", charSpacing:1 });
    s2.addText(prob,  { x:x+0.1, y:3.5,  w:2.7, h:0.6,  fontSize:28, bold:true, color:WHITE, fontFace:"Calibri" });
    s2.addText("probability", { x:x+0.1, y:4.1, w:2.7, h:0.28, fontSize:10, color:"CCCCCC", fontFace:"Calibri" });
    s2.addText(blurb(findSection(sections, lbl), 90), { x:x+0.1, y:4.4, w:2.7, h:0.6, fontSize:10, color:"DDDDDD", fontFace:"Calibri" });
  });

  // Slides 3-5 — Scenarios
  [["OPTIMISTIC","Scenario One — Optimistic",GREEN],["BASELINE","Scenario Two — Baseline",BLUE],["DISRUPTIVE","Scenario Three — Disruptive",RED]].forEach(([key,label,col]) => {
    const s = pres.addSlide(); s.background = { color:"F8F9FC" };
    s.addShape(pres.shapes.RECTANGLE, { x:0, y:0,    w:10, h:0.07, fill:{color:col}, line:{color:col} });
    s.addShape(pres.shapes.RECTANGLE, { x:0, y:0.07, w:10, h:0.63, fill:{color:col}, line:{color:col} });
    s.addText(label, { x:0.4, y:0.13, w:9.2, h:0.5, fontSize:18, bold:true, color:WHITE, fontFace:"Calibri" });
    s.addText(blurb(findSection(sections, key), 520), { x:0.4, y:0.88, w:9.2, h:4.4, fontSize:13, color:"2D3748", fontFace:"Calibri", valign:"top" });
  });

  // Slide 6 — Region in Focus
  const s6 = lightSlide(`${region || "Region"} in Focus`);
  s6.addText(blurb(findSection(sections, "FOCUS"), 520), { x:0.5, y:0.95, w:9, h:4.3, fontSize:13, color:"2D3748", fontFace:"Calibri", valign:"top" });

  // Slide 7 — Closing
  const s7 = darkSlide();
  s7.addShape(pres.shapes.RECTANGLE, { x:0, y:5.38, w:10, h:0.245, fill:{color:GOLD}, line:{color:GOLD} });
  s7.addText("THREE SCENARIOS.", { x:1, y:0.9,  w:8, h:0.95, fontSize:40, bold:true, color:WHITE, fontFace:"Calibri", align:"center" });
  s7.addText("TEN YEARS.",       { x:1, y:1.85, w:8, h:0.95, fontSize:40, bold:true, color:GOLD,  fontFace:"Calibri", align:"center" });
  s7.addText("ONE REPORT.",      { x:1, y:2.8,  w:8, h:0.95, fontSize:40, bold:true, color:WHITE, fontFace:"Calibri", align:"center" });
  s7.addText(`${topic || "Strategic Foresight"}  ·  ${region || ""}  ·  ${new Date().getFullYear()}`, { x:1, y:4.1, w:8, h:0.4, fontSize:13, color:MID, fontFace:"Calibri", italic:true, align:"center" });

  const arrayBuffer = await pres.write({ outputType: "arraybuffer" });
  const buffer = Buffer.from(arrayBuffer);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
  res.setHeader("Content-Disposition", `attachment; filename="foresight-report.pptx"`);
  res.status(200).send(buffer);
}