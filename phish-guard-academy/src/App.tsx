// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import {
  ShieldAlert, Upload, Link as LinkIcon, Image as ImageIcon, CheckCircle2,
  AlertTriangle, Info, PlayCircle, Award, BookOpen, BarChart2, Search, Timer, Lock
} from "lucide-react";
import {
  PieChart, Pie, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, Legend
} from "recharts";
import { AnimatePresence, motion } from "framer-motion";

/* ---------- Types ---------- */
type TabKey = "analysis" | "challenges" | "learn" | "analytics" | "glossary";

type Finding = {
  type: string;
  label: string;
  detail: string;
  severity: "low" | "med" | "high";
};

type Box = { x: number; y: number; w: number; h: number; label: string };

type AnalysisResult = {
  risk: number;
  findings: Finding[];
  boxes: Box[];
};

type QuizItem = {
  id: string;
  cat: string;
  prompt: string;
  options: string[];
  correct: number;
  explain: string;
  img?: string;
};

type GlossaryItem = {
  term: string;
  aliases?: string[];
  def: string;
  examples?: { good: string; bad: string };
};

type EventRecord =
  | { ts: number; type: "view_lesson"; topicId: string }
  | { ts: number; type: "start_quiz"; topicId: string }
  | { ts: number; type: "submit_quiz"; topicId: string; correct: boolean }
  | { ts: number; type: "submit_quiz_question"; qId: string; choice: number; correct: boolean };

/* ---------- Lightweight UI primitives (typed) ---------- */
type Children = { children?: React.ReactNode };

export function Button(
  { children, className = "", ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & Children
) {
  return (
    <button {...rest} className={`btn ${className}`.trim()}>{children}</button>
  );
}

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return <input {...props} className={`input ${props.className || ""}`.trim()} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return <textarea {...props} className={`textarea ${props.className || ""}`.trim()} />;
}

export function Switch({
  checked, onChange, id, ...rest
}: { checked: boolean; onChange: (v: boolean) => void; id?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="switch" {...rest}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="slider" />
    </div>
  );
}

export function Label(
  { htmlFor, children, className = "" }:
  React.LabelHTMLAttributes<HTMLLabelElement> & Children
) {
  return <label htmlFor={htmlFor} className={`label ${className}`.trim()}>{children}</label>;
}

export function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "secondary" | "destructive" }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress">
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Card({ children, className = "" }: Children & { className?: string }) {
  return <div className={`card ${className}`.trim()}>{children}</div>;
}

export function CardHeader({ children, className = "" }: Children & { className?: string }) {
  return <div className={`card-header ${className}`.trim()}>{children}</div>;
}

export function CardContent({ children, className = "" }: Children & { className?: string }) {
  return <div className={`card-content ${className}`.trim()}>{children}</div>;
}

export function CardFooter({ children, className = "" }: Children & { className?: string }) {
  return <div className={`card-footer ${className}`.trim()}>{children}</div>;
}

export function CardTitle({ children, className = "" }: Children & { className?: string }) {
  return <div className={`card-title ${className}`.trim()}>{children}</div>;
}

export function Alert(
  { children, variant = "default" }: Children & { variant?: "default" | "destructive" }
) {
  return <div className={`alert ${variant === "destructive" ? "alert-danger" : ""}`}>{children}</div>;
}
export function AlertTitle({ children }: Children) { return <div className="alert-title">{children}</div>; }
export function AlertDescription({ children }: Children) { return <div className="alert-desc">{children}</div>; }

/* ---------- Storage helpers ---------- */
const LS_KEYS = {
  progress: "pg_progress_v1",
  events: "pg_events_v1",
};
function load<T>(k: string, def: T): T {
  try { const v = JSON.parse(localStorage.getItem(k) || "null"); return (v ?? def) as T; } catch { return def; }
}
function save<T>(k: string, v: T) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
function pushEvent(evt: Omit<EventRecord, "ts">) {
  if (typeof window === "undefined") return;
  const ev = load<EventRecord[]>(LS_KEYS.events, []);
  ev.push({ ts: Date.now(), ...evt } as EventRecord);
  save(LS_KEYS.events, ev);
}

/* ---------- Demo data ---------- */
const demoTrend = [
  { month: "Apr", credentialHarvesting: 24, invoiceFraud: 9, extortion: 4 },
  { month: "May", credentialHarvesting: 31, invoiceFraud: 12, extortion: 6 },
  { month: "Jun", credentialHarvesting: 29, invoiceFraud: 15, extortion: 7 },
  { month: "Jul", credentialHarvesting: 35, invoiceFraud: 18, extortion: 8 },
  { month: "Aug", credentialHarvesting: 40, invoiceFraud: 16, extortion: 9 },
  { month: "Sep", credentialHarvesting: 44, invoiceFraud: 21, extortion: 11 },
];

const demoQuiz: QuizItem[] = [
  { id: "q1", cat:"Email", prompt: "Email: 'Account will be terminated in 24 hours.' Link text bank.example.com → URL bank.safe-login.co", options: ["Legit","Suspicious: urgency + mismatch","Safe because HTTPS","Ignore"], correct: 1, explain: "Urgency + link text vs destination mismatch." },
  { id: "q2", cat:"Email", prompt: "Sender: PaypaI Support <support@paypaI.com>", options: ["Legit","Lookalike domain (capital i)","Safe if SPF passes","Undecidable"], correct: 1, explain: "'paypaI' uses uppercase i instead of l." },
  { id: "q3", cat:"Malware", prompt: "Attachment: invoice.zip from unknown vendor", options: ["Open","Report and delete","Forward","Disable AV"], correct: 1, explain: "Unexpected archives often carry malware." },
  { id: "q4", cat:"Web", prompt: "https://security.paypal.com.secure-login.co", options: ["Owned by PayPal","Phishing via subdomain trick","Safe: lock icon","Trusted TLD"], correct: 1, explain: "Registered domain is secure-login.co." },
  { id: "q5", cat:"SMS", prompt: "SMS: http://xn--pple-43a.com", options: ["Apple","Intl portal","Punycode lookalike","Gov"], correct: 2, explain: "Punycode masks lookalikes." },
  { id: "q6", cat:"Auth", prompt: "QR code claims 'MFA reset'", options: ["Safe","Report to security","Scan then decide","Email QR around"], correct: 1, explain: "Report rogue QR." },
  { id: "q7", cat:"Web", prompt: "bit.ly/abcd → unknown", options: ["Always safe","Only corp links","Expand or avoid","Ignore policy"], correct: 2, explain: "Shorteners hide destinations." },
  { id: "q8", cat:"Email", prompt: "Vendor asks via Gmail for invoice payment", options: ["Normal","Verify via known channel","Pay now","Update bank via link"], correct: 1, explain: "Verify out-of-band." },
  { id: "q9", cat:"Web", prompt: "Login page shows Not Secure", options: ["Fine","Use VPN","Do not enter creds","Type faster"], correct: 2, explain: "Never enter creds on HTTP." },
  { id: "q10", cat:"Email", prompt: "Colleague demands gift cards urgently", options: ["Comply","Verify identity out-of-band","Ignore","Send last 4"], correct: 1, explain: "Classic BEC." },
  { id: "q11", cat:"Malware", prompt: "Attachment: 'Q3_financials.xlsm' from unknown sender", options: ["Open macros","Disable macros then open","Upload to sandbox or report","Trust if Office warns"], correct: 2, explain: "Macro-enabled docs are high-risk; route to sandbox/report." },
  { id: "q12", cat:"Auth", prompt: "SSO page asks for MFA code after 'session expired' from unknown link", options: ["Enter code","Use password manager URL or portal","Ignore and try again","Approve any push"], correct: 1, explain: "Navigate yourself to SSO; do not follow unknown links." },
  { id: "q13", cat:"Auth", prompt: "OAuth consent requests access to 'read email and manage settings' from new app", options: ["Approve to view doc","Deny and report","Approve if Google","Forward to teammate"], correct: 1, explain: "Malicious OAuth grants persist; deny and report." },
  { id: "q14", cat:"SMS", prompt: "SMS: 'Your package is held. Pay £1.99: ship-update.co'", options: ["Click and pay","Search courier site yourself","Reply STOP","Text friend"], correct: 1, explain: "Go to courier via known site or app, not link in SMS." },
  { id: "q15", cat:"Email", prompt: "Email from 'it-support@example-helpdesk.com' about password reset", options: ["It's our domain","Check From and return-path, report","Reset immediately","Forward credentials"], correct: 1, explain: "Domain mismatch with company. Verify and report." },
  { id: "q16", cat:"Web", prompt: "QR code on office printer for 'driver update'", options: ["Scan and install","Use vendor portal from bookmarked link","Ask random colleague","Ignore forever"], correct: 1, explain: "Access vendor portal directly; QR could be tampered." },
  { id: "q17", cat:"Email", prompt: "Invoice from known vendor but bank account changed", options: ["Pay now","Verify change via known phone","Email back for confirmation","Split payment"], correct: 1, explain: "Always verify bank changes out-of-band." },
  { id: "q18", cat:"Web", prompt: "Browser lock screen says 'Call Microsoft Support'", options: ["Call number on page","Close tab or kill browser","Give card to unlock","Install offered tool"], correct: 1, explain: "Scareware; close tab or kill task. Do not call." },
  { id: "q19", cat:"Web", prompt: "Colleague shares a 'DocuSign' link: docusign.secure-doc.io", options: ["Legit","Check domain and open only if docusign.com","It's fine if padlock","Open on mobile"], correct: 1, explain: "Registered domain isn't docusign.com; verify in account." },
  { id: "q20", cat:"Auth", prompt: "Multiple push MFA prompts at night", options: ["Approve one to stop","Report to security and change password","Turn off MFA","Ignore for days"], correct: 1, explain: "Likely MFA fatigue attack; report and secure account." },
];

const glossary: GlossaryItem[] = [
  { term: "Phishing", aliases:["Phish"], def: "Deceptive attempt to steal data or install malware.", examples:{good:"Report suspicious emails.", bad:"Entering credentials in unknown forms."} },
  { term: "Spear Phishing", aliases:["Spear"], def: "Targeted phishing tailored to a person or role.", examples:{good:"Verify by phone for VIP requests.", bad:"Pay invoice from new address without check."} },
  { term: "Whaling", aliases:[], def: "Executive-targeted spear phishing." },
  { term: "BEC", aliases:["Business Email Compromise"], def: "Impersonation of leaders or vendors to request money/data." },
  { term: "Credential Harvesting", aliases:["Cred Harvest"], def: "Fake login pages to steal credentials." },
  { term: "Smishing", aliases:["SMS Phishing"], def: "Phishing over SMS." },
  { term: "Vishing", aliases:["Voice Phishing"], def: "Voice phishing via calls or voicemail." },
  { term: "QRishing", aliases:["QR Phishing"], def: "Malicious QR codes." },
  { term: "Punycode", aliases:[], def: "Unicode encoding that enables lookalike domains." },
  { term: "Homoglyph", aliases:[], def: "Visually similar characters used for deception." },
  { term: "Link Shortener", aliases:["Short URL"], def: "Service that hides destination URLs." },
  { term: "MFA Fatigue", aliases:["Push bombing"], def: "Push-bombing to elicit approval." },
];

/* ---------- Helpers ---------- */
async function mockAnalyze({ text, url, file }: { text?: string; url?: string; file?: File | null }): Promise<AnalysisResult> {
  const base = `${text || ""}\n${url || ""}\n${file ? file.name : ""}`.trim();
  const hasUrl = /(https?:\/\/[^\s]+)/i.test(base);
  const urgent = /(urgent|immediately|24\s*hours|verify now|account (locked|closed))/i.test(base);
  const lookalike = /(paypaI|rnicrosoft|faceb00k|app1e|goog1e)/i.test(base);
  const findings: Finding[] = [];
  if (lookalike) findings.push({ type: "lookalike", label: "Lookalike brand", detail: "Possible homoglyphs in brand/domain", severity: "high" });
  if (hasUrl) findings.push({ type: "links", label: "Contains links", detail: "Verify destination vs domain owner", severity: urgent ? "high" : "med" });
  if (urgent) findings.push({ type: "urgent-language", label: "Urgent language", detail: "Pressure to act quickly detected", severity: "med" });
  if (!findings.length) findings.push({ type: "general", label: "No strong cues", detail: "No obvious phishing signals in provided input", severity: "low" });
  const riskBase = (urgent ? 40 : 10) + (hasUrl ? 20 : 0) + (lookalike ? 30 : 0);
  const risk = Math.max(5, Math.min(98, riskBase));
  return new Promise((r) => setTimeout(() => r({ risk, findings, boxes: [] }), 150));
}

async function analyzeAPI(payload: {
  text?: string;
  url?: string;
  file?: File | null;
}) {
  try {
    try { const res = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: payload.file
        ? undefined
        : { "Content-Type": "application/json" },
      body: payload.file
        ? (() => {
            const fd = new FormData();
            if (payload.text) fd.append("text", payload.text);
            if (payload.url) fd.append("url", payload.url);
            if (payload.file) fd.append("image", payload.file);
            return fd;
          })()
        : JSON.stringify({
            text: payload.text ?? "",
            url: payload.url ?? "",
          }),
    });

    if (!res.ok) {
      throw new Error("backend error");
    }

    return await res.json(); } catch (err) { console.error("Analyze API failed:", err); return { risk: 0, severity: "error", findings: ["Backend offline or misconfigured."], ocr_text: "", boxes: [] }; }
  } catch (err) {
    console.error("analyzeAPI failed, falling back to mockAnalyze", err);
    return mockAnalyze({
      text: payload.text ?? "",
      url: payload.url ?? "",
      file: payload.file ?? null,
    });
  }
}

function RiskBadge({ score }: { score: number }) {
  const label = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
  const intent: "destructive" | "secondary" | "default" = score >= 70 ? "destructive" : score >= 40 ? "secondary" : "default";
  return <Badge variant={intent}>Risk: {label} ({score}%)</Badge>;
}

/* ---------- Header ---------- */
function Header({ tab, setTab }: { tab: TabKey; setTab: React.Dispatch<React.SetStateAction<TabKey>> }) {
  const LinkBtn = ({ id, label }: { id: TabKey; label: string }) => (
    <button
      className={`nav-link ${tab === id ? "active" : ""}`}
      onClick={() => { setTab(id); const el = document.querySelector(`#${id}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }}
    >
      {label}
    </button>
  );
  return (
    <div className="app-header">
      <div className="header-inner">
        <div className="brand"><ShieldAlert size={22} /> <span>PhishGuard Academy</span></div>
        <div className="nav">
          <LinkBtn id="analysis" label="Analyze" />
          <LinkBtn id="challenges" label="Challenges" />
          <LinkBtn id="learn" label="Learning Hub" />
          <LinkBtn id="analytics" label="Analytics" />
          <LinkBtn id="glossary" label="Glossary" />
        </div>
      </div>
    </div>
  );
}

/* ---------- Tabs ---------- */
function AnalysisTab() {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [safeMode, setSafeMode] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const doAnalyze = async () => { setLoading(true); const r = await analyzeAPI({ text, url, file }); setResult(r); setLoading(false); };

  useEffect(() => {
    if (!imgPreview) return;
    const img = new Image();
    img.onload = () => {
      const c = canvasRef.current; if (!c) return;
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      if (!result?.boxes?.length) return;
      ctx.lineWidth = 3; ctx.strokeStyle = "red"; ctx.font = "12px sans-serif"; ctx.fillStyle = "rgba(255,0,0,0.15)";
      result.boxes.forEach((b) => {
        const x = b.x * img.width, y = b.y * img.height, w = b.w * img.width, h = b.h * img.height;
        ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h); ctx.fillStyle = "red"; ctx.fillText(b.label, x + 4, y + 12); ctx.fillStyle = "rgba(255,0,0,0.15)";
      });
    };
    img.src = imgPreview;
  }, [imgPreview, result]);

  return (
    <motion.div id="analysis" className="grid grid-2 gap-6" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
      <Card className="shadow-lg">
        <CardHeader><CardTitle><Upload size={18} /> Upload or Paste</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="text">Paste email text</Label>
            <Textarea id="text" placeholder="Paste suspicious email content" value={text} onChange={(e) => setText(e.target.value)} className="minh-120" />
          </div>
          <div className="grid grid-2 gap-3">
            <div>
              <Label htmlFor="url">URL</Label>
              <div className="row gap-2">
                <Input id="url" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
                <Button type="button" aria-label="validate-link"><LinkIcon size={16} /></Button>
              </div>
            </div>
            <div>
              <Label htmlFor="file">Screenshot</Label>
              <Input
                id="file" type="file" accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  if (f) {
                    const r = new FileReader();
                    r.onload = () => setImgPreview(typeof r.result === "string" ? r.result : null);
                    r.readAsDataURL(f);
                  } else setImgPreview(null);
                }}
              />
            </div>
          </div>
          <div className="row gap-2">
            <Switch id="safe" checked={safeMode} onChange={setSafeMode} />
            <Label htmlFor="safe">Safe mode: strip live links</Label>
          </div>
        </CardContent>
        <CardFooter className="row between">
          <div className="muted xs">Uses /api/analyze if reachable, else mock.</div>
          <Button onClick={doAnalyze} disabled={loading}>{loading ? "Analyzing..." : "Analyze"}</Button>
        </CardFooter>
      </Card>

      <Card className="shadow-lg">
        <CardHeader><CardTitle><ShieldAlert size={18} /> Result</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!result && <div className="muted">No analysis yet. Upload text, a URL, or a screenshot to begin.</div>}

          {result && (
            <div className="space-y-4">
              <div className="row gap-3">
                <RiskBadge score={result.risk} />
    <div className="text-xs muted">ML Risk: {result.ml_risk}% (confidence {Math.round(result.ml_confidence * 100)}%)</div>
                <Progress value={result.risk} />
              </div>

              <div className="grid grid-2 gap-3">
                {result.findings.map((f, i) => (
                  <Alert key={i} variant={f.severity === "high" ? "destructive" : "default"}>
                    <AlertTitle className="row gap-2">{f.severity === "high" ? <AlertTriangle size={16} /> : <Info size={16} />}{f.label}</AlertTitle>
                    <AlertDescription className="text-sm">{f.detail}</AlertDescription>
                  </Alert>
                ))}
              </div>

              <div className="grid grid-2 gap-3">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm row gap-2"><ImageIcon size={14} /> Screenshot</CardTitle></CardHeader>
                  <CardContent>
                    <div className="img-frame">
                      {imgPreview ? <canvas ref={canvasRef} className="img-canvas" /> :
                        <div className="img-empty">No image</div>}
                    </div>
                    {!result?.boxes?.length && imgPreview && <p className="muted xs mt-2">Image shown. No suspicious text regions detected.</p>}
    {result?.ocr_text && <div className="mt-2 text-xs muted">OCR extracted: {result.ocr_text}</div>}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm row gap-2"><CheckCircle2 size={14} /> Next steps</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="bullet">
                      {[
                        "Do not click links or attachments.",
                        "Change reused passwords.",
                        "Enable multi-factor authentication.",
                        "Report to email provider and IT/security."
                      ].map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ChallengesTab() {
  const cats = useMemo(() => Array.from(new Set(["All", ...demoQuiz.map(q => q.cat || "Other")])), []);
  const [selectedCat, setSelectedCat] = useState<string>("All");
  const [randomize, setRandomize] = useState(true);
  const [count, setCount] = useState(10);

  const [indices, setIndices] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<Record<string, { choice: number; correct: boolean }>>({});
  const [timed, setTimed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [responseTimes, setResponseTimes] = useState<Record<string, number>>({});

  const buildRun = () => {
    const pool = demoQuiz.map((q, i) => ({ q, i })).filter(({ q }) => selectedCat === "All" ? true : q.cat === selectedCat);
    const arr = pool.map(p => p.i);
    if (randomize) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } }
    const picked = arr.slice(0, Math.min(count, arr.length));
    setIndices(picked); setIdx(0); setScore(0); setAnswered({}); setResponseTimes({}); setTimeLeft(20);
  };
  useEffect(buildRun, []); // initial

  useEffect(() => {
    if (!timed) return;
    setTimeLeft(20);
    const t = setInterval(() => setTimeLeft((s) => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(t);
  }, [idx, timed]);

  const q = demoQuiz[indices[idx] ?? 0] || demoQuiz[0];
  const atEnd = idx === indices.length - 1 && !!answered[q.id];

  const answer = (choice: number) => {
    if (answered[q.id]) return;
    const correct = choice === q.correct;
    setAnswered({ ...answered, [q.id]: { choice, correct } });
    if (timed) setResponseTimes({ ...responseTimes, [q.id]: 20 - timeLeft });
    if (correct) setScore((s) => s + 1);
    pushEvent({ type: "submit_quiz_question", qId: q.id, choice, correct });
  };
  const next = () => setIdx((v) => Math.min(v + 1, indices.length - 1));
  const restart = () => buildRun();

  const total = indices.length || 1;
  const allCorrect = total > 0 && Object.values(answered).length === total && Object.values(answered).every(a => a.correct);
  const fastAvg = timed && Object.values(responseTimes).length > 0 &&
    (Object.values(responseTimes).reduce((a, b) => a + b, 0) / Object.values(responseTimes).length) <= 5;

  const badges = [
    { label: "Link Sleuth", done: score >= 1 },
    { label: "Header Hound", done: score >= 3 },
    { label: "Spoof Spotter", done: score >= 5 },
    { label: "Perfect Run", done: allCorrect },
    { label: "Speedster", done: !!fastAvg },
    { label: "Marathoner", done: total >= 15 },
  ];

  return (
    <motion.div id="challenges" className="grid grid-leftwide gap-6" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
      <Card className="shadow-lg">
        <CardHeader><CardTitle><PlayCircle size={18} /> Phishing Awareness Challenge</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-3 p-3 border rounded">
            <div>
              <Label>Category</Label>
              <select className="input" value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)}>
                {cats.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Question count</Label>
              <Input type="number" min={1} max={demoQuiz.length} value={count} onChange={(e) => setCount(parseInt(e.target.value || "1", 10))} />
            </div>
            <div className="row between">
              <div className="row gap-2">
                <Switch id="rand" checked={randomize} onChange={setRandomize} />
                <Label htmlFor="rand">Randomise</Label>
              </div>
              <Button onClick={buildRun}>Start</Button>
            </div>
          </div>

          <div className="row between muted">
            <div>Question {Math.min(idx + 1, indices.length)} of {indices.length}</div>
            <div className="row gap-2"><Timer size={16} />{timed ? `${timeLeft}s` : "untimed"}</div>
          </div>
          <div className="xs muted">Category: <span className="bold">{q.cat || "—"}</span></div>
          <div className="qprompt">{q.prompt}</div>
          {q.img && <img src={q.img} alt="question" className="qimg" />}

          <div className="grid gap-2">
            {q.options.map((opt, i) => {
              const sel = answered[q.id]?.choice === i;
              const ok = answered[q.id]?.correct;
              const variant = sel ? (ok ? "" : "danger") : "outline";
              return (
                <Button key={i} className={`wide ${variant}`} onClick={() => answer(i)}>
                  {opt}
                </Button>
              );
            })}
          </div>

          {answered[q.id] && (
            <Alert variant={answered[q.id].correct ? "default" : "destructive"}>
              <AlertTitle>{answered[q.id].correct ? "Correct" : "Incorrect"}</AlertTitle>
              <AlertDescription className="text-sm">{q.explain}</AlertDescription>
            </Alert>
          )}

          {atEnd && (
            <Card className="mt-2">
              <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <div>Score: {score} / {indices.length}</div>
                {timed && Object.keys(responseTimes).length > 0 && (
                  <div>Avg response time: {(
                    Object.values(responseTimes).reduce((a, b) => a + b, 0) / Object.values(responseTimes).length
                  ).toFixed(1)}s</div>
                )}
                <div className="space-y-1">
                  {indices.map(i => {
                    const qq = demoQuiz[i];
                    return answered[qq.id] && !answered[qq.id].correct ? (
                      <div key={qq.id} className="xs">❌ {qq.prompt} — <span className="italic">{qq.explain}</span></div>
                    ) : null;
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
        <CardFooter className="row between">
          <div className="row gap-2 text-sm"><Award size={16} />Score: {score}</div>
          <div className="row gap-2">
            <Label htmlFor="timed" className="text-sm">Timed</Label>
            <Switch id="timed" checked={timed} onChange={setTimed} />
            <Button onClick={next} disabled={idx === indices.length - 1}>Next</Button>
            <Button className="outline" onClick={restart}>Restart</Button>
          </div>
        </CardFooter>
      </Card>

      <div className="grid gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Achievements</CardTitle></CardHeader>
          <CardContent className="badges">
            {badges.map(b => <Badge key={b.label} variant={b.done ? "default" : "secondary"}>{b.label}</Badge>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Progress</CardTitle></CardHeader>
          <CardContent><Progress value={(score / (indices.length || 1)) * 100} /></CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

const TOPICS = [
  { id: "lh1", title: "Phishing Patterns", level:"beg", duration:6, prereqIds:[], body:"Hooks: urgency, fear, reward, authority, scarcity. Verify via a second channel." },
  { id: "lh2", title: "Domain Spoofing", level:"beg", duration:7, prereqIds:["lh1"], body:"Check registered domain vs subdomain tricks." },
  { id: "lh3", title: "Social Engineering", level:"int", duration:8, prereqIds:["lh2"], body:"Pretexts: payroll change, invoice update, MFA reset, gift cards." },
  { id: "lh4", title: "Email Auth Basics", level:"int", duration:8, prereqIds:["lh3"], body:"SPF, DKIM, DMARC reduce spoofing but are not guarantees." },
  { id: "lh5", title: "Advanced BEC", level:"adv", duration:10, prereqIds:["lh4"], body:"Invoice fraud, vendor compromise, and payment diversion patterns." },
] as const;

const ASSESS: Record<string, { p: string; a: string[]; c: number; r: string }[]> = {
  lh1: [{p:"Which is a common phishing hook?", a:["Detailed privacy policy","Urgent threat","Signed email"], c:1, r:"Urgency pressures mistakes."}],
  lh2: [{p:"Which is the registered domain in login.paypal.com.attacker.co?", a:["login.paypal.com","attacker.co","paypal.com"], c:1, r:"Registered domain is attacker.co."}],
  lh3: [{p:"Gift card request from a 'CEO' is likely:", a:["Standard","BEC attempt","Newsletter"], c:1, r:"Classic BEC pretext."}],
  lh4: [{p:"DMARC primarily helps with:", a:["End-to-end encryption","Spoofing control","Malware removal"], c:1, r:"Alignment to block spoofing."}],
  lh5: [{p:"Best out-of-band verification is:", a:["Reply to email","Call known number","Click link"], c:1, r:"Call known contact number."}],
};

function LearningHubTab() {
  const [level, setLevel] = useState<"beg" | "int" | "adv">("beg");
  const [progress, setProgress] = useState<Record<string, { score: number; passed: boolean }>>(load(LS_KEYS.progress, {}));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeAssess, setActiveAssess] = useState<string | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  useEffect(() => save(LS_KEYS.progress, progress), [progress]);

  const passed = (id: string) => Boolean(progress[id]?.passed);
  const canAccess = (t: typeof TOPICS[number]) => t.prereqIds.every((p) => passed(p));

  const startLesson = (id: string) => { setExpandedId(expandedId === id ? null : id); pushEvent({ type: "view_lesson", topicId: id }); };
  const startQuiz = (id: string) => { setActiveAssess(id); setChoice(null); pushEvent({ type: "start_quiz", topicId: id }); };
  const submitQuiz = (id: string, ok: boolean) => {
    pushEvent({ type: "submit_quiz", topicId: id, correct: ok });
    setProgress({ ...progress, [id]: { score: ok ? 100 : 0, passed: ok } });
    setActiveAssess(null);
  };

  const levels = [
    { key: "beg" as const, label: "Beginner" },
    { key: "int" as const, label: "Intermediate" },
    { key: "adv" as const, label: "Advanced" },
  ];

  return (
    <motion.div id="learn" className="grid gap-6" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
      <div className="row gap-2">
        <BookOpen size={18} />
        <div className="row gap-2">
          {levels.map(l => (
            <Button key={l.key} className={level === l.key ? "" : "outline"} onClick={() => setLevel(l.key)}>{l.label}</Button>
          ))}
        </div>
        <div className="ml-auto muted xs">Progress saves locally.</div>
      </div>

      <div className="grid grid-2 gap-4">
        {TOPICS.filter(t => t.level === level).map(t => {
          const unlocked = canAccess(t);
          const p = progress[t.id]?.score || 0;
          const assessing = activeAssess === t.id;
          const q = ASSESS[t.id][0];
          const correct = choice === q.c;
          return (
            <Card key={t.id} className={!unlocked ? "dim" : ""}>
              <CardHeader>
                <CardTitle className="row gap-2">
                  {!unlocked && <Lock size={16} />}{t.title}
                  <span className="muted xs">· {t.duration} min</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="muted">{t.body}</p>
                <Progress value={p} />
                <div className="row gap-2">
                  <Button onClick={() => startLesson(t.id)} disabled={!unlocked}>{expandedId === t.id ? "Close" : "Open"}</Button>
                  <Button className="secondary" onClick={() => startQuiz(t.id)} disabled={!unlocked || passed(t.id)}>Take assessment</Button>
                  {passed(t.id) && <Badge>Passed</Badge>}
                </div>

                {expandedId === t.id && (
                  <div className="lesson">
                    <div className="bold mb-1">Objectives</div>
                    <ul className="bullet">
                      <li>Recognize red flags</li>
                      <li>Practice verification steps</li>
                      <li>Apply policy-aligned reporting</li>
                    </ul>
                  </div>
                )}

                {assessing && (
                  <div className="quiz">
                    <div className="bold mb-2">Assessment</div>
                    <div className="mb-2">{q.p}</div>
                    <div className="grid gap-2 mb-2">
                      {q.a.map((opt, i) => (
                        <Button key={i} className={`wide ${choice === i ? (i === q.c ? "" : "danger") : "outline"}`} onClick={() => setChoice(i)}>{opt}</Button>
                      ))}
                    </div>
                    <div className="xs muted mb-2">{choice !== null ? (correct ? "Correct. " : "Incorrect. ") + q.r : "Select an answer."}</div>
                    <div className="row gap-2">
                      <Button onClick={() => submitQuiz(t.id, !!correct)} disabled={choice === null}>Submit</Button>
                      <Button className="outline" onClick={() => setActiveAssess(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ---------- Analytics ---------- */
function deriveAnalytics() {
  const events = load<EventRecord[]>(LS_KEYS.events, []);
  const perQ = Object.keys(ASSESS).map(id => {
    const subs = events.filter(e => e.type === "submit_quiz" && e.topicId === id) as Extract<EventRecord, { type: "submit_quiz" }>[];
    const n = subs.length || 1;
    const correct = subs.filter(s => s.correct).length;
    const p = correct / n;
    const wrong = n - correct;
    return { id, n, p: +(p.toFixed(2)), correct, wrong };
  });

  const byChoice: Record<string, { total: number; wrong: number[] }> = {};
  events.filter(e => e.type === "submit_quiz_question").forEach((e) => {
    const ev = e as Extract<EventRecord, { type: "submit_quiz_question" }>;
    byChoice[ev.qId] ||= { total: 0, wrong: [0, 0, 0, 0] };
    byChoice[ev.qId].total++;
    const q = demoQuiz.find(x => x.id === ev.qId);
    if (!ev.correct && q && ev.choice < q.options.length) {
      byChoice[ev.qId].wrong[ev.choice] = (byChoice[ev.qId].wrong[ev.choice] || 0) + 1;
    }
  });
  const confusion = Object.keys(byChoice).map(qId => {
    const q = demoQuiz.find(x => x.id === qId);
    const wrong = byChoice[qId].wrong.map((v, i) => ({ option: q?.options[i] || `Opt ${i + 1}`, count: v || 0 }));
    return { qId, wrong };
  });

  const steps = [
    { key: "view_lesson", label: "Viewed lesson" },
    { key: "start_quiz", label: "Started quiz" },
    { key: "submit_quiz", label: "Submitted" },
    { key: "passed", label: "Passed" },
  ] as const;
  const totals: Record<string, number> = Object.fromEntries(steps.map(s => [s.key, 0]));
  events.forEach(e => { if (totals[e.type] !== undefined) totals[e.type]++; if (e.type === "submit_quiz" && e.correct) totals.passed++; });
  const funnel = steps.map(s => ({ step: s.label, count: totals[s.key] }));

  return { perQ, confusion, funnel };
}

function AnalyticsTab() {
  const { perQ, funnel } = deriveAnalytics();
  const tooltipFmt = (value: number, name: string) => [value, name] as [number, string];
  const caption = (t: string) => (<p className="xs muted mt-2">{t}</p>);

  return (
    <motion.div id="analytics" className="grid grid-2 gap-6" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
      <Card className="shadow-lg">
        <CardHeader><CardTitle className="row gap-2"><BarChart2 size={18} /> Challenge Success Rates</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={demoTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ReTooltip formatter={tooltipFmt} />
              <Legend />
              <Bar dataKey="credentialHarvesting" name="Credential Harvesting" />
              <Bar dataKey="invoiceFraud" name="Invoice Fraud" />
              <Bar dataKey="extortion" name="Extortion" />
            </BarChart>
          </ResponsiveContainer>
          {caption("Counts of detected scenario types answered correctly by month.")}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader><CardTitle>Item Analysis</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perQ} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
              <YAxis dataKey="id" type="category" />
              <ReTooltip formatter={(v: number) => `${Math.round(v * 100)}% correct`} />
              <Bar dataKey="p" name="% correct" />
            </BarChart>
          </ResponsiveContainer>
          {caption("Per-topic correctness. Low % indicates difficult items needing review.")}
        </CardContent>
      </Card>

      <Card className="shadow-lg grid-span-2">
        <CardHeader><CardTitle className="text-base">Quiz Funnel</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnel}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="step" />
              <YAxis />
              <ReTooltip />
              <Bar dataKey="count" name="Users" />
            </BarChart>
          </ResponsiveContainer>
          {caption("Flow from viewing lessons to passing assessments.")}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ---------- Glossary ---------- */
function GlossaryTab() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<"all" | "channels" | "tactics">("all");
  const tags: Record<"all" | "channels" | "tactics", string[]> = {
    all: glossary.map(g => g.term),
    channels: ["Smishing", "Vishing", "QRishing"],
    tactics: ["Homoglyph", "Punycode", "Link Shortener", "BEC"],
  };

  const items = glossary.filter(g => {
    const hay = (g.term + " " + (g.aliases || []).join(" ") + " " + g.def).toLowerCase();
    return (q ? hay.includes(q.toLowerCase()) : true) && (tag === "all" || tags[tag].includes(g.term));
  });

  const terms = useMemo(() => new Set(glossary.map(g => g.term)), []);
  const autolink = (text: string, setQ2: (s: string) => void) => {
    const re = new RegExp(`\\b(${Array.from(terms).join("|")})\\b`, "gi");
    const parts = text.split(re);
    return parts.map((p, i) =>
      terms.has(p) ? <button key={i} className="underline linklike" onClick={() => setQ2(p)} title="Jump to term">{p}</button> : <span key={i}>{p}</span>
    );
  };

  const termOfDay = glossary[(new Date().getDate()) % glossary.length];

  return (
    <motion.div id="glossary" className="grid gap-4" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
      <div className="row gap-2 wrap">
        <Search size={16} />
        <Input placeholder="Search terms" value={q} onChange={(e) => setQ(e.target.value)} className="maxw-sm" />
        <div className="row gap-2 xs">
          <span>Filter:</span>
          {(["all", "channels", "tactics"] as const).map(t => (
            <Button key={t} className={tag === t ? "" : "outline"} onClick={() => setTag(t)}>{t}</Button>
          ))}
        </div>
      </div>

      <Card className="muted-bg">
        <CardHeader className="pb-2"><CardTitle className="text-base">Term of the day</CardTitle></CardHeader>
        <CardContent className="text-sm"><span className="bold">{termOfDay.term}:</span> {termOfDay.def}</CardContent>
      </Card>

      <div className="grid grid-2 gap-3">
        {items.map((g, i) => (
          <Card key={i}>
            <CardHeader className="pb-1"><CardTitle className="text-base">{g.term}</CardTitle></CardHeader>
            <CardContent className="text-sm muted space-y-2">
              <div>{autolink(g.def, setQ)}</div>
              {g.aliases?.length ? <div className="xs">Aliases: {g.aliases.join(", ")}</div> : null}
              {g.examples && (
                <div className="xs"><span className="bold">Example:</span> {g.examples.good} <span className="bold">Counter:</span> {g.examples.bad}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

/* ---------- Shell ---------- */
function Page({ tab }: { tab: TabKey }) {
  return (
    <AnimatePresence mode="wait">
      {tab === "analysis" && <AnalysisTab key="analysis" />}
      {tab === "challenges" && <ChallengesTab key="challenges" />}
      {tab === "learn" && <LearningHubTab key="learn" />}
      {tab === "analytics" && <AnalyticsTab key="analytics" />}
      {tab === "glossary" && <GlossaryTab key="glossary" />}
    </AnimatePresence>
  );
}

export default function App() {
  const [tab, setTab] = useState<TabKey>("analysis");
  return (
    <div className="app">
      <Header tab={tab} setTab={setTab} />
      <main className="container">
        <Page tab={tab} />
      </main>
      <footer className="footer xs muted">© {new Date().getFullYear()} PhishGuard Academy</footer>
    </div>
  );
}
