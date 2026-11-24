import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const NAV_ITEMS = [
  { id: "home", label: "Inicio", icon: "home" },
  { id: "order", label: "Registrar pedido", icon: "order" },
  { id: "inventory", label: "Disponibilidad y reabastecimiento", icon: "inventory" },
  { id: "dispatch", label: "Despacho y seguimiento", icon: "dispatch" },
  { id: "tracking", label: "Consulta del cliente", icon: "tracking" },
  { id: "confirmations", label: "Confirmación de entrega", icon: "confirmations" },
  { id: "notifications", label: "Notificaciones", icon: "notifications" },
];

const ICONS = {
  home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
  order: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5h6M9 10h6M9 14h6M9 18h3" /></>,
  inventory: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5M3 8v9l9 5 9-5V8M12 13v9" /></>,
  dispatch: <><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" /><circle cx="7.5" cy="18" r="2" /><circle cx="17.5" cy="18" r="2" /></>,
  tracking: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
  confirmations: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
  notifications: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  orders: <><path d="M8 4H5a2 2 0 0 0-2 2v14h18V6a2 2 0 0 0-2-2h-3M8 4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2M8 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2" /><path d="M7 11h10M7 15h10" /></>,
  pending: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  delivered: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
  observed: <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
  products: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v9l9 5 9-5V8M12 13v9" /></>,
  stock: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5M3 8v9l9 5 9-5V8" /><path d="M7 10.2 16 5.2" /></>,
  outOfStock: <><path d="m12 3 9 5v8M3 8v9l9 5 3-1.7" /><path d="m3 8 9 5 9-5M12 13v9M17 17l5 5M22 17l-5 5" /></>,
  restock: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v9l9 5 9-5v-4M12 13v9M12 6v4M10 8h4" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
  moon: <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />,
};

const CHECKS = [
  "Cliente y condición comercial",
  "Productos y vigencia",
  "Precio y promoción",
  "Límite de crédito",
  "Ventana de entrega",
];

const CURRENCY = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "No se pudo completar la operación.");
  }
  return data;
}

function AppIcon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name] || ICONS.products}
    </svg>
  );
}

function App() {
  const [page, setPage] = useState("home");
  const [trackingInitialCode, setTrackingInitialCode] = useState("");
  const [dispatchTargetOrderNumber, setDispatchTargetOrderNumber] = useState("");
  const [dispatchReminderOpen, setDispatchReminderOpen] = useState(false);
  const [quickGuideOpen, setQuickGuideOpen] = useState(false);
  const [theme, setTheme] = useState(
    () => window.localStorage.getItem("alicorp-theme") === "dark" ? "dark" : "light",
  );
  const [dashboard, setDashboard] = useState(null);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationPopoverOpen, setNotificationPopoverOpen] = useState(false);
  const [restockRequests, setRestockRequests] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [period, setPeriod] = useState("7d");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [dashboardFilters, setDashboardFilters] = useState({
    client_id: "",
    status: "",
  });
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const notificationButtonRef = useRef(null);
  const notificationPopoverRef = useRef(null);
  const closeQuickGuide = useCallback(() => setQuickGuideOpen(false), []);

  const refresh = useCallback(async () => {
    setError("");
    if (period === "custom" && (!customRange.start || !customRange.end)) {
      return;
    }
    const params = new URLSearchParams({ period });
    if (period === "custom" && customRange.start && customRange.end) {
      params.set("start", customRange.start);
      params.set("end", customRange.end);
    }
    Object.entries(dashboardFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    try {
      const [
        summary,
        clientRows,
        productRows,
        orderRows,
        stockRows,
        notices,
        requests,
        pendingDeliveries,
      ] =
        await Promise.all([
          api(`/dashboard?${params}`),
          api("/clients"),
          api("/products"),
          api("/orders"),
          api("/inventory"),
          api("/notifications"),
          api("/restock-requests"),
          api("/deliveries?pending_only=true"),
        ]);
      setDashboard(summary);
      setUpdatedAt(summary.updated_at);
      setClients(clientRows);
      setProducts(productRows);
      setOrders(orderRows);
      setInventory(stockRows);
      setNotifications(notices);
      setRestockRequests(requests);
      setDeliveries(pendingDeliveries);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [period, customRange.start, customRange.end, dashboardFilters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    window.localStorage.setItem("alicorp-theme", theme);
  }, [theme]);

  useEffect(() => {
    let reconnectTimer;
    let socket;
    let stopped = false;
    const connectSocket = () => {
      if (stopped) return;
      socket = new WebSocket(
        `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/ws`,
      );
      socket.onmessage = () => refresh();
      socket.onclose = () => {
        if (!stopped) reconnectTimer = window.setTimeout(connectSocket, 5000);
      };
      socket.onerror = () => socket.close();
    };
    connectSocket();
    const fallback = window.setInterval(refresh, 30000);
    return () => {
      stopped = true;
      window.clearTimeout(reconnectTimer);
      window.clearInterval(fallback);
      socket?.close();
    };
  }, [refresh]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!notificationPopoverOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (
        !notificationButtonRef.current?.contains(event.target) &&
        !notificationPopoverRef.current?.contains(event.target)
      ) {
        setNotificationPopoverOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setNotificationPopoverOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [notificationPopoverOpen]);

  const runAction = async (action, successMessage, onSuccess) => {
    setError("");
    try {
      const result = await action();
      await refresh();
      setToast(successMessage);
      if (onSuccess) onSuccess(result);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    }
  };

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );
  const pendingOrders = useMemo(
    () => orders.filter((order) => !["Entregado completamente", "Cancelado"].includes(order.status)),
    [orders],
  );

  const markAllNotificationsRead = () =>
    runAction(
      () => api("/notifications/read-all", { method: "PATCH" }),
      "Todas las notificaciones están leídas.",
    );

  useEffect(() => {
    if (!pendingOrders.length) {
      setDispatchReminderOpen(false);
      return undefined;
    }
    const timer = window.setInterval(() => setDispatchReminderOpen(true), 50000);
    return () => window.clearInterval(timer);
  }, [pendingOrders.length]);

  useEffect(() => {
    if (!dispatchReminderOpen) return undefined;
    const timer = window.setTimeout(() => setDispatchReminderOpen(false), 2000);
    return () => window.clearTimeout(timer);
  }, [dispatchReminderOpen]);

  useEffect(() => {
    if (!pendingOrders.length) return undefined;
    let active = true;
    let checking = false;
    const checkPendingOrders = async () => {
      if (checking) return;
      checking = true;
      try {
        const latestOrders = await api("/orders");
        if (active) setOrders(latestOrders);
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        checking = false;
      }
    };
    const timer = window.setInterval(checkPendingOrders, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [pendingOrders.length]);

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loader" />
        <p>Conectando con el entorno de operaciones…</p>
      </div>
    );
  }

  return (
    <div className="app-shell" data-theme={theme}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <strong>PIVP Alicorp</strong>
            <span>Operaciones de pedidos</span>
          </div>
        </div>
        <div className="nav-caption">NAVEGACIÓN OPERATIVA</div>
        <nav className="side-nav" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => (
            <button
              className={`nav-item ${page === item.id ? "active" : ""} ${
                item.id === "order" && page === "home" ? "nav-highlight" : ""
              }`}
              key={item.id}
              onClick={() => {
                setPage(item.id);
                setError("");
                if (item.id !== "dispatch") setDispatchTargetOrderNumber("");
              }}
            >
              <span className={`nav-icon icon-${item.id}`}>
                <AppIcon name={item.icon} size={21} />
              </span>
              <span>{item.label}</span>
              {item.id === "notifications" && unreadCount > 0 && (
                <span className="nav-count">{unreadCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="environment-card">
          <strong>◉ ENTORNO DEMOSTRATIVO</strong>
          <span>Proyecto académico TO-BE</span>
          <span>Diadia / Insuma ↔ SAP S/4HANA</span>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="system-tags">
            <span className="tag tag-demo">● PROTOTIPO TO-BE (ACADÉMICO)</span>
            <span className="tag tag-online">● SAP S/4HANA (Simulado): En línea</span>
          </div>
          <div className="topbar-actions">
            <button
              className="theme-toggle"
              onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              <AppIcon name={theme === "dark" ? "sun" : "moon"} size={18} />
              <span>{theme === "dark" ? "Claro" : "Oscuro"}</span>
            </button>
            <button
              ref={notificationButtonRef}
              className="icon-button notification-button"
              onClick={() => setNotificationPopoverOpen((current) => !current)}
              aria-expanded={notificationPopoverOpen}
              aria-controls="notification-popover"
              aria-label={`${unreadCount} notificaciones sin leer`}
            >
              <AppIcon name="notifications" size={20} />
              {unreadCount > 0 && (
                <span className="notification-dot">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            {notificationPopoverOpen && (
              <NotificationPopover
                popoverRef={notificationPopoverRef}
                notifications={notifications}
                unreadCount={unreadCount}
                onReadAll={markAllNotificationsRead}
                onViewAll={() => {
                  setNotificationPopoverOpen(false);
                  setPage("notifications");
                }}
              />
            )}
            <button
              className="quick-guide"
              onClick={() => setQuickGuideOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={quickGuideOpen}
              aria-controls="quick-guide-dialog"
            >
              ? Chatbot
            </button>
            <div className="operator">
              <strong>Operador Supply Chain / Comercial</strong>
              <span>Alicorp B2B Operations</span>
            </div>
            <div className="avatar">O</div>
          </div>
        </header>

        <main className="content">
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Cerrar error">×</button>
            </div>
          )}
          {page === "home" && (
            <Dashboard
              dashboard={dashboard}
              period={period}
              customRange={customRange}
              filters={dashboardFilters}
              clients={clients}
              updatedAt={updatedAt}
              onPeriodChange={setPeriod}
              onCustomRangeChange={setCustomRange}
              onFiltersChange={setDashboardFilters}
              onOpenOrder={() => setPage("order")}
              onOpenInventory={() => setPage("inventory")}
              onOpenOrders={() => setPage("dispatch")}
              onOpenRestock={() => setPage("inventory")}
            />
          )}
          {page === "order" && (
            <OrderPage
              clients={clients}
              products={products}
              onManualRestock={(payload) =>
                runAction(
                  () => api("/restock-requests", { method: "POST", body: JSON.stringify(payload) }),
                  "Solicitud enviada a Almacén Central.",
                )
              }
              onCreate={(payload) =>
                runAction(
                  () => api("/orders", { method: "POST", body: JSON.stringify(payload) }),
                  "Pedido registrado correctamente.",
                  (created) => {
                    setTrackingInitialCode(created.order_number);
                    setPage("tracking");
                  },
                )
              }
            />
          )}
          {page === "inventory" && (
            <InventoryPage
              inventory={inventory}
              orders={orders}
              restockRequests={restockRequests}
              onReserve={(id) =>
                runAction(() => api(`/orders/${id}/reserve`, { method: "POST" }), "Stock reservado. El pedido está listo para preparación.")
              }
              onPrepare={(id) =>
                runAction(() => api(`/orders/${id}/prepare`, { method: "POST" }), "Pedido enviado a preparación.")
              }
              onRestockStatus={(id, status) =>
                runAction(
                  () => api(`/restock-requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
                  status === "Atendido" ? "Solicitud atendida y stock actualizado." : "Solicitud asignada a Almacén Central.",
                )
              }
              onNotifyRestock={(id) =>
                runAction(
                  () => api(`/inventory/${id}/notify-restock`, { method: "POST" }),
                  "Notificado correctamente",
                )
              }
            />
          )}
          {page === "dispatch" && (
            <DispatchPage
              orders={orders}
              targetOrderNumber={dispatchTargetOrderNumber}
              onDispatch={(id, payload) =>
                runAction(
                  () => api(`/orders/${id}/dispatch`, { method: "POST", body: JSON.stringify(payload) }),
                  "Entrega registrada. El solicitante ya puede confirmar la recepción.",
                )
              }
              onOpenConfirmations={() => setPage("confirmations")}
            />
          )}
          {page === "tracking" && (
            <TrackingPage
              clients={clients}
              orders={orders}
              notifications={notifications}
              initialCode={trackingInitialCode}
              onInitialCodeHandled={setTrackingInitialCode}
            />
          )}
          {page === "confirmations" && (
            <ConfirmationsPage
              clients={clients}
              deliveries={deliveries}
              onConfirm={(id, payload) =>
                runAction(
                  () => api(`/deliveries/${id}/confirm`, { method: "PATCH", body: JSON.stringify(payload) }),
                  "Confirmación guardada y seguimiento actualizado.",
                )
              }
            />
          )}
          {page === "notifications" && (
            <NotificationsPage
              notifications={notifications}
              onReadAll={markAllNotificationsRead}
            />
          )}
        </main>
      </div>
      {dispatchReminderOpen && pendingOrders.length > 0 && (
        <DispatchReminderPopup
          pendingOrders={pendingOrders}
          onClose={() => setDispatchReminderOpen(false)}
          onViewOrder={() => {
            setDispatchTargetOrderNumber(pendingOrders[0].order_number);
            setDispatchReminderOpen(false);
            setPage("dispatch");
          }}
        />
      )}
      <QuickGuideChat
        open={quickGuideOpen}
        onClose={closeQuickGuide}
      />
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </div>
  );
}

function DispatchReminderPopup({ pendingOrders, onClose, onViewOrder }) {
  const order = pendingOrders[0];
  if (!order) return null;
  const count = pendingOrders.length;

  return (
    <div className="dispatch-reminder-overlay">
      <section
        className="dispatch-reminder-popup"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dispatch-reminder-title"
        aria-describedby="dispatch-reminder-description"
      >
        <span className="dispatch-reminder-icon" aria-hidden="true">!</span>
        <div className="dispatch-reminder-content">
          <strong className="dispatch-reminder-eyebrow">ALERTA DE DESPACHO</strong>
          <h2 id="dispatch-reminder-title">Pedidos pendientes de despacho</h2>
          <p id="dispatch-reminder-description">
            Hay {count} pedido{count === 1 ? "" : "s"} pendiente{count === 1 ? "" : "s"} de despacho.
            {" "}Se mostrará nuevamente en 50 segundos.
          </p>
          <p className="dispatch-reminder-order">Pedido: {order.order_number}</p>
        </div>
        <div className="dispatch-reminder-actions">
          <button className="secondary-button" onClick={onClose}>Cerrar</button>
          <button className="primary-button dispatch-reminder-view" onClick={onViewOrder}>
            Ver pedido
          </button>
        </div>
      </section>
    </div>
  );
}

function QuickGuideChat({ open, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "¡Hola! Puedo ayudarte con productos, stock, pedidos y el uso de los módulos.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState({
    checking: false,
    available: false,
    model: "llama3.2",
    message: "",
  });
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setOllamaStatus((current) => ({ ...current, checking: true }));
    api("/assistant/status")
      .then((status) => {
        if (active) setOllamaStatus({ ...status, checking: false });
      })
      .catch((requestError) => {
        if (active) {
          setOllamaStatus({
            checking: false,
            available: false,
            model: "llama3.2",
            message: requestError.message,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = async (messageText) => {
    const content = messageText.trim();
    if (!content || sending) return;
    const conversation = [...messages, { role: "user", content }];
    setMessages(conversation);
    setDraft("");
    setSending(true);
    try {
      const result = await api("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ messages: conversation.slice(-16) }),
      });
      setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
    } catch (requestError) {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: `No pude responder: ${requestError.message}` },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const suggestions = [
    "¿Qué productos tienen stock bajo?",
    "¿Cuál es el estado de mis pedidos?",
    "¿Cómo registro un pedido?",
  ];

  return (
    <div
      className="assistant-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        id="quick-guide-dialog"
        className="assistant-chat"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-chat-title"
      >
        <header className="assistant-chat-header">
          <div className="assistant-chat-avatar" aria-hidden="true">A</div>
          <div className="assistant-chat-heading">
            <strong id="assistant-chat-title">Guía rápida</strong>
            <span
              className={`assistant-chat-status ${ollamaStatus.available ? "is-ready" : "is-offline"}`}
              title={ollamaStatus.message}
            >
              <span className="assistant-chat-status-dot" />
              {ollamaStatus.checking
                ? "Verificando Ollama…"
                : ollamaStatus.available
                  ? `Ollama · ${ollamaStatus.model}`
                  : "Ollama no listo"}
            </span>
          </div>
          <button className="assistant-chat-close" onClick={onClose} aria-label="Cerrar guía rápida">
            ×
          </button>
        </header>
        {!ollamaStatus.available && !ollamaStatus.checking && ollamaStatus.message && (
          <div className="assistant-chat-connection" role="status">{ollamaStatus.message}</div>
        )}
        <div className="assistant-chat-messages" aria-live="polite">
          {messages.map((message, index) => (
            <article
              className={`assistant-chat-message message-${message.role}`}
              key={`${message.role}-${index}`}
            >
              <span>{message.role === "user" ? "Tú" : "Guía"}</span>
              <p>{message.content}</p>
            </article>
          ))}
          {messages.length === 1 && (
            <div className="assistant-chat-suggestions">
              {suggestions.map((suggestion) => (
                <button key={suggestion} onClick={() => sendMessage(suggestion)} disabled={sending}>
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          {sending && (
            <div className="assistant-chat-typing" role="status">
              Ollama está escribiendo…
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form
          className="assistant-chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage(draft);
          }}
        >
          <textarea
            ref={inputRef}
            aria-label="Escribe tu consulta"
            placeholder="Pregunta por pedidos, productos, stock o cómo usar el sistema…"
            value={draft}
            maxLength={2000}
            rows={1}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage(draft);
              }
            }}
          />
          <button type="submit" disabled={!draft.trim() || sending} aria-label="Enviar mensaje">
            Enviar
          </button>
        </form>
        <div className="assistant-chat-footnote">
          Las respuestas usan datos actuales del sistema. El asistente no modifica pedidos ni inventario.
        </div>
      </section>
    </div>
  );
}

function notificationTitle(notification) {
  const message = notification.message.toLowerCase();
  if (notification.kind === "abastecimiento") return "Abastecimiento requerido";
  if (notification.kind === "factura") return "Factura pendiente";
  if (notification.kind === "confirmacion") {
    if (message.includes("confirma la recepción")) return "Entrega pendiente de confirmar";
    if (message.includes("incidencia")) return "Entrega observada";
    return "Entrega confirmada";
  }
  if (message.includes("registrado")) return "Pedido registrado";
  if (message.includes("despacho")) return "Pedido pendiente de despacho";
  if (message.includes("preparación")) return "Pedido en preparación";
  if (message.includes("reservado")) return "Pedido reservado";
  return "Actualización de pedido";
}

function notificationCode(notification) {
  const message = notification.message.toLowerCase();
  if (notification.kind === "estado") {
    if (message.includes("registrado") || message.includes("despacho")) return "PEDIDO_PENDIENTE_ENTREGA";
    if (message.includes("preparación")) return "PEDIDO_EN_PREPARACION";
    if (message.includes("reservado")) return "PEDIDO_RESERVADO";
    if (message.includes("observado")) return "PEDIDO_OBSERVADO";
    if (message.includes("entregado")) return "PEDIDO_ENTREGADO";
  }
  if (notification.kind === "pedido") return "PEDIDO_REGISTRADO";
  if (notification.kind === "abastecimiento") return "ABASTECIMIENTO_REQUERIDO";
  if (notification.kind === "factura") return "FACTURA_PENDIENTE";
  if (notification.kind === "confirmacion") {
    if (message.includes("confirma la recepción")) return "ENTREGA_PENDIENTE_CONFIRMACION";
    if (message.includes("incidencia")) return "ENTREGA_OBSERVADA";
    return "ENTREGA_CONFIRMADA";
  }
  return "ACTUALIZACION_PEDIDO";
}

function NotificationPopover({
  popoverRef,
  notifications,
  unreadCount,
  onReadAll,
  onViewAll,
}) {
  return (
    <section
      className="notification-popover"
      id="notification-popover"
      ref={popoverRef}
      aria-label="Notificaciones recientes"
    >
      <header className="notification-popover-header">
        <div>
          <strong>Notificaciones</strong>
          <span>{unreadCount} sin leer</span>
        </div>
        <div className="notification-popover-actions">
          <button onClick={onReadAll} disabled={!unreadCount}>Marcar todas leídas</button>
          <button onClick={onViewAll}>Ver todas</button>
        </div>
      </header>
      <div className="notification-popover-list">
        {notifications.length ? notifications.slice(0, 8).map((notification) => (
          <button
            className={`notification-item ${notification.is_read ? "notification-read" : "notification-unread"}`}
            key={notification.id}
            onClick={onViewAll}
          >
            <span className={`notification-item-mark severity-${notification.severity || "azul"}`}>
              <AppIcon
                name={notification.kind === "factura" ? "order" : notification.kind === "abastecimiento" ? "restock" : notification.kind === "confirmacion" ? "confirmations" : "orders"}
                size={17}
              />
            </span>
            <span className="notification-item-content">
              <strong>{notificationTitle(notification)}</strong>
              <span>{notification.message}</span>
              <small>
                {notification.order_number || notification.recipient}
                {" · "}
                {new Date(notification.created_at).toLocaleString("es-PE", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
            </span>
            {!notification.is_read && <span className="notification-unread-dot" />}
          </button>
        )) : (
          <p className="notification-empty">No tienes notificaciones todavía.</p>
        )}
      </div>
    </section>
  );
}

function PageHeading({ title, subtitle, action }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function Panel({ title, accent = "blue", children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <h2 className={`panel-title accent-${accent}`}>
          <span />
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function Dashboard({
  dashboard,
  period,
  customRange,
  filters,
  clients,
  updatedAt,
  onPeriodChange,
  onCustomRangeChange,
  onFiltersChange,
  onOpenOrder,
  onOpenInventory,
  onOpenOrders,
  onOpenRestock,
}) {
  const [selectedMetric, setSelectedMetric] = useState("");
  const metrics = [
    { label: "Total de pedidos", value: dashboard?.total, color: "blue", icon: "orders", detail: "Pedidos creados en el periodo." },
    { label: "Pedidos pendientes", value: dashboard?.pending, color: "orange", icon: "pending", detail: "Pedidos todavía abiertos o en proceso." },
    { label: "Pedidos atendidos", value: dashboard?.delivered, color: "green", icon: "delivered", detail: "Entregas confirmadas por el solicitante." },
    { label: "Pedidos observados", value: dashboard?.observed, color: "red", icon: "observed", detail: "Entregas que requieren atención." },
    { label: "Total de productos", value: dashboard?.products_total, color: "blue", icon: "products", detail: "Productos disponibles en el catálogo." },
    { label: "Productos con stock bajo", value: dashboard?.incidents, color: "orange", icon: "stock", detail: "Productos por debajo del mínimo configurado." },
    { label: "Productos sin stock", value: dashboard?.out_of_stock, color: "red", icon: "outOfStock", detail: "Productos agotados." },
    { label: "Abastecimientos pendientes", value: dashboard?.pending_restock, color: "red", icon: "restock", detail: "Solicitudes que Almacén Central debe atender." },
  ];
  const selected = metrics.find((item) => item.label === selectedMetric);
  const alerts = dashboard?.alerts ?? [];
  const metricKey = selectedMetric.toLowerCase();
  const relatedAlerts = metricKey.includes("stock")
    ? alerts.filter((alert) => alert.type === "stock")
    : metricKey.includes("abastecimiento")
      ? alerts.filter((alert) => alert.type === "abastecimiento")
      : metricKey.includes("observado")
        ? alerts.filter((alert) => alert.type === "confirmacion" || alert.type === "pedido")
        : alerts.filter((alert) => alert.type === "pedido");
  const formatUpdate = updatedAt
    ? new Date(updatedAt).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })
    : "Actualizando…";

  return (
    <>
      <PageHeading
        title="Dashboard principal"
        subtitle="Resumen en tiempo real de pedidos, almacén y abastecimiento."
        action={<button className="primary-button" onClick={onOpenOrder}>＋ Nuevo pedido</button>}
      />
      <div className="dashboard-toolbar">
        <label className="period-control">
          Periodo de consulta
          <select value={period} onChange={(event) => onPeriodChange(event.target.value)}>
            <option value="today">Hoy</option>
            <option value="7d">Últimos 7 días</option>
            <option value="month">Mes actual</option>
            <option value="custom">Rango personalizado</option>
          </select>
        </label>
        {period === "custom" && (
          <div className="date-range">
            <label>Desde<input type="date" value={customRange.start} onChange={(event) => onCustomRangeChange((range) => ({ ...range, start: event.target.value }))} /></label>
            <label>Hasta<input type="date" value={customRange.end} min={customRange.start} onChange={(event) => onCustomRangeChange((range) => ({ ...range, end: event.target.value }))} /></label>
          </div>
        )}
        <div className="dashboard-filters">
          <label>Solicitante<select value={filters.client_id} onChange={(event) => onFiltersChange((current) => ({ ...current, client_id: event.target.value }))}>
            <option value="">Todos</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select></label>
          <label>Estado<select value={filters.status} onChange={(event) => onFiltersChange((current) => ({ ...current, status: event.target.value }))}>
            <option value="">Todos los estados</option>
            {["Registrado", "Pendiente por falta de stock", "Reservado", "En preparación", "En verificación", "Entrega parcial", "Entregado completamente", "Observado", "Cancelado"].map((item) => <option key={item}>{item}</option>)}
          </select></label>
          <button className="filter-reset" onClick={() => onFiltersChange({ client_id: "", status: "" })}>Limpiar filtros</button>
        </div>
        <span className="last-updated"><span className="live-dot" /> Última actualización: {formatUpdate}</span>
      </div>
      <div className="metric-grid">
        {metrics.map((metric) => (
          <button
            className={`metric-card metric-${metric.color} ${selectedMetric === metric.label ? "metric-selected" : ""}`}
            key={metric.label}
            onClick={() => setSelectedMetric((current) => current === metric.label ? "" : metric.label)}
            aria-pressed={selectedMetric === metric.label}
          >
            <span className="metric-label">{metric.label}</span>
            <div className="metric-number-row">
              <strong>{metric.value ?? 0}</strong>
              <span className="metric-icon"><AppIcon name={metric.icon} size={22} /></span>
            </div>
            <span className="metric-footnote">Ver detalle ↗</span>
          </button>
        ))}
      </div>
      <div className="confirmation-kpis">
        <div><span>Entregas confirmadas</span><strong>{dashboard?.delivered ?? 0}</strong></div>
        <div><span>Por confirmar</span><strong>{dashboard?.pending_confirmations ?? 0}</strong></div>
        <div><span>Entregas observadas</span><strong>{dashboard?.observed_deliveries ?? 0}</strong></div>
        <div><span>Facturas pendientes</span><strong>{dashboard?.pending_invoices ?? 0}</strong></div>
        <div><span>Promedio de calificación</span><strong>{dashboard?.average_rating ? `★ ${dashboard.average_rating} / 5` : "—"}</strong></div>
      </div>
      {selected && (
        <Panel title={selected.label} accent={selected.color === "red" ? "orange" : "blue"} className="metric-detail-panel">
          <div className="metric-detail">
            <strong>{selected.value ?? 0}</strong>
            <span>{selected.detail}</span>
            {(metricKey.includes("stock") || metricKey.includes("productos")) && <button className="text-action" onClick={onOpenInventory}>Abrir inventario</button>}
            {metricKey.includes("abastecimiento") && <button className="text-action" onClick={onOpenRestock}>Gestionar solicitudes</button>}
            {metricKey.includes("pedido") && <button className="text-action" onClick={onOpenOrders}>Ver pedidos</button>}
          </div>
          {relatedAlerts.length > 0 && <AlertList alerts={relatedAlerts.slice(0, 5)} />}
        </Panel>
      )}
      <section className="chart-grid">
        <BarsPanel
          title="Pedidos por día"
          entries={(dashboard?.charts?.orders_by_day ?? []).map((item) => ({ label: item.date.slice(5).replace("-", "/"), value: item.count }))}
          empty="No hay pedidos en este periodo."
          color="blue"
        />
        <BarsPanel
          title="Productos más solicitados"
          entries={(dashboard?.charts?.top_products ?? []).map((item) => ({ label: item.name, value: item.quantity }))}
          empty="Aún no hay líneas de pedidos."
          color="green"
        />
        <BarsPanel
          title="Movimiento de inventario"
          entries={(dashboard?.charts?.inventory_movement ?? []).map((item) => ({ label: item.date.slice(5).replace("-", "/"), value: item.quantity }))}
          empty="No se han registrado entregas."
          color="orange"
        />
        <BarsPanel
          title="Pedidos por estado"
          entries={(dashboard?.charts?.orders_by_status ?? []).map((item) => ({ label: item.status, value: item.count }))}
          empty="No hay pedidos en este periodo."
          color="blue"
        />
        <BarsPanel
          title="Consumo por área y sede"
          entries={(dashboard?.charts?.consumption_by_area ?? []).map((item) => ({ label: `${item.area} · ${item.site}`, value: item.quantity }))}
          empty="Aún no hay datos de consumo por área."
          color="green"
        />
        <BarsPanel
          title="Calificaciones de entrega"
          entries={(dashboard?.charts?.ratings ?? []).map((item) => ({ label: `${"★".repeat(item.rating)} · ${item.rating}`, value: item.count }))}
          empty="Aún no hay calificaciones."
          color="orange"
        />
      </section>
      <Panel
        title="Alertas operativas"
        accent="orange"
        className={`alert-panel ${(alerts.some((item) => item.severity === "rojo") ? "alert-panel-critical" : "")}`}
      >
        {alerts.length ? <AlertList alerts={alerts.slice(0, 8)} /> : <p>No hay alertas pendientes de atención.</p>}
      </Panel>
      <Panel title="Pedidos recientes" accent="green" className="table-panel">
        <OrderTable orders={dashboard?.orders ?? []} empty="Todavía no hay pedidos registrados en este periodo." />
      </Panel>
    </>
  );
}

function BarsPanel({ title, entries, empty, color }) {
  const max = Math.max(1, ...entries.map((entry) => entry.value));
  return (
    <Panel title={title} className="chart-panel">
      {entries.length ? (
        <div className="bar-chart">
          {entries.map((entry) => (
            <div className="bar-column" key={entry.label} title={`${entry.label}: ${entry.value}`}>
              <span className="bar-value">{entry.value}</span>
              <div className={`bar-track bar-${color}`}>
                <span style={{ height: `${Math.max(4, (entry.value / max) * 100)}%` }} />
              </div>
              <span className="bar-label">{entry.label}</span>
            </div>
          ))}
        </div>
      ) : <div className="empty-row">{empty}</div>}
    </Panel>
  );
}

function AlertList({ alerts }) {
  return (
    <div className="alert-list">
      {alerts.map((alert, index) => (
        <div className={`alert-row alert-${alert.severity}`} key={`${alert.type}-${alert.title}-${index}`}>
          <span className="alert-symbol">{alert.severity === "rojo" ? "!" : "●"}</span>
          <div><strong>{alert.title}</strong><span>{alert.detail}</span></div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const color =
    ["Entregado", "Entregado completamente", "Reservado", "Atendido"].includes(status)
      ? "green"
      : ["En preparación", "Entrega parcial", "En atención"].includes(status)
        ? "orange"
        : ["Despachado", "En verificación"].includes(status)
          ? "blue"
          : ["Observado", "Pendiente por falta de stock", "Pendiente"].includes(status)
            ? "red"
          : "gray";
  return <span className={`status-badge status-${color}`}>{status}</span>;
}

function OrderTable({ orders, empty }) {
  if (!orders.length) return <div className="empty-row">{empty}</div>;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>PEDIDO</th>
            <th>CLIENTE</th>
            <th>LÍNEAS</th>
            <th>TOTAL</th>
            <th>ESTADO</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="order-code">{order.order_number}</td>
              <td>{order.client_name}</td>
              <td>{order.items.length}</td>
              <td>{CURRENCY.format(order.total)}</td>
              <td><StatusBadge status={order.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderPage({ clients, products, onCreate, onManualRestock }) {
  const [clientId, setClientId] = useState("");
  const [channel, setChannel] = useState("Diadia");
  const [deliveryDate, setDeliveryDate] = useState(
    () => new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  );
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [cart, setCart] = useState([]);
  const [checksPassed, setChecksPassed] = useState(false);
  const [saving, setSaving] = useState(false);

  const addProduct = () => {
    const id = Number(productId);
    const amount = Number(quantity);
    if (!id || !Number.isInteger(amount) || amount < 1) return;
    setCart((current) => {
      const existing = current.find((line) => line.id === id);
      if (existing) {
        return current.map((line) =>
          line.id === id ? { ...line, quantity: line.quantity + amount } : line,
        );
      }
      const product = products.find((item) => item.id === id);
      return product ? [...current, { ...product, quantity: amount }] : current;
    });
    setChecksPassed(false);
  };

  const removeProduct = (id) => {
    setCart((current) => current.filter((line) => line.id !== id));
    setChecksPassed(false);
  };

  const total = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);

  const submitOrder = async () => {
    if (!clientId || !cart.length || !checksPassed) return;
    setSaving(true);
    try {
      const created = await onCreate({
        client_id: Number(clientId),
        channel,
        delivery_date: deliveryDate,
        items: cart.map(({ id, quantity: amount }) => ({
          product_id: id,
          quantity: amount,
        })),
      });
      if (!created) return;
      setCart([]);
      setChecksPassed(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeading
        title="Registrar pedido comercial"
        subtitle="Agregue uno o varios productos antes de validar y registrar un único pedido."
      />
      <div className="order-top-grid">
        <Panel title="Cabecera del pedido">
          <div className="form-grid">
            <label>
              Cliente
              <select
                value={clientId}
                onChange={(event) => {
                  setClientId(event.target.value);
                  setChecksPassed(false);
                }}
              >
                <option value="">Seleccione un cliente</option>
                {clients.map((client) => (
                  <option value={client.id} key={client.id}>{client.name}</option>
                ))}
              </select>
            </label>
            <label>
              Canal
              <select
                value={channel}
                onChange={(event) => {
                  setChannel(event.target.value);
                  setChecksPassed(false);
                }}
              >
                <option>Diadia</option>
                <option>Insuma</option>
              </select>
            </label>
            <label>
              Fecha de entrega
              <input
                type="date"
                value={deliveryDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => {
                  setDeliveryDate(event.target.value);
                  setChecksPassed(false);
                }}
              />
            </label>
          </div>
          <div className="section-label">AGREGAR PRODUCTO</div>
          <div className="product-entry">
            <label>
              Producto
              <select value={productId} onChange={(event) => setProductId(event.target.value)}>
                <option value="">Seleccione un producto</option>
                {products.map((product) => (
                  <option value={product.id} key={product.id}>
                    {product.name} · {product.sku}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cantidad
              <input
                type="number"
                min="1"
                max="10000"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>
            <button className="primary-button add-button" onClick={addProduct}>Agregar producto</button>
          </div>
          <button
            className="manual-restock-button"
            disabled={!productId}
            onClick={() => onManualRestock({
              product_id: Number(productId),
              requested_quantity: Number(quantity),
              requester: clients.find((client) => String(client.id) === clientId)?.name || "Operaciones",
            })}
          >
            ↥ Notificar a Almacén Central
          </button>
        </Panel>
        <Panel title="Matriz de validación SAP" accent="green" className="validation-panel">
          <p className="panel-description">Controles ejecutados secuencialmente antes del registro.</p>
          <div className="check-list">
            {CHECKS.map((check) => (
              <div className={`check-item ${checksPassed ? "check-approved" : ""}`} key={check}>
                <span className={checksPassed ? "check-done" : ""}>{checksPassed ? "✓" : "○"}</span>
                <div>
                  <strong>{check}</strong>
                  <small>{checksPassed ? "Validación aprobada" : "Pendiente de ejecutar"}</small>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="Productos agregados al pedido" accent="blue" className="table-panel cart-panel">
        {cart.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>PRODUCTO</th><th>PRECIO</th><th>CANTIDAD</th><th>SUBTOTAL</th><th /></tr>
              </thead>
              <tbody>
                {cart.map((line) => (
                  <tr key={line.id}>
                    <td>{line.name}<span className="sub-cell">{line.sku}</span></td>
                    <td>{CURRENCY.format(line.price)}</td>
                    <td>{line.quantity}</td>
                    <td>{CURRENCY.format(line.price * line.quantity)}</td>
                    <td>
                      <button className="remove-button" onClick={() => removeProduct(line.id)} aria-label={`Quitar ${line.name}`}>Quitar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty-row">Sin productos agregados.</div>}
        <div className="cart-total"><span>Total</span><strong>{CURRENCY.format(total)}</strong></div>
      </Panel>
      <Panel title="Registrar pedido" accent="green" className="submit-panel">
        <div className={`submit-content ${checksPassed ? "submit-content-approved" : ""}`}>
          <div className="submit-copy">
            <span className="submit-accent" aria-hidden="true" />
            <div>
              <strong>Registrar pedido</strong>
              <span>
                {checksPassed
                  ? "La validación SAP fue aprobada. Puede registrar el pedido."
                  : "Valide el pedido en SAP para habilitar el registro."}
              </span>
            </div>
          </div>
          <div className="submit-actions">
            {checksPassed ? (
              <button
                className="primary-button submit-order-button"
                disabled={!cart.length || saving}
                onClick={submitOrder}
              >
                {saving ? "Registrando…" : "Registrar pedido en SAP"}
              </button>
            ) : (
              <button
                className="secondary-button"
                disabled={!clientId || !cart.length || saving}
                onClick={() => setChecksPassed(true)}
              >
                Validar pedido en SAP
              </button>
            )}
          </div>
        </div>
      </Panel>
    </>
  );
}

function InventoryPage({
  inventory,
  orders,
  restockRequests,
  onReserve,
  onPrepare,
  onRestockStatus,
  onNotifyRestock,
}) {
  const [selectedId, setSelectedId] = useState("");
  const [notifyingProductId, setNotifyingProductId] = useState(null);
  const eligible = orders.filter(
    (order) => order.status === "Registrado" || order.status === "Reservado",
  );
  const selected = eligible.find((order) => String(order.id) === selectedId);

  const notifyRestock = async (productId) => {
    setNotifyingProductId(productId);
    try {
      await onNotifyRestock(productId);
    } finally {
      setNotifyingProductId(null);
    }
  };

  return (
    <>
      <PageHeading
        title="Disponibilidad y reabastecimiento"
        subtitle="ATP de todas las líneas del pedido; no hay reservas parciales."
      />
      <Panel title="Pedido para reservar" className="filter-panel">
        <div className="filter-row">
          <label>
            Pedido
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              <option value="">Seleccione un pedido</option>
              {eligible.map((order) => (
                <option value={order.id} key={order.id}>
                  {order.order_number} · {order.client_name} · {order.status}
                </option>
              ))}
            </select>
          </label>
          {selected?.status === "Registrado" && (
            <button className="primary-button" onClick={() => onReserve(selected.id)}>Reservar pedido</button>
          )}
          {selected?.status === "Reservado" && (
            <button className="primary-button" onClick={() => onPrepare(selected.id)}>Enviar a preparación</button>
          )}
        </div>
        {selected && (
          <div className="selected-order-note">
            {selected.items.map((item) => `${item.name}: ${item.quantity} un.`).join(" · ")}
          </div>
        )}
        {!eligible.length && <div className="empty-inline">No hay pedidos pendientes de reserva o preparación.</div>}
      </Panel>
      <Panel title="Solicitudes de abastecimiento · Almacén Central" accent="orange" className="table-panel">
        {restockRequests.length ? (
          <div className="table-scroll">
            <table>
              <thead><tr><th>PRODUCTO</th><th>STOCK ATP</th><th>SOLICITADO</th><th>FALTANTE</th><th>SOLICITANTE</th><th>PEDIDO</th><th>FECHA</th><th>ESTADO</th><th>ACCIÓN</th></tr></thead>
              <tbody>
                {restockRequests.map((request) => (
                  <tr key={request.id} className={request.status !== "Atendido" ? "restock-pending-row" : ""}>
                    <td>{request.product_name}<span className="sub-cell">{request.sku}</span></td>
                    <td>{request.available_stock}</td>
                    <td>{request.requested_quantity}</td>
                    <td className="missing-quantity">{request.missing_quantity}</td>
                    <td>{request.requester}</td>
                    <td>{request.order_number || "Solicitud manual"}</td>
                    <td>{new Date(request.created_at).toLocaleString("es-PE")}</td>
                    <td><StatusBadge status={request.status} /></td>
                    <td>
                      {request.status === "Pendiente" && (
                        <button className="table-action" onClick={() => onRestockStatus(request.id, "En atención")}>Atender</button>
                      )}
                      {request.status === "En atención" && (
                        <button className="table-action table-action-green" onClick={() => onRestockStatus(request.id, "Atendido")}>Abastecer</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty-row">No hay solicitudes de abastecimiento pendientes.</div>}
      </Panel>
      <Panel title="Inventario completo" accent="green" className="table-panel inventory-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>SKU</th><th>PRODUCTO</th><th>CATEGORÍA</th><th>STOCK</th><th>RESERVADO</th><th>ATP</th></tr>
            </thead>
            <tbody>
              {inventory.map((product) => (
                <tr key={product.id}>
                  <td className="order-code">{product.sku}</td>
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td>{product.stock}</td>
                  <td>{product.reserved}</td>
                  <td>
                    <div className="inventory-atp-cell">
                      <span className={product.atp <= product.minimum_stock ? "atp-low" : "atp-good"}>
                        {product.atp}
                      </span>
                      {product.atp === 0 && (
                        <button
                          className="inventory-restock-notify-button"
                          disabled={notifyingProductId === product.id}
                          onClick={() => notifyRestock(product.id)}
                        >
                          {notifyingProductId === product.id ? "Notificando…" : "Notificar reposición de stock"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function DispatchPage({ orders, targetOrderNumber, onDispatch, onOpenConfirmations }) {
  const [filter, setFilter] = useState(targetOrderNumber ? "Todos" : "Listos para entrega");
  const visibleOrders = orders.filter((order) =>
    filter === "Todos"
      ? true
      : filter === "Listos para entrega"
        ? ["En preparación", "Entrega parcial", "Observado"].includes(order.status)
        : filter === "Pendiente confirmación"
          ? order.status === "En verificación"
          : order.status === filter,
  );

  useEffect(() => {
    if (targetOrderNumber) {
      document.getElementById("dispatch-target-order")?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [targetOrderNumber, visibleOrders.length]);

  return (
    <>
      <PageHeading
        title="Despacho y seguimiento"
        subtitle="Registra entregas completas o parciales; el solicitante confirma la recepción."
        action={<button className="secondary-button" onClick={onOpenConfirmations}>Confirmaciones pendientes</button>}
      />
      <Panel title="Pedidos de despacho" accent="green" className="table-panel dispatch-panel">
        <div className="table-tools">
          <label className="filter-select">
            Estado
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option>Listos para entrega</option>
              <option>Pendiente confirmación</option>
              <option>Entrega parcial</option>
              <option>Observado</option>
              <option>Todos</option>
            </select>
          </label>
        </div>
        {visibleOrders.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>PEDIDO</th><th>PRODUCTOS</th><th>ESTADO</th><th>SEGUIMIENTO</th><th>ENTREGA</th><th>ACCIÓN</th></tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr
                    key={order.id}
                    id={order.order_number === targetOrderNumber ? "dispatch-target-order" : undefined}
                    className={order.order_number === targetOrderNumber ? "dispatch-target-row" : ""}
                  >
                    <td className="order-code">{order.order_number}<span className="sub-cell">{order.client_name}</span></td>
                    <td>{order.items.map((item) => `${item.name} · recibido ${item.delivered_quantity}/${item.quantity}`).join(", ")}</td>
                    <td><StatusBadge status={order.status} /></td>
                    <td>{order.tracking_code || "—"}</td>
                    <td>{order.deliveries?.map((delivery) => delivery.tracking_code).join(", ") || "—"}</td>
                    <td>
                      {["En preparación", "Entrega parcial", "Observado"].includes(order.status) && (
                        <DispatchForm order={order} onSubmit={(payload) => onDispatch(order.id, payload)} />
                      )}
                      {order.status === "En verificación" && (
                        <button className="table-action table-action-green" onClick={onOpenConfirmations}>Esperando confirmación</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-row">No hay pedidos listos para despacho.</div>
        )}
      </Panel>
    </>
  );
}

function DispatchForm({ order, onSubmit }) {
  const [quantities, setQuantities] = useState(() =>
    Object.fromEntries(
      order.items.map((item) => [
        item.product_id,
        Math.max(0, item.quantity - item.delivered_quantity),
      ]),
    ),
  );
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const lines = Object.entries(quantities)
    .filter(([, quantity]) => Number(quantity) > 0)
    .map(([productId, quantity]) => ({
      product_id: Number(productId),
      quantity: Number(quantity),
    }));

  const submit = async () => {
    if (!lines.length) return;
    setSaving(true);
    try {
      await onSubmit({ items: lines, invoice_number: invoiceNumber.trim() || null });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dispatch-form">
      {order.items.map((item) => {
        const remaining = Math.max(0, item.quantity - item.delivered_quantity);
        if (!remaining) return null;
        return (
          <label key={item.product_id}>
            {item.name} · máx. {remaining}
            <input
              type="number"
              min="0"
              max={remaining}
              value={quantities[item.product_id] ?? 0}
              onChange={(event) => setQuantities((current) => ({
                ...current,
                [item.product_id]: Math.min(remaining, Math.max(0, Number(event.target.value))),
              }))}
            />
          </label>
        );
      })}
      <label>
        N.º de factura
        <input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} placeholder="Opcional" maxLength={80} />
      </label>
      <button className="table-action" disabled={!lines.length || saving} onClick={submit}>
        {saving ? "Registrando…" : "Registrar entrega"}
      </button>
    </div>
  );
}

function ConfirmationsPage({ clients, deliveries, onConfirm }) {
  const [clientId, setClientId] = useState("");
  const visible = deliveries.filter(
    (delivery) => !clientId || String(delivery.client_id) === clientId,
  );
  return (
    <>
      <PageHeading
        title="Confirmación de entrega"
        subtitle="Confirma lo recibido, revisa la factura y califica la atención de 1 a 5 estrellas."
      />
      <Panel title="Solicitante" accent="blue" className="filter-panel">
        <label className="customer-select">
          Usuario solicitante
          <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
            <option value="">Selecciona un cliente solicitante</option>
            {clients.map((client) => (
              <option value={client.id} key={client.id}>{client.name}</option>
            ))}
          </select>
        </label>
        <p className="panel-description">
          Entorno académico sin autenticación: selecciona el cliente del pedido para probar su confirmación.
        </p>
      </Panel>
      {clientId && (
        <Panel title="Entregas pendientes de confirmación" accent="orange" className="confirmation-list">
          {visible.length ? visible.map((delivery) => (
            <DeliveryConfirmation key={delivery.id} delivery={delivery} onConfirm={onConfirm} />
          )) : <div className="empty-row">No tienes entregas pendientes de confirmar.</div>}
        </Panel>
      )}
      {!clientId && <div className="empty-inline">Selecciona al solicitante para consultar sus entregas pendientes.</div>}
    </>
  );
}

function DeliveryConfirmation({ delivery, onConfirm }) {
  const [clientId, setClientId] = useState(String(delivery.client_id));
  const [quantities, setQuantities] = useState(() =>
    Object.fromEntries(delivery.items.map((item) => [item.product_id, item.quantity])),
  );
  const [invoiceReceived, setInvoiceReceived] = useState(false);
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState("");
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    setSaving(true);
    try {
      await onConfirm(delivery.id, {
        requester_client_id: Number(clientId),
        items: delivery.items.map((item) => ({
          product_id: item.product_id,
          received_quantity: Number(quantities[item.product_id] || 0),
        })),
        invoice_received: invoiceReceived,
        rating: rating || null,
        comments,
        observations,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="confirmation-card">
      <div className="confirmation-card-heading">
        <div>
          <strong>{delivery.order_number}</strong>
          <span>{delivery.client_name} · {delivery.area} · {delivery.site}</span>
        </div>
        <StatusBadge status="En verificación" />
      </div>
      <div className="confirmation-meta">
        <span>Seguimiento: <strong>{delivery.tracking_code}</strong></span>
        <span>Registrada: <strong>{new Date(delivery.created_at).toLocaleString("es-PE")}</strong></span>
        <span>Factura: <strong>{delivery.invoice_number || "Pendiente de emitir"}</strong></span>
      </div>
      <div className="confirmation-items">
        {delivery.items.map((item) => (
          <label key={item.product_id}>
            {item.name} · despachado {item.quantity}
            <input
              type="number"
              min="0"
              max={item.quantity}
              value={quantities[item.product_id] ?? 0}
              onChange={(event) => setQuantities((current) => ({
                ...current,
                [item.product_id]: Math.min(item.quantity, Math.max(0, Number(event.target.value))),
              }))}
            />
          </label>
        ))}
      </div>
      <div className="confirmation-controls">
        <label className="checkbox-label">
          <input type="checkbox" checked={invoiceReceived} onChange={(event) => setInvoiceReceived(event.target.checked)} />
          Confirmo que recibí la factura
        </label>
        <fieldset className="rating-fieldset">
          <legend>Calificación de atención</legend>
          <div className="rating-stars" role="radiogroup" aria-label="Calificación de 1 a 5 estrellas">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                type="button"
                key={value}
                className={value <= rating ? "star-active" : ""}
                onClick={() => setRating(value)}
                aria-label={`${value} ${value === 1 ? "estrella" : "estrellas"}`}
                aria-pressed={rating === value}
              >
                ★
              </button>
            ))}
            <span>{rating ? ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][rating] : "Selecciona de 1 a 5"}</span>
          </div>
        </fieldset>
        <label className="wide-field">Comentario (opcional)<textarea value={comments} onChange={(event) => setComments(event.target.value)} maxLength={2000} /></label>
        <label className="wide-field">Observaciones o productos no recibidos<textarea value={observations} onChange={(event) => setObservations(event.target.value)} maxLength={2000} /></label>
      </div>
      <button className="primary-button confirm-button" disabled={saving} onClick={confirm}>
        {saving ? "Guardando…" : "Confirmar entrega"}
      </button>
    </article>
  );
}

function TrackingPage({ clients, orders, notifications, initialCode, onInitialCodeHandled }) {
  const [code, setCode] = useState(initialCode);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const [clientId, setClientId] = useState("");
  const clientOrders = orders.filter(
    (item) => !clientId || String(item.client_id) === clientId,
  );

  const lookup = useCallback(async (value) => {
    const query = value.trim();
    if (!query) return;
    setSearching(true);
    setError("");
    setOrder(null);
    try {
      const found = await api(`/track/${encodeURIComponent(query)}`);
      setOrder(found);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!initialCode) return;
    setCode(initialCode);
    lookup(initialCode);
    onInitialCodeHandled("");
  }, [initialCode, lookup, onInitialCodeHandled]);

  const search = async (event) => {
    event.preventDefault();
    await lookup(code);
  };

  const statuses = ["Registrado", "Reservado", "En preparación", "En verificación", "Entrega parcial", "Entregado completamente"];
  const statusIndex = order ? Math.max(0, statuses.indexOf(order.status)) : -1;

  return (
    <>
      <section className="tracking-banner">
        <div>
          <h1>Seguimiento de pedidos</h1>
          <p>Consulte el estado y detalle de todas las líneas de un pedido.</p>
        </div>
        <form className="tracking-search" onSubmit={search}>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Código de pedido o seguimiento"
            aria-label="Código de pedido o seguimiento"
          />
          <button type="submit" disabled={searching}>{searching ? "Buscando…" : "Consultar"}</button>
        </form>
      </section>
      <Panel title="Consulta del cliente" accent="blue" className="filter-panel customer-filter">
        <label>
          Cliente
          <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
            <option value="">Todos los clientes</option>
            {clients.map((client) => (
              <option value={client.id} key={client.id}>{client.name}</option>
            ))}
          </select>
        </label>
        <p className="panel-description">Consulta rápida por cliente o ingresa un código de pedido para ver su estado.</p>
      </Panel>
      {error && <div className="inline-error" role="alert">{error}</div>}
      {!order && clientId && (
        <Panel title="Pedidos del cliente" accent="green" className="table-panel">
          {clientOrders.length ? (
            <div className="table-scroll">
              <table>
                <thead><tr><th>PEDIDO</th><th>FECHA DE ENTREGA</th><th>TOTAL</th><th>ESTADO</th><th /></tr></thead>
                <tbody>
                  {clientOrders.map((item) => (
                    <tr key={item.id}>
                      <td className="order-code">{item.order_number}</td>
                      <td>{item.delivery_date}</td>
                      <td>{CURRENCY.format(item.total)}</td>
                      <td><StatusBadge status={item.status} /></td>
                      <td><button className="table-action" onClick={() => { setOrder(item); setCode(item.order_number); }}>Ver pedido</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty-row">Este cliente todavía no tiene pedidos.</div>}
        </Panel>
      )}
      {order && (
        (!clientId || String(order.client_id) === clientId) ? (
          <div className="tracking-result-layout">
            <TrackingResult order={order} statusIndex={statusIndex} />
            <TrackingNotificationPanel
              orderNumber={order.order_number}
              notifications={notifications.filter((item) => item.order_number === order.order_number)}
            />
          </div>
        ) : (
          <div className="inline-error" role="alert">El pedido no corresponde al cliente seleccionado.</div>
        )
      )}
    </>
  );
}

function TrackingResult({ order, statusIndex }) {
  const milestones = ["Registrado", "Reservado", "En preparación", "En verificación", "Entrega parcial", "Entregado completamente"];
  return (
    <Panel title={`Pedido ${order.order_number}`} accent="green" className="tracking-result">
      <div className="tracking-meta">
        <div><span>CLIENTE</span><strong>{order.client_name}</strong></div>
        <div><span>CANAL</span><strong>{order.channel}</strong></div>
        <div><span>ENTREGA</span><strong>{order.delivery_date}</strong></div>
        <div><span>TOTAL</span><strong>{CURRENCY.format(order.total)}</strong></div>
        <div><span>SEGUIMIENTO</span><strong>{order.tracking_code || "Pendiente de despacho"}</strong></div>
      </div>
      <div className="timeline">
        {milestones.map((status, index) => (
          <div className={`timeline-step ${index <= statusIndex ? "completed" : ""} ${index === statusIndex ? "current" : ""}`} key={status}>
            <span>{index < statusIndex ? "✓" : index + 1}</span>
            <strong>{status}</strong>
          </div>
        ))}
      </div>
      <div className="table-scroll tracking-items">
        <table>
          <thead><tr><th>PRODUCTO</th><th>SKU</th><th>CANTIDAD</th><th>SUBTOTAL</th></tr></thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.sku}><td>{item.name}</td><td>{item.sku}</td><td>{item.quantity}</td><td>{CURRENCY.format(item.subtotal)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {order.events?.length > 0 && (
        <div className="order-history">
          <strong>Historial de movimientos</strong>
          {order.events.map((event, index) => (
            <div className="history-row" key={`${event.created_at}-${index}`}>
              <span>{new Date(event.created_at).toLocaleString("es-PE")}</span>
              <div><StatusBadge status={event.new_status} /><span>{event.description}</span></div>
              <small>Responsable: {event.actor}</small>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function TrackingNotificationPanel({ orderNumber, notifications }) {
  const orderedNotifications = [...notifications].sort(
    (first, second) => new Date(first.created_at) - new Date(second.created_at),
  );
  return (
    <Panel title="Notificaciones" accent="blue" className="tracking-notifications">
      {orderedNotifications.length ? (
        <div className="tracking-notification-list">
          {orderedNotifications.map((notification) => (
            <article className="tracking-notification" key={notification.id}>
              <strong>{notificationCode(notification)}</strong>
              <p>{notification.message}</p>
              <time dateTime={notification.created_at}>
                {new Date(notification.created_at).toLocaleString("es-PE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </article>
          ))}
        </div>
      ) : (
        <p className="tracking-notification-empty">
          No hay notificaciones para el pedido {orderNumber}.
        </p>
      )}
    </Panel>
  );
}

function NotificationsPage({ notifications, onReadAll }) {
  const [recipient, setRecipient] = useState("Todas");
  const recipients = ["Todas", ...new Set(notifications.map((item) => item.recipient))];
  const visible = notifications.filter(
    (item) => recipient === "Todas" || item.recipient === recipient,
  );
  return (
    <>
      <PageHeading
        title="Centro de notificaciones"
        subtitle="Historial completo de alertas y comunicaciones de pedidos."
        action={<button className="secondary-button" onClick={onReadAll}>Marcar todas leídas</button>}
      />
      <Panel title="Notificaciones" accent="blue" className="table-panel">
        <div className="table-tools">
          <label className="filter-select">
            Destinatario
            <select value={recipient} onChange={(event) => setRecipient(event.target.value)}>
              {recipients.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
        </div>
        {visible.length ? (
          <div className="table-scroll">
            <table>
              <thead><tr><th>PRIORIDAD</th><th>ESTADO</th><th>NOTIFICACIÓN</th><th>DESTINATARIO</th><th>PEDIDO</th><th>FECHA</th></tr></thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id}>
                    <td><span className={`severity-badge severity-${item.severity || "azul"}`}>{item.severity || "azul"}</span></td>
                    <td><span className={`read-indicator ${item.is_read ? "read" : ""}`}>{item.is_read ? "Leída" : "Nueva"}</span></td>
                    <td>{item.message}{item.missing_quantity > 0 && <span className="sub-cell">Solicitado {item.requested_quantity} · Disponible {item.available_stock} · Faltante {item.missing_quantity}</span>}</td>
                    <td>{item.recipient}</td>
                    <td className="order-code">{item.order_number || "—"}</td>
                    <td>{new Date(item.created_at).toLocaleString("es-PE")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty-row">No hay notificaciones para este filtro.</div>}
      </Panel>
    </>
  );
}

export default App;
