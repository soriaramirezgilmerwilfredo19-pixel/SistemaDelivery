import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import { scheduleStatus } from '../utils/schedule';

const ConfigContext = createContext(null);

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    client
      .get('/config')
      .then((res) => setConfig(res.data.data))
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const value = useMemo(() => {
    const est = config?.establishment || {};
    return {
      config,
      loading,
      est,
      appName: config?.app_name || 'Sistema Delivery',
      deliveryFee: Number(config?.delivery_fee || 2.5),
      freeOver: Number(config?.free_delivery_over || 25),
      eta: config?.eta_minutes || '25-45',
      status: est.timezone
        ? scheduleStatus(config?.hours, config?.holidays || [], est.timezone)
        : null
    };
  }, [config, loading, tick]);

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  return useContext(ConfigContext);
}