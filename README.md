# F1 Live Control Card (`f1-live-control-card`)

> Vibe coded with Antigravity.  Code has been reviewed and could probably be refactored in places.  Tested on both desktop and mobile app, happy for feedback and issues

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/default)
[![version](https://img.shields.io/badge/version-2.3.0-blue.svg)](https://github.com/paulgbrichardson/f1-live-control-card)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A high-performance custom Lovelace card suite for **Formula 1 Live Broadcast Synchronisation**, **Guided Lap Sync Telemetry Calibration**, and **Session Mode Switching** in Home Assistant.

Engineered to match the authentic **Nicxe/f1_sensor** aesthetic with official typography, capsule status pills, dark carbon gradient panel, and dynamic racing red accent borders.

Includes two custom Lovelace elements:
1. `custom:f1-live-control-card`: The main broadcast synchronisation, guided lap sync, and delay calibration deck.
2. `custom:f1-mode-toggle-card`: A standalone segmented capsule pill button switching between Live Session and Replay Mode.

---

## Features

- **Guided Lap Sync Engine**: Full two-stage leader lap synchronization designed for live Race & Sprint sessions:
  - **Stage 1 (Waiting)**: Radar pulse banner waits for the telemetry leader to cross the timing line. The match button is locked to prevent premature calibration.
  - **Stage 2 (Running)**: High-visibility racing green guidance badge alerts you of the exact completed telemetry lap and target TV lap.
  - **Live Stopwatch**: Real-time ticking delay stopwatch (`elapsed s`) measures the precise lag between telemetry and your video stream.
- **Real-Time Telemetry Lap Badge**: Dedicated header status displaying the active session lap count (e.g. `LAP 3 / 56`) powered by `sensor.f1_race_lap_count`.
- **Broadcaster Quick Presets**: Instant one-tap delay jumps tailored for popular feeds:
  - 🛰️ **Sky Sat** (`+18.0s`)
  - 🏎️ **F1 TV Pro** (`+22.0s`)
  - 📱 **Now / Stream** (`+38.0s`)
  - 🔄 **Zero** (`0.0s`)
- **High-Precision Nudge Controls**: Fine-tune broadcast delay with micro and macro nudge steps: `-5s`, `-1s`, `-0.1s`, `+0.1s`, `+1s`, `+5s`.
- **Digital Delay Hero Display**: Large numeric readout displaying current broadcast delay in seconds with sub-second accuracy.
- **Reference Mode Selector**: Integrated dropdown for selecting the delay synchronization baseline (`select.f1_live_delay_reference` - e.g. *Lap sync (race/sprint)*, *Session start/green flag*).
- **Companion Mode Toggle (`custom:f1-mode-toggle-card`)**: Segmented capsule pill switcher between Live Session and Replay Mode with telemetry indicators (`[SEEKING]`, `[REPLAY PAUSED]`, `REPLAY RUNNING`).
- **Visual UI Card Editor**: Full GUI configuration editors for both cards directly in Lovelace.
- **Automated Font Injection**: Automatically loads official Formula 1 font assets from the environment.

---

## How Guided Lap Sync Works

Synchronizing live Formula 1 TV feeds with live telemetry is often tricky because video streams lag behind satellite or internet telemetry by 15 to 45 seconds. The **Guided Lap Sync** eliminates all guesswork:

1. In the **Reference Mode** selector, ensure **`Lap sync (race/sprint)`** is selected.
2. Tap **`START SYNC`**.
3. **Wait for Stage 1**: The card enters `WAITING` mode (radar scan). Home Assistant waits for the race leader to finish their active lap in the raw timing data.
4. **Watch Stage 2**: As soon as the leader crosses the line, the card transitions to `RUNNING` (glowing green banner) and starts a live ticking stopwatch. The card explicitly prompts:
   > *"🏁 LAP X COMPLETED IN TELEMETRY! 👉 WATCH YOUR TV: When TV lap counter flips to LAP X+1, click MATCH DELAY!"*
5. As soon as your TV broadcast's on-screen lap counter ticks to the target lap, click **`MATCH DELAY`**!
6. Home Assistant immediately locks in the measured delay down to the tenth of a second.

---

## Installation

### Installation via HACS (Custom Repository)
1. In Home Assistant, open **HACS** → **Frontend**.
2. Click the three dots in the top right corner and choose **Custom repositories**.
3. Add the repository URL:
   - **Repository**: `https://github.com/paulgbrichardson/f1-live-control-card`
   - **Type**: `Dashboard` (or `Lovelace`)
4. Click **Add**, find **F1 Live Control Card**, and click **Download**.
5. Reload your browser window.

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
| `lap_count_entity` | `string` | `sensor.f1_race_lap_count` | Lap counter sensor displayed in header |

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
lap_count_entity: sensor.f1_race_lap_count
```

### Session Mode Switcher
```yaml
type: custom:f1-mode-toggle-card
entity: input_boolean.f1_replay_mode
status_entity: sensor.f1_replay_status
```

## 🏎️ Complete Pit Wall Dashboard

For the complete production layout, full YAML configuration, and matching modular styles for `custom:f1-sensor-card`, visit the **[f1-pitwall-dashboard](https://github.com/paulgbrichardson/f1-pitwall-dashboard)** showcase repository.

---

## License

MIT © [Paul](LICENSE)
