import React, { useState } from 'react';
import { ChevronDown, BookOpen, Video, FileText } from 'lucide-react';
import Layout from '../components/Layout';

export default function Learning() {
  const [expandedModule, setExpandedModule] = useState<number | null>(0);

  const modules = [
    {
      id: 0,
      title: 'Introduction to Phishing',
      icon: BookOpen,
      lessons: [
        { title: 'What is Phishing?', type: 'article', duration: '5 min' },
        { title: 'Common Phishing Types', type: 'video', duration: '8 min' },
        { title: 'Phishing Statistics', type: 'article', duration: '3 min' },
      ],
    },
    {
      id: 1,
      title: 'URL Analysis',
      icon: FileText,
      lessons: [
        { title: 'URL Structure Basics', type: 'article', duration: '7 min' },
        { title: 'Spotting Fake Domains', type: 'video', duration: '10 min' },
        { title: 'Domain Tricks & Typosquatting', type: 'article', duration: '6 min' },
      ],
    },
    {
      id: 2,
      title: 'Email Red Flags',
      icon: Video,
      lessons: [
        { title: 'Suspicious Language Patterns', type: 'article', duration: '5 min' },
        { title: 'Urgent Language Analysis', type: 'video', duration: '9 min' },
        { title: 'Sender Verification', type: 'article', duration: '4 min' },
      ],
    },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Learning Hub
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            Master phishing detection with our comprehensive learning modules
          </p>
        </div>

        {/* Modules */}
        <div className="space-y-4">
          {modules.map(module => {
            const Icon = module.icon;
            return (
              <div
                key={module.id}
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/30 transition"
                >
                  <div className="flex items-center gap-4">
                    <Icon className="w-6 h-6 text-blue-400" />
                    <div className="text-left">
                      <h3 className="text-white font-bold">{module.title}</h3>
                      <p className="text-sm text-slate-400">{module.lessons.length} lessons</p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition ${
                      expandedModule === module.id ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedModule === module.id && (
                  <div className="border-t border-slate-700/50 px-6 py-4 space-y-3">
                    {module.lessons.map((lesson, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-slate-900/50 rounded hover:bg-slate-900 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-white text-sm font-medium">{lesson.title}</p>
                            <p className="text-xs text-slate-400">{lesson.type} • {lesson.duration}</p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                          {lesson.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Tips */}
        <div className="mt-12 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-lg p-8">
          <h2 className="text-white font-bold text-xl mb-4">💡 Quick Tips</h2>
          <ul className="space-y-3 text-slate-300">
            <li>✓ Always verify sender email addresses carefully</li>
            <li>✓ Hover over links to see the real URL before clicking</li>
            <li>✓ Be wary of urgent language or threats</li>
            <li>✓ Check for spelling and grammar errors</li>
            <li>✓ Never provide passwords or sensitive info via email</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
