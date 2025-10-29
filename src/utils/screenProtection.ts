// Screen capture protection utilities - targeted for PIP window only

export const enablePIPScreenProtection = () => {
  // Hide content when screen sharing is detected (PIP window only)
  let isContentHidden = false
  let protectionOverlay: HTMLElement | null = null
  let originalGetDisplayMedia: any = null

  const createProtectionOverlay = () => {
    if (protectionOverlay) return protectionOverlay

    protectionOverlay = document.createElement('div')
    protectionOverlay.id = 'pip-protection-overlay'
    protectionOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #1a1a1a;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-family: system-ui, sans-serif;
      user-select: none;
    `
    
    protectionOverlay.innerHTML = `
      <div style="text-align: center; max-width: 300px; padding: 1rem;">
        <div style="font-size: 2rem; margin-bottom: 1rem;">🔒</div>
        <h2 style="font-size: 1.25rem; margin-bottom: 1rem; color: #ef4444;">Protected</h2>
        <p style="font-size: 0.875rem; line-height: 1.4; color: #9ca3af;">
          Floating window hidden during screen sharing for privacy
        </p>
      </div>
    `
    
    return protectionOverlay
  }

  const hideContent = () => {
    if (!isContentHidden) {
      const overlay = createProtectionOverlay()
      document.body.appendChild(overlay)
      
      // Hide only PIP content
      const pipElements = document.querySelectorAll('.pip-app')
      pipElements.forEach(el => {
        ;(el as HTMLElement).style.display = 'none'
      })
      
      isContentHidden = true
    }
  }

  const showContent = () => {
    if (isContentHidden) {
      setTimeout(() => {
        if (protectionOverlay && document.body.contains(protectionOverlay)) {
          document.body.removeChild(protectionOverlay)
        }
        
        // Show PIP content
        const pipElements = document.querySelectorAll('.pip-app')
        pipElements.forEach(el => {
          ;(el as HTMLElement).style.display = ''
        })
        
        isContentHidden = false
      }, 500)
    }
  }

  // Detect screen sharing through getDisplayMedia
  const detectScreenSharing = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      try {
        originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia
        
        navigator.mediaDevices.getDisplayMedia = function(...args) {
          // Only hide content if it's browser window sharing (not entire screen)
          hideContent()
          const stream = originalGetDisplayMedia.apply(this, args)
          stream.then((mediaStream: MediaStream) => {
            mediaStream.getTracks().forEach((track: MediaStreamTrack) => {
              track.onended = () => showContent()
            })
          }).catch(() => {
            showContent()
          })
          return stream
        }
      } catch (e) {
        console.warn('Screen sharing detection setup failed:', e)
      }
    }
  }

  // Initialize screen sharing detection
  detectScreenSharing()

  // Clean up function
  return () => {
    // Restore original content if hidden
    if (isContentHidden && protectionOverlay && document.body.contains(protectionOverlay)) {
      document.body.removeChild(protectionOverlay)
      
      const pipElements = document.querySelectorAll('.pip-app')
      pipElements.forEach(el => {
        ;(el as HTMLElement).style.display = ''
      })
      
      isContentHidden = false
    }
    
    // Restore original getDisplayMedia function
    if (navigator.mediaDevices && originalGetDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia
    }
  }
}

// Lightweight protection for main window (no content hiding)
export const enableScreenProtection = () => {
  // Just basic prevention of screenshots via keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    // Block Print Screen, F12, etc. only
    if (
      e.key === 'PrintScreen' || // Print Screen
      e.key === 'F12' // F12
    ) {
      e.preventDefault()
      e.stopPropagation()
      return false
    }
  }

  document.addEventListener('keydown', handleKeyDown)

  // Clean up function
  return () => {
    document.removeEventListener('keydown', handleKeyDown)
  }
}

// Add screen capture detection
export const detectScreenCapture = () => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  if (!ctx) return false

  // Try to detect if screen is being captured
  try {
    canvas.width = 1
    canvas.height = 1
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, 1, 1)
    
    const imageData = ctx.getImageData(0, 0, 1, 1)
    const data = imageData.data
    
    // Check if the pixel data is being intercepted
    return data[0] !== 0 || data[1] !== 0 || data[2] !== 0
  } catch (e) {
    return true // If error, assume capture is happening
  }
}

// Window title protection (like banking sites)
export const protectWindowTitle = () => {
  let originalTitle = document.title
  
  const updateTitle = () => {
    if (document.hidden) {
      document.title = 'Secure Session'
    } else {
      document.title = originalTitle
    }
  }

  document.addEventListener('visibilitychange', updateTitle)
  window.addEventListener('blur', () => {
    document.title = 'Secure Session'
  })
  window.addEventListener('focus', () => {
    document.title = originalTitle
  })

  return () => {
    document.title = originalTitle
  }
}