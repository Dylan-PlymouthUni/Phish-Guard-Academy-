import React from 'react';
import { TrendingUp, Users, Shield, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';

export default function Analytics() {
  const stats = [
    { label: 'Threats Detected', value: '12,458', icon: Shield, change: '+23%' },
    { label: 'Users Protected', value: '8,342', icon: Users, change: '+14%' },
    { label: 'Phishing Emails', value: '3,892', icon: AlertCircle, change: '+42%' },
    { label: 'Detection Rate', value: '98.7%', icon: TrendingUp, change: '+2.3%' },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Analytics & Insights
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            Real-time statistics and threat analysis
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <Icon className="w-8 h-8 text-blue-400" />
                  <span className="text-green-400 text-sm font-bold">{stat.change}</span>
                </div>
                <p className="text-slate-400 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Threat Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
            <h2 className="text-white font-bold text-lg mb-6">Threat Types</h2>
            <div className="space-y-4">
              {[
                { name: 'Credential Phishing', count: 4532, percent: 40 },
                { name: 'Malware Distribution', count: 2890, percent: 25 },
                { name: 'Payment Fraud', count: 2345, percent: 20 },
                { name: 'Other', count: 1691, percent: 15 },
              ].map((threat, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-2">
                    <span className="text-white text-sm font-medium">{threat.name}</span>
                    <span className="text-slate-400 text-sm">{threat.count}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                      style={{ width: `${threat.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
            <h2 className="text-white font-bold text-lg mb-6">Top Malicious Domains</h2>
            <div className="space-y-3">
              {[
                'fake-bank-verify.tk',
                'secure-paypal-update.xyz',
                'amazon-account-confirm.top',
                'microsoft-verify.work',
                'apple-id-security.men',
              ].map((domain, i) => (
                <div
                  key={i}
                  className="p-3 bg-slate-900/50 rounded border border-slate-700/50 font-mono text-sm text-red-400"
                >
                  {domain}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
