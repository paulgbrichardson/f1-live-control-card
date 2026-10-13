/**
 * F1 Live Control Card (f1-live-control-card)
 * Version: 2.1.2
 * 
 * Custom Lovelace Card for Formula 1 Live TV Session Synchronisation & Delay Calibration.
 * Exact Match to Nicxe/f1_sensor Replay Control Card (F1ReplayControlCard):
 * - Unified carbon chassis (.rc-card) with subtle red top-edge gradient
 * - Typography matching Replay Card (.rc-header, .rc-title 14px 600 weight, .rc-subtitle 11px)
 * - Standardized replay status pill badge (.rc-status-pill) with official color tokens, live pulse, and <ha-icon>
 * - Authentic Replay Card action buttons (.rc-button): 36px height, 8px radius, 10px bold uppercase, <ha-icon> 17px
 * - Dedicated Delay Hero Panel (.rc-status-details) with discrete nudge buttons (.rc-button.nudge-btn)
 * - Authentic Reference dropdown (.rc-select-field, .rc-field-label, .rc-select-wrap)
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
    let res = await fetch('/local/f1-sensor-live-data-card/f1-sensor-live-data-card.js');
    if (!res.ok) {
      res = await fetch('/hacsfiles/f1-sensor-live-data-card/f1-sensor-live-data-card.js');
    }
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
        return;
      }
    }
  } catch (e) {
    // Gracefully fallback to system fonts
  }

  const fontUrl = '/local/f1-sensor-live-data-card/fonts/barlow-condensed-latin-700-normal.woff2';
  const hacsFontUrl = '/hacsfiles/f1-sensor-live-data-card/fonts/barlow-condensed-latin-700-normal.woff2';
  const fallbackStyle = document.createElement('style');
  fallbackStyle.setAttribute('data-f1-fonts', 'true');
  fallbackStyle.textContent = `
    @font-face {
      font-family: 'F1 Barlow Condensed';
      src: url('${fontUrl}') format('woff2'), url('${hacsFontUrl}') format('woff2');
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
    }
  `;
  document.head.appendChild(fallbackStyle);

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
      kicker: '',
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
      kicker: '',
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
      @keyframes replayPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.64; }
      }

      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;

        /* Replay Card Tokens matching F1ReplayControlCard */
        --rc-bg: var(--f1-card-bg, #0b0b0d);
        --rc-bg-soft: var(--f1-card-bg-soft, #131315);
        --rc-bg-end: var(--f1-card-bg-end, #0a0a0a);
        --rc-border: var(--f1-card-border, rgba(255, 255, 255, 0.08));
        --rc-divider: var(--f1-card-divider, rgba(255, 255, 255, 0.08));
        --rc-text: var(--f1-card-text, #f5f5f5);
        --rc-muted: var(--f1-card-muted, rgba(255, 255, 255, 0.65));
        --rc-soft: var(--f1-card-soft, rgba(255, 255, 255, 0.42));
        --rc-chip: var(--f1-card-chip, rgba(255, 255, 255, 0.06));
        --rc-panel: var(--f1-card-panel, rgba(255, 255, 255, 0.04));
        --rc-shadow: var(--f1-card-compact-shadow, 0 16px 40px rgba(0, 0, 0, 0.35));

        --f1-card-display-font-family: 'Formula1 Wide', 'Formula1 Display', Arial, sans-serif;
        --f1-card-body-font-family: 'Formula1 Display', 'Titillium Web', Arial, sans-serif;
        --f1-marker-red: #ff3b30;
      }

      * {
        box-sizing: border-box;
      }

      ha-card {
        padding: 0;
        background: transparent;
        box-shadow: none;
        border: none;
      }

      /* Replay Card Container Architecture (.rc-card) */
      .rc-card {
        font-family: var(--f1-card-body-font-family, 'Formula1 Display', 'Titillium Web', Arial, sans-serif);
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 12px;
        border-radius: var(--ha-card-border-radius, 12px);
        background:
          linear-gradient(90deg, rgba(225, 6, 0, 0.18), transparent 34%) top left / 100% 2px no-repeat,
          radial-gradient(circle at 14% 10%, var(--rc-chip), transparent 44%),
          linear-gradient(160deg, var(--rc-bg) 0%, var(--rc-bg-soft) 58%, var(--rc-bg-end) 100%);
        border: 1px solid var(--rc-border);
        box-shadow: var(--rc-shadow);
        color: var(--rc-text);
        container-type: inline-size;
      }

      /* Replay Card Header (.rc-header) */
      .rc-header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
      }

      .rc-title-group {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .rc-kicker {
        color: var(--f1-marker-red);
        font-family: var(--f1-card-body-font-family, 'Formula1 Display', sans-serif);
        font-size: 8.5px;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        line-height: 1.1;
      }

      .rc-kicker:empty {
        display: none;
      }

      .rc-title {
        font-family: var(--f1-card-display-font-family, 'Formula1 Wide', 'Formula1 Display', Arial, sans-serif);
        font-weight: 600;
        font-size: 14px;
        letter-spacing: 0.018em;
        line-height: 1.14;
        overflow-wrap: anywhere;
        text-transform: uppercase;
        color: var(--rc-text);
      }

      .rc-subtitle {
        color: var(--rc-muted);
        font-family: var(--f1-card-body-font-family, 'Formula1 Display', 'Titillium Web', Arial, sans-serif);
        font-size: 11px;
        line-height: 1.3;
        overflow-wrap: anywhere;
        text-transform: uppercase;
      }

      .rc-subtitle:empty {
        display: none;
      }

      /* Standardized Replay Status Pill (.rc-status-pill) */
      .rc-status-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 24px;
        padding: 3px 9px;
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--rc-status-color, var(--rc-soft)) 46%, transparent);
        background: color-mix(in srgb, var(--rc-status-color, var(--rc-soft)) 14%, transparent);
        color: var(--rc-status-color, var(--rc-text));
        font-weight: 700;
        font-size: 10px;
        letter-spacing: 0.05em;
        white-space: nowrap;
        text-transform: uppercase;
      }

      .rc-status-pill ha-icon {
        --mdc-icon-size: 15px;
        flex-shrink: 0;
      }

      .rc-status-pill.playing,
      .rc-status-pill.live {
        --rc-status-color: #34c759;
        animation: replayPulse 1.6s ease-in-out infinite;
      }

      .rc-status-pill.calibrating {
        --rc-status-color: #f59e0b;
        animation: replayPulse 1.2s ease-in-out infinite;
      }

      /* Status Details / Delay Hero Section (.rc-status-details) */
      .rc-status-details {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        padding: 8px 12px;
        border: 1px solid var(--rc-divider);
        border-radius: 8px;
        background: var(--rc-panel);
        align-items: center;
      }

      .rc-detail {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .rc-detail-label {
        color: var(--rc-muted);
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .rc-delay-readout {
        display: flex;
        align-items: baseline;
        gap: 2px;
      }

      .rc-delay-num {
        font-family: var(--f1-card-display-font-family, 'Formula1 Display', sans-serif);
        font-size: 22px;
        font-weight: 800;
        color: var(--rc-text);
        line-height: 1;
        letter-spacing: -0.02em;
        font-variant-numeric: tabular-nums;
      }

      .rc-delay-unit {
        font-family: var(--f1-card-display-font-family, 'Formula1 Display', sans-serif);
        font-size: 12px;
        font-weight: 800;
        color: #e10600;
        margin-left: 2px;
      }

      .rc-nudge-group {
        display: flex;
        gap: 5px;
        align-items: center;
      }

      /* Replay Action Buttons (.rc-button) */
      .rc-controls-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 7px;
      }

      .rc-button {
        min-width: 0;
        min-height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border: 1px solid var(--rc-divider);
        border-radius: 8px;
        background: var(--rc-panel);
        color: var(--rc-text);
        font: inherit;
        font-size: 10px;
        font-weight: 700;
        line-height: 1;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
        box-sizing: border-box;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      .rc-button ha-icon {
        --mdc-icon-size: 17px;
        flex: 0 0 auto;
      }

      .rc-button:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color: color-mix(in srgb, #e10600 45%, var(--rc-divider));
        background: color-mix(in srgb, #e10600 10%, var(--rc-panel));
      }

      .rc-button:active:not(:disabled) {
        transform: translateY(0);
      }

      .rc-button:disabled {
        opacity: 0.42;
        cursor: not-allowed;
      }

      .rc-button.primary {
        background: linear-gradient(135deg, #e10600, #9f0500);
        border-color: rgba(255, 255, 255, 0.14);
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(225, 6, 0, 0.28);
      }

      .rc-button.primary:hover:not(:disabled) {
        background: linear-gradient(135deg, #ff1812, #b80700);
        border-color: rgba(255, 255, 255, 0.25);
        box-shadow: 0 4px 12px rgba(225, 6, 0, 0.4);
      }

      .rc-button.load {
        background: color-mix(in srgb, #38bdf8 15%, var(--rc-panel));
        border-color: color-mix(in srgb, #38bdf8 34%, var(--rc-divider));
        color: color-mix(in srgb, #38bdf8 84%, var(--rc-text));
      }

      .rc-button.load:hover:not(:disabled) {
        background: color-mix(in srgb, #38bdf8 25%, var(--rc-panel));
        border-color: color-mix(in srgb, #38bdf8 50%, var(--rc-divider));
      }

      .rc-button.calibrating {
        background: color-mix(in srgb, #f59e0b 16%, var(--rc-panel));
        border-color: color-mix(in srgb, #f59e0b 38%, var(--rc-divider));
        color: #fde68a;
      }

      .rc-button.calibrating:hover:not(:disabled) {
        background: color-mix(in srgb, #f59e0b 26%, var(--rc-panel));
        border-color: color-mix(in srgb, #f59e0b 55%, var(--rc-divider));
      }

      .rc-button.nudge-btn {
        min-height: 28px;
        padding: 0 8px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: 700;
      }

      .rc-button-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Replay Select Field (.rc-select-field) */
      .rc-select-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

      .rc-field-label {
        color: var(--rc-muted);
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .rc-select-wrap {
        position: relative;
        min-width: 0;
      }

      .rc-select-wrap::after {
        content: '';
        position: absolute;
        right: 12px;
        top: 50%;
        width: 7px;
        height: 7px;
        border-right: 2px solid var(--rc-muted);
        border-bottom: 2px solid var(--rc-muted);
        transform: translateY(-65%) rotate(45deg);
        pointer-events: none;
      }

      select {
        width: 100%;
        height: 38px;
        appearance: none;
        border: 1px solid var(--rc-divider);
        border-radius: 8px;
        background: color-mix(in srgb, var(--rc-panel) 76%, transparent);
        color: var(--rc-text);
        font: inherit;
        font-size: 12px;
        line-height: 1.2;
        padding: 0 32px 0 10px;
        outline: none;
        min-width: 0;
        text-overflow: ellipsis;
        cursor: pointer;
      }

      select:focus {
        border-color: color-mix(in srgb, #e10600 70%, var(--rc-divider));
        box-shadow: 0 0 0 2px rgba(225, 6, 0, 0.16);
      }

      /* Responsive Layout */
      @container (max-width: 420px) {
        .rc-status-details {
          grid-template-columns: 1fr;
          gap: 8px;
        }
        .rc-controls-grid {
          grid-template-columns: 1fr;
          gap: 6px;
        }
      }
    `;

    this.shadowRoot.innerHTML = `
      <style>${style}</style>
      <ha-card>
        <div class="rc-card">
          <div class="rc-header">
            <div class="rc-title-group">
              <div class="rc-kicker" id="kicker">${this._config.kicker || ''}</div>
              <div class="rc-title" id="title">${this._config.title || 'LIVE TV SYNCHRONISATION'}</div>
              <div class="rc-subtitle" id="subtitle">${this._config.subtitle || 'DELAY CALIBRATION & OFFSET'}</div>
            </div>
            <div class="rc-status-pill playing" id="status-pill">
              <ha-icon icon="mdi:broadcast" id="status-icon"></ha-icon>
              <span id="status-text">LIVE SYNC</span>
            </div>
          </div>

          <div class="rc-status-details">
            <div class="rc-detail">
              <span class="rc-detail-label">Current Broadcast Delay</span>
              <div class="rc-delay-readout">
                <span class="rc-delay-num" id="delay-num">--</span><span class="rc-delay-unit">s</span>
              </div>
            </div>
            <div class="rc-nudge-group">
              <button class="rc-button nudge-btn" data-delta="-5">-5s</button>
              <button class="rc-button nudge-btn" data-delta="-1">-1s</button>
              <button class="rc-button nudge-btn" data-delta="1">+1s</button>
              <button class="rc-button nudge-btn" data-delta="5">+5s</button>
            </div>
          </div>

          <div class="rc-controls-grid">
            <button class="rc-button load" id="btn-calibrate">
              <ha-icon icon="mdi:timer-outline" id="calibrate-icon"></ha-icon>
              <span class="rc-button-label" id="calibrate-text">START CALIBRATION</span>
            </button>
            <button class="rc-button primary" id="btn-match">
              <ha-icon icon="mdi:lock"></ha-icon>
              <span class="rc-button-label">MATCH DELAY (TV NOW)</span>
            </button>
          </div>

          <label class="rc-select-field">
            <span class="rc-field-label">Reference Mode</span>
            <span class="rc-select-wrap">
              <select id="reference-select">
                <option value="Session live">Session live</option>
              </select>
            </span>
          </label>
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
    if (!this._hass || !this._config.delay_entity) return;
    const entity = this._hass.states[this._config.delay_entity];
    const current = entity ? parseFloat(entity.state) || 0 : 0;
    const target = Math.max(0, Math.round((current + delta) * 10) / 10);
    const domain = this._config.delay_entity.split('.')[0] || 'number';
    this._hass.callService(domain, 'set_value', {
      entity_id: this._config.delay_entity,
      value: target,
    });
  }

  _toggleCalibration() {
    if (!this._hass || !this._config.calibration_entity) return;
    const domain = this._config.calibration_entity.split('.')[0] || 'switch';
    this._hass.callService(domain, 'toggle', {
      entity_id: this._config.calibration_entity,
    });
  }

  _matchDelay() {
    if (!this._hass || !this._config.match_button_entity) return;
    const domain = this._config.match_button_entity.split('.')[0] || 'button';
    this._hass.callService(domain, 'press', {
      entity_id: this._config.match_button_entity,
    });
  }

  _setReference(option) {
    if (!this._hass || !this._config.reference_entity) return;
    const domain = this._config.reference_entity.split('.')[0] || 'select';
    this._hass.callService(domain, 'select_option', {
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
    const calIcon = this.shadowRoot.getElementById('calibrate-icon');
    const calText = this.shadowRoot.getElementById('calibrate-text');
    const statusPill = this.shadowRoot.getElementById('status-pill');
    const statusIcon = this.shadowRoot.getElementById('status-icon');
    const statusText = this.shadowRoot.getElementById('status-text');

    const isActive = calState && calState.state === 'on';

    if (calBtn) {
      if (isActive) {
        calBtn.className = 'rc-button calibrating';
        if (calIcon) calIcon.setAttribute('icon', 'mdi:timer-sand');
        if (calText) calText.textContent = 'STOP CALIBRATION';
      } else {
        calBtn.className = 'rc-button load';
        if (calIcon) calIcon.setAttribute('icon', 'mdi:timer-outline');
        if (calText) calText.textContent = 'START CALIBRATION';
      }
    }

    if (statusPill && statusText) {
      if (isActive) {
        statusPill.className = 'rc-status-pill calibrating';
        if (statusIcon) statusIcon.setAttribute('icon', 'mdi:timer-outline');
        statusText.textContent = 'CALIBRATING';
      } else {
        statusPill.className = 'rc-status-pill playing';
        if (statusIcon) statusIcon.setAttribute('icon', 'mdi:broadcast');
        statusText.textContent = 'LIVE SYNC';
      }
    }

    const refState = this._hass.states[this._config.reference_entity];
    const refSelect = this.shadowRoot.getElementById('reference-select');
    if (refSelect && refState && refState.attributes && refState.attributes.options) {
      const opts = refState.attributes.options;
      const current = refState.state;
      const newHtml = opts.map(o => `<option value="${o}" ${o === current ? 'selected' : ''}>${o}</option>`).join('');
      if (refSelect.innerHTML !== newHtml) {
        refSelect.innerHTML = newHtml;
      } else if (refSelect.value !== current) {
        refSelect.value = current;
      }
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
        width: 100%;
        box-sizing: border-box;
        font-family: var(--f1-card-display-font-family, 'Formula1 Display', sans-serif) !important;
      }

      * {
        box-sizing: border-box;
      }

      ha-card {
        height: 46px;
        min-height: 46px;
        border-radius: var(--ha-card-border-radius, 12px);
        background:
          radial-gradient(circle at 14% 10%, rgba(255, 255, 255, 0.04), transparent 44%),
          linear-gradient(160deg, #0b0b0d 0%, #131315 58%, #0a0a0a 100%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-left: 4px solid var(--f1-mode-accent, #ff3b30);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        padding: 4px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        align-items: stretch;
        cursor: pointer;
        user-select: none;
        transition: border-left-color 0.25s ease;
        box-sizing: border-box;
        overflow: hidden;
        container-type: inline-size;
      }

      ha-card.replay-active {
        --f1-mode-accent: #34c759;
      }

      .pill {
        min-width: 0;
        height: 100%;
        min-height: 36px;
        padding: 0 10px;
        border-radius: 999px;
        font-family: var(--f1-card-display-font-family, 'Formula1 Display', sans-serif) !important;
        font-weight: 800;
        font-size: 11px;
        letter-spacing: 0.04em;
        display: flex;
        align-items: center;
        justify-content: center;
        text-transform: uppercase;
        white-space: nowrap !important;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        color: rgba(255, 255, 255, 0.45);
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        cursor: pointer;
        box-sizing: border-box;
        line-height: 1;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      }

      .pill span {
        white-space: nowrap !important;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .pill:hover:not(.active) {
        background: rgba(255, 255, 255, 0.07);
        color: rgba(255, 255, 255, 0.75);
      }

      .pill.active {
        color: #ffffff;
      }

      .pill.active.live {
        color: #ffffff;
        background: color-mix(in srgb, #ff3b30 20%, rgba(255, 255, 255, 0.04));
        border: 1px solid color-mix(in srgb, #ff3b30 65%, transparent);
        box-shadow: 0 2px 10px rgba(255, 59, 48, 0.3);
      }

      .pill.active.replay {
        color: #ffffff;
        background: color-mix(in srgb, #34c759 20%, rgba(255, 255, 255, 0.04));
        border: 1px solid color-mix(in srgb, #34c759 65%, transparent);
        box-shadow: 0 2px 10px rgba(52, 199, 89, 0.3);
      }

      .pill.active.replay.seeking {
        color: #ffffff;
        background: color-mix(in srgb, #ff9500 20%, rgba(255, 255, 255, 0.04));
        border: 1px solid color-mix(in srgb, #ff9500 65%, transparent);
        box-shadow: 0 2px 10px rgba(255, 149, 0, 0.3);
      }

      .pill.active.replay.paused {
        color: #ffffff;
        background: color-mix(in srgb, #f59e0b 20%, rgba(255, 255, 255, 0.04));
        border: 1px solid color-mix(in srgb, #f59e0b 65%, transparent);
        box-shadow: 0 2px 10px rgba(245, 158, 11, 0.3);
      }

      .pulse-dot {
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 8px currentColor;
        margin-right: 6px;
        flex-shrink: 0;
      }

      .pulse-dot.live-dot {
        background: #ff3b30;
        box-shadow: 0 0 8px #ff3b30;
      }

      .pulse-dot.replay-dot {
        background: #34c759;
        box-shadow: 0 0 8px #34c759;
      }

      .pulse-dot.seeking-dot {
        background: #ff9500;
        box-shadow: 0 0 8px #ff9500;
      }

      .pulse-dot.paused-dot {
        background: #f59e0b;
        box-shadow: 0 0 8px #f59e0b;
      }

      @container (max-width: 330px) {
        .pill {
          font-size: 9.5px;
          letter-spacing: 0.02em;
          padding: 0 6px;
        }
        .pulse-dot {
          margin-right: 4px;
        }
      }
    `;

    this.shadowRoot.innerHTML = `
      <style>${style}</style>
      <ha-card id="card">
        <div class="pill active live" id="live-pill">
          <span class="pulse-dot live-dot" id="live-dot"></span>
          <span>${this._config.live_label}</span>
        </div>
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
        liveDot.className = 'pulse-dot live-dot';
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
          replayDot.className = 'pulse-dot seeking-dot';
          replayDot.style.display = 'inline-block';
          replayText.textContent = '[SEEKING]';
        } else if (isPaused) {
          replayPill.className = 'pill active replay paused';
          replayDot.className = 'pulse-dot paused-dot';
          replayDot.style.display = 'inline-block';
          replayText.textContent = 'REPLAY PAUSED';
        } else {
          replayPill.className = 'pill active replay';
          replayDot.className = 'pulse-dot replay-dot';
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
    '%c F1-LIVE-CONTROL-CARD %c v2.1.2 ',
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
    '%c F1-MODE-TOGGLE-CARD %c v2.1.2 ',
    'color: white; background: #e10600; font-weight: 700;',
    'color: #040711; background: #86efac; font-weight: 700;'
  );
}
