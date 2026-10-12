# F1 Live Control Card (`f1-live-control-card`)

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/default)
[![version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/paul/f1-live-control-card)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A high-performance custom Lovelace card suite for **Formula 1 Live Broadcast Synchronisation**, **TV Delay Calibration**, and **Session Mode Switching** in Home Assistant.

Engineered to match the authentic **Nicxe/f1_sensor** aesthetic with official typography, capsule status pills, dark carbon gradient panel, and dynamic racing red accent borders.

Includes two custom Lovelace elements:
1. `custom:f1-live-control-card`: The main broadcast synchronisation and delay calibration deck.
2. `custom:f1-mode-toggle-card`: A standalone segmented capsule pill button switching between Live Session and Replay Mode.

---

## Features

- **Digital Delay Hero Display**: Large numeric readout displaying current broadcast delay in seconds with sub-second accuracy.
- **Quick Nudge Buttons**: Rapid delta adjust buttons (`-5s`, `-1s`, `+1s`, `+5s`) updating `number.f1_live_delay` with zero latency.
- **Live Delay Calibration**: Single-tap toggle for `switch.f1_delay_calibration` with an active pulsing amber glow and status label.
- **Instant TV Delay Lock**: Single-tap trigger for `button.f1_match_live_delay` with racing red accent styling and hover elevation.
- **Reference Mode Selector**: Integrated dropdown for selecting the delay synchronization baseline (`select.f1_live_delay_reference`).
- **Companion Mode Toggle (`custom:f1-mode-toggle-card`)**: Segmented capsule pill switcher between Live Session and Replay Mode with telemetry indicators (`[SEEKING]`, `[REPLAY PAUSED]`, `REPLAY RUNNING`).
- **Visual UI Card Editor**: Full GUI configuration editors for both cards directly in Lovelace.
- **Automated Font Injection**: Automatically loads official Formula 1 font assets from the environment.

---

## Installation

### Manual Lovelace Resource
1. Copy `f1-live-control-card.js` (or minified `f1-live-control-card.min.js`) into your Home Assistant `/config/www/` directory.
2. In Home Assistant, navigate to **Settings** → **Dashboards** → **Resources** (top right three dots).
3. Click **Add Resource**:
   - **URL**: `/local/f1-live-control-card.js`
   - **Resource Type**: `JavaScript Module`

---

## Configuration Options

### 1. F1 Live Control Card (`custom:f1-live-control-card`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `type` | `string` | **Required** | Must be `custom:f1-live-control-card` |
| `title` | `string` | `Live TV Synchronisation` | Card title rendered in header |
| `delay_entity` | `string` | `number.f1_live_delay` | Entity storing the broadcast delay in seconds |
| `calibration_entity` | `string` | `switch.f1_delay_calibration` | Switch entity for delay calibration mode |
| `match_button_entity` | `string` | `button.f1_match_live_delay` | Button entity to lock TV delay |
| `reference_entity` | `string` | `select.f1_live_delay_reference` | Select entity for delay reference mode |

### 2. F1 Session Mode Toggle Card (`custom:f1-mode-toggle-card`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `type` | `string` | **Required** | Must be `custom:f1-mode-toggle-card` |
| `entity` | `string` | `input_boolean.f1_replay_mode` | Entity toggling replay mode on/off |
| `status_entity` | `string` | `sensor.f1_replay_status` | Status sensor for dynamic replay state badge |
| `live_label` | `string` | `LIVE SESSION` | Label on the live pill |
| `replay_label` | `string` | `REPLAY MODE` | Default label on the replay pill |

---

## YAML Examples

### Live TV Synchronisation Card
```yaml
type: custom:f1-live-control-card
title: Live TV Synchronisation
```

### Session Mode Switcher
```yaml
type: custom:f1-mode-toggle-card
entity: input_boolean.f1_replay_mode
status_entity: sensor.f1_replay_status
```

---

## License

MIT © [Paul](LICENSE)
