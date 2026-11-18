import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketPayload } from '@/types/websocket';
import { useAuth } from './AuthContext';

type MessageHandler = (payload: WebSocketPayload) => void;

interface WebSocketContextType {
  isConnected: boolean;
  onlineCount: number;
  subscribe: (handler: MessageHandler) => () => void;
  sendMessage: (data: unknown) => boolean;
  playOrderNotificationSound: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// Sinh âm thanh chuông báo chuẩn WAV PCM độc lập, không phụ thuộc file mạng
function createChimeWavUrl(): string {
  try {
    const sampleRate = 22050;
    const duration = 1.0;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Chuông Ding (880Hz) + Dong (659Hz) vang rõ rệt cho nhà hàng
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;
      if (t < 0.35) {
        const env = Math.exp(-t * 7);
        sample += Math.sin(2 * Math.PI * 880 * t) * env * 0.75;
      } else {
        const t2 = t - 0.25;
        const env = Math.exp(-t2 * 4.5);
        sample += Math.sin(2 * Math.PI * 659.25 * t2) * env * 0.9;
      }
      const val = Math.max(-1, Math.min(1, sample));
      view.setInt16(44 + i * 2, val < 0 ? val * 0x8000 : val * 0x7fff, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  } catch {
    return '';
  }
}

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const socketRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const chimeAudioUrlRef = useRef<string>('');

  useEffect(() => {
    chimeAudioUrlRef.current = createChimeWavUrl();
    return () => {
      if (chimeAudioUrlRef.current) {
        URL.revokeObjectURL(chimeAudioUrlRef.current);
      }
    };
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    return audioContextRef.current;
  }, []);

  // Mở khóa AudioContext khi người dùng chạm vào bất kỳ đâu trên màn hình
  useEffect(() => {
    const unlock = () => {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    };
    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, [getAudioContext]);

  const playOrderNotificationSound = useCallback(() => {
    console.log('🔔 [Admin Sound] Phát chuông báo có đơn mới!');

    // 1. Phát qua HTML5 Audio (rất tốt trên tab nền / background)
    if (chimeAudioUrlRef.current) {
      try {
        const audio = new Audio(chimeAudioUrlRef.current);
        audio.volume = 1.0;
        audio.play().catch(() => {});
      } catch {
        // ignore
      }
    }

    // 2. Phát qua Web Audio API Synthesizer
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const triggerOscillators = () => {
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.7, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.5);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1174.66, now + 0.15); // D6
        gain2.gain.setValueAtTime(0.85, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.9);
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(triggerOscillators).catch(() => {});
      } else {
        triggerOscillators();
      }
    } catch {
      // Audio error
    }
  }, [getAudioContext]);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    // Ưu tiên kết nối thẳng tới backend port (8089) để tránh phụ thuộc proxy Vite
    let url = '';
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl && typeof apiUrl === 'string' && apiUrl.startsWith('http')) {
      url = apiUrl.replace(/^http/, 'ws') + '/ws';
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      url = `${protocol}//${window.location.host}/ws`;
    }

    if (token) {
      url += `?token=Bearer%20${encodeURIComponent(token)}`;
    }

    try {
      const socket = new WebSocket(url);

      socket.onopen = () => {
        console.log('🟢 [WebSocket Admin] Đã kết nối thành công:', url);
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const payload: WebSocketPayload = JSON.parse(event.data);

          if (payload.action === 'ONLINE_COUNT' && 'count' in payload) {
            setOnlineCount(payload.count as number);
          }

          if (payload.action === 'NEW_ORDER' || payload.action === 'CALL_STAFF') {
            console.log('🔔 [WebSocket Admin] Nhận thông báo đơn mới / gọi nhân viên -> Phát chuông!');
            playOrderNotificationSound();
          }

          // Gửi tới tất cả subscriber đang đăng ký
          handlersRef.current.forEach((handler) => handler(payload));
        } catch {
          // Bỏ qua tin nhắn không phải JSON
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        // Tự động thử kết nối lại sau 3 giây
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      socket.onerror = (err) => {
        console.warn('🔴 [WebSocket Admin] Lỗi kết nối WebSocket:', err);
        socket.close();
      };

      socketRef.current = socket;
    } catch (err) {
      console.warn('🔴 [WebSocket Admin] Không thể khởi tạo socket:', err);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, [token, playOrderNotificationSound]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const subscribe = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const sendMessage = useCallback((data: unknown): boolean => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(data));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        onlineCount,
        subscribe,
        sendMessage,
        playOrderNotificationSound,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
