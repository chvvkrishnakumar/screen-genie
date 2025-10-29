import { useState, useRef, useEffect } from 'react'
import '../styles/FloatingWindow.css'

interface FloatingWindowProps {
  children: React.ReactNode
  defaultPosition?: { x: number; y: number }
  defaultSize?: { width: number; height: number }
  minSize?: { width: number; height: number }
  onClose?: () => void
}

export const FloatingWindow: React.FC<FloatingWindowProps> = ({
  children,
  defaultPosition = { x: 20, y: 20 },
  defaultSize = { width: 400, height: 600 },
  minSize = { width: 300, height: 400 },
  onClose
}) => {
  const [position, setPosition] = useState(defaultPosition)
  const [size, setSize] = useState(defaultSize)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const windowRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) return
    
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragStart.x))
      const newY = Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragStart.y))
      
      setPosition({ x: newX, y: newY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizing(false)
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizing(true)
    setDragStart({
      x: e.clientX - size.width,
      y: e.clientY - size.height
    })
  }

  const handleResizeMove = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = Math.max(minSize.width, e.clientX - position.x)
      const newHeight = Math.max(minSize.height, e.clientY - position.y)
      
      setSize({ width: newWidth, height: newHeight })
    }
  }

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', isDragging ? handleMouseMove : handleResizeMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', isDragging ? handleMouseMove : handleResizeMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, dragStart, position, size])

  return (
    <div
      ref={windowRef}
      className="floating-window"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="floating-window-header">
        <div className="window-title">AI Assistant</div>
        <div className="window-controls">
          <button
            className="minimize-btn"
            onClick={() => setSize({ width: size.width, height: 50 })}
          >
            −
          </button>
          {onClose && (
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          )}
        </div>
      </div>
      
      <div className="floating-window-content">
        {children}
      </div>
      
      <div
        className="resize-handle"
        onMouseDown={handleResizeStart}
      />
    </div>
  )
}