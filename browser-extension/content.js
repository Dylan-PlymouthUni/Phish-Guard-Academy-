// Content script - Highlights suspicious links on pages

// Add visual indicators to links
function analyzePage() {
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
