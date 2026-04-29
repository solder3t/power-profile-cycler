import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const EXTENSION_SCHEMA_ID = 'power-profile-cycler@solder3t';
const POWER_PROFILES_BUS_NAME = 'org.freedesktop.UPower.PowerProfiles';
const POWER_PROFILES_OBJECT_PATH = '/org/freedesktop/UPower/PowerProfiles';
const POWER_PROFILES_INTERFACE_NAME = 'org.freedesktop.UPower.PowerProfiles';
const POWER_PROFILES_INTERFACE = `
<node>
    <interface name="org.freedesktop.UPower.PowerProfiles">
        <property name="ActiveProfile" type="s" access="readwrite"/>
        <property name="Profiles" type="aa{sv}" access="read"/>
    </interface>
</node>`;

const PowerProfilesProxy = Gio.DBusProxy.makeProxyWrapper(POWER_PROFILES_INTERFACE);

export default class PowerProfileCyclerExtension extends Extension {
    enable() {
        this._settings = this.getSettings(EXTENSION_SCHEMA_ID);
        this._powerProfilesProxy = null;
        this._powerProfilesChangedId = 0;
        this._shortcutChangedId = 0;
        this._lastKnownProfile = 'balanced';

        this._connectPowerProfilesProxy();
        this._setupKeyboardShortcut();
    }

    disable() {
        Main.wm.removeKeybinding('keyboard-shortcut');

        if (this._shortcutChangedId) {
            this._settings.disconnect(this._shortcutChangedId);
            this._shortcutChangedId = 0;
        }

        if (this._powerProfilesProxy && this._powerProfilesChangedId) {
            this._powerProfilesProxy.disconnect(this._powerProfilesChangedId);
            this._powerProfilesChangedId = 0;
        }

        this._powerProfilesProxy = null;
        this._settings = null;
    }

    _connectPowerProfilesProxy() {
        this._powerProfilesProxy = new PowerProfilesProxy(
            Gio.DBus.system,
            POWER_PROFILES_BUS_NAME,
            POWER_PROFILES_OBJECT_PATH,
            (proxy, error) => {
                if (error) {
                    console.error(`Error creating power profiles proxy: ${error.message}`);
                    this._powerProfilesProxy = null;
                    return;
                }

                this._powerProfilesChangedId = proxy.connect('g-properties-changed', () => {
                    this._refreshCachedProfile();
                });
                this._refreshCachedProfile();
            }
        );
    }

    _setupKeyboardShortcut() {
        this._rebindKeyboardShortcut();
        this._shortcutChangedId = this._settings.connect('changed::keyboard-shortcut', () => {
            this._rebindKeyboardShortcut();
        });
    }

    _rebindKeyboardShortcut() {
        Main.wm.removeKeybinding('keyboard-shortcut');

        let shortcuts = this._settings.get_strv('keyboard-shortcut');
        if (shortcuts.length === 0 || !shortcuts[0])
            return;

        Main.wm.addKeybinding(
            'keyboard-shortcut',
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => this._cyclePowerProfile()
        );
    }

    _getCachedProperty(name) {
        if (!this._powerProfilesProxy)
            return null;

        try {
            return this._powerProfilesProxy.get_cached_property(name);
        } catch (e) {
            console.error(`Error reading power profile property ${name}: ${e}`);
            return null;
        }
    }

    _refreshCachedProfile() {
        let activeProfileVariant = this._getCachedProperty('ActiveProfile');
        if (!activeProfileVariant)
            return;

        let activeProfile = activeProfileVariant.unpack();
        if (activeProfile)
            this._lastKnownProfile = activeProfile;
    }

    _getAvailablePowerProfiles() {
        let profilesVariant = this._getCachedProperty('Profiles');
        if (profilesVariant) {
            let profiles = profilesVariant.deepUnpack()
                .map(profileInfo => {
                    let profile = profileInfo.Profile ?? profileInfo['Profile'];
                    return profile instanceof GLib.Variant ? profile.unpack() : profile;
                })
                .filter(profile => profile);

            if (profiles.length > 0)
                return profiles;
        }

        return ['power-saver', 'balanced', 'performance'];
    }

    _getActivePowerProfile() {
        this._refreshCachedProfile();
        return this._lastKnownProfile;
    }

    _setPowerProfile(profile) {
        let [success, , stderr] = GLib.spawn_command_line_sync(`powerprofilesctl set ${profile}`);
        if (!success)
            throw new Error(stderr.toString().trim() || `Failed to set profile to ${profile}`);

        this._lastKnownProfile = profile;
        this._showProfileOsd(profile);
    }

    _cyclePowerProfile() {
        try {
            let profiles = this._getAvailablePowerProfiles();
            if (profiles.length === 0)
                return;

            let currentProfile = this._getActivePowerProfile();
            let currentIndex = profiles.indexOf(currentProfile);
            if (currentIndex === -1)
                currentIndex = 0;

            let nextProfile = profiles[(currentIndex + 1) % profiles.length];
            this._setPowerProfile(nextProfile);
        } catch (e) {
            console.error(`Error cycling power profile: ${e}`);
        }
    }

    _getProfileDisplayName(profile) {
        switch (profile) {
        case 'performance':
            return 'Performance';
        case 'balanced':
            return 'Balanced';
        case 'power-saver':
            return 'Power Saver';
        default:
            return profile.charAt(0).toUpperCase() + profile.slice(1);
        }
    }

    _getProfileIconName(profile) {
        switch (profile) {
        case 'performance':
            return 'power-profile-performance-symbolic';
        case 'balanced':
            return 'power-profile-balanced-symbolic';
        case 'power-saver':
            return 'power-profile-power-saver-symbolic';
        default:
            return 'power-profile-balanced-symbolic';
        }
    }

    _showProfileOsd(profile) {
        if (!this._settings.get_boolean('show-osd'))
            return;

        try {
            let icon = Gio.Icon.new_for_string(this._getProfileIconName(profile));
            let label = this._getProfileDisplayName(profile);
            let monitorIndex = Main.layoutManager.primaryIndex;

            Main.osdWindowManager.showOne(monitorIndex, icon, label, null);
        } catch (e) {
            console.error(`Error showing power profile OSD: ${e}`);
        }
    }
}
