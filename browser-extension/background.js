// Create context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get({
    apiUrl: 'http://localhost:8000',
    sensitivity: 'balanced',
    autoScan: true,
    inlineWarnings: true,
    badgeAlerts: true,
    trustedDomains: ['localhost', '127.0.0.1', 'github.dev', 'codespaces.app']
  }, (items) => {
    chrome.storage.sync.set(items)
  })

  chrome.contextMenus.create({
    id: 'analyzeLink',
    title: 'Analyze with PhishGuard',
    contexts: ['link']
  })

  chrome.contextMenus.create({
    id: 'analyzePage',
    title: 'Analyze this page',
    contexts: ['page']
  })
})

function getRiskLabel(riskScore) {
  if (riskScore >= 70) return 'Likely phishing'
  if (riskScore >= 40) return 'Needs verification'
  return 'Likely safe'
}

function getThreshold(sensitivity) {
  if (sensitivity === 'strict') return 50
  if (sensitivity === 'relaxed') return 75
  return 65
}

function isTrustedDomain(url, settings) {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return (settings.trustedDomains || []).some((domain) => {
      const normalized = String(domain).toLowerCase()
      return hostname === normalized || hostname.endsWith(`.${normalized}`)
    })
  } catch {
    return false
  }
}

// Get API URL from storage or use default
function getExtensionSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({
      apiUrl: 'http://localhost:8000',
      sensitivity: 'balanced',
      autoScan: true,
      inlineWarnings: true,
      badgeAlerts: true,
      trustedDomains: ['localhost', '127.0.0.1', 'github.dev', 'codespaces.app']
    }, (items) => {
      resolve(items)
    })
  })
}

function updateBadge(riskScore, badgeAlerts) {
  if (!badgeAlerts) {
    chrome.action.setBadgeText({ text: '' })
    return
  }

  if (riskScore >= 70) {
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
    chrome.action.setBadgeText({ text: '!' })
  } else if (riskScore >= 40) {
    chrome.action.setBadgeBackgroundColor({ color: '#f97316' })
    chrome.action.setBadgeText({ text: '?' })
  } else {
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' })
    chrome.action.setBadgeText({ text: 'OK' })
  }
}

async function analyzeUrlWithSettings(url, settings) {
  const response = await fetch(`${settings.apiUrl}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url })
  })

  if (!response.ok) {
    throw new Error('Analysis failed')
  }

  return response.json()
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || info.pageUrl
  const settings = await getExtensionSettings()

  if (!url) return

  try {
    const data = await analyzeUrlWithSettings(url, settings)
    const riskScore = data.risk || 0
    const riskLabel = data.risk_label
      ? data.risk_label.replace('_', ' ')
      : getRiskLabel(riskScore).toLowerCase()

    updateBadge(riskScore, settings.badgeAlerts)

    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.svg',
      title: 'PhishGuard Analysis',
      message: `${riskScore}% risk: ${riskLabel}`
    })

    // Store result for popup
    chrome.storage.session.set({
      lastAnalysis: {
        url,
        riskScore,
        timestamp: Date.now()
      }
    })

    if (tab && settings.inlineWarnings) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'PHISHGUARD_ANALYSIS_RESULT',
        payload: {
          url,
          riskScore,
          riskLabel,
          shouldWarn: riskScore >= getThreshold(settings.sensitivity)
        }
      })
    }
  } catch (error) {
    console.error('Analysis failed:', error)
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.svg',
      title: 'PhishGuard Error',
      message: 'Failed to analyze URL. Check API connection.'
    })
  }
})

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && /^https?:/.test(tab.url)) {
    const settings = await getExtensionSettings()
    if (!settings.autoScan || isTrustedDomain(tab.url, settings)) {
      return
    }

    try {
      const data = await analyzeUrlWithSettings(tab.url, settings)
      const riskScore = data.risk || 0
      updateBadge(riskScore, settings.badgeAlerts)

      if (settings.inlineWarnings) {
        chrome.tabs.sendMessage(tabId, {
          type: 'PHISHGUARD_ANALYSIS_RESULT',
          payload: {
            url: tab.url,
            riskScore,
            riskLabel: data.risk_label || getRiskLabel(riskScore),
            shouldWarn: riskScore >= getThreshold(settings.sensitivity)
          }
        })
      }
    } catch (error) {
      console.error('Auto-scan failed:', error)
    }
  }
})

// Clear badge after 5 seconds
setInterval(() => {
  chrome.action.setBadgeText({ text: '' })
}, 5000)
