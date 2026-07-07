import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const EXTENSION_SCHEMA_ID = 'power-profile-cycler@solder3t';

const NEW_BUS_NAME = 'org.freedesktop.UPower.PowerProfiles';
const NEW_OBJECT_PATH = '/org/freedesktop/UPower/PowerProfiles';
const NEW_INTERFACE = `
<node>
    <interface name="org.freedesktop.UPower.PowerProfiles">
        <property name="ActiveProfile" type="s" access="readwrite"/>
        <property name="Profiles" type="aa{sv}" access="read"/>
    </interface>
</node>`;

const LEGACY_BUS_NAME = 'net.hadess.PowerProfiles';
const LEGACY_OBJECT_PATH = '/net/hadess/PowerProfiles';
const LEGACY_INTERFACE = `
<node>
    <interface name="net.hadess.PowerProfiles">
        <property name="ActiveProfile" type="s" access="readwrite"/>
        <property name="Profiles" type="aa{sv}" access="read"/>
    </interface>
</node>`;

const NewPowerProfilesProxy = Gio.DBusProxy.makeProxyWrapper(NEW_INTERFACE);
const LegacyPowerProfilesProxy = Gio.DBusProxy.makeProxyWrapper(LEGACY_INTERFACE);

export default class PowerProfileCyclerExtension extends Extension {
    enable() {
        this._enabled = true;
        this._settings = this.getSettings(EXTENSION_SCHEMA_ID);
        this._powerProfilesProxy = null;
        this._powerProfilesChangedId = 0;
        this._shortcutChangedId = 0;
        this._lastKnownProfile = 'balanced';

        this._connectPowerProfilesProxy();
        this._setupKeyboardShortcut();
    }

    disable() {
        this._enabled = false;
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

    _connectProxy(busName, objectPath, proxyClass, callback) {
        return new proxyClass(
            Gio.DBus.system,
            busName,
            objectPath,
            (proxy, error) => {
                if (error || !proxy.g_name_owner) {
                    callback(null, error || new Error(`No owner for bus name ${busName}`));
                    return;
                }
                callback(proxy, null);
            }
        );
    }

    _connectPowerProfilesProxy() {
        this._powerProfilesProxy = null;

        this._connectProxy(NEW_BUS_NAME, NEW_OBJECT_PATH, NewPowerProfilesProxy, (proxy, error) => {
            if (!this._enabled)
                return;

            if (proxy) {
                this._powerProfilesProxy = proxy;
                this._powerProfilesChangedId = proxy.connect('g-properties-changed', () => {
                    this._refreshCachedProfile();
                });
                this._refreshCachedProfile();
                console.log(`Power Profile Cycler: Connected to ${NEW_BUS_NAME}`);
            } else {
                console.log(`Power Profile Cycler: ${NEW_BUS_NAME} not available (${error?.message}). Trying legacy fallback...`);
                this._connectProxy(LEGACY_BUS_NAME, LEGACY_OBJECT_PATH, LegacyPowerProfilesProxy, (legacyProxy, legacyError) => {
                    if (!this._enabled)
                        return;

                    if (legacyProxy) {
                        this._powerProfilesProxy = legacyProxy;
                        this._powerProfilesChangedId = legacyProxy.connect('g-properties-changed', () => {
                            this._refreshCachedProfile();
                        });
                        this._refreshCachedProfile();
                        console.log(`Power Profile Cycler: Connected to legacy ${LEGACY_BUS_NAME}`);
                    } else {
                        console.error(`Power Profile Cycler: Failed to connect to any power-profiles-daemon D-Bus interface: ${legacyError?.message}`);
                    }
                });
            }
        });
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

    _refreshCachedProfile() {
        if (!this._powerProfilesProxy)
            return;

        try {
            let activeProfile = this._powerProfilesProxy.ActiveProfile;
            if (activeProfile instanceof GLib.Variant)
                activeProfile = activeProfile.unpack();

            if (activeProfile)
                this._lastKnownProfile = activeProfile;
        } catch (e) {
            console.error(`Error refreshing cached power profile: ${e}`);
        }
    }

    _getAvailablePowerProfiles() {
        if (!this._powerProfilesProxy)
            return ['power-saver', 'balanced', 'performance'];

        try {
            let profiles = this._powerProfilesProxy.Profiles;
            if (profiles) {
                if (profiles instanceof GLib.Variant)
                    profiles = profiles.deepUnpack();

                if (Array.isArray(profiles)) {
                    let unpackedProfiles = profiles.map(profileInfo => {
                        let profile = profileInfo.Profile ?? profileInfo['Profile'];
                        if (profile instanceof GLib.Variant)
                            return profile.unpack();
                        return profile;
                    }).filter(profile => typeof profile === 'string');

                    if (unpackedProfiles.length > 0)
                        return unpackedProfiles;
                }
            }
        } catch (e) {
            console.error(`Error getting available power profiles: ${e}`);
        }

        return ['power-saver', 'balanced', 'performance'];
    }

    _getActivePowerProfile() {
        this._refreshCachedProfile();
        return this._lastKnownProfile;
    }

    _setPowerProfile(profile) {
        if (!this._powerProfilesProxy)
            throw new Error('Power profiles proxy is not connected');

        try {
            this._powerProfilesProxy.ActiveProfile = profile;
            this._lastKnownProfile = profile;
            this._showProfileOsd(profile);
        } catch (e) {
            console.error(`Error setting power profile to ${profile}: ${e}`);
            throw e;
        }
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
