/**
 * Home component/module file.
 * This file defines the Home page component for the PhishGuard Academy application. The Home page serves as the landing page for users, providing an overview of the application's features, benefits, and key statistics. It includes sections such as a hero banner, feature highlights, user benefits, and a call-to-action to encourage users to start using the application.
 * The Home component is responsible for:
 * - Displaying a visually appealing hero section that introduces the application and its value proposition.
 * - Highlighting key features of the application with icons and descriptions.
 * - Showcasing important statistics to build credibility and encourage user engagement.
 * - Providing a clear call-to-action that directs users to start analyzing or learning more about phishing detection.
 * - Ensuring a responsive design that looks great on both desktop and mobile devices.
 * - Using appropriate colors, typography, and spacing to create an engaging user experience.
 */

import React from 'react';
import { Shield, Zap, Users, TrendingUp, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function Home() {
  const features = [
    {
      icon: Shield,
      title: "AI-Powered Detection",
      description: "Advanced machine learning models trained on real phishing data",
    },
    {
      icon: Zap,
      title: "Instant Analysis",
      description: "Get results in seconds with our optimized detection engine",
    },
    {
      icon: Users,
      title: "Community Learning",
      description: "Learn from thousands of analyzed phishing attempts",
    },
  ];

  const stats = [
    { label: "Phishing Detected", value: "12.5K+" },
    { label: "Users Protected", value: "8.3K+" },
    { label: "Detection Rate", value: "98.7%" },
  ];

  const benefits = [
    "Real-time threat detection",
    "Educational challenges & lessons",
    "Performance analytics",
    "Offline capability",
    "Privacy-focused (no storage)",
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
                Protect Yourself from
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  Phishing Attacks
                </span>
              </h1>
              <p className="text-xl text-slate-300 leading-relaxed">
                PhishGuard Academy teaches you to spot phishing attempts with AI-powered analysis and interactive challenges.
              </p>
              <div className="flex gap-4">
                <Link
                  to="/analyze"
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center gap-2"
                >
                  Start Analyzing <ArrowRight size={20} />
                </Link>
                <Link
                  to="/learning"
                  className="px-8 py-3 border-2 border-slate-400 hover:border-white text-white font-semibold rounded-lg transition"
                >
                  Learn More
                </Link>
              </div>
            </div>
            
            {/* Hero Illustration */}
            <div className="relative h-96 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl border border-slate-700/50 flex items-center justify-center">
              <Shield className="w-48 h-48 text-blue-400/20" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-slate-800/50 py-16 border-y border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-4xl font-bold text-blue-400 mb-2">{stat.value}</p>
                <p className="text-slate-300">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-4 text-center">Why Choose PhishGuard?</h2>
          <p className="text-slate-300 text-center mb-12 max-w-2xl mx-auto">
            Comprehensive phishing detection and education platform
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-8 hover:border-blue-500/50 transition">
                  <Icon className="w-12 h-12 text-blue-400 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-300">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-slate-800/30 py-20 border-y border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-12 text-center">What You Get</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                <p className="text-slate-300">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-slate-300 mb-8">
            Join thousands protecting themselves from phishing attacks
          </p>
          <Link
            to="/analyze"
            className="inline-block px-12 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition"
          >
            Begin Your Journey
          </Link>
        </div>
      </section>
    </Layout>
  );
}