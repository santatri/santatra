import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  // Polyfill pour Buffer
  if (!window.Buffer) window.Buffer = Buffer;
  
  // Polyfill pour process
  if (!window.process) {
    window.process = {
      env: {},
      version: '',
      nextTick: (callback) => setTimeout(callback, 0)
    };
  }
  
  // Polyfill pour global
  if (!window.global) window.global = window;
}