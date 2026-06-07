# Terminal Control Center

[Tiếng Việt](./README.md) | **English**

A web application for managing remote **tmux** sessions through your browser. Create, monitor, control, and close terminal sessions via an intuitive web interface.

## Overview

Terminal Control Center (TCC) serves the need to **open and manage many terminal
working sessions** at once through a single web interface. You can use it:

- **Locally**: access it right on the computer/server running TCC.
- **Remotely**: combine it with a private-network solution such as **VPN /
  Tailscale / SSH tunnel** to control your server securely from anywhere,
  including your phone.

Thanks to tmux, sessions **outlive the browser** — closing a tab or losing your
network connection won't interrupt running processes. Who it's for:

- **System engineers / DevOps**: monitor and operate multiple servers and
  long-running processes.
- **Developers and "vibe coders"**: run builds/tests/agents and keep many working
  sessions tidy on both desktop and mobile.

> **Cross-platform:** a **Linux build** is available today. **macOS** has install
> scripts (launchd) but is **untested**. **Windows** will be developed in a
> separate repository (`<link to be updated>`). See [Roadmap](./docs/ROADMAP.md).

## Features

- **Dashboard** showing all active tmux sessions
- **Create / kill sessions** directly from the browser
- **Web terminal** with realtime interaction over WebSocket
- **Sessions outlive the browser** thanks to tmux — closing a tab keeps the session alive
- **Rename, notes, last access time** per session for easy management
- **Drag-and-drop ordering** of sessions (stored server-side)
- **Terminal control bar**: scroll, Enter, ESC, Ctrl+C, Tab, arrow keys, copy/paste
- **Character encoding config**: UTF-8, GBK, Big5, EUC-KR, Shift_JIS, TIS-620...
- **Bilingual UI** English/Vietnamese (English by default, switch in Settings)
- **Shell selection** when creating a session (configurable allowlist, default bash/zsh/sh/fish)
- **Default path for new sessions** (`defaultPath`): new sessions start directly in that directory
- **Light/Dark/Auto theme** — compact icon button on dashboard; Auto follows the OS
- **Copy/Paste** on both desktop and mobile: control-bar buttons + keyboard shortcuts **Ctrl+Shift+C / Ctrl+Shift+V** (Ubuntu terminal convention); includes a fallback so it still works over HTTP (LAN/VPN)
- **Insecure config warnings** when sessionSecret is default or host is public without auth
- **Authentication** toggle; scrypt-hashed password; brute-force protection
- **Responsive** — works on desktop and mobile
- Default port: **7171** (configurable in `config.json`)

## Requirements

| Component | Minimum version |
|---|---|
| OS | Ubuntu 20.04+ (or Debian-based) / macOS 12+ (untested) |
| Node.js | 18+ |
| tmux | 3.0+ (Linux: apt install tmux; macOS: brew install tmux) |

## Installation

```bash
git clone <repo-url> Terminal-Control-Center
cd Terminal-Control-Center
npm install
cp config.example.json config.json
```

## Configuration

Edit `config.json` (created from `config.example.json`):

| Field | Description | Default |
|---|---|---|
| `host` | Bind address. `0.0.0.0` = all interfaces, `127.0.0.1` = localhost only | `0.0.0.0` |
| `port` | Listening port | `7171` |
| `authEnabled` | Enable/disable login authentication | `false` |
| `password` | Login password. Stored as **scrypt hash** after changing via UI (only effective when `authEnabled: true`) | `""` |
| `sessionSecret` | Secret used to sign the session cookie. **Must change** in production | `"REPLACE_WITH_RANDOM_SECRET"` |
| `shell` | Default shell for new sessions | `"bash"` |
| `shells` | Allowlist of shells available for selection when creating sessions | `["bash","zsh","sh","fish"]` |
| `theme` | UI theme: `dark`, `light` or `auto` (follows the OS) | `"dark"` |
| `defaultPath` | Default working directory for new sessions (blank = tmux default). Supports `~`. Passed via `tmux new-session -c` | `""` |
| `tmuxPrefix` | Name prefix for tmux sessions managed by TCC | `"tcc"` |
| `termFontFamily` | Terminal font family (xterm.js) | `"monospace"` |
| `termFontSize` | Terminal font size (8–40) | `14` |
| `termEncoding` | Terminal character encoding (server transcodes to UTF-8). E.g. `utf-8`, `gbk`, `big5`, `euc-kr`, `tis-620` | `"utf-8"` |
| `language` | UI language: `en` or `vi` | `"en"` |
| `loginRateLimit.enabled` | Enable login attempt limiting (brute-force protection) | `true` |
| `loginRateLimit.maxAttempts` | Max attempts within the time window | `5` |
| `loginRateLimit.windowMs` | Time window length (ms) | `60000` |
| `tls.enabled` | Enable HTTPS (secure context => Paste button auto-reads clipboard). Set `false` to run HTTP | `true` |
| `tls.keyPath` | Path to PEM private key (absolute or relative to project root) | `"data/tls/key.pem"` |
| `tls.certPath` | Path to PEM certificate (absolute or relative to project root) | `"data/tls/cert.pem"` |

> Most settings above can be changed directly via the **⚙ Settings** button on the
> dashboard (see [Settings UI](#settings-ui)). Session metadata (notes, order, last
> access) is stored in `data/sessions-meta.json`.

### Settings UI

Click the **⚙ Settings** button on the dashboard to open the settings panel. There you can:

- Toggle **require password** on access and **change the password** (stored as scrypt hash).
- Configure **Host** and **Port** (requires restart to apply — see below).
- Change terminal **font family** and **font size**.
- Set the **default path** for new sessions (`defaultPath`) — validated on save: must be an absolute, existing directory.
- Select **character encoding** — reopen the terminal after changing.
- Switch **UI language** (English/Vietnamese) — applied immediately.
- Switch **theme** (Dark/Light/Auto) — there is also a compact icon button on the dashboard that cycles through them.
- Adjust login **brute-force protection** parameters (max attempts, time window).

When auth is enabled, changing sensitive items (password, auth, host, port) requires
entering the **current password** to confirm.

### Character encoding

xterm.js only renders **UTF-8**. If your program/system uses a different encoding
(e.g. Chinese GBK/Big5, Korean EUC-KR, Thai TIS-620, Japanese Shift_JIS), the server
**transcodes** bytes ↔ UTF-8 using `iconv-lite`. Pick the right encoding in Settings;
after changing you must **reopen the terminal** (no server restart needed).

### Language

The UI defaults to **English** and can be switched to **Vietnamese** in Settings.
The choice is stored server-side so it applies across all devices. For the i18n
conventions developers must follow: see [`docs/I18N.md`](./docs/I18N.md).

### Copy / Paste & shortcuts

In the terminal screen you can copy / paste two ways:

- **Keyboard shortcuts** (Ubuntu terminal convention): **Ctrl+Shift+C** to copy
  the current selection, **Ctrl+Shift+V** to paste. Note the `Shift` distinguishes
  them from `Ctrl+C` (still the interrupt signal sent to the shell) and `Ctrl+V`.
- **Control-bar buttons** (⧉ copy / ⎘ paste) — handy for touch/mobile devices.

How it works:
- **Ctrl+Shift+V** uses the browser's native `paste` event, reading the **client**
  clipboard directly — it works even over **HTTP**, no HTTPS required.
- The **Paste button** only auto-reads the clipboard in a **secure context** (HTTPS
  or `localhost`). Over **HTTP** the browser blocks the clipboard API, so the button
  opens a dialog for manual paste. To make the Paste button work automatically over
  an IP, use HTTPS (see [HTTPS](#https--automatic-clipboard-over-ip)).
- **Copy** prefers `navigator.clipboard` with an `execCommand('copy')` fallback, so it
  always works, even over HTTP.

### HTTPS / automatic clipboard over IP

Browsers only enable the clipboard API in a **secure context** (`https://` or
`localhost`). Over `http://<IP>` the Paste button cannot auto-read the clipboard.
That is why **HTTPS is enabled by default** (`tls.enabled: true`).

On startup, if no cert exists, the server **auto-generates a self-signed
certificate**: it detects the machine's IPs into the SAN field, stores them in
`data/tls/` (git-ignored), and writes `keyPath`/`certPath` back into `config.json`.
**No manual command required.**

Open `https://<IP>:<port>`. The browser will warn about an untrusted certificate
(self-signed) the first time — click **Advanced → Proceed** once and the Paste
button will auto-read the clipboard.

To run over HTTP (disable TLS), set in `config.json`:

```json
{
  "tls": {
    "enabled": false
  }
}
```

> - The generated cert covers every IPv4 of the machine + `localhost`. If the IP
>   changes or you add a hostname, delete `data/tls/*.pem` and restart to regenerate
>   (or run `./generate-cert.sh <IP/hostname...>` to specify manually).
> - `keyPath`/`certPath` may be absolute or relative to the project root.
> - Cert generation needs `openssl`. If it is missing (or write permission fails)
>   the server logs an error and exits (it does not silently fall back to HTTP) to
>   avoid security confusion.

### Changing the port

The default port is **7171**. If it is already taken on your machine, switch to a free
port by editing the `port` field in `config.json`:

```json
{
  "port": 8080
}
```

Check whether a port is already in use before choosing it:

```bash
# Replace 7171 with the port you want to check
ss -tln | grep ':7171' && echo "IN USE" || echo "FREE"
```

After changing the port, restart the server (or `sudo systemctl restart
terminal-control-center` if running via systemd). Remember to open the new port on
your firewall if you need access from other machines.

## Running manually

```bash
chmod +x start.sh
./start.sh
```

The script checks dependencies (tmux, node), installs `node_modules` if missing,
creates `config.json` if absent, then starts the server.

## Install as a systemd service (auto-start with the OS)

```bash
chmod +x install-service.sh
./install-service.sh
```

The script needs **sudo** to create the unit file at
`/etc/systemd/system/terminal-control-center.service` and enable the service.

Once installed, the service starts automatically on every boot.

### Removing the service

```bash
chmod +x uninstall-service.sh
./uninstall-service.sh
```

### Service management commands

```bash
# Check status
sudo systemctl status terminal-control-center

# Stop
sudo systemctl stop terminal-control-center

# Restart
sudo systemctl restart terminal-control-center

# View live logs
journalctl -u terminal-control-center -f
```

## Install on macOS (launchd) — ⚠️ untested

> **Note:** macOS install scripts are provided but have **not been tested on real
> macOS hardware**. Community confirmation is needed.

Requirements: Node.js 18+, tmux 3.0+ (install via `brew install tmux`).

```bash
chmod +x install-service-macos.sh
./install-service-macos.sh
```

The script creates a LaunchAgent at
`~/Library/LaunchAgents/com.tcc.terminal-control-center.plist` with `KeepAlive`
and `RunAtLoad` (auto-starts on login).

### Removing the macOS service

```bash
chmod +x uninstall-service-macos.sh
./uninstall-service-macos.sh
```

### macOS service management commands

```bash
# Check status
launchctl list | grep com.tcc

# Stop
launchctl unload ~/Library/LaunchAgents/com.tcc.terminal-control-center.plist

# Restart
launchctl unload ~/Library/LaunchAgents/com.tcc.terminal-control-center.plist
launchctl load ~/Library/LaunchAgents/com.tcc.terminal-control-center.plist
```

## REST API

State-changing requests (POST/PUT/DELETE) require the `X-CSRF-Token` header
(token taken from the `tcc_csrf` cookie the server issues automatically).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sessions` | List tmux sessions (with note, order, lastAccess) |
| `POST` | `/api/sessions` | Create a new session (body: `{name, shell?}` — shell must be in `config.shells`) |
| `DELETE` | `/api/sessions/:name` | Kill a session by name |
| `POST` | `/api/sessions/:name/touch` | Update last access time |
| `PUT` | `/api/sessions/:name/note` | Save a note for the session |
| `PUT` | `/api/sessions/:name/rename` | Rename a session |
| `PUT` | `/api/sessions/order` | Save sort order (drag-and-drop) |
| `POST` | `/api/sessions/:name/scroll` | Scroll session content (tmux copy-mode): `up`/`down`/`top`/`bottom` |
| `GET` | `/api/settings` | Get current config (no secrets) |
| `PUT` | `/api/settings` | Update config |
| `POST` | `/api/login` | Log in (when auth is enabled) |
| `POST` | `/api/logout` | Log out |
| `GET` | `/api/config` | Get public config + version + font + language + theme + shells + warnings |

### WebSocket

| Endpoint | Description |
|---|---|
| `WS /ws/session/:name` | Realtime terminal connection to a tmux session |

## Directory structure

```
Terminal-Control-Center/
├── config.example.json    # Sample config
├── config.json            # Real config (git-ignored)
├── CHANGELOG.md           # Change history by version
├── data/                  # Session metadata (git-ignored, created at runtime)
├── docs/                  # Project documentation (see below)
├── start.sh               # Manual run script
├── install-service.sh     # Install systemd service (Linux)
├── uninstall-service.sh   # Remove systemd service (Linux)
├── install-service-macos.sh   # Install launchd service (macOS, untested)
├── uninstall-service-macos.sh # Remove launchd service (macOS, untested)
├── package.json
├── public/                # Frontend (HTML/CSS/JS)
├── src/                   # Node.js backend
│   ├── app.js             # buildApp + computeWarnings (Fastify app, no listen)
│   └── server.js          # Entry point (reads config, calls buildApp, listens)
└── test/                  # Unit tests + integration tests
```

## Documentation

Detailed docs live in the [`docs/`](./docs) directory:

- [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — overall architecture, data flow.
- [`DESIGN.md`](./docs/DESIGN.md) — design philosophy & technical decisions (trade-offs).
- [`CODEMAP.md`](./docs/CODEMAP.md) — source map, shared utilities.
- [`I18N.md`](./docs/I18N.md) — internationalization conventions (MUST follow when editing UI).
- [`TODO.md`](./docs/TODO.md) — to-do list.
- [`ROADMAP.md`](./docs/ROADMAP.md) — direction by version.

Change history: [`CHANGELOG.md`](./CHANGELOG.md).

## ⚠️ SECURITY WARNING

> **A web terminal = remote command execution on the host.** Think carefully before exposing it to a network.

- **Always enable `authEnabled: true`** and set a strong password when running outside localhost.
- **Change `sessionSecret`** to a long random string (≥ 32 characters).
- **Bind `host: "127.0.0.1"`** if you only use it locally.
- **Do not expose to the internet** without HTTPS + a reverse proxy (nginx/caddy).
- For remote access, use a **VPN** or **SSH tunnel** instead of opening a public port.
- Restrict access with a firewall (`ufw allow from <LAN_IP> to any port 7171`).
