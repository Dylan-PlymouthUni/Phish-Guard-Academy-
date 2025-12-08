import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Upload, AlertTriangle, Zap, Lock, Eye } from 'lucide-react';
import Layout from '../components/Layout';

export default function Analyze() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'image' | 'email' | 'url'>('image');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError('');
      setActiveTab('image');
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      let data: FormData | any = null;

      if (file) {
        data = new FormData();
        data.append('file', file);
        
        const response = await fetch('/analyze', {
          method: 'POST',
          body: data,
        });
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const result = await response.json();
        setResult(result);
      } else if (text || url) {
        data = { text, url };
        
        const response = await fetch('/analyze_text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const result = await response.json();
        setResult(result);
      } else {
        setError('Please provide input (image, email text, or URL)');
        setLoading(false);
        return;
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 70) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-500' };
    if (risk >= 40) return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-500' };
    return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-500' };
  };

  const getRiskLabel = (risk: number) => {
    if (risk >= 70) return '🚨 High Risk';
    if (risk >= 40) return '⚠️ Medium Risk';
    return '✅ Low Risk';
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Analyze for Phishing
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            Upload screenshots, paste emails, or enter URLs to detect phishing attacks using AI-powered analysis.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-2">
            <form onSubmit={handleAnalyze} className="space-y-6 bg-slate-800/50 p-6 rounded-lg border border-slate-700/50">
              {/* Tabs */}
              <div className="flex gap-2 border-b border-slate-700">
                {['image', 'email', 'url'].map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-2 font-medium transition border-b-2 ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {tab === 'image' ? '📸 Screenshot' : tab === 'email' ? '📧 Email' : '🔗 URL'}
                  </button>
                ))}
              </div>

              {/* Screenshot Tab */}
              {activeTab === 'image' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 hover:border-blue-500 transition cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                      id="file-input"
                    />
                    <label htmlFor="file-input" className="cursor-pointer flex flex-col items-center gap-3">
                      <Upload className="w-12 h-12 text-slate-400" />
                      <div className="text-center">
                        <p className="text-white font-medium">Drag screenshot here or click to browse</p>
                        <p className="text-sm text-slate-400">PNG, JPG, GIF up to 8MB</p>
                      </div>
                    </label>
                  </div>
                  {file && (
                    <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-green-400">{file.name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Email Tab */}
              {activeTab === 'email' && (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste the suspicious email content here..."
                  className="w-full h-48 p-4 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              )}

              {/* URL Tab */}
              {activeTab === 'url' && (
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://suspicious-bank.tk or goo.gl/xyz123"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                {loading ? 'Analyzing...' : 'Analyze Now'}
              </button>
            </form>

            {/* Error Display */}
            {error && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Info Cards */}
          <div className="space-y-4">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <Eye className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white">How It Works</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>✓ AI-powered visual analysis</li>
                <li>✓ URL pattern detection</li>
                <li>✓ Suspicious language check</li>
                <li>✓ Real-time feedback</li>
              </ul>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <Lock className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-white">Privacy</h3>
              </div>
              <p className="text-sm text-slate-300">
                Your uploads are analyzed in real-time and never stored. 100% private and secure.
              </p>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="mt-12 space-y-6">
            {/* Overall Risk */}
            {result.overall_risk_percent !== undefined && (
              <div className={`p-8 border-2 rounded-lg ${getRiskColor(result.overall_risk_percent).bg} ${getRiskColor(result.overall_risk_percent).border}`}>
                <div className="flex items-end gap-6">
                  <div>
                    <p className={`text-6xl font-bold ${getRiskColor(result.overall_risk_percent).text}`}>
                      {result.overall_risk_percent}%
                    </p>
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-2xl font-bold ${getRiskColor(result.overall_risk_percent).text} mb-2`}>
                      {getRiskLabel(result.overall_risk_percent)}
                    </h3>
                    <p className="text-slate-300 text-sm">
                      {result.overall_risk_percent >= 70
                        ? 'This appears to be a phishing or scam attempt. Do not interact with it.'
                        : result.overall_risk_percent >= 40
                        ? 'Suspicious indicators detected. Verify sender and be cautious.'
                        : 'This appears to be legitimate, but always verify before clicking links.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Risk Breakdown */}
            <div className="grid grid-cols-3 gap-4">
              {result.model_risk_percent !== undefined && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Visual Analysis</p>
                  <p className={`text-3xl font-bold ${getRiskColor(result.model_risk_percent).text}`}>
                    {result.model_risk_percent}%
                  </p>
                </div>
              )}
              {result.url_risk_percent !== undefined && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">URL Risk</p>
                  <p className={`text-3xl font-bold ${getRiskColor(result.url_risk_percent).text}`}>
                    {result.url_risk_percent}%
                  </p>
                </div>
              )}
              {result.phrase_risk_percent !== undefined && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Language</p>
                  <p className={`text-3xl font-bold ${getRiskColor(result.phrase_risk_percent).text}`}>
                    {result.phrase_risk_percent}%
                  </p>
                </div>
              )}
            </div>

            {/* Detected Phrases */}
            {result.detected_phrases && result.detected_phrases.length > 0 && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-6">
                <h3 className="font-semibold text-orange-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Suspicious Phrases Detected
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.detected_phrases.map((p: string) => (
                    <span key={p} className="bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-sm font-medium">
                      "{p}"
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* URLs */}
            {result.urls && result.urls.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4">🔗 URLs Found</h3>
                <div className="space-y-3">
                  {result.urls.map((url_item: any) => (
                    <div key={url_item.url} className="p-3 bg-slate-900/50 rounded border border-slate-700/50">
                      <p className="text-sm font-mono text-blue-400 break-all mb-2">{url_item.url}</p>
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>Risk: {url_item.ml_risk_percent || 0}%</span>
                        {url_item.reasons && <span>{url_item.reasons.join(', ')}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
