/**
 * F1 Live Control Card (f1-live-control-card)
 * Version: 2.3.0
 * 
 * Custom Lovelace Card for Formula 1 Live TV Session Synchronisation & Delay Calibration.
 * - Unified carbon chassis (.rc-card) matching Weekend Hub aesthetic
 * - Guided Lap Sync Engine: real-time telemetry lap tracking, armed state, and visual TV match prompts
 * - Real-time Telemetry Stopwatch display during active measurement
 * - Broadcaster Quick Presets (Sky Satellite, F1 TV Pro, Sky Stream/Now TV, Zero)
 * - Telemetry Lap Counter Chip (e.g. LAP 3 / 56)
 * - Responsive container queries and dark-mode native select dropdowns
 * Companion F1ModeToggleCard (custom:f1-mode-toggle-card) included for seamless Live / Replay switching.
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
      kicker: 'SESSION TELEMETRY SYNC',
      title: 'LIVE TV SYNCHRONISATION',
      subtitle: 'DELAY CALIBRATION & LAP SYNC',
      delay_entity: 'number.f1_live_delay',
      calibration_entity: 'switch.f1_delay_calibration',
      match_button_entity: 'button.f1_match_live_delay',
      reference_entity: 'select.f1_live_delay_reference',
      lap_count_entity: 'sensor.f1_race_lap_count',
      show_presets: true,
      show_nudge: true,
    };
  }

  setConfig(config) {
    this._config = Object.assign({
      kicker: 'SESSION TELEMETRY SYNC',
      title: 'LIVE TV SYNCHRONISATION',
      subtitle: 'DELAY CALIBRATION & LAP SYNC',
      delay_entity: 'number.f1_live_delay',
      calibration_entity: 'switch.f1_delay_calibration',
      match_button_entity: 'button.f1_match_live_delay',
      reference_entity: 'select.f1_live_delay_reference',
      lap_count_entity: 'sensor.f1_race_lap_count',
      show_presets: true,
      show_nudge: true,
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
        --rc-accent: #ff3b30;
        --rc-surface: #0b0b0d;
        --rc-panel: #131315;
        --rc-card-bg: #0a0a0a;
        --rc-border: rgba(255, 255, 255, 0.08);
        --rc-divider: rgba(255, 255, 255, 0.08);
        --rc-text: #f5f5f5;
        --rc-muted: rgba(255, 255, 255, 0.65);
        --rc-font: var(--f1-card-display-font-family, 'Formula1 Display', 'F1 Barlow Condensed', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      }

      * {
        box-sizing: border-box;
      }

      ha-card {
        border-radius: var(--ha-card-border-radius, 12px);
        overflow: hidden;
        border: 1px solid var(--rc-border);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
        color: var(--rc-text);
        font-family: var(--rc-font);
        background:
          linear-gradient(110deg, transparent 0 47%, rgba(255, 255, 255, 0.025) 47% 48%, transparent 48% 100%),
          radial-gradient(circle at 93% -8%, rgba(255, 59, 48, 0.22), transparent 38%),
          linear-gradient(155deg, var(--rc-surface) 0%, var(--rc-panel) 68%, var(--rc-card-bg) 100%);
        position: relative;
        container-type: inline-size;
      }

      ha-card::before {
        content: '';
        position: absolute;
        inset: 0 auto 0 0;
        width: 4px;
        background: var(--rc-accent);
        z-index: 5;
      }

      .rc-card {
        padding: clamp(14px, 2.5vw, 20px) clamp(16px, 3vw, 24px);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      /* Header */
      .rc-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--rc-divider);
      }

      .rc-title-group {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .rc-kicker {
        color: var(--rc-accent);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .rc-title {
        color: var(--rc-text);
        font-size: clamp(15px, 2.2vw, 18px);
        font-weight: 800;
        letter-spacing: -0.02em;
        text-transform: uppercase;
        line-height: 1.15;
      }

      .rc-subtitle {
        color: var(--rc-muted);
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .rc-header-badges {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .rc-lap-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 10.5px;
        font-weight: 800;
        letter-spacing: 0.04em;
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #ffffff;
        font-variant-numeric: tabular-nums;
      }

      /* Status Pill */
      .rc-status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 26px;
        padding: 0 10px;
        border-radius: 9999px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        white-space: nowrap;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: var(--rc-muted);
        transition: all 0.25s ease;
      }

      .rc-status-pill ha-icon {
        --mdc-icon-size: 14px;
      }

      .rc-status-pill.playing {
        color: #86efac;
        background: rgba(34, 197, 94, 0.14);
        border-color: rgba(34, 197, 94, 0.35);
      }

      .rc-status-pill.calibrating {
        color: #fde68a;
        background: rgba(245, 158, 11, 0.16);
        border-color: rgba(245, 158, 11, 0.45);
        animation: amberPulse 2s infinite ease-in-out;
      }

      .rc-status-pill.measuring {
        color: #86efac;
        background: rgba(52, 199, 89, 0.22);
        border-color: rgba(52, 199, 89, 0.6);
        box-shadow: 0 0 10px rgba(52, 199, 89, 0.3);
      }

      /* Current Delay Hero Panel */
      .rc-status-details {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: center;
        gap: 14px;
        padding: 10px 14px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--rc-divider);
      }

      .rc-detail {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .rc-detail-label {
        color: var(--rc-muted);
        font-size: 9.5px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .rc-delay-readout {
        display: flex;
        align-items: baseline;
        gap: 3px;
      }

      .rc-delay-num {
        font-size: clamp(22px, 3.5vw, 28px);
        font-weight: 900;
        color: #ffffff;
        font-variant-numeric: tabular-nums;
        line-height: 1;
        letter-spacing: -0.02em;
      }

      .rc-delay-unit {
        font-size: 13px;
        font-weight: 700;
        color: var(--rc-muted);
      }

      .rc-nudge-group {
        display: flex;
        align-items: center;
        gap: 4px;
        justify-content: flex-end;
        flex-wrap: wrap;
      }

      .rc-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        height: 36px;
        padding: 0 14px;
        border-radius: 8px;
        font-family: inherit;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        cursor: pointer;
        user-select: none;
        transition: all 0.15s ease;
        border: 1px solid transparent;
        white-space: nowrap;
      }

      .rc-button:hover:not(:disabled) {
        transform: translateY(-1px);
      }

      .rc-button:active:not(:disabled) {
        transform: translateY(0);
      }

      .rc-button:disabled {
        opacity: 0.38;
        cursor: not-allowed;
      }

      .rc-button.nudge-btn {
        height: 28px;
        padding: 0 8px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
        color: #f5f5f5;
      }

      .rc-button.nudge-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.22);
      }

      /* Quick Presets Row */
      .rc-presets-row {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }

      .rc-presets-label {
        font-size: 9.5px;
        font-weight: 800;
        letter-spacing: 0.05em;
        color: var(--rc-muted);
        text-transform: uppercase;
        margin-right: 2px;
      }

      .rc-preset-chip {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 10px;
        font-weight: 700;
        font-family: inherit;
        color: rgba(255, 255, 255, 0.75);
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .rc-preset-chip:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.25);
        color: #ffffff;
      }

      /* Mission Control Lap Sync Deck */
      .rc-sync-deck {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid var(--rc-divider);
        border-radius: 10px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .rc-sync-deck-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .rc-field-label {
        color: var(--rc-muted);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .rc-select-wrap {
        position: relative;
        width: 100%;
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
        background: #14151b;
        color: #f5f5f5;
        color-scheme: dark !important;
        font: inherit;
        font-size: 12px;
        font-weight: 600;
        padding: 0 32px 0 10px;
        outline: none;
        cursor: pointer;
      }

      select option {
        background: #14151b;
        color: #f5f5f5;
        color-scheme: dark !important;
      }

      select:focus {
        border-color: var(--rc-accent);
      }

      /* Interactive Mission Guidance Banner */
      .rc-guide-banner {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 8px;
        font-size: 11px;
        line-height: 1.4;
        transition: all 0.25s ease;
      }

      .rc-guide-icon {
        font-size: 16px;
        flex-shrink: 0;
        line-height: 1.2;
      }

      .rc-guide-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .rc-guide-title {
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        font-size: 11px;
      }

      .rc-guide-banner.idle {
        background: rgba(56, 189, 248, 0.07);
        border: 1px solid rgba(56, 189, 248, 0.2);
        color: #bae6fd;
      }

      .rc-guide-banner.waiting {
        background: rgba(245, 158, 11, 0.12);
        border: 1px solid rgba(245, 158, 11, 0.45);
        color: #fef3c7;
        animation: amberPulse 2s infinite ease-in-out;
      }

      .rc-guide-banner.measuring {
        background: rgba(52, 199, 89, 0.14);
        border: 1px solid rgba(52, 199, 89, 0.55);
        color: #dcfce7;
        box-shadow: 0 0 14px rgba(52, 199, 89, 0.2);
      }

      /* Running Telemetry Stopwatch Panel */
      .rc-stopwatch-panel {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border-radius: 8px;
        background: rgba(52, 199, 89, 0.12);
        border: 1px solid rgba(52, 199, 89, 0.35);
      }

      .rc-stopwatch-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .pulse-ring {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #34c759;
        box-shadow: 0 0 10px #34c759;
        animation: ringPulse 1.2s infinite ease-in-out;
      }

      .rc-stopwatch-label {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #86efac;
      }

      .rc-stopwatch-digits {
        display: flex;
        align-items: baseline;
        gap: 3px;
        font-variant-numeric: tabular-nums;
        font-size: 26px;
        font-weight: 900;
        color: #86efac;
        text-shadow: 0 0 12px rgba(52, 199, 89, 0.45);
        line-height: 1;
      }

      .rc-stopwatch-unit {
        font-size: 12px;
        font-weight: 700;
        color: rgba(134, 239, 172, 0.7);
      }

      /* Controls Grid */
      .rc-controls-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .rc-button.primary {
        background: linear-gradient(135deg, #e10600, #a50500);
        border-color: rgba(255, 255, 255, 0.18);
        color: #ffffff;
        box-shadow: 0 2px 10px rgba(225, 6, 0, 0.3);
      }

      .rc-button.primary:hover:not(:disabled) {
        background: linear-gradient(135deg, #ff1a14, #c20600);
        box-shadow: 0 4px 14px rgba(225, 6, 0, 0.5);
      }

      .rc-button.load {
        background: rgba(56, 189, 248, 0.12);
        border-color: rgba(56, 189, 248, 0.35);
        color: #38bdf8;
      }

      .rc-button.load:hover:not(:disabled) {
        background: rgba(56, 189, 248, 0.22);
        border-color: rgba(56, 189, 248, 0.55);
      }

      .rc-button.cancel-btn {
        background: rgba(239, 68, 68, 0.15);
        border-color: rgba(239, 68, 68, 0.35);
        color: #fca5a5;
      }

      .rc-button.cancel-btn:hover:not(:disabled) {
        background: rgba(239, 68, 68, 0.25);
        border-color: rgba(239, 68, 68, 0.55);
      }

      .rc-button.pulse-anim {
        animation: buttonPulse 1.4s infinite ease-in-out;
      }

      /* Last Result */
      .rc-last-result {
        font-size: 10px;
        font-weight: 700;
        color: #86efac;
        padding: 4px 8px;
        background: rgba(34, 197, 94, 0.08);
        border: 1px solid rgba(34, 197, 94, 0.2);
        border-radius: 6px;
        text-align: center;
      }

      /* Animations */
      @keyframes amberPulse {
        0%, 100% { border-color: rgba(245, 158, 11, 0.45); }
        50% { border-color: rgba(245, 158, 11, 0.85); box-shadow: 0 0 10px rgba(245, 158, 11, 0.25); }
      }

      @keyframes ringPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.6; }
      }

      @keyframes buttonPulse {
        0%, 100% { transform: scale(1); box-shadow: 0 2px 10px rgba(225, 6, 0, 0.35); }
        50% { transform: scale(1.02); box-shadow: 0 4px 18px rgba(225, 6, 0, 0.7); }
      }

      /* Responsive Layout */
      @container (max-width: 440px) {
        .rc-status-details {
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .rc-nudge-group {
          justify-content: flex-start;
        }
        .rc-controls-grid {
          grid-template-columns: 1fr;
        }
      }
    `;

    this.shadowRoot.innerHTML = `
      <style>${style}</style>
      <ha-card>
        <div class="rc-card">
          <div class="rc-header">
            <div class="rc-title-group">
              <div class="rc-kicker" id="kicker">${this._config.kicker || 'SESSION TELEMETRY SYNC'}</div>
              <div class="rc-title" id="title">${this._config.title || 'LIVE TV SYNCHRONISATION'}</div>
              <div class="rc-subtitle" id="subtitle">${this._config.subtitle || 'DELAY CALIBRATION & LAP SYNC'}</div>
            </div>
            <div class="rc-header-badges">
              <div class="rc-lap-badge" id="lap-badge" style="display:none;">
                <span class="rc-lap-icon">🏁</span>
                <span id="lap-badge-text">LAP --</span>
              </div>
              <div class="rc-status-pill playing" id="status-pill">
                <ha-icon icon="mdi:broadcast" id="status-icon"></ha-icon>
                <span id="status-text">LIVE SYNC</span>
              </div>
            </div>
          </div>

          <div class="rc-status-details">
            <div class="rc-detail">
              <span class="rc-detail-label">Current Broadcast Delay</span>
              <div class="rc-delay-readout">
                <span class="rc-delay-num" id="delay-num">--</span><span class="rc-delay-unit">s</span>
              </div>
            </div>
            <div class="rc-nudge-group" id="nudge-group">
              <button class="rc-button nudge-btn" data-delta="-5">-5s</button>
              <button class="rc-button nudge-btn" data-delta="-1">-1s</button>
              <button class="rc-button nudge-btn" data-delta="-0.1">-0.1s</button>
              <button class="rc-button nudge-btn" data-delta="0.1">+0.1s</button>
              <button class="rc-button nudge-btn" data-delta="1">+1s</button>
              <button class="rc-button nudge-btn" data-delta="5">+5s</button>
            </div>
          </div>

          <div class="rc-presets-row" id="presets-row" style="${this._config.show_presets === false ? 'display:none;' : ''}">
            <span class="rc-presets-label">Quick Jump:</span>
            <button class="rc-preset-chip" data-delay="18">Sky Sat (18s)</button>
            <button class="rc-preset-chip" data-delay="22">F1 TV (22s)</button>
            <button class="rc-preset-chip" data-delay="38">Now/Stream (38s)</button>
            <button class="rc-preset-chip" data-delay="0">Reset 0s</button>
          </div>

          <div class="rc-sync-deck">
            <div class="rc-sync-deck-header">
              <span class="rc-field-label">CALIBRATION & LAP SYNC MISSION CONTROL</span>
            </div>

            <div class="rc-reference-selector">
              <label class="rc-select-field">
                <div class="rc-select-wrap">
                  <select id="reference-select">
                    <option value="Lap sync (race/sprint)">Lap sync (race/sprint) — Recommended</option>
                    <option value="Session live">Session live (Lights Out)</option>
                  </select>
                </div>
              </label>
            </div>

            <div class="rc-guide-banner idle" id="guide-banner">
              <div class="rc-guide-icon" id="guide-icon">🏁</div>
              <div class="rc-guide-content">
                <div class="rc-guide-title" id="guide-title">READY TO CALIBRATE</div>
                <div class="rc-guide-desc" id="guide-desc">
                  Select <strong>Lap sync</strong> then click <strong>START CALIBRATION</strong> below. The telemetry engine will arm and wait for the leader to complete the current lap.
                </div>
              </div>
            </div>

            <div class="rc-stopwatch-panel" id="stopwatch-panel" style="display:none;">
              <div class="rc-stopwatch-indicator">
                <span class="pulse-ring"></span>
                <span class="rc-stopwatch-label">TELEMETRY STOPWATCH</span>
              </div>
              <div class="rc-stopwatch-digits">
                <span id="stopwatch-time">0.0</span><span class="rc-stopwatch-unit">s</span>
              </div>
            </div>

            <div class="rc-controls-grid">
              <button class="rc-button load" id="btn-calibrate">
                <ha-icon icon="mdi:timer-outline" id="calibrate-icon"></ha-icon>
                <span class="rc-button-label" id="calibrate-text">START CALIBRATION</span>
              </button>
              <button class="rc-button primary" id="btn-match" disabled>
                <ha-icon icon="mdi:lock"></ha-icon>
                <span class="rc-button-label" id="match-text">MATCH DELAY (TV NOW)</span>
              </button>
            </div>

            <div class="rc-last-result" id="last-result" style="display:none;"></div>
          </div>
        </div>
      </ha-card>
    `;

    // Event Listeners
    this.shadowRoot.querySelectorAll('.nudge-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = parseFloat(btn.dataset.delta);
        this._adjustDelay(delta);
      });
    });

    this.shadowRoot.querySelectorAll('.rc-preset-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const delay = parseFloat(btn.dataset.delay);
        this._setDelay(delay);
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

  _setDelay(val) {
    if (!this._hass || !this._config.delay_entity) return;
    const domain = this._config.delay_entity.split('.')[0] || 'number';
    this._hass.callService(domain, 'set_value', {
      entity_id: this._config.delay_entity,
      value: Math.max(0, val),
    });
  }

  _toggleCalibration() {
    if (!this._hass || !this._config.calibration_entity) return;
    const calState = this._hass.states[this._config.calibration_entity];
    const isArmedOrRunning = calState && calState.state === 'on';
    const domain = this._config.calibration_entity.split('.')[0] || 'switch';
    const service = isArmedOrRunning ? 'turn_off' : 'turn_on';
    this._hass.callService(domain, service, {
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

    // 1. Current Delay
    const delayState = this._hass.states[this._config.delay_entity];
    const delayEl = this.shadowRoot.getElementById('delay-num');
    if (delayEl && delayState) {
      delayEl.textContent = delayState.state;
    }

    // 2. Lap Count Badge
    const lapEntityId = this._config.lap_count_entity || 'sensor.f1_race_lap_count';
    const lapState = this._hass.states[lapEntityId];
    const lapBadge = this.shadowRoot.getElementById('lap-badge');
    const lapBadgeText = this.shadowRoot.getElementById('lap-badge-text');
    let currentLap = null;
    let totalLaps = null;
    if (lapBadge && lapBadgeText) {
      if (lapState && lapState.state && lapState.state !== 'unavailable' && lapState.state !== 'unknown') {
        currentLap = lapState.state;
        totalLaps = lapState.attributes ? lapState.attributes.total_laps : null;
        lapBadgeText.textContent = totalLaps ? `TELEMETRY LAP ${currentLap}/${totalLaps}` : `TELEMETRY LAP ${currentLap}`;
        lapBadge.style.display = 'inline-flex';
      } else {
        lapBadge.style.display = 'none';
      }
    }

    // 3. Calibration State & Attributes
    const calState = this._hass.states[this._config.calibration_entity];
    const calAttrs = calState ? calState.attributes || {} : {};
    const mode = calAttrs.mode || (calState && calState.state === 'on' ? 'running' : 'idle');
    const isWaiting = mode === 'waiting';
    const isRunning = mode === 'running';
    const isIdle = !isWaiting && !isRunning;
    const recordedLap = calAttrs.recorded_lap;
    const elapsed = calAttrs.elapsed !== undefined && calAttrs.elapsed !== null ? calAttrs.elapsed : null;
    const lastResult = calAttrs.last_result;
    const activeRefKind = calAttrs.reference || '';

    // 4. Reference Selector
    const refState = this._hass.states[this._config.reference_entity];
    const refSelect = this.shadowRoot.getElementById('reference-select');
    let selectedOption = 'Lap sync (race/sprint)';
    if (refSelect && refState && refState.attributes && refState.attributes.options) {
      const opts = refState.attributes.options;
      const current = refState.state;
      selectedOption = current;
      const newHtml = opts.map(o => `<option value="${o}" ${o === current ? 'selected' : ''}>${o}</option>`).join('');
      if (refSelect.innerHTML !== newHtml) {
        refSelect.innerHTML = newHtml;
      } else if (refSelect.value !== current) {
        refSelect.value = current;
      }
      refSelect.disabled = !isIdle;
    }

    // 5. Status Pill & Guided Mission Control UI
    const statusPill = this.shadowRoot.getElementById('status-pill');
    const statusIcon = this.shadowRoot.getElementById('status-icon');
    const statusText = this.shadowRoot.getElementById('status-text');

    const guideBanner = this.shadowRoot.getElementById('guide-banner');
    const guideIcon = this.shadowRoot.getElementById('guide-icon');
    const guideTitle = this.shadowRoot.getElementById('guide-title');
    const guideDesc = this.shadowRoot.getElementById('guide-desc');
    const calBtn = this.shadowRoot.getElementById('btn-calibrate');
    const calIcon = this.shadowRoot.getElementById('calibrate-icon');
    const calText = this.shadowRoot.getElementById('calibrate-text');
    const matchBtn = this.shadowRoot.getElementById('btn-match');
    const matchText = this.shadowRoot.getElementById('match-text');
    const stopwatchPanel = this.shadowRoot.getElementById('stopwatch-panel');
    const stopwatchTime = this.shadowRoot.getElementById('stopwatch-time');
    const lastResultEl = this.shadowRoot.getElementById('last-result');

    const isLapSync = (activeRefKind === 'lap_sync') || selectedOption.toLowerCase().includes('lap');

    if (isWaiting) {
      if (statusPill) statusPill.className = 'rc-status-pill calibrating';
      if (statusIcon) statusIcon.setAttribute('icon', 'mdi:timer-sand');
      if (statusText) statusText.textContent = isLapSync ? 'WAITING FOR LAP TICK' : 'WAITING FOR SESSION';

      if (guideBanner) guideBanner.className = 'rc-guide-banner waiting';
      if (guideIcon) guideIcon.textContent = '⏳';
      if (guideTitle) guideTitle.textContent = isLapSync ? 'ARMED: WAITING FOR TELEMETRY LAP TICK' : 'ARMED: WAITING FOR SESSION START';
      if (guideDesc) {
        guideDesc.innerHTML = isLapSync
          ? `Telemetry is monitoring the leader (Currently on Lap <strong>${currentLap || '--'}</strong>). Keep watching your TV — as soon as the lap completes in telemetry, the timer will start automatically!`
          : `Waiting for session status to report <strong>Started</strong> in live telemetry. Keep watching TV!`;
      }

      if (calBtn) {
        calBtn.className = 'rc-button cancel-btn';
        if (calIcon) calIcon.setAttribute('icon', 'mdi:close-circle-outline');
        if (calText) calText.textContent = 'CANCEL CALIBRATION';
      }

      if (matchBtn) {
        matchBtn.disabled = true;
        matchBtn.classList.remove('pulse-anim');
        if (matchText) matchText.textContent = 'WAITING FOR LAP...';
      }

      if (stopwatchPanel) stopwatchPanel.style.display = 'none';

    } else if (isRunning) {
      if (statusPill) statusPill.className = 'rc-status-pill measuring';
      if (statusIcon) statusIcon.setAttribute('icon', 'mdi:timer-play');
      if (statusText) statusText.textContent = 'MEASURING TV DELAY';

      if (guideBanner) guideBanner.className = 'rc-guide-banner measuring';
      if (guideIcon) guideIcon.textContent = '🎯';

      const targetLap = (recordedLap !== null && recordedLap !== undefined) ? (parseInt(recordedLap, 10) + 1) : null;

      if (guideTitle) {
        guideTitle.textContent = targetLap
          ? `🏁 LAP ${recordedLap} COMPLETED IN TELEMETRY!`
          : `⏱ MEASURING TV BROADCAST DELAY`;
      }

      if (guideDesc) {
        guideDesc.innerHTML = targetLap
          ? `👉 <strong>WATCH YOUR TV SCREEN NOW!</strong> The exact instant your TV broadcast lap counter changes to <strong>LAP ${targetLap}</strong>, press <strong>MATCH DELAY</strong> below!`
          : `👉 <strong>WATCH TV NOW:</strong> Press <strong>MATCH DELAY</strong> the moment your broadcast catches up with the telemetry event (lights out)!`;
      }

      if (calBtn) {
        calBtn.className = 'rc-button cancel-btn';
        if (calIcon) calIcon.setAttribute('icon', 'mdi:close-circle-outline');
        if (calText) calText.textContent = 'CANCEL';
      }

      if (matchBtn) {
        matchBtn.disabled = false;
        matchBtn.classList.add('pulse-anim');
        if (matchText) matchText.textContent = targetLap ? `MATCH DELAY (TV AT LAP ${targetLap})` : `MATCH DELAY (TV NOW)`;
      }

      if (stopwatchPanel) {
        stopwatchPanel.style.display = 'flex';
        if (stopwatchTime) stopwatchTime.textContent = elapsed !== null ? parseFloat(elapsed).toFixed(1) : '0.0';
      }

    } else {
      if (statusPill) statusPill.className = 'rc-status-pill playing';
      if (statusIcon) statusIcon.setAttribute('icon', 'mdi:broadcast');
      if (statusText) statusText.textContent = 'LIVE SYNC';

      if (guideBanner) guideBanner.className = 'rc-guide-banner idle';
      if (guideIcon) guideIcon.textContent = isLapSync ? '🏁' : '⏱️';
      if (guideTitle) guideTitle.textContent = isLapSync ? 'LAP SYNC CALIBRATION (RECOMMENDED)' : 'SESSION LIVE CALIBRATION';
      if (guideDesc) {
        guideDesc.innerHTML = isLapSync
          ? `Click <strong>START CALIBRATION</strong> during a race or sprint. Telemetry will arm and wait for the next lap completion to measure your broadcast delay.`
          : `Click <strong>START CALIBRATION</strong> before the race start. Telemetry will begin timing at lights out so you can match on your TV.`;
      }

      if (calBtn) {
        calBtn.className = 'rc-button load';
        if (calIcon) calIcon.setAttribute('icon', 'mdi:timer-outline');
        if (calText) calText.textContent = 'START CALIBRATION';
      }

      if (matchBtn) {
        matchBtn.disabled = false;
        matchBtn.classList.remove('pulse-anim');
        if (matchText) matchText.textContent = 'MATCH DELAY (TV NOW)';
      }

      if (stopwatchPanel) stopwatchPanel.style.display = 'none';

      if (lastResultEl) {
        if (lastResult && lastResult.seconds !== undefined) {
          lastResultEl.style.display = 'block';
          lastResultEl.innerHTML = `✓ Last sync: <strong>${lastResult.seconds}s</strong> delay locked (${lastResult.completed_at ? new Date(lastResult.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recent'})`;
        } else {
          lastResultEl.style.display = 'none';
        }
      }
    }
  }

  getCardSize() {
    return 4;
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
    const fields = ['kicker', 'title', 'subtitle', 'delay_entity', 'calibration_entity', 'match_button_entity', 'reference_entity', 'lap_count_entity'];
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
          <input type="text" id="kicker" value="${this._config.kicker || 'SESSION TELEMETRY SYNC'}" placeholder="SESSION TELEMETRY SYNC">
        </div>
        <div class="form-row">
          <label for="title">Title</label>
          <input type="text" id="title" value="${this._config.title || 'LIVE TV SYNCHRONISATION'}">
        </div>
        <div class="form-row">
          <label for="subtitle">Subtitle</label>
          <input type="text" id="subtitle" value="${this._config.subtitle || 'DELAY CALIBRATION & LAP SYNC'}" placeholder="DELAY CALIBRATION & LAP SYNC">
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
        <div class="form-row">
          <label for="lap_count_entity">Race Lap Count Entity</label>
          <input type="text" id="lap_count_entity" value="${this._config.lap_count_entity || 'sensor.f1_race_lap_count'}">
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
      lap_count_entity: this.querySelector('#lap_count_entity')?.value ?? 'sensor.f1_race_lap_count',
    });
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    }));
  }
}

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
    '%c F1-LIVE-CONTROL-CARD %c v2.3.0 ',
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
