# Power Profile Cycler

A GNOME Shell extension that cycles through power profiles with a keyboard shortcut and shows a GNOME-style center-bottom OSD for the active profile.

## Features

- Cycle between `power-saver`, `balanced`, and `performance`
- User-configurable keyboard shortcut from the GNOME Extensions preferences window
- Optional GNOME-style OSD when the profile changes
- No panel icon

## Requirements

- GNOME Shell 50
- `power-profiles-daemon`
- `powerprofilesctl`

## Installation

### From source checkout

1. Copy only the extension files into your local GNOME Shell extensions directory:

```bash
UUID="power-profile-cycler@solder3t"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"

mkdir -p "$DEST/schemas"
cp extension.js metadata.json prefs.js "$DEST/"
cp schemas/org.gnome.shell.extensions.power-profile-cycler.gschema.xml "$DEST/schemas/"
```

2. Compile the schema:

```bash
glib-compile-schemas "$DEST/schemas"
```

3. Reload GNOME Shell extensions:

- Log out and back in, or
- Disable and re-enable the extension from the Extensions app

4. Enable the extension:

```bash
gnome-extensions enable power-profile-cycler@solder3t
```

### From packaged zip

Build the zip locally:

```bash
./scripts/package.sh
```

Then install it with:

```bash
gnome-extensions install --force dist/power-profile-cycler@solder3t.shell-extension.zip
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
UUID="power-profile-cycler@solder3t"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"

cp extension.js metadata.json prefs.js "$DEST/"
cp schemas/org.gnome.shell.extensions.power-profile-cycler.gschema.xml "$DEST/schemas/"
glib-compile-schemas "$DEST/schemas"
```

## Packaging

Build a distributable extension zip locally with:

```bash
./scripts/package.sh
```

The output is written to `dist/` as `power-profile-cycler@solder3t.shell-extension.zip`.

## GitHub Releases

- Push a tag like `v1.0.0`
- GitHub Actions will build the extension zip
- The workflow uploads the zip as both an artifact and a GitHub release asset

## License

MIT
