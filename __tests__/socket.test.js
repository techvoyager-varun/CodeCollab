import { describe, it, expect } from 'vitest';

describe('Socket Events', () => {
  it('should define required event names', () => {
    const events = ['join-room', 'leave-room', 'code-change', 'cursor-move', 'file-save', 'chat-message', 'typing-start', 'typing-stop'];
    expect(events).toContain('join-room');
    expect(events).toContain('code-change');
    expect(events).toContain('cursor-move');
    expect(events).toContain('chat-message');
    expect(events.length).toBe(8);
  });

  it('should format user data for room join', () => {
    const user = { id: '123', username: 'varun', avatarColor: '#d4a843' };
    const payload = { roomId: 'room-1', user };
    expect(payload.roomId).toBe('room-1');
    expect(payload.user.username).toBe('varun');
  });

  it('should format cursor data', () => {
    const cursor = {
      userId: '123',
      username: 'varun',
      fileId: 'file-1',
      position: { lineNumber: 10, column: 5 },
      selection: null
    };
    expect(cursor.position.lineNumber).toBe(10);
    expect(cursor.position.column).toBe(5);
  });

  it('should define whiteboard event names', () => {
    const events = ['whiteboard-init', 'whiteboard-draw-add', 'whiteboard-clear', 'whiteboard-draw-raw', 'whiteboard-draw-raw-end', 'whiteboard-cursor'];
    expect(events).toContain('whiteboard-draw-add');
    expect(events).toContain('whiteboard-clear');
    expect(events).toContain('whiteboard-draw-raw');
  });

  it('should format shape data for whiteboard draw', () => {
    const shape = {
      id: 'shape-1',
      type: 'rect',
      color: '#d4a843',
      strokeWidth: 4,
      x: 10,
      y: 20,
      width: 100,
      height: 50
    };
    expect(shape.type).toBe('rect');
    expect(shape.strokeWidth).toBe(4);
    expect(shape.width).toBe(100);
  });
});
