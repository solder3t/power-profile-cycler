# Power Profile Cycler

A GNOME Shell extension that cycles through power profiles with a keyboard shortcut and shows a GNOME-style center-bottom OSD for the active profile.

## Features

- Cycle between `power-saver`, `balanced`, and `performance`
- User-configurable keyboard shortcut from the GNOME Extensions preferences window
- Optional GNOME-style OSD when the profile changes
- No panel icon or menu

## Requirements

- GNOME Shell 50
- `power-profiles-daemon`
- `powerprofilesctl`

## Installation

### From source

1. Copy this extension into your local GNOME Shell extensions directory:

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/power-profile-cycler@solder3t
cp -r . ~/.local/share/gnome-shell/extensions/power-profile-cycler@solder3t
```

2. Compile the schema:

```bash
glib-compile-schemas ~/.local/share/gnome-shell/extensions/power-profile-cycler@solder3t/schemas
```

3. Reload GNOME Shell extensions:

- Log out and back in, or
- Disable and re-enable the extension from the Extensions app

4. Enable the extension:

```bash
gnome-extensions enable power-profile-cycler@solder3t
```

## Configuration

- Open the Extensions app
- Open preferences for `Power Profile Cycler`
- Set your preferred shortcut
- Optionally enable or disable the OSD

Default shortcut: `Ctrl+Alt+P`

## Usage

Press the configured shortcut to cycle to the next available power profile.

## Development

To update the installed local copy during development:

```bash
cp extension.js metadata.json prefs.js ~/.local/share/gnome-shell/extensions/power-profile-cycler@solder3t/
cp schemas/org.gnome.shell.extensions.power-profile-cycler.gschema.xml ~/.local/share/gnome-shell/extensions/power-profile-cycler@solder3t/schemas/
glib-compile-schemas ~/.local/share/gnome-shell/extensions/power-profile-cycler@solder3t/schemas
```

## License

MIT
