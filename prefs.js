import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const EXTENSION_SCHEMA_ID = 'power-profile-cycler@solder3t';
const KEYBOARD_SHORTCUT_KEY = 'keyboard-shortcut';
const SHOW_OSD_KEY = 'show-osd';

const ShortcutButton = GObject.registerClass({
    GTypeName: 'PowerProfileCyclerShortcutButton',
}, class ShortcutButton extends Gtk.Button {
    _init(settings, settingsKey) {
        super._init({
            valign: Gtk.Align.CENTER,
            has_frame: false,
        });

        this._settings = settings;
        this._settingsKey = settingsKey;
        this._label = new Gtk.ShortcutLabel({
            disabled_text: _('New accelerator...'),
            valign: Gtk.Align.CENTER,
        });

        this.set_child(this._label);
        this.connect('clicked', this._openEditor.bind(this));
        this._settings.connect(`changed::${this._settingsKey}`, () => this._sync());

        this._sync();
    }

    _sync() {
        let [shortcut] = this._settings.get_strv(this._settingsKey);
        this._label.set_accelerator(shortcut || '');
    }

    _openEditor() {
        this._editor = new Adw.Window({
            modal: true,
            hide_on_close: true,
            transient_for: this.get_root(),
            width_request: 420,
            height_request: 220,
            content: new Adw.StatusPage({
                icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic',
                title: _('Set Shortcut'),
                description: _('Press a new key combination. Press Backspace to clear it.'),
            }),
        });

        let keyController = new Gtk.EventControllerKey();
        keyController.connect('key-pressed', this._onKeyPressed.bind(this));
        this._editor.add_controller(keyController);
        this._editor.present();
    }

    _onKeyPressed(_widget, keyval, keycode, state) {
        let mask = state & Gtk.accelerator_get_default_mod_mask();
        mask &= ~Gdk.ModifierType.LOCK_MASK;

        if (!mask && keyval === Gdk.KEY_Escape) {
            this._editor.close();
            return Gdk.EVENT_STOP;
        }

        if (keyval === Gdk.KEY_BackSpace) {
            this._settings.set_strv(this._settingsKey, []);
            this._editor.close();
            return Gdk.EVENT_STOP;
        }

        if (!_isValidBinding(mask, keycode, keyval) || !_isValidAccel(mask, keyval))
            return Gdk.EVENT_STOP;

        let shortcut = Gtk.accelerator_name_with_keycode(null, keyval, keycode, mask);
        this._settings.set_strv(this._settingsKey, [shortcut]);
        this._editor.close();
        return Gdk.EVENT_STOP;
    }
});

export default class PowerProfileCyclerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        let settings = this.getSettings(EXTENSION_SCHEMA_ID);

        window.set_default_size(560, 420);

        let page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'preferences-system-symbolic',
        });

        let behaviorGroup = new Adw.PreferencesGroup({
            title: _('Behavior'),
            description: _('Choose how the extension reacts when you cycle power profiles.'),
        });

        let shortcutRow = new Adw.ActionRow({
            title: _('Cycle Shortcut'),
            subtitle: _('Keyboard shortcut used to cycle to the next available profile.'),
        });
        let shortcutButton = new ShortcutButton(settings, KEYBOARD_SHORTCUT_KEY);
        let shortcutResetButton = new Gtk.Button({
            icon_name: 'edit-undo-symbolic',
            tooltip_text: _('Reset to default'),
            valign: Gtk.Align.CENTER,
            css_classes: ['flat', 'circular'],
        });
        shortcutResetButton.connect('clicked', () => settings.reset(KEYBOARD_SHORTCUT_KEY));
        shortcutRow.add_suffix(shortcutButton);
        shortcutRow.add_suffix(shortcutResetButton);
        behaviorGroup.add(shortcutRow);

        let showOsdRow = new Adw.SwitchRow({
            title: _('Show On-Screen Display'),
            subtitle: _('Show the GNOME-style bottom pill when the active power profile changes.'),
        });
        settings.bind(SHOW_OSD_KEY, showOsdRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        behaviorGroup.add(showOsdRow);

        let infoGroup = new Adw.PreferencesGroup({
            title: _('Notes'),
        });
        infoGroup.add(new Adw.ActionRow({
            title: _('Power Profiles'),
            subtitle: _('The extension only cycles through profiles exposed by power-profiles-daemon on your system.'),
        }));

        page.add(behaviorGroup);
        page.add(infoGroup);
        window.add(page);
    }
}

function _isKeyvalForbidden(keyval) {
    return [
        Gdk.KEY_Home,
        Gdk.KEY_Left,
        Gdk.KEY_Up,
        Gdk.KEY_Right,
        Gdk.KEY_Down,
        Gdk.KEY_Page_Up,
        Gdk.KEY_Page_Down,
        Gdk.KEY_End,
        Gdk.KEY_Tab,
        Gdk.KEY_KP_Enter,
        Gdk.KEY_Return,
        Gdk.KEY_Mode_switch,
    ].includes(keyval);
}

function _isValidBinding(mask, keycode, keyval) {
    if ((mask === 0 || mask === Gdk.ModifierType.SHIFT_MASK) && keycode !== 0) {
        if (
            (keyval >= Gdk.KEY_a && keyval <= Gdk.KEY_z) ||
            (keyval >= Gdk.KEY_A && keyval <= Gdk.KEY_Z) ||
            (keyval >= Gdk.KEY_0 && keyval <= Gdk.KEY_9) ||
            (keyval === Gdk.KEY_space && mask === 0) ||
            _isKeyvalForbidden(keyval)
        )
            return false;
    }

    return true;
}

function _isValidAccel(mask, keyval) {
    return Gtk.accelerator_valid(keyval, mask) || (keyval === Gdk.KEY_Tab && mask !== 0);
}
