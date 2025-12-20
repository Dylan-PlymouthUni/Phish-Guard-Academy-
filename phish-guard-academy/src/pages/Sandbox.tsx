import { useState } from 'react'
import { MainLayout } from '../components/layout/MainLayout'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { 
  Mail, AlertTriangle, CheckCircle, Eye, Link as LinkIcon, 
  FileText, Calendar, Clock, User, Shield, X, ChevronDown,
  ExternalLink, Info, Lightbulb, Target, Award
} from 'lucide-react'

interface EmailExample {
  id: string
  from: string
  fromDisplay: string
  subject: string
  date: string
  body: string
  links: { text: string; url: string; safe: boolean }[]
  attachments?: { name: string; safe: boolean }[]
  isPhishing: boolean
  difficulty: 'easy' | 'medium' | 'hard'
  indicators: string[]
  explanation: string
  score: number
}

const EMAIL_EXAMPLES: EmailExample[] = [
  {
    id: 'example_1',
    from: 'security@paypa1-verify.com',
    fromDisplay: 'PayPal Security Team',
    subject: 'URGENT: Verify Your Account Within 24 Hours',
    date: '2025-12-09 14:23:45',
    body: `Dear Valued Customer,

We have detected unusual activity on your PayPal account. For your security, we need you to verify your identity immediately.

Your account will be SUSPENDED if you do not complete verification within 24 hours.

Click here to verify now: http://paypa1-verify.com/account/verify

If you do not recognize this activity, please contact us immediately.

Thank you for your cooperation.
PayPal Security Team

© 2025 PayPal Inc. All rights reserved.`,
    links: [
      { text: 'Click here to verify now', url: 'http://paypa1-verify.com/account/verify', safe: false }
    ],
    isPhishing: true,
    difficulty: 'easy',
    indicators: [
      'Domain uses "1" instead of "l" (paypa1 vs paypal)',
      'Creates false urgency (24 hours)',
      'Generic greeting ("Valued Customer")',
      'Uses HTTP instead of HTTPS',
      'Threats to suspend account',
      'Suspicious domain (paypa1-verify.com not paypal.com)'
    ],
    explanation: 'This is a classic phishing email. The domain "paypa1-verify.com" uses typosquatting (number 1 instead of letter l). PayPal would never threaten account suspension via email, and legitimate communications come from @paypal.com domains.',
    score: 85
  },
  {
    id: 'example_2',
    from: 'noreply@amazon.com',
    fromDisplay: 'Amazon.com',
    subject: 'Your order #123-4567890-1234567 has shipped',
    date: '2025-12-09 09:15:22',
    body: `Hello Customer,

Your Amazon.com order #123-4567890-1234567 has been shipped!

Track your package: https://www.amazon.com/gp/css/order-history

Arriving: Wednesday, December 11, 2025

Items shipped:
- 1x Laptop Stand (Black)

You can review your order details at: https://www.amazon.com/orders

Thank you for shopping with us!

Amazon Customer Service`,
    links: [
      { text: 'Track your package', url: 'https://www.amazon.com/gp/css/order-history', safe: true },
      { text: 'review your order details', url: 'https://www.amazon.com/orders', safe: true }
    ],
    isPhishing: false,
    difficulty: 'easy',
    indicators: [
      '✓ Legitimate amazon.com domain',
      '✓ Uses HTTPS',
      '✓ Specific order number',
      '✓ No urgent threats or demands',
      '✓ Links point to official domain',
      '✓ Professional formatting'
    ],
    explanation: 'This appears to be a legitimate Amazon shipping notification. The email comes from @amazon.com, uses HTTPS, includes specific order information, and doesn\'t create urgency or threaten consequences.',
    score: 5
  },
  {
    id: 'example_3',
    from: 'ceo@company-internal.com',
    fromDisplay: 'John Smith (CEO)',
    subject: 'Urgent: Need Gift Cards for Client Meeting',
    date: '2025-12-09 16:45:10',
    body: `Hi there,

I'm currently in a meeting with an important client and I need your help urgently.

Can you purchase $2,000 in iTunes gift cards for me? I need them as gifts for the client team. Please buy them from the nearest store and send me the card numbers and PINs via email.

I'll reimburse you later today. This is time-sensitive as the meeting ends in 2 hours.

Thanks,
John Smith
CEO`,
    links: [],
    isPhishing: true,
    difficulty: 'medium',
    indicators: [
      'Unusual request from executive',
      'Requests gift cards (common scam)',
      'Creates artificial urgency',
      'Asks to send sensitive info via email',
      'Generic greeting',
      'Email may be spoofed (check Return-Path)',
      'CEOs typically don\'t make such requests via email'
    ],
    explanation: 'This is CEO fraud (also called whaling). Attackers impersonate executives to trick employees into making unauthorized purchases or transfers. Legitimate executives never ask employees to buy gift cards via email. Always verify through a phone call using a known number.',
    score: 95
  },
  {
    id: 'example_4',
    from: 'delivery@usps-tracking.info',
    fromDisplay: 'USPS Delivery Service',
    subject: 'Package Delivery Failed - Reschedule Required',
    date: '2025-12-09 11:30:00',
    body: `USPS DELIVERY NOTIFICATION

We attempted to deliver your package but no one was available.

Tracking Number: US9876543210

To reschedule delivery, please click here: http://bit.ly/usps-redelivery-2024

Your package will be returned to sender if you don't reschedule within 48 hours.

This is an automated message. Please do not reply.

United States Postal Service`,
    links: [
      { text: 'click here', url: 'http://bit.ly/usps-redelivery-2024', safe: false }
    ],
    isPhishing: true,
    difficulty: 'medium',
    indicators: [
      'Domain is usps-tracking.info (not usps.com)',
      'Uses shortened URL (bit.ly) to hide destination',
      'Creates urgency (48 hours)',
      'No specific address or recipient name',
      'USPS uses usps.com or usps.gov domains',
      'Unexpected package notification'
    ],
    explanation: 'This is a package delivery scam. The domain "usps-tracking.info" is not affiliated with USPS. The legitimate USPS domain is usps.com. The shortened URL hides the real malicious destination. If you\'re expecting a package, check the official USPS website directly.',
    score: 80
  },
  {
    id: 'example_5',
    from: 'accounts@microsoft.com',
    fromDisplay: 'Microsoft Account Team',
    subject: 'Microsoft account security info was added',
    date: '2025-12-09 08:20:15',
    body: `Microsoft account

Security info was recently added to your Microsoft account example@email.com

When: December 9, 2025 8:15 AM
Where: Seattle, WA, United States
Device: Windows 10 PC

If this wasn't you, please review your account:
https://account.microsoft.com/security

Thanks,
The Microsoft account team

This is an automated message. Replies are not monitored.`,
    links: [
      { text: 'review your account', url: 'https://account.microsoft.com/security', safe: true }
    ],
    isPhishing: false,
    difficulty: 'medium',
    indicators: [
      '✓ Legitimate microsoft.com domain',
      '✓ Uses HTTPS',
      '✓ Specific details (date, location, device)',
      '✓ Proper Microsoft formatting',
      '✓ Doesn\'t demand immediate action',
      '✓ Link goes to official microsoft.com'
    ],
    explanation: 'This appears to be a legitimate Microsoft security notification. It uses the official microsoft.com domain, provides specific details, and the link points to the official Microsoft account security page. These notifications inform you of account changes without creating panic.',
    score: 10
  },
  {
    id: 'example_6',
    from: 'support@app1e-security.com',
    fromDisplay: 'Apple Support',
    subject: 'Your iCloud Storage is Full',
    date: '2025-12-09 13:45:00',
    body: `Dear iCloud User,

Your iCloud storage is 98% full!

You have only 0.2 GB remaining. Upgrade now to avoid losing your photos, documents, and backups.

Special Offer: Get 200GB for only $0.99/month!

Upgrade Your Storage: http://app1e-security.com/icloud/upgrade?id=user12345

This offer expires in 24 hours.

- Apple Support Team

If you did not request this, please ignore this email.`,
    links: [
      { text: 'Upgrade Your Storage', url: 'http://app1e-security.com/icloud/upgrade?id=user12345', safe: false }
    ],
    isPhishing: true,
    difficulty: 'hard',
    indicators: [
      'Domain uses "1" instead of "l" (app1e vs apple)',
      'Suspicious domain (app1e-security.com not apple.com)',
      'Uses HTTP instead of HTTPS',
      'Creates urgency (24 hours)',
      'Generic greeting ("iCloud User")',
      'Apple communications come from @apple.com or @icloud.com'
    ],
    explanation: 'Sophisticated phishing attempt using typosquatting. The domain "app1e-security.com" uses the number "1" instead of the letter "l" to mimic apple.com. Apple\'s legitimate emails come from @apple.com or @icloud.com domains. Always check storage through the Settings app or iCloud.com directly.',
    score: 90
  }
]

export default function Sandbox() {
  const [selectedEmail, setSelectedEmail] = useState<EmailExample | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [userGuess, setUserGuess] = useState<boolean | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [showHints, setShowHints] = useState(false)
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)

  const handleGuess = (isPhishing: boolean) => {
    if (!selectedEmail || revealed) return
    
    setUserGuess(isPhishing)
    setRevealed(true)
    
    const correct = isPhishing === selectedEmail.isPhishing
    setScore(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1
    }))
  }

  const nextEmail = () => {
    const currentIndex = EMAIL_EXAMPLES.findIndex(e => e.id === selectedEmail?.id)
    const nextIndex = (currentIndex + 1) % EMAIL_EXAMPLES.length
    setSelectedEmail(EMAIL_EXAMPLES[nextIndex])
    setRevealed(false)
    setUserGuess(null)
    setShowHints(false)
    setHoveredLink(null)
  }

  const selectEmail = (email: EmailExample) => {
    setSelectedEmail(email)
    setRevealed(false)
    setUserGuess(null)
    setShowHints(false)
    setHoveredLink(null)
  }

  if (!selectedEmail) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-10 h-10 text-blue-400" />
              <h1 className="text-5xl font-bold text-white">Email Sandbox</h1>
            </div>
            <p className="text-slate-400 text-lg">
              Practice identifying phishing emails in a safe environment. Test your skills with realistic examples!
            </p>
          </div>

          {/* Score Card */}
          {score.total > 0 && (
            <Card className="mb-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Your Score</h3>
                    <p className="text-slate-400">Track your phishing detection accuracy</p>
                  </div>
                  <div className="text-center">
                    <div className="text-5xl font-bold text-blue-400">
                      {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
                    </div>
                    <p className="text-sm text-slate-400 mt-2">
                      {score.correct} / {score.total} correct
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Email List */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {EMAIL_EXAMPLES.map((email) => (
              <div
                key={email.id}
                className="cursor-pointer hover:scale-105 transition-transform duration-300"
                onClick={() => selectEmail(email)}
              >
                <Card>
                  <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant={
                      email.difficulty === 'easy' ? 'success' :
                      email.difficulty === 'medium' ? 'warning' : 'danger'
                    }>
                      {email.difficulty}
                    </Badge>
                    <Target className="w-5 h-5 text-blue-400" />
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{email.fromDisplay}</span>
                    </div>
                    <h3 className="text-white font-bold text-lg line-clamp-2">{email.subject}</h3>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      {email.links.length} link{email.links.length !== 1 ? 's' : ''}
                    </span>
                    <Button variant="secondary" size="sm">
                    </Button>
                  </div>
                </CardContent>
              </Card>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <Card className="mt-12">
            <CardContent>
              <div className="flex items-start gap-4">
                <Info className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold text-white mb-3">How to Use the Sandbox</h3>
                  <ul className="space-y-2 text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>Select an email to analyze from the list above</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>Examine the email carefully - check sender, subject, body, and links</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>Hover over links to reveal their true destinations (just like in real email)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>Decide if it's legitimate or phishing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>Get instant feedback with detailed explanations</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="secondary" 
              onClick={() => setSelectedEmail(null)}
            >
              ← Back to List
            </Button>
            <Badge variant={
              selectedEmail.difficulty === 'easy' ? 'success' :
              selectedEmail.difficulty === 'medium' ? 'warning' : 'danger'
            }>
              {selectedEmail.difficulty}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-slate-400">Your Accuracy</p>
              <p className="text-2xl font-bold text-blue-400">
                {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Email Display */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent>
                {/* Email Header */}
                <div className="border-b border-slate-700 pb-4 mb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-white font-bold">{selectedEmail.fromDisplay}</p>
                          <p className="text-xs text-slate-500">&lt;{selectedEmail.from}&gt;</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-400">
                      <div className="flex items-center gap-2 justify-end mb-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(selectedEmail.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(selectedEmail.date).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white">{selectedEmail.subject}</h2>
                </div>

                {/* Email Body */}
                <div className="mb-6">
                  <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
                    <pre className="whitespace-pre-wrap font-sans text-slate-300 leading-relaxed">
                      {selectedEmail.body}
                    </pre>
                  </div>
                </div>

                {/* Links Section */}
                {selectedEmail.links.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                      <LinkIcon className="w-5 h-5 text-blue-400" />
                      Links in Email (Hover to Reveal)
                    </h3>
                    <div className="space-y-2">
                      {selectedEmail.links.map((link, index) => (
                        <div
                          key={index}
                          className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-blue-500/50 transition"
                          onMouseEnter={() => setHoveredLink(link.url)}
                          onMouseLeave={() => setHoveredLink(null)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-blue-400 font-medium mb-1">{link.text}</p>
                              {hoveredLink === link.url && (
                                <div className="flex items-start gap-2 mt-2 p-3 bg-slate-900/80 rounded border border-yellow-500/30">
                                  <Eye className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-xs text-yellow-400 font-semibold mb-1">Actual URL:</p>
                                    <p className="text-xs text-slate-300 break-all font-mono">{link.url}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            <ExternalLink className="w-5 h-5 text-slate-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-orange-400" />
                      Attachments
                    </h3>
                    <div className="space-y-2">
                      {selectedEmail.attachments.map((attachment, index) => (
                        <div key={index} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 flex items-center gap-3">
                          <FileText className="w-5 h-5 text-slate-400" />
                          <span className="text-slate-300">{attachment.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Decision Section */}
            {!revealed && (
              <Card className="mt-6">
                <CardContent>
                  <h3 className="text-xl font-bold text-white mb-4">What do you think?</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="success"
                      fullWidth
                      onClick={() => handleGuess(false)}
                      className="py-6 text-lg"
                    >
                      <CheckCircle className="w-6 h-6 mr-2" />
                      Legitimate
                    </Button>
                    <Button
                      variant="danger"
                      fullWidth
                      onClick={() => handleGuess(true)}
                      className="py-6 text-lg"
                    >
                      <AlertTriangle className="w-6 h-6 mr-2" />
                      Phishing
                    </Button>
                  </div>
                  
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setShowHints(!showHints)}
                    className="mt-4"
                  >
                    <Lightbulb className="w-5 h-5 mr-2" />
                    {showHints ? 'Hide Hints' : 'Show Hints'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Result Section */}
            {revealed && (
              <Card className={`mt-6 ${
                userGuess === selectedEmail.isPhishing
                  ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30'
                  : 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30'
              }`}>
                <CardContent>
                  <div className="flex items-center gap-3 mb-4">
                    {userGuess === selectedEmail.isPhishing ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-green-400" />
                        <div>
                          <h3 className="text-2xl font-bold text-green-400">Correct!</h3>
                          <p className="text-slate-300">
                            {selectedEmail.isPhishing ? "You successfully identified this phishing email!" : "You correctly identified this as legitimate!"}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <X className="w-8 h-8 text-red-400" />
                        <div>
                          <h3 className="text-2xl font-bold text-red-400">Incorrect</h3>
                          <p className="text-slate-300">
                            This email is actually {selectedEmail.isPhishing ? "PHISHING" : "LEGITIMATE"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="bg-slate-900/50 rounded-lg p-4 mb-4 border border-slate-700">
                    <p className="text-slate-300 leading-relaxed">{selectedEmail.explanation}</p>
                  </div>

                  <Button
                    variant="primary"
                    fullWidth
                    onClick={nextEmail}
                    className="py-4"
                  >
                    Next Email Challenge →
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Risk Score */}
            <Card>
              <CardContent>
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  Threat Level
                </h3>
                <div className="text-center mb-4">
                  <div className={`text-6xl font-bold mb-2 ${
                    selectedEmail.score >= 70 ? 'text-red-400' :
                    selectedEmail.score >= 40 ? 'text-orange-400' : 'text-green-400'
                  }`}>
                    {revealed ? selectedEmail.score : '??'}%
                  </div>
                  <p className="text-slate-400">
                    {revealed 
                      ? (selectedEmail.score >= 70 ? 'HIGH RISK' : selectedEmail.score >= 40 ? 'MEDIUM RISK' : 'LOW RISK')
                      : 'Make your guess first'
                    }
                  </p>
                </div>
                {revealed && (
                  <div className="bg-slate-900/50 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        selectedEmail.score >= 70 ? 'bg-gradient-to-r from-red-600 to-red-400' :
                        selectedEmail.score >= 40 ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
                        'bg-gradient-to-r from-green-600 to-green-400'
                      }`}
                      style={{ width: `${selectedEmail.score}%` }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Indicators */}
            {(showHints || revealed) && (
              <Card>
                <CardContent>
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-400" />
                    {selectedEmail.isPhishing ? 'Red Flags' : 'Legitimate Signs'}
                  </h3>
                  <ul className="space-y-2">
                    {selectedEmail.indicators.map((indicator, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-slate-300">
                        {selectedEmail.isPhishing ? (
                          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        )}
                        <span>{indicator}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Tips */}
            <Card>
              <CardContent>
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  Pro Tips
                </h3>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Always check the sender's email address, not just the display name</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Hover over links to see where they actually lead</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Be wary of urgency, threats, or too-good-to-be-true offers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Verify suspicious emails by contacting the company directly</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Progress */}
            {revealed && (
              <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
                <CardContent>
                  <div className="flex items-center gap-3 mb-3">
                    <Award className="w-6 h-6 text-purple-400" />
                    <h3 className="text-white font-bold">Keep Going!</h3>
                  </div>
                  <p className="text-slate-300 text-sm mb-3">
                    Practice makes perfect. The more emails you analyze, the better you'll get at spotting phishing attempts!
                  </p>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Emails Analyzed</span>
                      <span className="text-white font-bold">{score.total}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
