import React, { useState, useEffect } from 'react';
import { Shield, Zap, Users, TrendingUp, ArrowRight, CheckCircle2, AlertCircle, Mail, Globe, Image as ImageIcon, Target, Award, BookOpen, BarChart3, Eye, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function Home() {
  const [activeExample, setActiveExample] = useState(0);
  const [animatedStats, setAnimatedStats] = useState({ analyses: 0, users: 0, rate: 0 });

  // Animate statistics on mount
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    
    const targets = { analyses: 12500, users: 8300, rate: 98.7 };
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setAnimatedStats({
        analyses: Math.floor((targets.analyses * step) / steps),
        users: Math.floor((targets.users * step) / steps),
        rate: parseFloat(((targets.rate * step) / steps).toFixed(1)),
      });

      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  // Rotate phishing examples
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveExample((prev) => (prev + 1) % phishingExamples.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: Shield,
      title: "Smart Detection",
      description: "Advanced detection system trained on thousands of real phishing attempts",
      color: "blue"
    },
    {
      icon: Zap,
      title: "Instant Analysis",
      description: "Get comprehensive threat reports in seconds with our optimized detection engine",
      color: "yellow"
    },
    {
      icon: Target,
      title: "Interactive Challenges",
      description: "Test and improve your skills with real-world phishing scenarios",
      color: "orange"
    },
    {
      icon: BookOpen,
      title: "Expert Education",
      description: "Learn from security experts with comprehensive lessons and tutorials",
      color: "green"
    },
    {
      icon: BarChart3,
      title: "Progress Tracking",
      description: "Monitor your improvement with detailed analytics and insights",
      color: "purple"
    },
    {
      icon: Users,
      title: "Community Learning",
      description: "Join thousands of users learning to spot phishing attempts",
      color: "cyan"
    },
  ];

  const capabilities = [
    { icon: Mail, title: "Email Analysis", desc: "Scan suspicious emails" },
    { icon: Globe, title: "URL Checking", desc: "Verify website safety" },
    { icon: ImageIcon, title: "Screenshot Scan", desc: "Analyze visual content" },
  ];

  const benefits = [
    "🛡️ Real-time threat detection",
    "🎓 Interactive educational challenges",
    "📊 Personalized performance analytics",
    "🔒 Privacy-focused (no data storage)",
    "📱 Mobile-responsive interface",
    "🏆 Achievement & badge system",
    "⚡ Instant feedback & explanations",
    "🌐 Works offline after initial load",
  ];

  const phishingExamples = [
    {
      type: "Urgent Account Verification",
      indicators: ["Generic greeting", "Urgent language", "Suspicious link"],
      risk: "HIGH"
    },
    {
      type: "Fake Prize Notification",
      indicators: ["Too good to be true", "Request for personal info", "Poor grammar"],
      risk: "HIGH"
    },
    {
      type: "CEO Impersonation",
      indicators: ["Unusual request", "External email", "Payment urgency"],
      risk: "CRITICAL"
    },
    {
      type: "Package Delivery Scam",
      indicators: ["Unknown sender", "Shortened URL", "Download request"],
      risk: "HIGH"
    },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-sm font-semibold">
                <Shield className="w-4 h-4" />
                Trusted by 8,000+ Users
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
                Master the Art of
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 animate-gradient">
                  Phishing Detection
                </span>
              </h1>
              
              <p className="text-xl text-slate-300 leading-relaxed">
                Learn to identify, analyze, and protect yourself from phishing attacks with our intelligent platform. 
                Interactive challenges, expert lessons, and real-time threat analysis.
              </p>

              <div className="flex gap-4 flex-wrap">
                <Link
                  to="/dashboard"
                  className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-xl transition flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                </Link>
                <Link
                  to="/learning"
                  className="px-8 py-4 border-2 border-slate-400 hover:border-white hover:bg-white/5 text-white font-semibold rounded-xl transition"
                >
                  Explore Lessons
                </Link>
              </div>

              {/* Quick capabilities */}
              <div className="flex gap-4 flex-wrap">
                {capabilities.map((cap, i) => {
                  const Icon = cap.icon;
                  return (
                    <div key={i} className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg">
                      <Icon className="w-4 h-4 text-blue-400" />
                      <div>
                        <p className="text-xs text-slate-400">{cap.desc}</p>
                        <p className="text-sm font-semibold text-white">{cap.title}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Interactive Demo */}
            <div className="relative">
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold">Live Threat Example</h3>
                  <div className="flex gap-2">
                    {phishingExamples.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveExample(i)}
                        className={`w-2 h-2 rounded-full transition ${
                          i === activeExample ? 'bg-red-500 w-6' : 'bg-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-400 text-sm">Threat Type:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      phishingExamples[activeExample].risk === 'CRITICAL' 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    }`}>
                      {phishingExamples[activeExample].risk} RISK
                    </span>
                  </div>
                  <p className="text-white font-semibold mb-4">{phishingExamples[activeExample].type}</p>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 mb-2">Red Flags Detected:</p>
                    {phishingExamples[activeExample].indicators.map((indicator, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-slate-300">{indicator}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link to="/analyze" className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-center font-semibold rounded-lg transition">
                  Analyze Your Own Threat →
                </Link>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-gradient-to-br from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full shadow-lg font-bold text-sm flex items-center gap-2 animate-bounce">
                <Shield className="w-4 h-4" />
                Safe & Secure
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Animated Stats Section */}
      <section className="bg-slate-800/50 py-16 border-y border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group hover:scale-105 transition-transform duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-full mb-4 group-hover:bg-blue-500/20 transition">
                <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-5xl font-bold text-blue-400 mb-2">{animatedStats.analyses.toLocaleString()}+</p>
              <p className="text-slate-300 font-medium">Threats Analyzed</p>
            </div>
            <div className="text-center group hover:scale-105 transition-transform duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full mb-4 group-hover:bg-green-500/20 transition">
                <Users className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-5xl font-bold text-green-400 mb-2">{animatedStats.users.toLocaleString()}+</p>
              <p className="text-slate-300 font-medium">Users Protected</p>
            </div>
            <div className="text-center group hover:scale-105 transition-transform duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/10 rounded-full mb-4 group-hover:bg-purple-500/20 transition">
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-5xl font-bold text-purple-400 mb-2">{animatedStats.rate}%</p>
              <p className="text-slate-300 font-medium">Detection Accuracy</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Everything You Need to Stay Safe</h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              Comprehensive tools and education to identify and prevent phishing attacks
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              const colorMap: any = {
                blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/30 hover:border-blue-400',
                yellow: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/30 hover:border-yellow-400',
                orange: 'from-orange-500/10 to-orange-600/5 border-orange-500/30 hover:border-orange-400',
                green: 'from-green-500/10 to-green-600/5 border-green-500/30 hover:border-green-400',
                purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/30 hover:border-purple-400',
                cyan: 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/30 hover:border-cyan-400',
              };
              return (
                <div key={i} className={`group bg-gradient-to-br ${colorMap[feature.color]} border rounded-xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
                  <div className={`inline-flex items-center justify-center w-14 h-14 bg-${feature.color}-500/10 rounded-lg mb-4 group-hover:scale-110 transition`}>
                    <Icon className={`w-7 h-7 text-${feature.color}-400`} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-300 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 py-20 border-y border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-12 text-center">What Makes Us Different</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, i) => (
              <div key={i} className="group flex items-start gap-3 p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:border-blue-500/50 hover:bg-slate-800/80 transition">
                <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-1 group-hover:scale-110 transition" />
                <p className="text-slate-300">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-16 text-center">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { num: "1", icon: Eye, title: "Submit", desc: "Upload a screenshot, email, or URL" },
              { num: "2", icon: Shield, title: "Analyze", desc: "Smart scanner detects phishing indicators" },
              { num: "3", icon: BarChart3, title: "Learn", desc: "Get detailed threat report & explanations" },
              { num: "4", icon: Award, title: "Improve", desc: "Complete challenges & track progress" },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="relative text-center">
                  <div className="relative inline-block mb-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-slate-900 border-2 border-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-blue-400 font-bold">{step.num}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-slate-400">{step.desc}</p>
                  {i < 3 && (
                    <ArrowRight className="hidden md:block absolute top-12 -right-4 w-8 h-8 text-slate-600" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600/10 to-purple-600/10 border-y border-blue-500/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Shield className="w-16 h-16 text-blue-400 mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to Protect Yourself?</h2>
          <p className="text-xl text-slate-300 mb-8 leading-relaxed">
            Join thousands of users who have improved their phishing detection skills.<br/>
            Start your journey to becoming a phishing expert today.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/dashboard"
              className="group px-12 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl transition shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              Start Free Now <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
            </Link>
            <Link
              to="/challenges"
              className="px-12 py-4 border-2 border-blue-400 hover:bg-blue-500/10 text-blue-400 font-bold rounded-xl transition"
            >
              Try a Challenge
            </Link>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-8 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span>No signup required</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-green-400" />
              <span>Privacy focused</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-400" />
              <span>Free forever</span>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}