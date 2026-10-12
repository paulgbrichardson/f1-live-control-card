/**
 * F1 Live Control Card (f1-live-control-card)
 * Version: 1.2.0
 * 
 * Custom Lovelace Card for Formula 1 Live TV Session Synchronisation & Delay Calibration.
 * Natively styled to match Nicxe/f1_sensor design system & authentic Formula 1 typography.
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
      title: 'Live TV Synchronisation',
      delay_entity: 'number.f1_live_delay',
      calibration_entity: 'switch.f1_delay_calibration',
      match_button_entity: 'button.f1_match_live_delay',
      reference_entity: 'select.f1_live_delay_reference',
    };
  }

  setConfig(config) {
    this._config = Object.assign({
      title: 'Live TV Synchronisation',
      delay_entity: 'number.f1_live_delay',
      calibration_entity: 'switch.f1_delay_calibration',
      match_button_entity: 'button.f1_match_live_delay',
      reference_entity: 'select.f1_live_delay_reference',
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
        font-family: 'Formula1 Display', 'Formula1 Wide', 'Titillium Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      ha-card {
        background:
          radial-gradient(circle at 14% 10%, rgba(255, 255, 255, 0.05), transparent 44%),
          linear-gradient(160deg, #0b0b0d 0%, #131315 58%, #0a0a0a 100%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-left: 3px solid #ff3b30;
        border-radius: var(--ha-card-border-radius, 12px);
        padding: 14px 16px;
        color: #f5f5f5;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        position: relative;
        overflow: hidden;
      }
      ha-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, rgba(255, 59, 48, 0.45) 0%, transparent 60%);
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .header-title-box {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .header-kicker {
        color: #ff3b30;
        font-family: 'Formula1 Wide', 'Formula1 Display', sans-serif !important;
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .header-title {
        font-family: 'Formula1 Wide', 'Formula1 Display', sans-serif !important;
        font-size: 0.95rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #fff;
      }
      .live-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 24px;
        padding: 3px 12px;
        border-radius: 999px;
        background: color-mix(in srgb, #ff3b30 14%, transparent);
        border: 1px solid color-mix(in srgb, #ff3b30 46%, transparent);
        color: #ff3b30;
        font-family: 'Formula1 Wide', 'Formula1 Display', sans-serif !important;
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        white-space: nowrap;
        transition: all 0.25s ease;
      }
      .live-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 6px currentColor;
        animation: pulse 1.5s infinite ease-in-out;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.35; transform: scale(0.8); }
      }
      .delay-hero {
        background: rgba(255, 255, 255, 0.025);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 10px;
        padding: 10px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .delay-value-box {
        display: flex;
        flex-direction: column;
      }
      .delay-label {
        font-family: 'Formula1 Display', 'Formula1 Wide', sans-serif;
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 700;
      }
      .delay-number {
        font-family: 'Formula1 Wide', 'Formula1 Display', sans-serif !important;
        font-size: 1.85rem;
        font-weight: 700;
        color: #fff;
        line-height: 1.1;
        font-feature-settings: 'tnum';
      }
      .delay-unit {
        font-family: 'Formula1 Display', sans-serif;
        font-size: 0.95rem;
        font-weight: 700;
        color: #ff3b30;
        margin-left: 3px;
      }
      .nudge-group {
        display: flex;
        gap: 6px;
      }
      .nudge-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        font-family: 'Formula1 Wide', 'Formula1 Display', sans-serif !important;
        font-weight: 700;
        font-size: 0.72rem;
        letter-spacing: 0.04em;
        padding: 6px 10px;
        border-radius: 999px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .nudge-btn:hover {
        background: color-mix(in srgb, #ff3b30 20%, transparent);
        border-color: color-mix(in srgb, #ff3b30 60%, transparent);
        color: #fff;
        transform: translateY(-1px);
      }
      .nudge-btn:active {
        transform: translateY(1px);
      }
      .controls-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 12px;
      }
      @media (max-width: 480px) {
        .controls-grid {
          grid-template-columns: 1fr;
        }
      }
      .action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 9px 12px;
        border-radius: 999px;
        font-family: 'Formula1 Wide', 'Formula1 Display', sans-serif !important;
        font-weight: 700;
        font-size: 0.72rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        outline: none;
      }
      .btn-calibrate {
        background: color-mix(in srgb, #38bdf8 14%, transparent);
        color: #38bdf8;
        border: 1px solid color-mix(in srgb, #38bdf8 46%, transparent);
      }
      .btn-calibrate.active {
        background: color-mix(in srgb, #f59e0b 20%, transparent);
        color: #fbbf24;
        border: 1px solid color-mix(in srgb, #f59e0b 60%, transparent);
        animation: pulse 1.5s infinite ease-in-out;
      }
      .btn-calibrate:hover {
        background: color-mix(in srgb, #38bdf8 24%, transparent);
        border-color: #38bdf8;
        transform: translateY(-1px);
      }
      .btn-match {
        background: #e10600;
        color: #ffffff;
        border: 1px solid color-mix(in srgb, #e10600 60%, transparent);
        box-shadow: 0 2px 10px rgba(225, 6, 0, 0.4);
      }
      .btn-match:hover {
        background: #ff1812;
        box-shadow: 0 4px 14px rgba(225, 6, 0, 0.6);
        transform: translateY(-1px);
      }
      .btn-match:active {
        transform: translateY(1px);
      }
      .reference-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.025);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 10px;
      }
      .reference-label {
        font-family: 'Formula1 Display', sans-serif;
        font-size: 0.72rem;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .reference-select {
        background: #15151c;
        color: #f5f5f5;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        padding: 4px 12px;
        font-family: 'Formula1 Wide', 'Formula1 Display', sans-serif !important;
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        outline: none;
        cursor: pointer;
      }
    `;

    this.shadowRoot.innerHTML = `
      <style>${style}</style>
      <ha-card>
        <div class="header">
          <div class="header-title-box">
            <span class="header-kicker">Session Telemetry Sync</span>
            <span class="header-title" id="title">${this._config.title}</span>
          </div>
          <div class="live-pill">
            <span class="live-dot"></span>
            <span>LIVE SYNC</span>
          </div>
        </div>

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
    if (calBtn && calState) {
      const isActive = calState.state === 'on';
      calBtn.className = 'action-btn btn-calibrate' + (isActive ? ' active' : '');
      if (calText) {
        calText.textContent = isActive ? 'Calibration Active (Stop)' : 'Start Calibration';
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
    this._renderBase();
  }

  _renderBase() {
    this.innerHTML = `
      <style>
        .form-row {
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-row label {
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--secondary-text-color, #94a3b8);
        }
        .form-row input {
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid var(--divider-color, rgba(255,255,255,0.12));
          background: var(--card-background-color, #1e1e24);
          color: var(--primary-text-color, #fff);
        }
      </style>
      <div class="card-config">
        <div class="form-row">
          <label for="title">Title</label>
          <input type="text" id="title" value="${this._config.title || 'Live TV Synchronisation'}">
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
    });
  }

  _valueChanged() {
    if (!this._config) return;
    const newConfig = Object.assign({}, this._config, {
      title: this.querySelector('#title').value,
      delay_entity: this.querySelector('#delay_entity').value,
      calibration_entity: this.querySelector('#calibration_entity').value,
      match_button_entity: this.querySelector('#match_button_entity').value,
      reference_entity: this.querySelector('#reference_entity').value,
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
        padding: 4px 8px;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        cursor: pointer;
        user-select: none;
        transition: all 0.25s ease;
        box-sizing: border-box;
      }
      ha-card.replay-active {
        border-left: 3px solid #34c759;
      }
      .pill {
        text-align: center;
        padding: 5px 12px;
        border-radius: 999px;
        font-family: 'Formula1 Wide', 'Formula1 Display', sans-serif !important;
        font-weight: 700;
        font-size: 10px;
        letter-spacing: 0.05em;
        display: flex;
        align-items: center;
        justify-content: center;
        text-transform: uppercase;
        transition: all 0.25s ease;
        color: #64748b;
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.06);
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
        color: #34c759;
        background: color-mix(in srgb, #34c759 14%, transparent);
        border: 1px solid color-mix(in srgb, #34c759 46%, transparent);
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
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 6px currentColor;
        margin-right: 6px;
        animation: pulse-dot 1.5s infinite ease-in-out;
      }
      @keyframes pulse-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.35; transform: scale(0.8); }
      }
      .divider {
        width: 1px;
        height: 18px;
        background: rgba(255, 255, 255, 0.08);
        margin: 0 4px;
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
          replayText.textContent = 'REPLAY RUNNING';
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
    this._renderBase();
  }

  _renderBase() {
    this.innerHTML = `
      <style>
        .form-row {
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-row label {
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--secondary-text-color, #94a3b8);
        }
        .form-row input {
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid var(--divider-color, rgba(255,255,255,0.12));
          background: var(--card-background-color, #1e1e24);
          color: var(--primary-text-color, #fff);
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
      </div>
    `;

    this.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', () => this._valueChanged());
    });
  }

  _valueChanged() {
    if (!this._config) return;
    const newConfig = Object.assign({}, this._config, {
      entity: this.querySelector('#entity').value,
      status_entity: this.querySelector('#status_entity').value,
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
    description: 'Live broadcast session synchronisation and delay calibration deck',
    preview: true,
  });
  console.info(
    '%c F1-LIVE-CONTROL-CARD %c v1.2.0 ',
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
    '%c F1-MODE-TOGGLE-CARD %c v1.0.0 ',
    'color: white; background: #e10600; font-weight: 700;',
    'color: #040711; background: #34c759; font-weight: 700;'
  );
}
