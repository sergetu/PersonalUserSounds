    showAudioDiagnosticsModal(filePath, rows) {
        this.ensureUi();
        this.ui?.openDiagnostics?.(filePath || "", Array.isArray(rows) ? rows : []);
    }
