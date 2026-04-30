"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AnyData = Record<string, unknown>;

type RealtimeMiningOptions = {
  intervalMs?: number;
  enableWebSocket?: boolean;
};

export function useRealtimeMiningData<T extends AnyData>(endpoint: string | null, intervalMsOrOptions: number | RealtimeMiningOptions = 10000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(endpoint));
  const [error, setError] = useState<string>("");
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const options = useMemo(() => {
    return typeof intervalMsOrOptions === "number"
      ? { intervalMs: intervalMsOrOptions, enableWebSocket: true }
      : {
          intervalMs: intervalMsOrOptions.intervalMs ?? 10000,
          enableWebSocket: intervalMsOrOptions.enableWebSocket ?? true,
        };
  }, [intervalMsOrOptions]);

  const load = useCallback(async () => {
    if (!endpoint) {
      setLoading(false);
      setError("");
      setData(null);
      return;
    }

    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || `Failed: ${res.status}`);
      }
      setData(payload as T);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (!endpoint) {
      setLoading(false);
      return;
    }

    void load();

    if (options.intervalMs <= 0) {
      return;
    }

    const timer = setInterval(() => {
      void load();
    }, options.intervalMs);

    return () => clearInterval(timer);
  }, [endpoint, load, options.intervalMs]);

  useEffect(() => {
    if (!endpoint || !options.enableWebSocket) {
      setWsConnected(false);
      return;
    }

    let cancelled = false;

    const connect = async () => {
      try {
        const tokenRes = await fetch("/api/mining/ws-token", { cache: "no-store" });
        if (!tokenRes.ok) return;
        const tokenPayload = await tokenRes.json();
        const token = String(tokenPayload?.token || "");
        if (!token) return;

        const wsBase = window.location.protocol === "https:" ? "wss" : "ws";
        const wsUrl = `${wsBase}://${window.location.hostname}:8080/ws/mining?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!cancelled) setWsConnected(true);
        };

        ws.onmessage = (event) => {
          if (cancelled) return;
          try {
            const payload = JSON.parse(event.data);
            if (payload && typeof payload === "object" && "counters" in payload) {
              setData(payload as T);
            } else {
              void load();
            }
          } catch {
            void load();
          }
        };

        ws.onclose = () => {
          if (!cancelled) {
            setWsConnected(false);
            reconnectTimeoutRef.current = setTimeout(() => {
              if (!cancelled) connect();
            }, 5000);
          }
        };

        ws.onerror = () => {
          if (!cancelled) {
            setWsConnected(false);
            reconnectTimeoutRef.current = setTimeout(() => {
              if (!cancelled) connect();
            }, 5000);
          }
        };
      } catch {
        setWsConnected(false);
      }
    };

    void connect();

    return () => {
      cancelled = true;
      wsRef.current?.close();
      wsRef.current = null;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [endpoint, load, options.enableWebSocket]);

  return useMemo(
    () => ({ data, loading, error, wsConnected, reload: load }),
    [data, loading, error, wsConnected, load],
  );
}