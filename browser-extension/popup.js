// Get API URL from storage or use default
let API_URL = 'http://localhost:8000'
const EXTENSION_DEFAULTS = {
  apiUrl: 'http://localhost:8000',
  sensitivity: 'balanced',
  autoScan: true,
  inlineWarnings: true,
  badgeAlerts: true,
  trustedDomains: ['localhost', '127.0.0.1', 'github.dev', 'codespaces.app']
}

chrome.storage.sync.get(EXTENSION_DEFAULTS, (items) => {
  API_URL = items.apiUrl
  document.getElementById('sensitivitySelect').value = items.sensitivity
  document.getElementById('autoScanToggle').checked = items.autoScan
  document.getElementById('inlineWarningsToggle').checked = items.inlineWarnings
  document.getElementById('badgeAlertsToggle').checked = items.badgeAlerts
})

function saveExtensionSettings() {
  chrome.storage.sync.set({
    sensitivity: document.getElementById('sensitivitySelect').value,
    autoScan: document.getElementById('autoScanToggle').checked,
    inlineWarnings: document.getElementById('inlineWarningsToggle').checked,
    badgeAlerts: document.getElementById('badgeAlertsToggle').checked,
  })
}

document.getElementById('sensitivitySelect').addEventListener('change', saveExtensionSettings)
document.getElementById('autoScanToggle').addEventListener('change', saveExtensionSettings)
document.getElementById('inlineWarningsToggle').addEventListener('change', saveExtensionSettings)
document.getElementById('badgeAlertsToggle').addEventListener('change', saveExtensionSettings)

// Get current tab URL
document.getElementById('checkCurrentPage').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.url) {
    document.getElementById('urlInput').value = tab.url
    analyzeURL(tab.url)
  }
})

// Open dashboard
document.getElementById('openDashboard').addEventListener('click', () => {
  chrome.storage.sync.get({ dashboardUrl: 'http://localhost:5173/app/dashboard' }, (items) => {
    chrome.tabs.create({ url: items.dashboardUrl })
  })
})

// Analyze button click
document.getElementById('analyzeBtn').addEventListener('click', () => {
  const url = document.getElementById('urlInput').value
  if (url) {
    analyzeURL(url)
  }
})

// Enter key support
document.getElementById('urlInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const url = document.getElementById('urlInput').value
    if (url) {
      analyzeURL(url)
    }
  }
})

// Main analysis function
async function analyzeURL(url) {
  const resultDiv = document.getElementById('result')
  const resultContent = document.getElementById('resultContent')
  const loading = document.getElementById('loading')
  const analyzeBtn = document.getElementById('analyzeBtn')
  
  // Show loading
  loading.style.display = 'block'
  resultDiv.classList.remove('show')
  analyzeBtn.disabled = true
  
  try {
    const response = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    })
    
    if (!response.ok) {
      throw new Error('Analysis failed')
    }
    
    const data = await response.json()
    displayResult(data)
  } catch (error) {
    resultContent.innerHTML = `
      <div style="color: #ef4444; font-size: 14px;">
        Analysis failed. Check your API URL in extension settings and try again.
      </div>
    `
    resultDiv.classList.add('show')
  } finally {
    loading.style.display = 'none'
    analyzeBtn.disabled = false
  }
}

// Display analysis result
function displayResult(data) {
  const resultDiv = document.getElementById('result')
  const resultContent = document.getElementById('resultContent')
  
  const riskScore = data.risk ?? data.risk_score ?? 0
  let riskClass, riskLabel
  const apiRiskLabel = data.risk_label

  if (apiRiskLabel === 'likely_phishing') {
    riskClass = 'risk-high'
    riskLabel = `Likely phishing (${riskScore}%)`
  } else if (apiRiskLabel === 'needs_verification') {
    riskClass = 'risk-medium'
    riskLabel = `Needs verification (${riskScore}%)`
  } else if (apiRiskLabel === 'likely_safe') {
    riskClass = 'risk-safe'
    riskLabel = `Likely safe (${riskScore}%)`
  } else
  if (riskScore >= 70) {
    riskClass = 'risk-high'
    riskLabel = `Likely phishing (${riskScore}%)`
  } else if (riskScore >= 40) {
    riskClass = 'risk-medium'
    riskLabel = `Needs verification (${riskScore}%)`
  } else {
    riskClass = 'risk-safe'
    riskLabel = `Likely safe (${riskScore}%)`
  }
  
  let findingsHTML = ''
  if (data.findings && data.findings.length > 0) {
    findingsHTML = '<div class="findings"><ul>' +
      data.findings.map(f => `<li>• ${f}</li>`).join('') +
      '</ul></div>'
  }
  
  resultContent.innerHTML = `
    <span class="risk-badge ${riskClass}">${riskLabel}</span>
    ${data.risk_summary ? `<div style="margin-top:8px;font-size:12px;line-height:1.4;color:#cbd5e1;">${data.risk_summary}</div>` : ''}
    ${findingsHTML}
  `
  
  resultDiv.classList.add('show')
  
  // Save to storage
  chrome.storage.local.get(['analyses'], (result) => {
    const analyses = result.analyses || []
    analyses.unshift({
      url: data.url,
      risk_score: riskScore,
      timestamp: new Date().toISOString(),
      findings: data.findings
    })
    // Keep last 100
    if (analyses.length > 100) {
      analyses.pop()
    }
    chrome.storage.local.set({ analyses })
  })
}
