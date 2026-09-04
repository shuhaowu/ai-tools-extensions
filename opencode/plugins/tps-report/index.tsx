/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui";
import type { EventSessionCreated, EventSessionUpdated } from "@opencode-ai/sdk/v2";
import { createSignal } from "solid-js";

type MessageState = {
	start: number;
	end: number;
	firstToken?: number;
	inputTokens: number;
	outputTokens: number;
};

class RingBuffer<T> {
	private data: T[];
	private size: number;
	private idx = 0;
	private filled = 0;

	constructor(size: number) {
		this.size = size;
		this.data = new Array<T>(size);
	}

	push(item: T) {
		this.data[this.idx] = item;
		this.idx = (this.idx + 1) % this.size;
		if (this.filled < this.size) this.filled++;
	}

	reset() {
		this.idx = 0;
		this.filled = 0;
	}

	values(): T[] {
		const out: T[] = [];
		for (let i = 0; i < this.filled; i++) {
			const pos = (this.idx - this.filled + i + this.size) % this.size;
			// biome-ignore lint/style/noNonNullAssertion: ring buffer guarantees the slot is filled
			out.push(this.data[pos]!);
		}
		return out;
	}
}

const formatTps = (tps: number | null) => (tps !== null && tps > 0 ? tps.toFixed(1) : "--");

const formatTtft = (ms: number | null) => {
	if (ms === null) return "--";
	if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
	return `${Math.round(ms)}ms`;
};

const statsText = (items: MessageState[]) => {
	let avgPpTps: number | null = null;
	let avgTgTps: number | null = null;
	let lastTtftMs: number | null = null;

	if (items.length > 0) {
		let totalPromptTokens = 0;
		let totalOutputTokens = 0;
		let totalTtfbMs = 0;
		let totalDecodeMs = 0;

		for (const s of items) {
			const ttfb = s.firstToken ? s.firstToken - s.start : s.end - s.start;
			const decodeMs = s.end - s.start - ttfb;
			totalPromptTokens += s.inputTokens;
			totalOutputTokens += s.outputTokens;
			totalTtfbMs += ttfb;
			totalDecodeMs += decodeMs;
		}

		avgPpTps = totalTtfbMs > 0 ? totalPromptTokens / (totalTtfbMs / 1000) : null;
		avgTgTps = totalDecodeMs > 0 ? totalOutputTokens / (totalDecodeMs / 1000) : null;

		// biome-ignore lint/style/noNonNullAssertion: items is non-empty here
		const last = items[items.length - 1]!;
		lastTtftMs = last.firstToken ? last.firstToken - last.start : last.end - last.start;
	}

	return `PP ${formatTps(avgPpTps)} | TG ${formatTps(avgTgTps)} | TTFT ${formatTtft(lastTtftMs)}`;
};

const RING_BUFFER_SIZE = 16;

const tui: TuiPlugin = async (api) => {
	const messageStates = new Map<string, MessageState>();
	const buffer = new RingBuffer<MessageState>(RING_BUFFER_SIZE);
	const [display, setDisplay] = createSignal(statsText([]));

	let lastSessionId: string | undefined;
	let lastModelKey: string | undefined;

	const reset = () => {
		messageStates.clear();
		buffer.reset();
		setDisplay(statsText([]));
	};

	const refresh = () => {
		setDisplay(statsText(buffer.values()));
	};

	const handleSession = (event: EventSessionCreated | EventSessionUpdated) => {
		const info = event.properties.info;
		if (!info) return;
		const sessionId = info.id;
		const modelKey = info.model ? `${info.model.providerID}/${info.model.id}` : undefined;
		if (sessionId !== lastSessionId || modelKey !== lastModelKey) {
			lastSessionId = sessionId;
			lastModelKey = modelKey;
			reset();
		}
	};

	api.event.on("session.created", handleSession);
	api.event.on("session.updated", handleSession);

	api.event.on("message.updated", (event) => {
		const info = event.properties.info;
		if (info.role !== "assistant") return;

		if (info.time.completed) {
			const state = messageStates.get(info.id);
			if (!state) return;

			state.end = Date.now();
			state.inputTokens = info.tokens.input;
			state.outputTokens = info.tokens.output;

			buffer.push({ ...state });
			messageStates.delete(info.id);
			refresh();
			return;
		}

		if (!messageStates.has(info.id)) {
			messageStates.set(info.id, { start: Date.now(), end: 0, inputTokens: 0, outputTokens: 0 });
		}
	});

	api.event.on("message.part.updated", (event) => {
		const state = messageStates.get(event.properties.part.messageID);
		if (state && !state.firstToken) {
			state.firstToken = Date.now();
		}
	});

	api.slots.register({
		slots: {
			session_prompt_right(ctx) {
				return <text fg={ctx.theme.current.textMuted}>{display()}</text>;
			},
		},
	});
};

const plugin: TuiPluginModule & { id: string } = {
	id: "tps-report",
	tui,
};

export default plugin;
