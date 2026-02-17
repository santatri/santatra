import { meta } from '@eslint/js';
import { io } from 'socket.io-client';
import.meta.env.VITE_BACKEND_URL || 'https://afa-s80u.onrender.com';

const URL = meta.env.VITE_BACKEND_URL || 'https://afa-s80u.onrender.com';
    

export const socket = io(URL, {
  withCredentials: true,
  transports: ['websocket', 'polling'], // Important pour la compatibilité
  autoConnect: false, // Optionnel - permet de contrôler manuellement la connexion
});