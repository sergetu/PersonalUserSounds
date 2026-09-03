    openUserModal(user) {
        this.ensureUi();
        if (!this.ui) return;
        const userId = String(user.id);
        const existing = this.settings.users[userId] || this.makeUserSettings(user);
        const draft = this.normalizeUserSettings(existing);
        const identity = draft.identity || {};
        this.ui.openUserModal({
            userId,
            avatar: identity.avatar || this.getAvatarUrl(user) || "",
            name: this.identityName(identity, userId),
            username: identity.username || user.username || "",
            settings: draft,
            canReset: Boolean(this.settings.users[userId])
        });
    }
