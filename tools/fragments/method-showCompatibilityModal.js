    showCompatibilityModal() {
        this.ensureUi();
        if (!this.ui) return;
        const rows = [
            ["Dispatcher", Boolean(this.modules.Dispatcher)],
            ["SoundUtils", Boolean(this.modules.SoundUtils) || this.soundPatchReady],
            ["DesktopNotification", this.notificationPatchReady],
            ["CallStore", Boolean(this.modules.CallStore)],
            ["VoiceStateStore", Boolean(this.modules.VoiceStateStore)],
            ["Context menu patch", Boolean(this.contextMenuUnpatch)],
            ["Sound prototype patch", this.soundPrototypePatched],
            ["Active unpatches", this.unpatches.length > 0]
        ];
        this.ui.openCompatibility(rows);
    }
