// Create context menu
chrome.runtime.onInstalled.addListener(() => {
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

// Get API URL from storage or use default
function getApiUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ apiUrl: 'http://localhost:8000' }, (items) => {
      resolve(items.apiUrl)
    })
  })
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || info.pageUrl
  const apiUrl = await getApiUrl()
  
  if (!url) return
  
  try {
    const response = await fetch(`${apiUrl}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    })
    
    const data = await response.json()
    const riskScore = data.risk || 0
    
    // Update badge
    if (riskScore >= 70) {
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
      chrome.action.setBadgeText({ text: '⚠️' })
    } else if (riskScore >= 40) {
      chrome.action.setBadgeBackgroundColor({ color: '#f97316' })
      chrome.action.setBadgeText({ text: '⚡' })
    } else {
      chrome.action.setBadgeBackgroundColor({ color: '#22c55e' })
      chrome.action.setBadgeText({ text: '✓' })
    }
    
    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.svg',
      title: 'PhishGuard Analysis',
      message: `Risk Level: ${riskScore}% - ${riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW'}`
    })
    
    // Store result for popup
    chrome.storage.session.set({
      lastAnalysis: {
        url,
        riskScore,
        timestamp: Date.now()
      }
    })
  } catch (error) {
    console.error('Analysis failed:', error)
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.svg',
      title: 'PhishGuard Error',
      message: 'Failed to analyze URL. Check connection.'
    })
  }
})

      message: `Risk Score: ${riskScore}% - ${riskScore >= 70 ? 'High Risk' : riskScore >= 40 ? 'Medium Risk' : 'Safe'}`
    })
  } catch (error) {
    console.error('Analysis failed:', error)
  }
})

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Auto-analyze in background (optional)
    // analyzeURLInBackground(tab.url)
  }
})

// Clear badge after 5 seconds
setInterval(() => {
  chrome.action.setBadgeText({ text: '' })
}, 5000)
