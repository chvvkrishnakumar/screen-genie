import { useCallback, useRef, useState } from 'react'

interface SystemPIPOptions {
  width?: number
  height?: number
  x?: number
  y?: number
}

export const useSystemPIP = () => {
  const [isOpen, setIsOpen] = useState(false)
  const windowRef = useRef<Window | null>(null)
  const originalContentRef = useRef<HTMLElement | null>(null)

  const openPIPWindow = useCallback(async (content: HTMLElement, options: SystemPIPOptions = {}) => {
    if (isOpen || !content) return false

    const { width = 400, height = 600, x = 100, y = 100 } = options

    try {
      // Try Document Picture-in-Picture API first (Chrome 116+)
      if ('documentPictureInPicture' in window) {
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width,
          height,
          disallowReturnToOpener: false
        })

        // Copy styles from main document
        const mainStyles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
        mainStyles.forEach(style => {
          pipWindow.document.head.appendChild(style.cloneNode(true))
        })

        // Create container in PIP window
        const container = pipWindow.document.createElement('div')
        container.style.width = '100%'
        container.style.height = '100%'
        container.style.margin = '0'
        container.style.padding = '0'
        pipWindow.document.body.appendChild(container)

        // Move content to PIP window
        originalContentRef.current = content.parentElement
        container.appendChild(content)
        
        // Add PIP mode class to body for special styling
        pipWindow.document.body.classList.add('pip-mode')
        
        // Add special styling for PIP mode
        content.style.height = '100%'
        content.style.maxWidth = 'none'
        content.style.margin = '0'
        content.style.borderRadius = '0'

        windowRef.current = pipWindow
        setIsOpen(true)

        // Handle PIP window close
        pipWindow.addEventListener('pagehide', () => {
          closePIPWindow()
        })

        return true
      }
      
      // Fallback to regular popup window for system-wide floating
      const features = [
        `width=${width}`,
        `height=${height}`,
        `left=${x}`,
        `top=${y}`,
        'resizable=yes',
        'scrollbars=no',
        'toolbar=no',
        'menubar=no',
        'location=no',
        'status=no',
        'directories=no'
      ].join(',')

      const popupWindow = window.open('', 'AI_Assistant_PIP', features)
      
      if (!popupWindow) {
        console.error('Failed to open popup - popup blocker may be active')
        return false
      }

      // Set up popup window
      popupWindow.document.title = 'AI Screen Assistant'
      
      // Copy styles to popup
      const mainStyles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
      mainStyles.forEach(style => {
        popupWindow.document.head.appendChild(style.cloneNode(true))
      })

      // Add viewport meta for proper scaling
      const viewport = popupWindow.document.createElement('meta')
      viewport.name = 'viewport'
      viewport.content = 'width=device-width, initial-scale=1.0'
      popupWindow.document.head.appendChild(viewport)

      // Set body styles
      popupWindow.document.body.style.margin = '0'
      popupWindow.document.body.style.padding = '0'
      popupWindow.document.body.style.overflow = 'hidden'
      popupWindow.document.body.style.fontFamily = 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif'
      popupWindow.document.body.style.background = '#1a1a1a'
      popupWindow.document.body.style.color = '#ffffff'

      // Create container
      const container = popupWindow.document.createElement('div')
      container.style.width = '100%'
      container.style.height = '100vh'
      container.style.display = 'flex'
      container.style.flexDirection = 'column'
      popupWindow.document.body.appendChild(container)

      // Move content to popup
      originalContentRef.current = content.parentElement
      container.appendChild(content)
      
      // Add PIP mode class to body for special styling
      popupWindow.document.body.classList.add('pip-mode')
      
      // Add special styling for PIP mode
      content.style.height = '100%'
      content.style.maxWidth = 'none'
      content.style.margin = '0'
      content.style.borderRadius = '0'

      windowRef.current = popupWindow
      setIsOpen(true)

      // Handle popup close
      const checkClosed = setInterval(() => {
        if (popupWindow.closed) {
          clearInterval(checkClosed)
          closePIPWindow()
        }
      }, 1000)

      // Keep popup always on top (as much as possible)
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
      // Get the content back from PIP window
      const pipContent = windowRef.current.document.querySelector('.app')
      if (pipContent && originalContentRef.current) {
        // Reset styles before moving back
        const appElement = pipContent as HTMLElement
        appElement.style.height = ''
        appElement.style.maxWidth = ''
        appElement.style.margin = ''
        appElement.style.borderRadius = ''
        
        originalContentRef.current.appendChild(pipContent)
      }

      // Close the window
      windowRef.current.close()
    } catch (error) {
      console.error('Error closing PIP window:', error)
    }

    windowRef.current = null
    originalContentRef.current = null
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