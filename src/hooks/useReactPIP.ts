import { useCallback, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

interface ReactPIPOptions {
  width?: number
  height?: number
  x?: number
  y?: number
}

export const useReactPIP = () => {
  const [isOpen, setIsOpen] = useState(false)
  const windowRef = useRef<Window | null>(null)
  const rootRef = useRef<any>(null)

  const openPIPWindow = useCallback(async (component: React.ReactElement, options: ReactPIPOptions = {}) => {
    if (isOpen) return false

    const { width = 400, height = 600, x = 100, y = 100 } = options

    try {
      // Try Document Picture-in-Picture API first (Chrome 116+)
      if ('documentPictureInPicture' in window) {
        try {
          // Ensure reasonable size constraints for PIP window
          const constrainedWidth = Math.min(Math.max(width, 300), 600)
          const constrainedHeight = Math.min(Math.max(height, 400), 800)
          
          const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
            width: constrainedWidth,
            height: constrainedHeight,
            disallowReturnToOpener: false
          })

          // Force window size after creation (Mac fix)
          if (pipWindow && pipWindow.resizeTo) {
            setTimeout(() => {
              try {
                pipWindow.resizeTo(constrainedWidth, constrainedHeight)
              } catch (resizeError) {
                console.log('Could not resize PIP window:', resizeError)
              }
            }, 100)
          }

        // Copy styles from main document
        const mainStyles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
        mainStyles.forEach(style => {
          pipWindow.document.head.appendChild(style.cloneNode(true))
        })

        // Create container and React root
        const container = pipWindow.document.createElement('div')
        container.id = 'pip-root'
        container.style.width = '100%'
        container.style.height = '100%'
        container.style.margin = '0'
        container.style.padding = '0'
        container.style.overflow = 'hidden'
        container.style.position = 'relative'
        pipWindow.document.body.appendChild(container)

        // Add PIP mode class for styling and prevent full screen expansion
        pipWindow.document.body.classList.add('pip-mode')
        pipWindow.document.body.style.margin = '0'
        pipWindow.document.body.style.padding = '0'
        pipWindow.document.body.style.background = '#1a1a1a'
        pipWindow.document.body.style.overflow = 'hidden'
        pipWindow.document.body.style.maxWidth = `${constrainedWidth}px`
        pipWindow.document.body.style.maxHeight = `${constrainedHeight}px`
        
        // Prevent document from expanding
        pipWindow.document.documentElement.style.width = `${constrainedWidth}px`
        pipWindow.document.documentElement.style.height = `${constrainedHeight}px`
        pipWindow.document.documentElement.style.overflow = 'hidden'
        
        // Try to make window less likely to be captured
        pipWindow.document.title = 'AI Assistant (Popup)'
        
        // Add meta tag to potentially help screen capture APIs identify this as UI
        const meta = pipWindow.document.createElement('meta')
        meta.name = 'screen-capture-exclude'
        meta.content = 'true'
        pipWindow.document.head.appendChild(meta)

        // Create React root and render component
        console.log('Creating React root in PIP window')
        const root = createRoot(container)
        console.log('Rendering component:', component)
        root.render(component)
        rootRef.current = root
        
        console.log('PIP content rendered successfully')

        windowRef.current = pipWindow
        setIsOpen(true)

        // Handle PIP window close
        pipWindow.addEventListener('pagehide', () => {
          closePIPWindow()
        })

        return true
        } catch (pipError: any) {
          console.log('Document PiP failed, falling back to popup:', pipError?.message || pipError)
          
          // If it's a user activation error, fall through to regular popup
          if (pipError?.name === 'NotAllowedError' && pipError?.message?.includes('user activation')) {
            console.log('User activation required - using popup fallback for auto-float')
          }
          // Continue to regular popup fallback below
        }
      }
      
      // Fallback to regular popup window
      // Ensure reasonable size constraints for popup fallback too
      const constrainedWidth = Math.min(Math.max(width, 300), 600)
      const constrainedHeight = Math.min(Math.max(height, 400), 800)
      
      const features = [
        `width=${constrainedWidth}`,
        `height=${constrainedHeight}`,
        `left=${x}`,
        `top=${y}`,
        'resizable=yes',
        'scrollbars=no',
        'toolbar=no',
        'menubar=no',
        'location=no',
        'status=no',
        'directories=no',
        'fullscreen=no'
      ].join(',')

      const popupWindow = window.open('about:blank', 'AI_Assistant_PIP', features)
      
      if (!popupWindow) {
        console.error('Failed to open popup - popup blocker may be active')
        alert('Popup blocked! Please allow popups for this site and try again.\n\n1. Click the popup blocker icon in your address bar\n2. Choose "Always allow popups from this site"\n3. Try opening the floating window again')
        return false
      }

      // Check if popup was actually opened (some blockers return a window but immediately close it)
      setTimeout(() => {
        if (popupWindow.closed) {
          alert('Popup was blocked or closed. Please allow popups for this site and try again.')
          return false
        }
      }, 100)

      // Set up popup window
      popupWindow.document.title = 'AI Screen Assistant'
      
      // Copy styles to popup
      const mainStyles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
      mainStyles.forEach(style => {
        popupWindow.document.head.appendChild(style.cloneNode(true))
      })

      // Add viewport meta
      const viewport = popupWindow.document.createElement('meta')
      viewport.name = 'viewport'
      viewport.content = 'width=device-width, initial-scale=1.0'
      popupWindow.document.head.appendChild(viewport)

      // Set body styles and prevent full screen expansion
      popupWindow.document.body.style.margin = '0'
      popupWindow.document.body.style.padding = '0'
      popupWindow.document.body.style.overflow = 'hidden'
      popupWindow.document.body.style.fontFamily = 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif'
      popupWindow.document.body.style.background = '#1a1a1a'
      popupWindow.document.body.style.color = '#ffffff'
      popupWindow.document.body.style.maxWidth = `${constrainedWidth}px`
      popupWindow.document.body.style.maxHeight = `${constrainedHeight}px`
      popupWindow.document.body.style.width = `${constrainedWidth}px`
      popupWindow.document.body.style.height = `${constrainedHeight}px`
      popupWindow.document.body.classList.add('pip-mode')
      
      // Prevent document from expanding
      popupWindow.document.documentElement.style.width = `${constrainedWidth}px`
      popupWindow.document.documentElement.style.height = `${constrainedHeight}px`
      popupWindow.document.documentElement.style.overflow = 'hidden'
      popupWindow.document.documentElement.style.maxWidth = `${constrainedWidth}px`
      popupWindow.document.documentElement.style.maxHeight = `${constrainedHeight}px`

      // Create container and React root
      const container = popupWindow.document.createElement('div')
      container.id = 'pip-root'
      container.style.width = '100%'
      container.style.height = '100vh'
      container.style.display = 'flex'
      container.style.flexDirection = 'column'
      popupWindow.document.body.appendChild(container)

      // Create React root and render component
      console.log('Creating React root in popup window')
      const root = createRoot(container)
      console.log('Rendering component:', component)
      root.render(component)
      rootRef.current = root
      
      console.log('Popup content rendered successfully')

      windowRef.current = popupWindow
      setIsOpen(true)

      // Handle popup close
      const checkClosed = setInterval(() => {
        if (popupWindow.closed) {
          clearInterval(checkClosed)
          closePIPWindow()
        }
      }, 1000)

      // Keep popup focused
      popupWindow.focus()
      
      return true
    } catch (error) {
      console.error('Failed to open PIP window:', error)
      return false
    }
  }, [isOpen])

  const closePIPWindow = useCallback(() => {
    if (!isOpen || !windowRef.current) return

    try {
      // Unmount React component
      if (rootRef.current) {
        rootRef.current.unmount()
      }

      // Close the window
      if (!windowRef.current.closed) {
        windowRef.current.close()
      }
    } catch (error) {
      console.error('Error closing PIP window:', error)
    }

    windowRef.current = null
    rootRef.current = null
    setIsOpen(false)
  }, [isOpen])

  const focusPIPWindow = useCallback(() => {
    if (windowRef.current && !windowRef.current.closed) {
      windowRef.current.focus()
    }
  }, [])

  return {
    isOpen,
    openPIPWindow,
    closePIPWindow,
    focusPIPWindow,
    pipWindow: windowRef.current
  }
}