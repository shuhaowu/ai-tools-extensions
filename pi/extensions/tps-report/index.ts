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

export default function (pi: ExtensionAPI) {
	const messageStates = new Map<string, MessageState>();
	const buffer = new RingBuffer<MessageState>(16);

	const clearWidget = (ctx: ExtensionContext) => {
		ctx.ui.setWidget(WIDGET_ID, undefined);
	};

	const renderWidget = (ctx: ExtensionContext, spinner = false) => {
		const items = buffer.values();
		if (items.length === 0) {
			ctx.ui.setWidget(WIDGET_ID, [spinner ? "⏳" : "🟢"], { placement: "belowEditor" });
			return;
		}

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

		const promptTps = totalPromptTokens / (totalTtfbMs / 1000 || 1);
		const decodeTps = totalOutputTokens / (totalDecodeMs / 1000 || 1);

		const prefix = spinner ? "⏳" : "🟢";
		const text = `prompt ${promptTps.toFixed(1)} t/s | decode ${decodeTps.toFixed(1)} t/s`;
		ctx.ui.setWidget(WIDGET_ID, [`${prefix} ${text}`], { placement: "belowEditor" });
	};

	pi.on("session_start", (_event, ctx) => {
		ctx.ui.setWidget(WIDGET_ID, ["🟢"], { placement: "belowEditor" });
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

		renderWidget(ctx, true);
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
		if (msg.role !== "assistant" || !msg.usage) {
			renderWidget(ctx, false);
			return;
		}

		const id = String(msg.timestamp);
		const state = messageStates.get(id);

		if (!state?.start) {
			renderWidget(ctx, false);
			return;
		}

		const now = Date.now();
		state.end = now;
		state.inputTokens = msg.usage.input;
		state.outputTokens = msg.usage.output;

		buffer.push({ ...state });

		messageStates.delete(id);
		renderWidget(ctx, false);
	});

	pi.on("session_shutdown", (_event, ctx) => {
		clearWidget(ctx);
	});
}
