    getSettingsPanel() {
        const React = BdApi.React;
        const h = React.createElement;
        const plugin = this;

        function SettingsPanelHost() {
            const containerRef = React.useRef(null);
            React.useEffect(() => {
                plugin.ensureUi();
                const container = containerRef.current;
                if (container && plugin.ui) plugin.ui.mountPanel(container);
                return () => {
                    try {
                        plugin.ui?.unmountPanel?.();
                    }
                    catch (error) {
                        plugin.logDebug("UI unmount failed", error);
                    }
                };
            }, []);
            return h("div", {ref: containerRef, className: "puss-panel-host"});
        }

        return h(SettingsPanelHost);
    }
