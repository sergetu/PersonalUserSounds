    ensureUi() {
        if (this.ui) return this.ui;
        try {
            this.ui = new PussUI({
                host: this.makeUiHost(),
                styles: typeof PUSS_STYLES === "string" ? PUSS_STYLES : "",
                templates: PUSS_TEMPLATES && typeof PUSS_TEMPLATES === "object" ? PUSS_TEMPLATES : {}
            });
        }
        catch (error) {
            this.ui = null;
            this.logDebug("UI initialization failed", error);
        }
        return this.ui;
    }

    initUi() {
        this.ensureUi();
    }

    makeUiHost() {
        const plugin = this;
        return {
            getSettings() {
                return plugin.cloneSettings(plugin.settings);
            },
            commitSettings(next) {
                plugin.settings = plugin.migrateSettings(next);
                plugin.saveSettings();
            },
            resolveUser(userId) {
                const user = plugin.modules.UserStore?.getUser?.(userId);
                if (!user) return null;
                return {
                    id: String(user.id),
                    username: user.username || "",
                    globalName: user.globalName || user.global_name || "",
                    avatar: plugin.getAvatarUrl(user) || ""
                };
            },
            pickAudioFile() {
                return plugin.pickAudioFile();
            },
            preview(config, volume) {
                plugin.audioManager.preview(config, volume);
            },
            stopPreview() {
                plugin.audioManager.stop("preview");
            },
            diagnose(config, volume) {
                plugin.audioManager.diagnose(config, volume);
            },
            saveUserDraft(userId, draft) {
                let user = plugin.modules.UserStore?.getUser?.(userId);
                if (!user) user = {id: userId, username: (draft.identity || {}).username || userId};
                const next = plugin.normalizeUserSettings(draft);
                next.identity = plugin.makeIdentity(user);
                plugin.settings.users[userId] = next;
                plugin.saveSettings();
                plugin.toast(plugin.t("saved"), "success");
                plugin.initVoiceState();
            },
            removeUser(userId) {
                delete plugin.settings.users[userId];
                plugin.saveSettings();
            },
            resetUser(userId) {
                delete plugin.settings.users[userId];
                plugin.saveSettings();
                plugin.toast(plugin.t("reset"), "success");
            },
            addUserById(userId) {
                const user = plugin.modules.UserStore?.getUser?.(userId);
                if (!user) return {error: "userNotFound"};
                plugin.ensureUserSettings(user);
                plugin.saveSettings();
                return {ok: true};
            },
            toast(message, type) {
                plugin.toast(message, type);
            },
            fileExists(path) {
                return plugin.fileExists(path);
            },
            identityName(identity, fallback) {
                return plugin.identityName(identity, fallback);
            }
        };
    }
