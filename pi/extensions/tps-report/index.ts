import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

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

const WIDGET_ID = "tps-report";

function formatTps(tps: number | null): string {
	return tps !== null && tps > 0 ? tps.toFixed(1) : "--";
}

export default function (pi: ExtensionAPI) {
	const messageStates = new Map<string, MessageState>();
	const buffer = new RingBuffer<MessageState>(16);

	const clearWidget = (ctx: ExtensionContext) => {
		ctx.ui.setWidget(WIDGET_ID, undefined);
	};


	const renderWidget = (ctx: ExtensionContext) => {
		const items = buffer.values();

		let ppTps: number | null = null;
		let tgTps: number | null = null;

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

			ppTps = totalTtfbMs > 0 ? totalPromptTokens / (totalTtfbMs / 1000) : null;
			tgTps = totalDecodeMs > 0 ? totalOutputTokens / (totalDecodeMs / 1000) : null;
		}

		ctx.ui.setWidget(
			WIDGET_ID,
			(_tui, theme) => {
				const text = `PP: ${formatTps(ppTps)} t/s • TG: ${formatTps(tgTps)} t/s`;
				return {
					render: () => [theme.fg("muted", text)],
					invalidate: () => {},
				};
			},
			{ placement: "aboveEditor" },
		);
	};

	pi.on("session_start", (_event, ctx) => {
		buffer.reset();
		messageStates.clear();
		renderWidget(ctx);
	});

	pi.on("message_start", (event, ctx) => {
		const msg = event.message;
		if (msg.role !== "assistant") return;

		const id = String(msg.timestamp);
		messageStates.set(id, {
			start: Date.now(),
			end: 0,
			inputTokens: 0,
			outputTokens: 0,
		});

		renderWidget(ctx);
	});

	pi.on("message_update", (event, _ctx) => {
		const msg = event.message;
		if (msg.role !== "assistant") return;

		const id = String(msg.timestamp);
		const state = messageStates.get(id);
		if (state && !state.firstToken) {
			state.firstToken = Date.now();
		}
	});

	pi.on("message_end", (event, ctx) => {
		const msg = event.message;
		if (msg.role !== "assistant" || !msg.usage) return;

		const id = String(msg.timestamp);
		const state = messageStates.get(id);

		if (!state?.start) return;

		const now = Date.now();
		state.end = now;
		state.inputTokens = msg.usage.input;
		state.outputTokens = msg.usage.output;

		buffer.push({ ...state });

		messageStates.delete(id);
		renderWidget(ctx);
	});

	pi.on("session_shutdown", (_event, ctx) => {
		clearWidget(ctx);
	});
}
