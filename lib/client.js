window.__ModuleLoader__.load({
	id: "dsh-llm-fallback/client",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region lib/types/client/FallbackCard.js
		/** Namespace owned by the llm-fallback browser card. */
		const NS = "llm-fallback";
		const STORE_KEY = "fallbackCard";
		/** Initial form state shape that the card renders. */
		const INITIAL = {
			fallbackChain: [],
			maxFailuresPerModel: 1
		};
		/**
		* Controller that binds a Zustand snapshot store to the Host settings scope,
		* and exposes the reactive face that the settings tab dispatches into.
		*/
		var FallbackCardController = class {
			#scope;
			#store;
			constructor(scope) {
				this.#scope = scope;
				this.#store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)(INITIAL);
				scope.subscribe(() => this.#sync());
				this.#sync();
			}
			#sync() {
				const snap = this.#scope.getSnapshot();
				this.#store.set({
					fallbackChain: snap.value?.fallbackChain ?? [],
					maxFailuresPerModel: snap.value?.maxFailuresPerModel ?? 1
				});
			}
			/** Return the reactive store the slot framework reads through `useFallbackCard`. */
			get store() { return this.#store; }
			/** Field readers the card uses to display each setting. */
			getters() {
				return {
					get fallbackChain() {
						return this.#store.getSnapshot().fallbackChain;
					},
					get maxFailuresPerModel() {
						return this.#store.getSnapshot().maxFailuresPerModel;
					}
				};
			}
			/** Set the fallback chain from user input. */
			setFallbackChain(chain) {
				this.#scope.set("fallbackChain", chain);
			}
			/** Set maxFailuresPerModel from user input. */
			setMaxFailuresPerModel(n) {
				this.#scope.set("maxFailuresPerModel", n);
			}
		};
		//#endregion
		//#region lib/types/client/locales.js
		const en = {
			fallbackTitle: "LLM Fallback",
			fallbackDescription: "Automatic model fallback when requests fail",
			fallbackChain: "Fallback chain (JSON)",
			fallbackChainHint: "Ordered list of provider+model pairs to try. Example: [{\"provider\":\"deepseek\",\"model\":\"deepseek-chat\"}, {\"provider\":\"openai\",\"model\":\"gpt-4o\"}]",
			maxFailuresPerModel: "Max failures per model",
			maxFailuresPerModelHint: "Consecutive failures before switching. Default: 1."
		};
		const zh = {
			fallbackTitle: "LLM 降级",
			fallbackDescription: "请求失败时自动切换到下一个模型",
			fallbackChain: "降级链（JSON）",
			fallbackChainHint: "按顺序尝试的 provider+model 配对列表。示例：[{\"provider\":\"deepseek\",\"model\":\"deepseek-chat\"}, {\"provider\":\"openai\",\"model\":\"gpt-4o\"}]",
			maxFailuresPerModel: "每模型最大失败次数",
			maxFailuresPerModelHint: "连续失败多少次后切换。默认：1。"
		};
		//#endregion
		//#region lib/types/client/index.js
		const inject = ["slots", "locale", "settingsScope"];
		/** Minimal card component rendered inside the settings plugins section. */
		function FallbackCard(props) {
			const { t } = props;
			const { fallbackChain, maxFailuresPerModel } = props.useFallbackCard(s => ({
				fallbackChain: s.fallbackChain,
				maxFailuresPerModel: s.maxFailuresPerModel
			}));
			const [chainText, setChainText] = react.useState(
				JSON.stringify(fallbackChain, null, 2)
			);
			const [maxText, setMaxText] = react.useState(String(maxFailuresPerModel));
			react.useEffect(() => {
				setChainText(JSON.stringify(fallbackChain, null, 2));
			}, [fallbackChain]);
			react.useEffect(() => {
				setMaxText(String(maxFailuresPerModel));
			}, [maxFailuresPerModel]);
			return (
				react_jsx_runtime.jsxs("div", {
					className: "dsh-fallback-card",
					children: [
						react_jsx_runtime.jsx("h3", { children: t("fallbackTitle") }),
						react_jsx_runtime.jsx("p", { className: "hint", children: t("fallbackDescription") }),
						react_jsx_runtime.jsx("label", {
							children: t("fallbackChain")
						}),
						react_jsx_runtime.jsx("textarea", {
							rows: 5,
							value: chainText,
							onChange: (e) => {
								setChainText(e.target.value);
								try {
									const parsed = JSON.parse(e.target.value);
									if (Array.isArray(parsed)) props.setFallbackChain(parsed);
								} catch {}
							}
						}),
						react_jsx_runtime.jsx("p", { className: "hint", children: t("fallbackChainHint") }),
						react_jsx_runtime.jsx("label", {
							children: t("maxFailuresPerModel")
						}),
						react_jsx_runtime.jsx("input", {
							type: "number",
							min: 1,
							value: maxText,
							onChange: (e) => {
								const n = parseInt(e.target.value, 10);
								if (!isNaN(n) && n >= 1) {
									setMaxText(e.target.value);
									props.setMaxFailuresPerModel(n);
								}
							}
						}),
						react_jsx_runtime.jsx("p", { className: "hint", children: t("maxFailuresPerModelHint") })
					]
				})
			);
		}
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "llm-fallback: locale");
			const controller = new FallbackCardController(ctx.settingsScope.bind({ namespace: NS }));
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				key: NS,
				locale: NS,
				inject: () => ({
					hooks: { [STORE_KEY]: controller.store },
					setFallbackChain: (chain) => controller.setFallbackChain(chain),
					setMaxFailuresPerModel: (n) => controller.setMaxFailuresPerModel(n)
				})
			}, FallbackCard));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
//# sourceMappingURL=client.js.map
