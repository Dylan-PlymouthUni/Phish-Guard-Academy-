// Content script - Highlights suspicious links on pages

let activeBanner = null

// Add visual indicators to links
function analyzePage() {
  chrome.storage.sync.get({ inlineWarnings: true }, (settings) => {
    if (!settings.inlineWarnings) return

    const links = document.querySelectorAll('a[href]')
    
    links.forEach(link => {
      const href = link.href
      
      // Quick heuristic checks
      if (isLikelySuspicious(href)) {
        link.style.outline = '2px solid #ef4444'
        link.style.outlineOffset = '2px'
        link.title = '⚠️ PhishGuard: Potentially suspicious link'
      }
    })
  })
}

function showWarningBanner(payload) {
  if (activeBanner) {
    activeBanner.remove()
    activeBanner = null
  }

  if (!payload.shouldWarn) return

  const banner = document.createElement('div')
  banner.style.position = 'fixed'
  banner.style.top = '16px'
  banner.style.right = '16px'
  banner.style.zIndex = '2147483647'
  banner.style.maxWidth = '360px'
  banner.style.padding = '14px 16px'
  banner.style.borderRadius = '12px'
  banner.style.background = 'linear-gradient(135deg, rgba(127,29,29,0.96), rgba(153,27,27,0.96))'
  banner.style.boxShadow = '0 16px 36px rgba(0,0,0,0.35)'
  banner.style.border = '1px solid rgba(254,202,202,0.28)'
  banner.style.color = '#fff'
  banner.style.fontFamily = 'system-ui, sans-serif'
  banner.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:12px;">
      <div style="font-size:20px;line-height:1;">⚠️</div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:700;letter-spacing:0.02em;">PhishGuard warning</div>
        <div style="font-size:12px;opacity:0.9;margin-top:4px;line-height:1.45;">
          ${payload.riskScore}% risk detected for this page. Classification: ${payload.riskLabel}.
        </div>
      </div>
      <button id="phishguard-dismiss" style="background:transparent;border:none;color:white;font-size:18px;cursor:pointer;line-height:1;">×</button>
    </div>
  `

  document.body.appendChild(banner)
  activeBanner = banner

  banner.querySelector('#phishguard-dismiss').addEventListener('click', () => {
    banner.remove()
    activeBanner = null
  })
}

// Basic heuristic check
function isLikelySuspicious(url) {
  try {
    const urlObj = new URL(url)
    
    // Check for IP addresses
    if (/^\d+\.\d+\.\d+\.\d+$/.test(urlObj.hostname)) {
      return true
    }
    
    // Check for excessive subdomains
    if ((urlObj.hostname.match(/\./g) || []).length > 3) {
      return true
    }
    
    // Check for suspicious keywords
    const suspiciousWords = ['verify', 'secure', 'account', 'update', 'login', 'bank']
    const hasMultipleSuspicious = suspiciousWords.filter(word => 
      urlObj.href.toLowerCase().includes(word)
    ).length >= 2
    
    if (hasMultipleSuspicious && !urlObj.protocol.startsWith('https')) {
      return true
    }
    
    return false
  } catch {
    return false
  }
}

// Run analysis when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', analyzePage)
} else {
  analyzePage()
}

// Re-analyze on dynamic content changes
const observer = new MutationObserver(() => {
  analyzePage()
})

observer.observe(document.body, {
  childList: true,
  subtree: true
})

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PHISHGUARD_ANALYSIS_RESULT') {
    chrome.storage.sync.get({ inlineWarnings: true }, (settings) => {
      if (settings.inlineWarnings) {
        showWarningBanner(message.payload)
      }
    })
  }
})
