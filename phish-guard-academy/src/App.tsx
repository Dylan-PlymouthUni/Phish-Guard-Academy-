// @ts-nocheck
import React, { useRef, useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Search, ShieldAlert, Upload, Award, BookOpen, BarChart2, Info, CheckCircle2,
  AlertTriangle, PlayCircle, Image as ImageIcon, FileText, Link as LinkIcon, Timer, Lock
} from "lucide-react";
import {
  PieChart, Pie, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, Legend
} from "recharts";

/* ---------- Types ---------- */
type Tab = "analysis" | "challenges" | "learn" | "analytics" | "glossary";

/* ---------- Storage helpers ---------- */
const LS_KEYS = { progress: "pg_progress_v1", events: "pg_events_v1" };
const load = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? def; } catch { return def; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const pushEvent = (evt) => { if (typeof window === "undefined") return; const ev = load(LS_KEYS.events, []); ev.push({ ts: Date.now(), ...evt }); save(LS_KEYS.events, ev); };

/* ---------- Mock + helpers ---------- */
async function mockAnalyze({ text, url, file }) {
  const base = `${text || ""}\n${url || ""}\n${file ? file.name : ""}`.trim();
  const hasUrl = /(https?:\/\/[^\s]+)/i.test(base);
  const urgent = /(urgent|immediately|24\s*hours|verify now|account (locked|closed))/i.test(base);
  const lookalike = /(paypaI|rnicrosoft|faceb00k|app1e|goog1e)/i.test(base);
  const findings = [];
  if (lookalike) findings.push({ type: "lookalike", label: "Lookalike brand", detail: "Possible homoglyphs in brand/domain", severity: "high" });
  if (hasUrl) findings.push({ type: "links", label: "Contains links", detail: "Verify destination vs domain owner", severity: urgent ? "high" : "med" });
  if (urgent) findings.push({ type: "urgent-language", label: "Urgent language", detail: "Pressure to act quickly detected", severity: "med" });
  if (!findings.length) findings.push({ type: "general", label: "No strong cues", detail: "No obvious phishing signals in provided input", severity: "low" });
  const riskBase = (urgent ? 40 : 10) + (hasUrl ? 20 : 0) + (lookalike ? 30 : 0);
  const risk = Math.max(5, Math.min(98, riskBase));
  return new Promise((r) => setTimeout(() => r({ risk, findings, boxes: [] }), 150));
}

async function analyzeAPI(payload) {
  try {
    const r = await fetch("/api/analyze", {
      method: "POST",
      headers: payload.file ? undefined : { "Content-Type": "application/json" },
      body: payload.file
        ? (() => { const fd = new FormData(); if (payload.text) fd.append("text", payload.text); if (payload.url) fd.append("url", payload.url); fd.append("image", payload.file); return fd; })()
        : JSON.stringify({ text: payload.text, url: payload.url })
    });
    if (!r.ok) throw new Error("fallback");
    return await r.json();
  } catch { return mockAnalyze(payload); }
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

const demoQuiz = [
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

/* ---------- Glossary ---------- */
const glossary = [
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

/* ---------- Header (typed) ---------- */
function Header({
  tab,
  setTab,
}: {
  tab: Tab;
  setTab: React.Dispatch<React.SetStateAction<Tab>>;
}) {
  const Item: React.FC<{ id: Tab; label: string }> = ({ id, label }) => (
    <button className={tab === id ? "hover:underline font-bold" : "hover:underline"} onClick={() => setTab(id)}>
      {label}
    </button>
  );

  return (
    <div className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b">
      <div className="max-w-7xl mx-auto p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6" />
          <span className="font-bold text-xl">PhishGuard</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm">
          <Item id="analysis" label="Analyze" />
          <Item id="challenges" label="Challenges" />
          <Item id="learn" label="Learning Hub" />
          <Item id="analytics" label="Analytics" />
          <Item id="glossary" label="Glossary" />
        </div>
      </div>
    </div>
  );
}

/* ---------- Small UI ---------- */
function RiskBadge({ score }) {
  const label = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
  const intent = score >= 70 ? "destructive" : score >= 40 ? "secondary" : "default";
  return <Badge variant={intent}>Risk: {label} ({score}%)</Badge>;
}

/* ---------- Analysis ---------- */
function AnalysisTab() {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [safeMode, setSafeMode] = useState(true);
  const canvasRef = useRef(null);

  const doAnalyze = async () => { setLoading(true); const r = await analyzeAPI({ text, url, file }); setResult(r); setLoading(false); };

  useEffect(() => {
    if (!imgPreview) return;
    const img = new Image();
    img.onload = () => {
      const c = canvasRef.current; if (!c) return;
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      if (!result?.boxes?.length) return;
      ctx.lineWidth = 3; ctx.strokeStyle = "red"; ctx.font = "12px sans-serif"; ctx.fillStyle = "rgba(255,0,0,0.15)";
      result.boxes.forEach(b => {
        const x = b.x * img.width, y = b.y * img.height, w = b.w * img.width, h = b.h * img.height;
        ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h); ctx.fillStyle = "red"; ctx.fillText(b.label, x+4, y+12); ctx.fillStyle = "rgba(255,0,0,0.15)";
      });
    };
    img.src = imgPreview;
  }, [imgPreview, result]);

  return (
    <div id="analysis" className="grid lg:grid-cols-2 gap-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Upload or Paste</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="text">Paste email text</Label>
            <Textarea id="text" placeholder="Paste suspicious email content" value={text} onChange={(e)=>setText(e.target.value)} className="min-h-[120px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="url">URL</Label>
              <div className="flex gap-2">
                <Input id="url" placeholder="https://..." value={url} onChange={(e)=>setUrl(e.target.value)} />
                <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" type="button"><LinkIcon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Validate link</TooltipContent></Tooltip></TooltipProvider>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="file">Screenshot</Label>
              <Input
                id="file"
                type="file"
                accept="image/*"
                onChange={(e)=> {
                  const f = e.target.files?.[0];
                  setFile(f || null);
                  if (f) {
                    const r = new FileReader();
                    r.onload = () => setImgPreview(r.result);
                    r.readAsDataURL(f);
                  }
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="safe" checked={safeMode} onCheckedChange={setSafeMode}/>
            <Label htmlFor="safe">Safe mode: strip live links</Label>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Uses /api/analyze if reachable, else mock.</div>
          <Button onClick={doAnalyze} disabled={loading}>{loading ? "Analyzing..." : "Analyze"}</Button>
        </CardFooter>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" />Result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!result && <div className="text-sm text-muted-foreground">No analysis yet. Upload text, a URL, or a screenshot to begin.</div>}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <RiskBadge score={result.risk} />
                <Progress value={result.risk} className="w-48"/>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {result.findings.map((f, i)=> (
                  <Alert key={i} variant={f.severity === "high" ? "destructive" : "default"}>
                    <AlertTitle className="flex items-center gap-2">{f.severity === "high" ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}{f.label}</AlertTitle>
                    <AlertDescription className="text-sm">{f.detail}</AlertDescription>
                  </Alert>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Text</CardTitle></CardHeader>
                  <CardContent className="text-xs whitespace-pre-wrap max-h-48 overflow-auto p-2 bg-muted/40 rounded-lg">{text || "—"}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ImageIcon className="h-4 w-4" />Screenshot</CardTitle></CardHeader>
                  <CardContent>
                    <div className="relative border rounded-lg overflow-hidden">
                      {imgPreview ? (
                        <canvas ref={canvasRef} className="w-full max-h-64 object-contain" />
                      ) : (
                        <div className="h-64 grid place-items-center text-sm text-muted-foreground">No image</div>
                      )}
                    </div>
                    {!result?.boxes?.length && imgPreview && (
                      <p className="mt-2 text-xs text-muted-foreground">Image shown. No suspicious text regions detected.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Next steps</CardTitle></CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {[
                      "Do not click any links or attachments.",
                      "Change passwords reused on other sites.",
                      "Enable multi-factor authentication.",
                      "Report to your email provider and IT/security.",
                    ].map((s,i)=> <li key={i}>{s}</li>)}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Challenges ---------- */
function ChallengesTab() {
  const cats = Array.from(new Set(["All", ...demoQuiz.map(q=>q.cat||"Other")]));
  const [selectedCat, setSelectedCat] = useState("All");
  const [randomize, setRandomize] = useState(true);
  const [count, setCount] = useState(10);

  const [indices, setIndices] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<Record<string,{choice:number;correct:boolean}>>({});
  const [timed, setTimed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [responseTimes, setResponseTimes] = useState<Record<string, number>>({});

  const buildRun = () => {
    const pool = demoQuiz.map((q,i)=>({q,i})).filter(({q})=> selectedCat==="All" ? true : q.cat===selectedCat);
    const arr = pool.map(p=>p.i);
    if (randomize) {
      for (let i=arr.length-1; i>0; i--) { const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    }
    const picked = arr.slice(0, Math.min(count, arr.length));
    setIndices(picked);
    setIdx(0);
    setScore(0);
    setAnswered({});
    setResponseTimes({});
    setTimeLeft(20);
  };
  useEffect(buildRun, []);

  useEffect(() => { if (!timed) return; setTimeLeft(20); const t = setInterval(()=>setTimeLeft((s)=> s>0 ? s-1 : 0),1000); return ()=>clearInterval(t); }, [idx, timed]);

  const q = demoQuiz[indices[idx] ?? 0] || demoQuiz[0];
  const atEnd = idx === indices.length - 1 && answered[q.id];

  const answer = (choice:number) => {
    if (answered[q.id]) return;
    const correct = choice === q.correct;
    setAnswered({ ...answered, [q.id]: { choice, correct } });
    if (timed) setResponseTimes({ ...responseTimes, [q.id]: 20 - timeLeft });
    if (correct) setScore(score + 1);
    pushEvent({ type:"submit_quiz_question", qId:q.id, choice, correct });
  };
  const next = () => setIdx(Math.min(idx + 1, indices.length - 1));
  const restart = () => buildRun();

  const total = indices.length || 1;
  const allCorrect = total>0 && Object.values(answered).length===total && Object.values(answered).every(a=>a.correct);
  const fastAvg = timed && Object.values(responseTimes).length>0 && (Object.values(responseTimes).reduce((a,b)=>a+b,0)/Object.values(responseTimes).length) <= 5;
  const badges = [
    {label:"Link Sleuth", done: score >= 1},
    {label:"Header Hound", done: score >= 3},
    {label:"Spoof Spotter", done: score >= 5},
    {label:"Perfect Run", done: allCorrect},
    {label:"Speedster", done: !!fastAvg},
    {label:"Marathoner", done: total >= 15},
  ];

  return (
    <div id="challenges" className="grid lg:grid-cols-[2fr,1fr] gap-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PlayCircle className="h-5 w-5" />Phishing Awareness Challenge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3 p-3 border rounded">
            <div className="space-y-1">
              <Label>Category</Label>
              <select className="w-full border rounded px-2 py-1" value={selectedCat} onChange={(e)=>setSelectedCat(e.target.value)}>
                {cats.map(c=> <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Question count</Label>
              <Input type="number" min={1} max={demoQuiz.length} value={count} onChange={(e)=>setCount(parseInt(e.target.value||"1",10))} />
            </div>
            <div className="space-y-1 flex items-end justify-between">
              <div className="flex items-center gap-2"><Switch id="rand" checked={randomize} onCheckedChange={setRandomize}/><Label htmlFor="rand">Randomise</Label></div>
              <Button size="sm" onClick={buildRun}>Start</Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>Question {Math.min(idx + 1, indices.length)} of {indices.length}</div>
            <div className="flex items-center gap-2"><Timer className="h-4 w-4" />{timed ? `${timeLeft}s` : "untimed"}</div>
          </div>
          <div className="text-xs text-muted-foreground">Category: <span className="font-medium">{q.cat || '—'}</span></div>
          <div className="text-lg font-medium">{q.prompt}</div>
          {q.img && <img src={q.img} alt="question" className="max-h-48 rounded border" />}

          <div className="grid gap-2">
            {q.options.map((opt, i)=> (
              <Button key={i} variant={answered[q.id]?.choice === i ? (answered[q.id]?.correct ? "default" : "destructive") : "outline"} className="justify-start" onClick={()=>answer(i)}>
                {opt}
              </Button>
            ))}
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
                {timed && Object.keys(responseTimes).length>0 && (
                  <div>Avg response time: {(
                    Object.values(responseTimes).reduce((a,b)=>a+b,0)/Object.values(responseTimes).length
                  ).toFixed(1)}s</div>
                )}
                <div className="space-y-1">
                  {indices.map(i=> { const qq=demoQuiz[i]; return answered[qq.id] && !answered[qq.id].correct ? (
                    <div key={qq.id} className="text-xs">❌ {qq.prompt} — <span className="italic">{qq.explain}</span></div>
                  ) : null; })}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="text-sm flex items-center gap-2"><Award className="h-4 w-4" />Score: {score}</div>
          <div className="flex items-center gap-2">
            <Label htmlFor="timed" className="text-sm">Timed</Label>
            <Switch id="timed" checked={timed} onCheckedChange={setTimed} />
            <Button onClick={next} disabled={idx === indices.length - 1}>Next</Button>
            <Button variant="outline" onClick={restart}>Restart</Button>
          </div>
        </CardFooter>
      </Card>
      <div className="grid gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Achievements</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {badges.map(b=> <Badge key={b.label} variant={b.done?"default":"secondary"}>{b.label}</Badge>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Progress</CardTitle></CardHeader>
          <CardContent><Progress value={(score / (indices.length||1)) * 100} /></CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------- Learning Hub ---------- */
const TOPICS = [
  { id: "lh1", title: "Phishing Patterns", level:"beg", duration:6, prereqIds:[], body:"Hooks: urgency, fear, reward, authority, scarcity. Verify via a second channel." },
  { id: "lh2", title: "Domain Spoofing", level:"beg", duration:7, prereqIds:["lh1"], body:"Check registered domain vs subdomain tricks." },
  { id: "lh3", title: "Social Engineering", level:"int", duration:8, prereqIds:["lh2"], body:"Pretexts: payroll change, invoice update, MFA reset, gift cards." },
  { id: "lh4", title: "Email Auth Basics", level:"int", duration:8, prereqIds:["lh3"], body:"SPF, DKIM, DMARC reduce spoofing but are not guarantees." },
  { id: "lh5", title: "Advanced BEC", level:"adv", duration:10, prereqIds:["lh4"], body:"Invoice fraud, vendor compromise, and payment diversion patterns." },
];
const ASSESS = {
  lh1: [{p:"Which is a common phishing hook?", a:["Detailed privacy policy","Urgent threat","Signed email"], c:1, r:"Urgency pressures mistakes."}],
  lh2: [{p:"Which is the registered domain in login.paypal.com.attacker.co?", a:["login.paypal.com","attacker.co","paypal.com"], c:1, r:"Registered domain is attacker.co."}],
  lh3: [{p:"Gift card request from a 'CEO' is likely:", a:["Standard","BEC attempt","Newsletter"], c:1, r:"Classic BEC pretext."}],
  lh4: [{p:"DMARC primarily helps with:", a:["End-to-end encryption","Spoofing control","Malware removal"], c:1, r:"Alignment to block spoofing."}],
  lh5: [{p:"Best out-of-band verification is:", a:["Reply to email","Call known number","Click link"], c:1, r:"Call known contact number."}],
};

function LearningHubTab() {
  const [level, setLevel] = useState("beg");
  const [progress, setProgress] = useState(load(LS_KEYS.progress, {}));
  const [expandedId, setExpandedId] = useState(null);
  const [activeAssess, setActiveAssess] = useState(null);
  const [choice, setChoice] = useState<number|null>(null);
  useEffect(()=>save(LS_KEYS.progress, progress), [progress]);

  const passed = (id) => Boolean(progress[id]?.passed);
  const canAccess = (t) => t.prereqIds.every(p=>passed(p));

  const startLesson = (id) => { setExpandedId(expandedId===id? null : id); pushEvent({ type:"view_lesson", topicId:id }); };
  const startQuiz = (id) => { setActiveAssess(id); setChoice(null); pushEvent({ type:"start_quiz", topicId:id }); };
  const submitQuiz = (id, ok) => { pushEvent({ type:"submit_quiz", topicId:id, correct: ok }); setProgress({ ...progress, [id]: { score: ok?100:0, passed: ok } }); setActiveAssess(null); };

  const levels = [
    { key:"beg", label:"Beginner" },
    { key:"int", label:"Intermediate" },
    { key:"adv", label:"Advanced" },
  ];

  return (
    <div id="learn" className="grid gap-6">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5" />
        <div className="flex gap-2">
          {levels.map(l=> (
            <Button key={l.key} size="sm" variant={level===l.key?"default":"outline"} onClick={()=>setLevel(l.key)}>{l.label}</Button>
          ))}
        </div>
        <div className="ml-auto text-xs text-muted-foreground">Progress saves locally.</div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {TOPICS.filter(t=>t.level===level).map(t=> {
          const unlocked = canAccess(t);
          const p = progress[t.id]?.score || 0;
          const assessing = activeAssess===t.id;
          const q = ASSESS[t.id][0];
          const correct = choice===q.c;
          return (
            <Card key={t.id} className={!unlocked?"opacity-60":undefined}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">{!unlocked && <Lock className="h-4 w-4"/>}{t.title} <span className="text-xs text-muted-foreground">· {t.duration} min</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{t.body}</p>
                <Progress value={p} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={()=>startLesson(t.id)} disabled={!unlocked}>{expandedId===t.id? 'Close' : 'Open'}</Button>
                  <Button size="sm" variant="secondary" onClick={()=>startQuiz(t.id)} disabled={!unlocked || passed(t.id)}>Take assessment</Button>
                  {passed(t.id) && <Badge>Passed</Badge>}
                </div>

                {expandedId===t.id && (
                  <div className="mt-3 p-3 rounded border bg-muted/30 text-sm">
                    <div className="font-medium mb-1">Objectives</div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Recognize red flags</li>
                      <li>Practice verification steps</li>
                      <li>Apply policy-aligned reporting</li>
                    </ul>
                  </div>
                )}

                {assessing && (
                  <div className="mt-3 p-3 rounded border">
                    <div className="text-sm font-medium mb-2">Assessment</div>
                    <div className="mb-2 text-sm">{q.p}</div>
                    <div className="grid gap-2 mb-2">
                      {q.a.map((opt,i)=> (
                        <Button key={i} variant={choice===i? (i===q.c? 'default':'destructive'):'outline'} className="justify-start" onClick={()=>setChoice(i)}>{opt}</Button>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">{choice!==null ? (correct? 'Correct. ' : 'Incorrect. ')+q.r : 'Select an answer.'}</div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={()=>submitQuiz(t.id, correct)} disabled={choice===null}>Submit</Button>
                      <Button size="sm" variant="outline" onClick={()=>setActiveAssess(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Analytics ---------- */
function deriveAnalytics() {
  const events = load(LS_KEYS.events, []);
  const perQ = Object.keys(ASSESS).map(id=>{
    const subs = events.filter(e=>e.type==="submit_quiz" && e.topicId===id);
    const n = subs.length||1;
    const correct = subs.filter(s=>s.correct).length;
    const p = correct / n;
    const wrong = n - correct;
    return { id, n, p: +(p.toFixed(2)), correct, wrong };
  });
  const byChoice = {};
  load(LS_KEYS.events, []).filter(e=>e.type==="submit_quiz_question").forEach(e=>{
    byChoice[e.qId] ||= { total:0, wrong:[0,0,0,0] };
    byChoice[e.qId].total++;
    if(!e.correct){ const q = demoQuiz.find(x=>x.id===e.qId); if(q && e.choice<q.options.length) { byChoice[e.qId].wrong[e.choice] = (byChoice[e.qId].wrong[e.choice]||0)+1; } }
  });
  const confusion = Object.keys(byChoice).map(qId=>{
    const q = demoQuiz.find(x=>x.id===qId);
    const wrong = byChoice[qId].wrong.map((v,i)=>({ option:q?.options[i]||`Opt ${i+1}`, count:v||0 }));
    return { qId, wrong };
  });
  const steps = [
    {key:"view_lesson", label:"Viewed lesson"},
    {key:"start_quiz", label:"Started quiz"},
    {key:"submit_quiz", label:"Submitted"},
    {key:"passed", label:"Passed"},
  ];
  const totals = Object.fromEntries(steps.map(s=>[s.key,0]));
  events.forEach(e=>{ if(totals[e.type]!==undefined) totals[e.type]++; if(e.type==="submit_quiz" && e.correct) totals.passed++; });
  const funnel = steps.map(s=>({ step:s.label, count: totals[s.key] }));
  return { perQ, confusion, funnel };
}

function AnalyticsTab() {
  const tooltipFmt = (value, name) => [value, name];
  const caption = (t) => (<p className="mt-2 text-xs text-muted-foreground">{t}</p>);
  const pieLabel = ({ name, percent }) => `${name}: ${(percent*100).toFixed(0)}%`;
  const { perQ, confusion, funnel } = deriveAnalytics();

  return (
    <div id="dashboard" className="grid lg:grid-cols-2 gap-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5" />Challenge Success Rates</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={demoTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" label={{ value: "Month", position: "insideBottom", offset: -5 }} />
              <YAxis label={{ value: "Count", angle: -90, position: "insideLeft" }} />
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
              <XAxis type="number" domain={[0,1]} tickFormatter={(v)=>`${Math.round(v*100)}%`} />
              <YAxis dataKey="id" type="category" />
              <ReTooltip formatter={(v)=>`${Math.round(v*100)}% correct`} />
              <Bar dataKey="p" name="% correct" />
            </BarChart>
          </ResponsiveContainer>
          {caption("Per-topic correctness. Low % indicates difficult items needing review.")}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader><CardTitle>Quiz Funnel</CardTitle></CardHeader>
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

      <Card className="shadow-lg lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Misidentified Types Breakdown</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie dataKey="value" data={[{name:"Links", value:56},{name:"Sender", value:24},{name:"Attachments", value:12},{name:"Branding", value:8}]} outerRadius={90} label={pieLabel} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          {caption("Share of user mistakes by cue type in recent challenges.")}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Glossary ---------- */
function GlossaryTab() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("all");
  const tags = {
    all: glossary.map(g=>g.term),
    channels: ["Smishing","Vishing","QRishing"],
    tactics: ["Homoglyph","Punycode","Link Shortener","BEC"],
  };
  const items = glossary.filter(g => {
    const hay = (g.term+" "+(g.aliases||[]).join(" ")+" "+g.def).toLowerCase();
    return (q? hay.includes(q.toLowerCase()): true) && (tag==="all" || tags[tag].includes(g.term));
  });

  const terms = new Set(glossary.map(g=>g.term));
  const autolink = (text, setQ) => {
    const re = new RegExp(`\\b(${Array.from(terms).join("|")})\\b`,`gi`);
    const parts = text.split(re);
    return parts.map((p,i)=> terms.has(p) ? <button key={i} className="underline" onClick={()=>setQ(p)} title="Jump to term">{p}</button> : <span key={i}>{p}</span>);
  };

  const termOfDay = glossary[(new Date().getDate()) % glossary.length];
  return (
    <div id="glossary" className="grid gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Search className="h-4 w-4" />
        <Input placeholder="Search terms" value={q} onChange={(e)=>setQ(e.target.value)} className="max-w-sm" />
        <div className="flex items-center gap-2 text-xs">
          <span>Filter:</span>
          {["all","channels","tactics"].map(t => (
            <Button key={t} size="sm" variant={tag===t?"default":"outline"} onClick={()=>setTag(t)}>{t}</Button>
          ))}
        </div>
      </div>
      <Card className="bg-muted/40">
        <CardHeader className="pb-2"><CardTitle className="text-base">Term of the day</CardTitle></CardHeader>
        <CardContent className="text-sm"><span className="font-medium">{termOfDay.term}:</span> {termOfDay.def}</CardContent>
      </Card>
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((g,i)=> (
          <Card key={i}>
            <CardHeader className="pb-1"><CardTitle className="text-base">{g.term}</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <div>{autolink(g.def, setQ)}</div>
              {g.aliases?.length ? <div className="text-xs">Aliases: {g.aliases.join(", ")}</div> : null}
              {g.examples && (
                <div className="text-xs"><span className="font-medium">Example:</span> {g.examples.good} <span className="font-medium">Counter:</span> {g.examples.bad}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- App ---------- */
export default function PhishGuardApp() {
  const [tab, setTab] = useState<Tab>("analysis");
  return (
    <div className="p-4">
      <Header tab={tab} setTab={setTab} />
      <main className="max-w-7xl mx-auto grid gap-10">
        {tab === "analysis" && <AnalysisTab />}
        {tab === "challenges" && <ChallengesTab />}
        {tab === "learn" && <LearningHubTab />}
        {tab === "analytics" && <AnalyticsTab />}
        {tab === "glossary" && <GlossaryTab />}
      </main>
    </div>
  );
}
