# Power Profile Cycler

A GNOME Shell extension that cycles through power profiles with a keyboard shortcut and shows a GNOME-style center-bottom OSD for the active profile.

## Features

- Cycle between `power-saver`, `balanced`, and `performance`
- User-configurable keyboard shortcut from the GNOME Extensions preferences window
- Optional GNOME-style OSD when the profile changes
- No panel icon

## Requirements

- GNOME Shell 49 or 50
- `power-profiles-daemon`
- `powerprofilesctl`

## Installation

### Option 1: Install from GitHub release

1. Open the latest GitHub release for this repository.
2. Download `power-profile-cycler@solder3t.shell-extension.zip`.
3. Do not extract that file. GNOME installs the extension from the zip itself.
4. Install it with:

```bash
gnome-extensions install --force power-profile-cycler@solder3t.shell-extension.zip
```

5. Enable it:

```bash
gnome-extensions enable power-profile-cycler@solder3t
```

6. Log out and back in if GNOME Shell does not pick it up immediately.

### Option 2: Install from a source checkout

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

3. Enable the extension:

```bash
gnome-extensions enable power-profile-cycler@solder3t
```

4. Reload GNOME Shell extensions:

- Log out and back in, or
- Disable and re-enable the extension from the Extensions app

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

### Automatic release from a tag push

1. Commit your changes.
2. Create and push a tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

3. GitHub Actions builds `power-profile-cycler@solder3t.shell-extension.zip`.
4. After the build succeeds, the workflow creates or updates the GitHub release automatically.
5. The built extension zip is attached to that release as a release asset.

### Manual release from GitHub Actions

1. Make sure the tag already exists on GitHub, for example `v1.0.0`.
2. Open the `Release Extension` workflow in the `Actions` tab.
3. Click `Run workflow`.
4. Set `create_release` to `true`.
5. Set `tag_name` to the existing tag you want to publish, for example `v1.0.0`.
6. Run the workflow.

The workflow will build the extension zip and then create or update the GitHub release for that tag.

## License

MIT
