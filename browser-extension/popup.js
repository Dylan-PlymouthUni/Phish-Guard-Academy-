// Get API URL from storage or use default
let API_URL = 'http://localhost:8000'

chrome.storage.sync.get({ apiUrl: 'http://localhost:8000' }, (items) => {
  API_URL = items.apiUrl
})

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
        ⚠️ Analysis failed. Make sure the PhishGuard API is running on localhost:8000
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
  
  const riskScore = data.risk_score || 0
  let riskClass, riskLabel
  
  if (riskScore >= 70) {
    riskClass = 'risk-high'
    riskLabel = `⚠️ High Risk (${riskScore}%)`
  } else if (riskScore >= 40) {
    riskClass = 'risk-medium'
    riskLabel = `⚡ Medium Risk (${riskScore}%)`
  } else {
    riskClass = 'risk-safe'
    riskLabel = `✅ Low Risk (${riskScore}%)`
  }
  
  let findingsHTML = ''
  if (data.findings && data.findings.length > 0) {
    findingsHTML = '<div class="findings"><ul>' +
      data.findings.map(f => `<li>• ${f}</li>`).join('') +
      '</ul></div>'
  }
  
  resultContent.innerHTML = `
    <span class="risk-badge ${riskClass}">${riskLabel}</span>
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
