import { useEffect } from 'react';
import client from '../api/client';

const API_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3000/api`;

export default function useOrderEvents(onEvent) {
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const source = new EventSource(`${API_URL}/events?token=${token}`);

    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent(data);
      } catch {
        /* evento de ping o no-JSON */
      }
    };

    source.onerror = () => {
      /* EventSource reintenta solo */
    };

    return () => source.close();
  }, [onEvent]);
}
