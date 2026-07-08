'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

export default function Whiteboard({ socket, roomId }) {
  const [shapes, setShapes] = useState([]);
  const [activeTool, setActiveTool] = useState('pencil'); // pencil | line | rect | circle | eraser
  const [activeColor, setActiveColor] = useState('var(--accent)');
  const [activeWidth, setActiveWidth] = useState(4);
  const [currentDrawingPath, setCurrentDrawingPath] = useState(null);
  
  const [remoteRawDraws, setRemoteRawDraws] = useState({});
  const [remoteCursors, setRemoteCursors] = useState({});
  
  const svgRef = useRef(null);
  const isDrawing = useRef(false);

  // Ask for current shapes when component mounts or socket connects
  useEffect(() => {
    if (socket) {
      socket.emit('whiteboard-load');
    }
  }, [socket]);

  // Handle socket sync
  useEffect(() => {
    if (!socket) return;

    socket.on('whiteboard-init', (initialShapes) => {
      setShapes(initialShapes);
    });

    socket.on('whiteboard-draw-add', (shape) => {
      setShapes(prev => [...prev, shape]);
    });

    socket.on('whiteboard-clear', () => {
      setShapes([]);
      setRemoteRawDraws({});
    });

    socket.on('whiteboard-draw-raw', ({ userId, username, avatarColor, tempShape }) => {
      setRemoteRawDraws(prev => ({
        ...prev,
        [userId]: { username, avatarColor, tempShape }
      }));
    });

    socket.on('whiteboard-draw-raw-end', ({ userId }) => {
      setRemoteRawDraws(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    socket.on('whiteboard-cursor', ({ userId, username, avatarColor, pos }) => {
      setRemoteCursors(prev => ({
        ...prev,
        [userId]: { username, avatarColor, pos }
      }));
    });

    socket.on('user-left', ({ username }) => {
      setRemoteCursors(prev => {
        const next = { ...prev };
        const leftUserEntry = Object.entries(next).find(([_, u]) => u.username === username);
        if (leftUserEntry) {
          delete next[leftUserEntry[0]];
        }
        return next;
      });
      setRemoteRawDraws(prev => {
        const next = { ...prev };
        const leftUserEntry = Object.entries(next).find(([_, u]) => u.username === username);
        if (leftUserEntry) {
          delete next[leftUserEntry[0]];
        }
        return next;
      });
    });

    return () => {
      socket.off('whiteboard-init');
      socket.off('whiteboard-draw-add');
      socket.off('whiteboard-clear');
      socket.off('whiteboard-draw-raw');
      socket.off('whiteboard-draw-raw-end');
      socket.off('whiteboard-cursor');
    };
  }, [socket]);

  // Translate client coordinates to SVG viewport coordinates
  const getCoordinates = useCallback((e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top)
    };
  }, []);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only draw on primary click
    const coords = getCoordinates(e);
    isDrawing.current = true;

    const newShape = {
      id: Math.random().toString(36).substring(2, 11),
      type: activeTool,
      color: activeTool === 'eraser' ? 'var(--base)' : activeColor,
      strokeWidth: activeTool === 'eraser' ? activeWidth * 2.5 : activeWidth,
    };

    if (activeTool === 'pencil' || activeTool === 'eraser') {
      newShape.points = [coords];
    } else if (activeTool === 'line') {
      newShape.x1 = coords.x;
      newShape.y1 = coords.y;
      newShape.x2 = coords.x;
      newShape.y2 = coords.y;
    } else if (activeTool === 'rect') {
      newShape.x1 = coords.x;
      newShape.y1 = coords.y;
      newShape.x = coords.x;
      newShape.y = coords.y;
      newShape.width = 0;
      newShape.height = 0;
    } else if (activeTool === 'circle') {
      newShape.cx = coords.x;
      newShape.cy = coords.y;
      newShape.r = 0;
    }

    setCurrentDrawingPath(newShape);
    if (socket) {
      socket.emit('whiteboard-draw-raw', newShape);
    }
  };

  const handleMouseMove = (e) => {
    const coords = getCoordinates(e);

    // Sync cursor presence
    if (socket) {
      socket.emit('whiteboard-cursor', coords);
    }

    if (!isDrawing.current || !currentDrawingPath) return;

    const updatedShape = { ...currentDrawingPath };
    if (activeTool === 'pencil' || activeTool === 'eraser') {
      updatedShape.points = [...updatedShape.points, coords];
    } else if (activeTool === 'line') {
      updatedShape.x2 = coords.x;
      updatedShape.y2 = coords.y;
    } else if (activeTool === 'rect') {
      const dx = coords.x - updatedShape.x1;
      const dy = coords.y - updatedShape.y1;
      updatedShape.width = Math.abs(dx);
      updatedShape.height = Math.abs(dy);
      updatedShape.x = dx < 0 ? coords.x : updatedShape.x1;
      updatedShape.y = dy < 0 ? coords.y : updatedShape.y1;
    } else if (activeTool === 'circle') {
      const dx = coords.x - updatedShape.cx;
      const dy = coords.y - updatedShape.cy;
      updatedShape.r = Math.round(Math.sqrt(dx * dx + dy * dy));
    }

    setCurrentDrawingPath(updatedShape);
    if (socket) {
      socket.emit('whiteboard-draw-raw', updatedShape);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing.current || !currentDrawingPath) return;
    isDrawing.current = false;

    // Filter out invalid/empty shapes
    let isValid = true;
    if (currentDrawingPath.type === 'pencil' || currentDrawingPath.type === 'eraser') {
      if (currentDrawingPath.points.length < 2) isValid = false;
    } else if (currentDrawingPath.type === 'rect') {
      if (currentDrawingPath.width < 2 && currentDrawingPath.height < 2) isValid = false;
    } else if (currentDrawingPath.type === 'circle') {
      if (currentDrawingPath.r < 2) isValid = false;
    }

    if (isValid) {
      setShapes(prev => [...prev, currentDrawingPath]);
      if (socket) {
        socket.emit('whiteboard-draw-add', currentDrawingPath);
      }
    }

    if (socket) {
      socket.emit('whiteboard-draw-raw-end');
    }
    setCurrentDrawingPath(null);
  };

  const handleClear = () => {
    setShapes([]);
    if (socket) {
      socket.emit('whiteboard-clear');
    }
  };

  const renderShape = (shape, key) => {
    switch (shape.type) {
      case 'pencil':
      case 'eraser':
        if (!shape.points || shape.points.length === 0) return null;
        const d = `M ${shape.points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
        return (
          <path
            key={key}
            d={d}
            fill="none"
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case 'line':
        return (
          <line
            key={key}
            x1={shape.x1}
            y1={shape.y1}
            x2={shape.x2}
            y2={shape.y2}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
            strokeLinecap="round"
          />
        );
      case 'rect':
        return (
          <rect
            key={key}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill="none"
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
          />
        );
      case 'circle':
        return (
          <circle
            key={key}
            cx={shape.cx}
            cy={shape.cy}
            r={shape.r}
            fill="none"
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
          />
        );
      default:
        return null;
    }
  };

  const colors = [
    { label: 'Accent', value: 'var(--accent)' },
    { label: 'Text', value: 'var(--text-1)' },
    { label: 'Green', value: 'var(--success)' },
    { label: 'Red', value: 'var(--error)' },
    { label: 'Cyan', value: 'var(--cyan)' },
    { label: 'Warning', value: 'var(--warning)' },
  ];

  const tools = [
    { id: 'pencil', icon: '✏', label: 'Pencil' },
    { id: 'line', icon: '➖', label: 'Line' },
    { id: 'rect', icon: '▭', label: 'Rect' },
    { id: 'circle', icon: '◯', label: 'Circle' },
    { id: 'eraser', icon: '⌫', label: 'Eraser' },
  ];

  return (
    <div className="w-full h-full flex flex-col relative select-none" style={{ backgroundColor: 'var(--base)' }}>
      {/* Floating Whiteboard Control Bar */}
      <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-10 flex flex-wrap items-center gap-4 bg-brand-surface1 border border-brand-border px-3 py-1.5 shadow-md">
        
        {/* Drawing Tools */}
        <div className="flex items-center gap-1">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`p-1 px-2.5 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer
                ${activeTool === tool.id ? 'bg-brand-accent text-brand-base' : 'text-brand-text2 hover:text-brand-text1 hover:bg-brand-surface2'}`}
              style={activeTool === tool.id ? { backgroundColor: 'var(--accent)', color: 'var(--base)' } : {}}
              title={tool.label}
            >
              <span>{tool.icon}</span>
              <span className="hidden sm:inline">{tool.label}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-brand-border" />

        {/* Color Palette (disabled when using eraser) */}
        <div className={`flex items-center gap-1.5 ${activeTool === 'eraser' ? 'opacity-30 pointer-events-none' : ''}`}>
          {colors.map(color => (
            <button
              key={color.value}
              onClick={() => setActiveColor(color.value)}
              className="w-4 h-4 border transition-transform hover:scale-110 cursor-pointer"
              style={{
                backgroundColor: color.value,
                borderColor: activeColor === color.value ? 'var(--text-1)' : 'var(--border)',
                borderWidth: activeColor === color.value ? '2px' : '1px',
              }}
              title={color.label}
            />
          ))}
        </div>

        <div className="w-px h-4 bg-brand-border" />

        {/* Stroke Thickness */}
        <div className="flex items-center gap-2">
          {[2, 4, 8].map(size => (
            <button
              key={size}
              onClick={() => setActiveWidth(size)}
              className={`flex items-center justify-center w-5 h-5 transition-colors hover:bg-brand-surface2 cursor-pointer
                ${activeWidth === size ? 'border border-brand-accentActive' : 'border border-transparent'}`}
              style={activeWidth === size ? { borderColor: 'var(--accent)' } : {}}
              title={`Thickness ${size}px`}
            >
              <div
                className="rounded-full bg-brand-text1"
                style={{
                  width: `${size + 1}px`,
                  height: `${size + 1}px`,
                  backgroundColor: 'var(--text-1)',
                  borderRadius: '50%'
                }}
              />
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-brand-border" />

        {/* Clear Action */}
        <button
          onClick={handleClear}
          className="text-xs font-mono font-semibold px-2 py-1 transition-colors hover:bg-brand-error/10 cursor-pointer"
          style={{ color: 'var(--error)' }}
          title="Clear drawing board"
        >
          🗑 Clear
        </button>
      </div>

      {/* SVG Draw Area */}
      <svg
        ref={svgRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="flex-1 w-full h-full cursor-crosshair outline-none"
        style={{ touchAction: 'none' }}
      >
        {/* Blueprint architectural grid background */}
        <defs>
          <pattern id="whiteboard-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.15" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#whiteboard-grid)" />

        {/* SVG Drawing elements */}
        {shapes.map((shape) => renderShape(shape, shape.id))}

        {/* Peer temporary drawings */}
        {Object.entries(remoteRawDraws).map(([userId, draw]) => {
          if (!draw.tempShape) return null;
          return renderShape(draw.tempShape, `${userId}-raw`);
        })}

        {/* Active Drawing path preview */}
        {currentDrawingPath && renderShape(currentDrawingPath, 'active-preview')}

        {/* Collaborative presence cursors */}
        {Object.entries(remoteCursors).map(([userId, cursor]) => {
          if (!cursor.pos) return null;
          return (
            <g key={userId} className="pointer-events-none transition-transform duration-75">
              {/* Pointer drawing */}
              <path
                d="M 0 0 L 0 16 L 4 12 L 8 20 L 11 18 L 7 11 L 12 11 Z"
                fill={cursor.avatarColor || 'var(--accent)'}
                stroke="var(--base)"
                strokeWidth="1.5"
                transform={`translate(${cursor.pos.x}, ${cursor.pos.y})`}
              />
              {/* Tooltip containing Username */}
              <g transform={`translate(${cursor.pos.x + 12}, ${cursor.pos.y + 12})`}>
                <rect
                  x="0"
                  y="0"
                  width={cursor.username.length * 7 + 10}
                  height="16"
                  fill="var(--surface-1)"
                  stroke={cursor.avatarColor || 'var(--accent)'}
                  strokeWidth="1"
                />
                <text
                  x="5"
                  y="11"
                  fill="var(--text-1)"
                  fontSize="9px"
                  fontFamily="var(--font-mono)"
                  fontWeight="bold"
                >
                  {cursor.username}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
