/**
 * F1 Live Control Card (f1-live-control-card)
 * Version: 2.0.0
 * 
 * Custom Lovelace Card for Formula 1 Live TV Session Synchronisation & Delay Calibration.
 * Unified with the Nicxe/f1_sensor Weekend Hub card design architecture:
 * - Shared .wh-shell triple-gradient carbon chassis & 4px red left indicator stripe
 * - Authentic Formula 1 Display typography with responsive clamp scaling
 * - Mobile container queries (@container max-width: 680px) for seamless pitwall & phone viewports
 * - Standardized status pill badge (.wh-live-badge) with exact Weekend Hub success tokens & solid glowing dot
 * Includes companion F1ModeToggleCard (custom:f1-mode-toggle-card) for seamless Live / Replay session switching.
 */

// Automated font loader matching Nicxe/f1_sensor
async function ensureF1Fonts() {
  if (typeof window === 'undefined') return;
  if (window._f1FontsLoaded || document.querySelector('style[data-f1-fonts]')) {
    window._f1FontsLoaded = true;
    return;
  }
  try {
    const res = await fetch('/local/f1-sensor-live-data-card/f1-sensor-live-data-card.js');
    if (res.ok) {
      const txt = await res.text();
      const fontIdx = txt.indexOf('@font-face');
      const endIdx = txt.indexOf('`;', fontIdx);
      if (fontIdx !== -1 && endIdx !== -1) {
        const fontCss = txt.substring(fontIdx, endIdx);
        const style = document.createElement('style');
        style.setAttribute('data-f1-fonts', 'true');
        style.textContent = fontCss;
        document.head.appendChild(style);
        window._f1FontsLoaded = true;
      }
    }
  } catch (e) {
    // Gracefully fallback to system fonts
  }

  if (!document.querySelector('link[href*="Barlow+Condensed"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,800;0,900&display=swap';
    document.head.appendChild(link);
  }
}
ensureF1Fonts();

class F1LiveControlCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static getConfigElement() {
    return document.createElement('f1-live-control-card-editor');
  }

  static getStubConfig() {
    return {
      kicker: 'SESSION TELEMETRY SYNC',
      title: 'LIVE TV SYNCHRONISATION',
      subtitle: 'DELAY CALIBRATION & OFFSET',
      delay_entity: 'number.f1_live_delay',
      calibration_entity: 'switch.f1_delay_calibration',
      match_button_entity: 'button.f1_match_live_delay',
      reference_entity: 'select.f1_live_delay_reference',
    };
  }

  setConfig(config) {
    this._config = Object.assign({
      kicker: 'SESSION TELEMETRY SYNC',
      title: 'LIVE TV SYNCHRONISATION',
      subtitle: 'DELAY CALIBRATION & OFFSET',
      delay_entity: 'number.f1_live_delay',
      calibration_entity: 'switch.f1_delay_calibration',
      match_button_entity: 'button.f1_match_live_delay',
      reference_entity: 'select.f1_live_delay_reference',
    }, config || {});

    ensureF1Fonts();
    this._renderBase();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateContent();
  }

  _renderBase() {
    const style = `
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
        font-family: var(--f1-card-body-font-family, 'Formula1 Display', sans-serif);

        /* Nicxe/f1_sensor Weekend Hub Theme Tokens */
        --f1-card-bg: #0b0b0d;
        --f1-card-bg-soft: #131315;
        --f1-card-bg-end: #0a0a0a;
        --f1-card-text: #f5f5f5;
        --f1-card-muted: rgba(255, 255, 255, 0.65);
        --f1-card-soft: rgba(255, 255, 255, 0.42);
        --f1-card-border: rgba(255, 255, 255, 0.08);
        --f1-card-divider: rgba(255, 255, 255, 0.08);
        --f1-card-divider-strong: rgba(255, 255, 255, 0.12);
        --f1-card-chip: rgba(255, 255, 255, 0.06);
        --f1-card-panel: rgba(255, 255, 255, 0.04);
        --f1-card-panel-soft: rgba(255, 255, 255, 0.025);
        --f1-card-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
        --f1-card-display-font-family: 'Formula1 Display', sans-serif;
        --f1-card-body-font-family: 'Formula1 Display', sans-serif;
        --f1-card-label-font-family: 'Formula1 Display', sans-serif;

        --f1-marker-red: #ff3b30;
        --f1-marker-yellow: #ffd60a;
        --f1-marker-green: #34c759;
        --f1-marker-blue: #0a84ff;
        --f1-marker-purple: #8b5cf6;
        --f1-marker-orange: #ff9500;

        --f1-status-info: #38bdf8;
        --f1-status-info-text: #bfdbfe;
        --f1-status-info-bg: rgba(59, 130, 246, 0.14);
        --f1-status-info-border: rgba(96, 165, 250, 0.28);
        --f1-status-warning: #f59e0b;
        --f1-status-warning-text: #fde68a;
        --f1-status-warning-bg: rgba(251, 191, 36, 0.10);
        --f1-status-warning-border: rgba(251, 191, 36, 0.24);
        --f1-status-success: #34c759;
        --f1-status-success-text: #86efac;
        --f1-status-success-bg: rgba(52, 199, 89, 0.16);
        --f1-status-success-border: rgba(52, 199, 89, 0.34);
        --f1-status-danger: #ff3b30;
        --f1-status-danger-text: #fca5a5;
        --f1-status-danger-bg: rgba(255, 59, 48, 0.14);
        --f1-status-danger-border: rgba(255, 59, 48, 0.32);
      }

      * {
        box-sizing: border-box;
      }

      ha-card {
        padding: 0;
        background: transparent;
        border: 0;
        box-shadow: none;
      }

      /* Authentic Weekend Hub Outer Shell (.wh-shell) */
      .wh-shell {
        position: relative;
        overflow: hidden;
        border: 1px solid var(--f1-card-border);
        border-radius: var(--ha-card-border-radius, 12px);
        background:
          linear-gradient(110deg, transparent 0 47%, var(--f1-card-panel-soft) 47% 48%, transparent 48% 100%),
          radial-gradient(circle at 93% -8%, rgba(255, 59, 48, 0.22), transparent 38%),
          linear-gradient(155deg, var(--f1-card-bg) 0%, var(--f1-card-bg-soft) 68%, var(--f1-card-bg-end) 100%);
        box-shadow: var(--f1-card-shadow);
        color: var(--f1-card-text);
        container-type: inline-size;
      }

      .wh-shell::before {
        content: '';
        position: absolute;
        inset: 0 auto 0 0;
        width: 4px;
        background: var(--f1-marker-red);
        z-index: 5;
      }

      /* Weekend Hub Header Architecture (.wh-header) */
      .wh-header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: start;
        gap: 16px;
        padding: clamp(14px, 2.5vw, 22px) clamp(16px, 3.2vw, 28px) 14px;
        border-bottom: 1px solid var(--f1-card-divider);
      }

      .wh-title-wrap {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .wh-kicker {
        color: var(--f1-marker-red);
        font-family: var(--f1-card-label-font-family, 'Formula1 Display', sans-serif);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.2em;
        text-transform: uppercase;
      }

      .wh-title {
        margin: 5px 0 2px;
        font-family: var(--f1-card-display-font-family, 'Formula1 Display', sans-serif);
        font-size: clamp(20px, 3.2vw, 32px);
        font-weight: 800;
        letter-spacing: -0.02em;
        line-height: 1;
        text-transform: uppercase;
        color: var(--f1-card-text);
      }

      .wh-subtitle {
        color: var(--f1-card-muted);
        font-family: var(--f1-card-body-font-family, 'Formula1 Display', sans-serif);
        font-size: 11px;
        line-height: 1.4;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .wh-subtitle:empty,
      .wh-kicker:empty {
        display: none;
      }

      /* Standardized Weekend Hub Status Badge (.wh-live-badge) */
      .wh-live-badge {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-height: 26px;
        padding: 0 10px;
        border: 1px solid var(--f1-card-divider-strong);
        border-radius: 999px;
        background: var(--f1-card-chip);
        color: var(--f1-card-muted);
        font-family: var(--f1-card-display-font-family, 'Formula1 Display', sans-serif);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .wh-live-badge.live {
        color: var(--f1-status-success-text);
        background: var(--f1-status-success-bg);
        border-color: var(--f1-status-success-border);
      }

      .wh-live-badge.calibrating {
        color: var(--f1-status-warning-text);
        background: var(--f1-status-warning-bg);
        border-color: var(--f1-status-warning-border);
      }

      .wh-live-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 10px currentColor;
        flex-shrink: 0;
      }

      /* Container Query Mobile Adaptation */
      @container (max-width: 680px) {
        .wh-header {
          grid-template-columns: 1fr;
          gap: 10px;
          padding: 14px 16px 12px;
        }
        .wh-live-badge {
          align-self: flex-start;
        }
        .wh-title {
          font-size: 22px;
        }
      }

      .wh-body {
        padding: clamp(14px, 2.5vw, 20px) clamp(16px, 3.2vw, 24px);
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .delay-hero {
        background: var(--f1-card-panel);
        border: 1px solid var(--f1-card-divider);
        border-radius: 10px;
        padding: 14px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .delay-value-box {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .delay-label {
        font-family: var(--f1-card-label-font-family, 'Formula1 Display', sans-serif);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--f1-card-muted);
        font-weight: 800;
      }

      .delay-number {
        font-family: var(--f1-card-display-font-family, 'Formula1 Display', sans-serif);
        font-size: 2.2rem;
        font-weight: 800;
        color: #fff;
        line-height: 1;
        letter-spacing: -0.02em;
        font-feature-settings: 'tnum';
      }

      .delay-unit {
        font-family: var(--f1-card-display-font-family, 'Formula1 Display', sans-serif);
        font-size: 1.1rem;
        font-weight: 800;
        color: var(--f1-marker-red);
        margin-left: 4px;
      }

      .nudge-group {
        display: flex;
        gap: 6px;
      }

      .nudge-btn {
        background: var(--f1-card-chip);
        border: 1px solid var(--f1-card-divider-strong);
        color: var(--f1-card-text);
        font-family: var(--f1-card-display-font-family, 'Formula1 Display', sans-serif);
        font-weight: 800;
        font-size: 11px;
        letter-spacing: 0.05em;
        padding: 6px 12px;
        border-radius: 999px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .nudge-btn:hover {
        background: color-mix(in srgb, var(--f1-marker-red) 20%, transparent);
        border-color: color-mix(in srgb, var(--f1-marker-red) 60%, transparent);
        color: #fff;
        transform: translateY(-1px);
      }

      .nudge-btn:active {
        transform: translateY(1px);
      }

      .controls-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      @container (max-width: 480px) {
        .controls-grid {
          grid-template-columns: 1fr;
        }
      }

      .action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 16px;
        border-radius: 999px;
        font-family: var(--f1-card-display-font-family, 'Formula1 Display', sans-serif);
        font-weight: 800;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        outline: none;
      }

      .btn-calibrate {
        background: var(--f1-status-info-bg);
        color: var(--f1-status-info-text);
        border: 1px solid var(--f1-status-info-border);
      }

      .btn-calibrate.active {
        background: var(--f1-status-warning-bg);
        color: var(--f1-status-warning-text);
        border: 1px solid var(--f1-status-warning-border);
      }

      .btn-calibrate:hover {
        filter: brightness(1.15);
        transform: translateY(-1px);
      }

      .btn-match {
        background: var(--f1-marker-red);
        color: #ffffff;
        border: 1px solid color-mix(in srgb, var(--f1-marker-red) 60%, transparent);
        box-shadow: 0 4px 14px rgba(255, 59, 48, 0.35);
      }

      .btn-match:hover {
        background: #ff5247;
        box-shadow: 0 6px 18px rgba(255, 59, 48, 0.5);
        transform: translateY(-1px);
      }

      .btn-match:active {
        transform: translateY(1px);
      }

      .reference-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: var(--f1-card-panel);
        border: 1px solid var(--f1-card-divider);
        border-radius: 10px;
      }

      .reference-label {
        font-family: var(--f1-card-label-font-family, 'Formula1 Display', sans-serif);
        font-size: 10px;
        color: var(--f1-card-muted);
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      .reference-select {
        background: var(--f1-card-bg-soft);
        color: var(--f1-card-text);
        border: 1px solid var(--f1-card-divider-strong);
        border-radius: 999px;
        padding: 5px 14px;
        font-family: var(--f1-card-display-font-family, 'Formula1 Display', sans-serif);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        outline: none;
        cursor: pointer;
      }
    `;

    this.shadowRoot.innerHTML = `
      <style>${style}</style>
      <ha-card>
        <div class="wh-shell">
          <div class="wh-header">
            <div class="wh-title-wrap">
              <div class="wh-kicker" id="kicker">${this._config.kicker || ''}</div>
              <div class="wh-title" id="title">${this._config.title || 'LIVE TV SYNCHRONISATION'}</div>
              <div class="wh-subtitle" id="subtitle">${this._config.subtitle || ''}</div>
            </div>
            <div class="wh-live-badge live" id="status-pill">
              <span class="wh-live-dot"></span>
              <span id="status-text">LIVE SYNC</span>
            </div>
          </div>

          <div class="wh-body">
            <div class="delay-hero">
              <div class="delay-value-box">
                <span class="delay-label">Current Broadcast Delay</span>
                <div class="delay-number">
                  <span id="delay-num">--</span><span class="delay-unit">s</span>
                </div>
              </div>
              <div class="nudge-group">
                <button class="nudge-btn" data-delta="-5">-5s</button>
                <button class="nudge-btn" data-delta="-1">-1s</button>
                <button class="nudge-btn" data-delta="1">+1s</button>
                <button class="nudge-btn" data-delta="5">+5s</button>
              </div>
            </div>

            <div class="controls-grid">
              <button class="action-btn btn-calibrate" id="btn-calibrate">
                <span>⏱️</span>
                <span id="calibrate-text">Start Calibration</span>
              </button>
              <button class="action-btn btn-match" id="btn-match">
                <span>🔒</span>
                <span>Match Delay (TV Now)</span>
              </button>
            </div>

            <div class="reference-row">
              <span class="reference-label">Reference Mode</span>
              <select class="reference-select" id="reference-select">
                <option value="Session live">Session live</option>
              </select>
            </div>
          </div>
        </div>
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll('.nudge-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = parseFloat(btn.dataset.delta);
        this._adjustDelay(delta);
      });
    });

    this.shadowRoot.getElementById('btn-calibrate').addEventListener('click', () => {
      this._toggleCalibration();
    });

    this.shadowRoot.getElementById('btn-match').addEventListener('click', () => {
      this._matchDelay();
    });

    this.shadowRoot.getElementById('reference-select').addEventListener('change', (e) => {
      this._setReference(e.target.value);
    });
  }

  _adjustDelay(delta) {
    if (!this._hass) return;
    const entity = this._hass.states[this._config.delay_entity];
    const current = entity ? parseFloat(entity.state) || 0 : 0;
    const target = Math.max(0, Math.round((current + delta) * 10) / 10);
    this._hass.callService('number', 'set_value', {
      entity_id: this._config.delay_entity,
      value: target,
    });
  }

  _toggleCalibration() {
    if (!this._hass) return;
    this._hass.callService('switch', 'toggle', {
      entity_id: this._config.calibration_entity,
    });
  }

  _matchDelay() {
    if (!this._hass) return;
    this._hass.callService('button', 'press', {
      entity_id: this._config.match_button_entity,
    });
  }

  _setReference(option) {
    if (!this._hass) return;
    this._hass.callService('select', 'select_option', {
      entity_id: this._config.reference_entity,
      option: option,
    });
  }

  _updateContent() {
    if (!this._hass || !this.shadowRoot) return;

    const delayState = this._hass.states[this._config.delay_entity];
    const delayEl = this.shadowRoot.getElementById('delay-num');
    if (delayEl && delayState) {
      delayEl.textContent = delayState.state;
    }

    const calState = this._hass.states[this._config.calibration_entity];
    const calBtn = this.shadowRoot.getElementById('btn-calibrate');
    const calText = this.shadowRoot.getElementById('calibrate-text');
    const statusPill = this.shadowRoot.getElementById('status-pill');
    const statusText = this.shadowRoot.getElementById('status-text');

    const isActive = calState && calState.state === 'on';

    if (calBtn) {
      calBtn.className = 'action-btn btn-calibrate' + (isActive ? ' active' : '');
      if (calText) {
        calText.textContent = isActive ? 'Calibration Active (Stop)' : 'Start Calibration';
      }
    }

    if (statusPill && statusText) {
      if (isActive) {
        statusPill.className = 'wh-live-badge calibrating';
        statusText.textContent = 'CALIBRATING';
      } else {
        statusPill.className = 'wh-live-badge live';
        statusText.textContent = 'LIVE SYNC';
      }
    }

    const refState = this._hass.states[this._config.reference_entity];
    const refSelect = this.shadowRoot.getElementById('reference-select');
    if (refSelect && refState && refState.attributes && refState.attributes.options) {
      const opts = refState.attributes.options;
      const current = refState.state;
      refSelect.innerHTML = opts.map(o => `<option value="${o}" ${o === current ? 'selected' : ''}>${o}</option>`).join('');
    }
  }

  getCardSize() {
    return 3;
  }
}

class F1LiveControlCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = Object.assign({}, config);
    if (!this._rendered) {
      this._renderBase();
      this._rendered = true;
    } else {
      this._updateContent();
    }
  }

  _isFocused(element) {
    if (!element) return false;
    try {
      if (element.matches && element.matches(':focus')) return true;
      if (document.activeElement === element) return true;
      const root = element.getRootNode();
      if (root && root.activeElement === element) return true;
    } catch (e) {}
    return false;
  }

  _updateContent() {
    if (!this._config) return;
    const fields = ['kicker', 'title', 'subtitle', 'delay_entity', 'calibration_entity', 'match_button_entity', 'reference_entity'];
    fields.forEach(id => {
      const el = this.querySelector(`#${id}`);
      if (el && !this._isFocused(el)) {
        const val = this._config[id] ?? '';
        if (el.value !== String(val)) {
          el.value = val;
        }
      }
    });
  }

  _renderBase() {
    this.innerHTML = `
      <style>
        .card-config {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 8px 0;
          font-family: var(--paper-font-body1_-_font-family, sans-serif);
        }
        .form-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-row label {
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--secondary-text-color, #94a3b8);
        }
        .form-row input {
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid var(--divider-color, rgba(255,255,255,0.15));
          background: var(--card-background-color, #1a1a24);
          color: var(--primary-text-color, #fff);
          outline: none;
        }
        .form-row input:focus {
          border-color: #ff3b30;
        }
      </style>
      <div class="card-config">
        <div class="form-row">
          <label for="kicker">Header Kicker</label>
          <input type="text" id="kicker" value="${this._config.kicker || ''}" placeholder="SESSION TELEMETRY SYNC">
        </div>
        <div class="form-row">
          <label for="title">Title</label>
          <input type="text" id="title" value="${this._config.title || 'Live TV Synchronisation'}">
        </div>
        <div class="form-row">
          <label for="subtitle">Subtitle</label>
          <input type="text" id="subtitle" value="${this._config.subtitle || ''}" placeholder="DELAY CALIBRATION & OFFSET">
        </div>
        <div class="form-row">
          <label for="delay_entity">Delay Number Entity</label>
          <input type="text" id="delay_entity" value="${this._config.delay_entity || 'number.f1_live_delay'}">
        </div>
        <div class="form-row">
          <label for="calibration_entity">Calibration Switch Entity</label>
          <input type="text" id="calibration_entity" value="${this._config.calibration_entity || 'switch.f1_delay_calibration'}">
        </div>
        <div class="form-row">
          <label for="match_button_entity">Match Button Entity</label>
          <input type="text" id="match_button_entity" value="${this._config.match_button_entity || 'button.f1_match_live_delay'}">
        </div>
        <div class="form-row">
          <label for="reference_entity">Reference Select Entity</label>
          <input type="text" id="reference_entity" value="${this._config.reference_entity || 'select.f1_live_delay_reference'}">
        </div>
      </div>
    `;

    this.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', () => this._valueChanged());
      inp.addEventListener('change', () => this._valueChanged());
    });
  }

  _valueChanged() {
    if (!this._config) return;
    const newConfig = Object.assign({}, this._config, {
      kicker: this.querySelector('#kicker')?.value ?? '',
      title: this.querySelector('#title')?.value ?? '',
      subtitle: this.querySelector('#subtitle')?.value ?? '',
      delay_entity: this.querySelector('#delay_entity')?.value ?? 'number.f1_live_delay',
      calibration_entity: this.querySelector('#calibration_entity')?.value ?? 'switch.f1_delay_calibration',
      match_button_entity: this.querySelector('#match_button_entity')?.value ?? 'button.f1_match_live_delay',
      reference_entity: this.querySelector('#reference_entity')?.value ?? 'select.f1_live_delay_reference',
    });
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    }));
  }
}

/**
 * F1 Session Mode Toggle Card (f1-mode-toggle-card)
 * Companion 2-way segmented pill button to switch between LIVE SESSION and REPLAY MODE.
 */
class F1ModeToggleCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static getConfigElement() {
    return document.createElement('f1-mode-toggle-card-editor');
  }

  static getStubConfig() {
    return {
      entity: 'input_boolean.f1_replay_mode',
      status_entity: 'sensor.f1_replay_status',
    };
  }

  setConfig(config) {
    this._config = Object.assign({
      entity: 'input_boolean.f1_replay_mode',
      status_entity: 'sensor.f1_replay_status',
      live_label: 'LIVE SESSION',
      replay_label: 'REPLAY MODE',
    }, config || {});
    this._renderBase();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateContent();
  }

  _renderBase() {
    const style = `
      :host {
        display: block;
        font-family: 'Formula1 Wide', 'Formula1 Display', sans-serif !important;
      }
      ha-card {
        height: 44px;
        border-radius: 12px;
        background:
          radial-gradient(circle at 14% 10%, rgba(255, 255, 255, 0.04), transparent 44%),
          linear-gradient(160deg, #0b0b0d 0%, #131315 58%, #0a0a0a 100%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-left: 3px solid #ff3b30;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        padding: 4px 6px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        align-items: center;
        gap: 4px;
        cursor: pointer;
        user-select: none;
        transition: all 0.25s ease;
        box-sizing: border-box;
        overflow: hidden;
      }
      ha-card.replay-active {
        border-left: 3px solid #34c759;
      }
      .pill {
        text-align: center;
        padding: 4px 6px;
        border-radius: 999px;
        font-family: 'Formula1 Display', 'Formula1 Wide', sans-serif !important;
        font-weight: 700;
        font-size: 9.5px;
        letter-spacing: 0.02em;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-transform: uppercase;
        white-space: nowrap !important;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: all 0.25s ease;
        color: #64748b;
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.06);
        min-width: 0;
        line-height: 1.1;
      }
      .pill span {
        white-space: nowrap !important;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .pill.active {
        color: #ffffff;
      }
      .pill.active.live {
        color: #ff3b30;
        background: color-mix(in srgb, #ff3b30 14%, transparent);
        border: 1px solid color-mix(in srgb, #ff3b30 46%, transparent);
      }
      .pill.active.replay {
        color: #86efac;
        background: rgba(52, 199, 89, 0.16);
        border: 1px solid rgba(52, 199, 89, 0.34);
      }
      .pill.active.replay.seeking {
        color: #ff9500;
        background: color-mix(in srgb, #ff9500 14%, transparent);
        border: 1px solid color-mix(in srgb, #ff9500 46%, transparent);
      }
      .pill.active.replay.paused {
        color: #f59e0b;
        background: color-mix(in srgb, #f59e0b 14%, transparent);
        border: 1px solid color-mix(in srgb, #f59e0b 46%, transparent);
      }
      .pulse-dot {
        display: inline-block;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 6px currentColor;
        margin-right: 4px;
        flex-shrink: 0;
      }
      .divider {
        width: 1px;
        height: 18px;
        background: rgba(255, 255, 255, 0.08);
        margin: 0 2px;
        flex-shrink: 0;
      }
    `;

    this.shadowRoot.innerHTML = `
      <style>${style}</style>
      <ha-card id="card">
        <div class="pill active live" id="live-pill">
          <span class="pulse-dot" id="live-dot"></span>
          <span>${this._config.live_label}</span>
        </div>
        <div class="divider"></div>
        <div class="pill" id="replay-pill">
          <span class="pulse-dot" id="replay-dot" style="display:none;"></span>
          <span id="replay-text">${this._config.replay_label}</span>
        </div>
      </ha-card>
    `;

    this.shadowRoot.getElementById('live-pill').addEventListener('click', (e) => {
      e.stopPropagation();
      this._setReplayMode(false);
    });

    this.shadowRoot.getElementById('replay-pill').addEventListener('click', (e) => {
      e.stopPropagation();
      this._setReplayMode(true);
    });

    this.shadowRoot.getElementById('card').addEventListener('click', () => {
      this._toggleMode();
    });
  }

  _setReplayMode(enableReplay) {
    if (!this._hass || !this._config.entity) return;
    const service = enableReplay ? 'turn_on' : 'turn_off';
    const domain = this._config.entity.split('.')[0] || 'input_boolean';
    this._hass.callService(domain, service, {
      entity_id: this._config.entity,
    });
  }

  _toggleMode() {
    if (!this._hass || !this._config.entity) return;
    const domain = this._config.entity.split('.')[0] || 'input_boolean';
    this._hass.callService(domain, 'toggle', {
      entity_id: this._config.entity,
    });
  }

  _updateContent() {
    if (!this._hass || !this.shadowRoot) return;
    const entity = this._hass.states[this._config.entity];
    const isReplay = entity && ['on', 'true', 'active'].includes(String(entity.state).toLowerCase());

    const statusEntity = this._hass.states[this._config.status_entity];
    const rStatus = statusEntity ? String(statusEntity.state).toLowerCase() : '';
    const isSeeking = rStatus === 'seeking' || rStatus === 'loading';
    const isPaused = rStatus === 'paused';

    const card = this.shadowRoot.getElementById('card');
    const livePill = this.shadowRoot.getElementById('live-pill');
    const replayPill = this.shadowRoot.getElementById('replay-pill');
    const liveDot = this.shadowRoot.getElementById('live-dot');
    const replayDot = this.shadowRoot.getElementById('replay-dot');
    const replayText = this.shadowRoot.getElementById('replay-text');

    if (card) {
      if (isReplay) {
        card.classList.add('replay-active');
      } else {
        card.classList.remove('replay-active');
      }
    }

    if (livePill && liveDot) {
      if (isReplay) {
        livePill.className = 'pill';
        liveDot.style.display = 'none';
      } else {
        livePill.className = 'pill active live';
        liveDot.style.display = 'inline-block';
      }
    }

    if (replayPill && replayText && replayDot) {
      if (!isReplay) {
        replayPill.className = 'pill';
        replayDot.style.display = 'none';
        replayText.textContent = this._config.replay_label;
      } else {
        if (isSeeking) {
          replayPill.className = 'pill active replay seeking';
          replayDot.style.display = 'inline-block';
          replayText.textContent = '[SEEKING]';
        } else if (isPaused) {
          replayPill.className = 'pill active replay paused';
          replayDot.style.display = 'none';
          replayText.textContent = '[REPLAY PAUSED]';
        } else {
          replayPill.className = 'pill active replay';
          replayDot.style.display = 'inline-block';
          replayText.textContent = this._config.replay_label;
        }
      }
    }
  }

  getCardSize() {
    return 1;
  }
}

class F1ModeToggleCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = Object.assign({}, config);
    if (!this._rendered) {
      this._renderBase();
      this._rendered = true;
    } else {
      this._updateContent();
    }
  }

  _isFocused(element) {
    if (!element) return false;
    try {
      if (element.matches && element.matches(':focus')) return true;
      if (document.activeElement === element) return true;
      const root = element.getRootNode();
      if (root && root.activeElement === element) return true;
    } catch (e) {}
    return false;
  }

  _updateContent() {
    if (!this._config) return;
    const fields = ['entity', 'status_entity', 'live_label', 'replay_label'];
    fields.forEach(id => {
      const el = this.querySelector(`#${id}`);
      if (el && !this._isFocused(el)) {
        const val = this._config[id] ?? '';
        if (el.value !== String(val)) {
          el.value = val;
        }
      }
    });
  }

  _renderBase() {
    this.innerHTML = `
      <style>
        .card-config {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 8px 0;
          font-family: var(--paper-font-body1_-_font-family, sans-serif);
        }
        .form-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-row label {
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--secondary-text-color, #94a3b8);
        }
        .form-row input {
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid var(--divider-color, rgba(255,255,255,0.15));
          background: var(--card-background-color, #1a1a24);
          color: var(--primary-text-color, #fff);
          outline: none;
        }
        .form-row input:focus {
          border-color: #ff3b30;
        }
      </style>
      <div class="card-config">
        <div class="form-row">
          <label for="entity">Replay Mode Entity (input_boolean)</label>
          <input type="text" id="entity" value="${this._config.entity || 'input_boolean.f1_replay_mode'}">
        </div>
        <div class="form-row">
          <label for="status_entity">Replay Status Sensor</label>
          <input type="text" id="status_entity" value="${this._config.status_entity || 'sensor.f1_replay_status'}">
        </div>
        <div class="form-row">
          <label for="live_label">Live Button Label</label>
          <input type="text" id="live_label" value="${this._config.live_label || 'LIVE SESSION'}">
        </div>
        <div class="form-row">
          <label for="replay_label">Replay Button Label</label>
          <input type="text" id="replay_label" value="${this._config.replay_label || 'REPLAY MODE'}">
        </div>
      </div>
    `;

    this.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', () => this._valueChanged());
      inp.addEventListener('change', () => this._valueChanged());
    });
  }

  _valueChanged() {
    if (!this._config) return;
    const newConfig = Object.assign({}, this._config, {
      entity: this.querySelector('#entity')?.value ?? 'input_boolean.f1_replay_mode',
      status_entity: this.querySelector('#status_entity')?.value ?? 'sensor.f1_replay_status',
      live_label: this.querySelector('#live_label')?.value ?? 'LIVE SESSION',
      replay_label: this.querySelector('#replay_label')?.value ?? 'REPLAY MODE',
    });
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    }));
  }
}

if (!customElements.get('f1-live-control-card-editor')) {
  customElements.define('f1-live-control-card-editor', F1LiveControlCardEditor);
}

if (!customElements.get('f1-live-control-card')) {
  customElements.define('f1-live-control-card', F1LiveControlCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'f1-live-control-card',
    name: 'F1 Live Control & Synchronisation Card',
    description: 'Live broadcast session synchronisation and delay calibration deck with Weekend Hub styling',
    preview: true,
  });
  console.info(
    '%c F1-LIVE-CONTROL-CARD %c v2.0.0 ',
    'color: white; background: #e10600; font-weight: 700;',
    'color: #040711; background: #38bdf8; font-weight: 700;'
  );
}

if (!customElements.get('f1-mode-toggle-card-editor')) {
  customElements.define('f1-mode-toggle-card-editor', F1ModeToggleCardEditor);
}

if (!customElements.get('f1-mode-toggle-card')) {
  customElements.define('f1-mode-toggle-card', F1ModeToggleCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'f1-mode-toggle-card',
    name: 'F1 Session Mode Toggle Card',
    description: 'Segmented capsule button switching between Live Session and Replay Mode with telemetry indicator',
    preview: true,
  });
  console.info(
    '%c F1-MODE-TOGGLE-CARD %c v2.0.0 ',
    'color: white; background: #e10600; font-weight: 700;',
    'color: #040711; background: #86efac; font-weight: 700;'
  );
}
