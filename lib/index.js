/**
 * dsh-llm-fallback — LLM model fallback plugin for DeepSeek Harness.
 *
 * Automatically switches to the next model in the configured fallback chain
 * when a model request fails. Cycles back to the first model when the last
 * one is exhausted.
 *
 * ## Configuration
 *
 * All configuration is managed through the **DSH Settings UI**:
 *
 * 1. Open DSH → **Settings** → find **llm-fallback** section
 * 2. Add your provider+model pairs to the fallback chain
 * 3. Adjust failure threshold and trigger codes as needed
 *
 * No need to edit `cordis.patch.yml` — the plugin reads config entirely
 * from the DSH settings system and updates live.
 *
 * @module dsh-llm-fallback
 */

import { Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings';

// ─── Plugin identity ─────────────────────────────────────────────────────────

export const name = 'llm-fallback';
export const inject = ['agents', 'settings'];

// ─── Config schema ────────────────────────────────────────────────────────────

/** One entry in the fallback chain: a specific provider+model pair. */
const ModelEntrySchema = z.object({
	/** Provider route ID — must match a registered adapter route. */
	provider: z.string().min(1),
	/** Model ID — must be valid for that provider. */
	model: z.string().min(1),
});

/** Runtime schema for the plugin config. Stored in DSH settings.yaml. */
export const Config = z.object({
	/**
	 * Ordered list of provider+model pairs to try in sequence.
	 * When the current model fails, the plugin cycles to the next entry.
	 * If the last entry also fails, it loops back to the first.
	 *
	 * Example:
	 * ```yaml
	 * fallbackChain:
	 *   - provider: deepseek
	 *     model: deepseek-chat
	 *   - provider: deepseek
	 *     model: deepseek-reasoner
	 *   - provider: openai
	 *     model: gpt-4o
	 * ```
	 */
	fallbackChain: z.array(ModelEntrySchema).default([]),
	/**
	 * Failure codes that trigger fallback. Subset of LlmFailure.code values.
	 * Default covers the most common transient errors.
	 */
	fallbackOn: z
		.array(z.string().min(1))
		.default([
			'RATE_LIMIT',
			'SERVER',
			'TIMEOUT',
			'TRANSPORT',
			'EMPTY_RESPONSE',
		]),
	/**
	 * Maximum consecutive failures for one model before switching to the next.
	 * Set to `1` to fail-fast; increase to let the current model retry more.
	 */
	maxFailuresPerModel: z.number().step(1).min(1).default(1),
});

// ─── Internal state ───────────────────────────────────────────────────────────

/**
 * Tracks consecutive failures per session-step-model combo.
 * Key format: `${sessionId}::t${turn}::s${step}::${provider}::${model}`
 */
const stepFailures = new Map();

function makeKey(sessionId, turn, step, provider, model) {
	return `${sessionId}::t${turn}::s${step}::${provider}::${model}`;
}

// ─── Core logic ───────────────────────────────────────────────────────────────

/**
 * The current config snapshot. Read fresh on each request so the plugin
 * always uses the latest settings value.
 */
let currentConfig = Config.parse({});

/**
 * Install the fallback plugin.
 *
 * Registers the config namespace with DSH settings so the user can edit
 * it through the Settings UI. The plugin reads config live on every request,
 * so changes take effect immediately without restart.
 *
 * @param ctx - Cordis plugin context (injected: `agents`, `settings`).
 */
export function apply(ctx, config) {
	const NS = settingsNamespace('llm-fallback');

	// Register with settings so the UI can render a configuration panel
	installSettingsSection(ctx, NS, Config, config, {
		validate(value) {
			// Validate that each entry has a non-empty provider and model
			for (let i = 0; i < value.fallbackChain.length; i++) {
				const entry = value.fallbackChain[i];
				if (!entry.provider || !entry.model) {
					throw new Error(
						`llm-fallback: fallbackChain[${i}] must have non-empty provider and model`
					);
				}
			}
		},
		setSource(source) {
			// Called when settings change — update the live config snapshot
			currentConfig = source();
			ctx.logger.debug(
				`llm-fallback: config updated — chain length: ${currentConfig.fallbackChain.length}`
			);
		},
		onChange() {
			// Triggered on any settings change — re-read current config
			currentConfig = source();
		},
	});

	// Initialize from current settings
	currentConfig = source();

	// ── Failure tracking helpers ─────────────────────────────────────────────

	/** Find the next entry after (provider, model) in the chain. Wraps around. */
	function nextEntry(provider, model) {
		const chain = currentConfig.fallbackChain;
		if (chain.length === 0) return undefined;
		const idx = chain.findIndex(
			(e) => e.provider === provider && e.model === model
		);
		if (idx < 0) return chain[0]; // unknown → start from first
		const nextIdx = (idx + 1) % chain.length;
		return chain[nextIdx];
	}

	/** Check whether a failure code should trigger fallback. */
	function isFallbackable(failure) {
		return new Set(currentConfig.fallbackOn).has(failure.code);
	}

	/** Increment and return the failure count for a model. */
	function bumpFailure(sessionId, turn, step, provider, model) {
		const key = makeKey(sessionId, turn, step, provider, model);
		const next = (stepFailures.get(key) ?? 0) + 1;
		stepFailures.set(key, next);
		return next;
	}

	// ── Listener: count failures on error ────────────────────────────────────

	// order: -100 ensures fallback counts errors BEFORE dsh-llm-retry runs.
	// This way maxFailuresPerModel is the sole switch criterion — retry is bypassed.
	const disposeOnError = ctx.on(
		'agent/request-error',
		(payload) => {
			const { agent, turn, step, provider, failure } = payload;
			// Use payload.provider (what was actually tried) rather than
			// agent.options.provider, which may be stale after a fallback switch.
			const currentModel = agent.options.model;

			if (!currentModel) return;
			if (currentConfig.fallbackChain.length === 0) return;
			if (!isFallbackable(failure)) return;

			const count = bumpFailure(agent.id, turn, step, provider, currentModel);
			if (count < currentConfig.maxFailuresPerModel) return;

			const next = nextEntry(provider, currentModel);
			if (!next) return;

			ctx.logger.info(
				`llm-fallback: "${provider}/${currentModel}" failed ${count}× (code=${failure.code}), ` +
				`falling back to "${next.provider}/${next.model}"`
			);
		},
		{ order: -100 }
	);

	// ── Listener: swap model before each request ───────────────────────────────

	const disposeOnRequest = ctx.on(
		'agent/request',
		async (payload, next) => {
			const { agent, turn, step } = payload;
			const currentProvider = agent.options.provider;
			const currentModel = agent.options.model;

			if (!currentProvider || !currentModel) return next();
			if (currentConfig.fallbackChain.length === 0) return next();

			const key = makeKey(agent.id, turn, step, currentProvider, currentModel);
			const failCount = stepFailures.get(key) ?? 0;

			if (failCount >= currentConfig.maxFailuresPerModel) {
				const nextEntry = nextEntry(currentProvider, currentModel);
				if (!nextEntry) return next();

				// Get the base config the machine would normally use
				const baseConfig = await next();
				if (!baseConfig) return baseConfig;

				// Build a replacement config — spread into a NEW object
				// so the frozen original is untouched
				const switchedConfig = {
					...baseConfig,
					provider: nextEntry.provider,
					model: nextEntry.model,
				};

				ctx.logger.debug(
					`llm-fallback: switching "${currentProvider}/${currentModel}" → ` +
					`"${nextEntry.provider}/${nextEntry.model}" (turn ${turn}, step ${step})`
				);

				return switchedConfig;
			}

			return next();
		},
		{ order: -100 }
	);

	// ── Lifecycle teardown ───────────────────────────────────────────────────

	ctx.effect(
		() => () => {
			disposeOnError();
			disposeOnRequest();
		},
		'llm-fallback: dispose listeners'
	);
}
