/**
 * dsh-llm-fallback — type definitions.
 *
 * @module dsh-llm-fallback/types
 */
import type { Context } from '@deepseek-ai/cordis';
import type z from '@deepseek-ai/schemastery';

/** One entry in the fallback chain: a specific provider+model pair. */
export type ModelEntry = {
	/** Provider route ID (must match a registered adapter route). */
	provider: string;
	/** Model ID (must be valid for that provider). */
	model: string;
};

/** Resolved plugin configuration. */
export type Config = {
	/** Ordered list of provider+model pairs to try in sequence. */
	fallbackChain: ModelEntry[];
	/** Failure codes that trigger fallback. */
	fallbackOn: string[];
	/** Max consecutive failures per model before switching. */
	maxFailuresPerModel: number;
};

/** Runtime schema for {@link Config}. */
export declare const Config: z<Config>;

/**
 * Install the fallback plugin.
 * Reads config from DSH settings (Settings UI) — no cordis.patch.yml required.
 *
 * @param ctx    - Cordis plugin context (injected: `agents`, `settings`).
 * @param config - Initial config (used as settings base layer).
 */
export declare function apply(ctx: Context, config: Config): void;

/** Plugin name (use in cordis.patch.yml: `name: 'dsh-llm-fallback'`). */
export declare const name = 'llm-fallback';

/** Services injected by this plugin. */
export declare const inject: string[];
