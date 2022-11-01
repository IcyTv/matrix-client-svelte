import { Plugin, PluginKey, EditorState, Transaction } from 'prosemirror-state';
import type { PluginSpec } from 'prosemirror-state';
import type { MarkType, Node as PmNode } from 'prosemirror-model';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';

export type Options = {
	markType?: MarkType;
};

export type FakeCursorState = {
	active?: boolean;
	side?: -1 | 0;
	next?: true; // Move outside of code after next transaction
	click?: true; // When the editor is clicked on
} | null;

export type CursorMetaTr = { action: 'next' } | { action: 'click' };

function toDom(): Node {
	const span = document.createElement('span');
	span.classList.add('fake-cursor');
	return span;
}

export function getDecorationPlugin(opts?: Options) {
	const plugin: Plugin<FakeCursorState> = new Plugin({
		key: new PluginKey('fakeCursor'),
		appendTransaction: (trs, oldState, state) => {
			const prev = plugin.getState(oldState) as FakeCursorState;
			const meta = trs[0]?.getMeta(plugin) as CursorMetaTr | null;
			if (prev?.next || meta?.action === 'click') {
				return stepOutside(state, getMarkType(state, opts));
			}

			return null;
		},
		state: {
			init: () => null,
			apply(tr, value, oldState, state): FakeCursorState | null {
				const meta = tr.getMeta(plugin) as CursorMetaTr | null;
				if (meta?.action === 'next') return { next: true };

				const markType = getMarkType(state, opts);
				const nextMark = markType.isInSet(state.storedMarks ?? state.doc.resolve(tr.selection.from).marks());
				const inCode = markType.isInSet(state.doc.resolve(tr.selection.from).marks());
				const nextCode = markType.isInSet(safeResolve(state.doc, tr.selection.from + 1).marks());
				const startOfLine = tr.selection.$from.parentOffset === 0;
				if (!tr.selection.empty) return null;
				if (!nextMark && nextCode && (!inCode || startOfLine)) {
					// |`code`
					return { active: true, side: -1 };
				}
				if (nextMark && !(inCode || startOfLine)) {
					// `|code`
					return { active: true, side: 0 };
				}
				if (!nextMark && inCode && !nextCode) {
					// `code`|
					return { active: true, side: 0 };
				}
				if (nextMark && inCode && !nextCode) {
					// `code|`
					return { active: true, side: -1 };
				}
				return null;
			},
		},
		props: {
			attributes: (state) => {
				const { active = false } = plugin.getState(state) ?? {};
				return {
					...(active ? { class: 'no-cursor' } : {}),
				};
			},
			decorations: (state) => {
				const { active, side } = plugin.getState(state) ?? {};
				if (!active) return DecorationSet.empty;
				const deco = Decoration.widget(state.selection.from, toDom, { side });
				return DecorationSet.create(state.doc, [deco]);
			},
			handleKeyDown(view, event) {
				switch (event.key) {
					case 'ArrowRight':
						return onArrowRight(view, plugin, event, getMarkType(view, opts));
					// case 'ArrowLeft':
					// 	return onArrowLeft(view, plugin, event, getMarkType(view, opts));
					// case 'Backspace':
					// 	return onBackspace(view, plugin, event, getMarkType(view, opts));
					// case 'Delete':
					// 	return onDelete(view, plugin, event, getMarkType(view, opts));
					case 'ArrowUp':
					case 'ArrowDown':
					case 'Home':
					case 'End':
						return stepOutsideNextTrAndPass(view, plugin);
					case 'e':
					case 'a':
						if (!event.ctrlKey) return false;
						return stepOutsideNextTrAndPass(view, plugin);
					default:
						return false;
				}
			},
			handleClick(view) {
				return stepOutsideNextTrAndPass(view, plugin, 'click');
			},
		},
	} as PluginSpec<FakeCursorState>);

	return plugin;
}

function stepOutside(state: EditorState, markType: MarkType): Transaction | null {
	if (!state) return null;
	const { selection, doc } = state;
	if (!selection.empty) return null;
	const stored = !!markType.isInSet(state.storedMarks ?? []);
	const inCode = !!markType.isInSet(selection.$from.marks());
	const nextCode = !!markType.isInSet(safeResolve(doc, selection.from + 1).marks() ?? []);
	const startOfLine = selection.$from.parentOffset === 0;

	// `code|` --> `code`|
	// `|code` --> |`code`
	// ^`|code` --> ^|`code`
	if (inCode !== nextCode || (!inCode && stored !== inCode) || (inCode && startOfLine)) return state.tr.removeStoredMark(markType);
	return null;
}

function safeResolve(doc: PmNode, pos: number) {
	return doc.resolve(Math.min(Math.max(1, pos), doc.nodeSize - 2));
}

function getMarkType(view: EditorView | EditorState, opts?: Options): MarkType {
	if ('schema' in view) return opts?.markType ?? view.schema.marks.code;
	return opts?.markType ?? view.state.schema.marks.code;
}

function stepOutsideNextTrAndPass(view: EditorView, plugin: Plugin, action: 'click' | 'next' = 'next'): boolean {
	const meta: CursorMetaTr = { action };
	view.dispatch(view.state.tr.setMeta(plugin, meta));
	return false;
}

function onArrowRightInside(view: EditorView, plugin: Plugin, event: KeyboardEvent, markType: MarkType): boolean {
	if (event.metaKey) return stepOutsideNextTrAndPass(view, plugin);
	if (event.shiftKey || event.altKey || event.ctrlKey) return false;
	const { selection, doc } = view.state;
	if (!selection.empty) return false;
	const pluginState = plugin.getState(view.state) as FakeCursorState;
	const pos = selection.$from;
	const inCode = !!markType.isInSet(pos.marks());
	const nextCode = !!markType.isInSet(pos.marksAcross(safeResolve(doc, selection.from + 1)) ?? []);

	if (pos.pos === view.state.doc.nodeSize - 3 && pos.parentOffset === pos.parent.nodeSize - 2 && pluginState?.active) {
		// Behaviour stops: `code`| at the end of the document
		view.dispatch(view.state.tr.removeStoredMark(markType));
		return true;
	}
	if (inCode === nextCode && pos.parentOffset !== 0) return false;
	if (inCode && (!pluginState?.active || pluginState.side === -1) && pos.parentOffset !== 0) {
		// `code|` --> `code`|
		view.dispatch(view.state.tr.removeStoredMark(markType));
		return true;
	}
	if (nextCode && pluginState?.side === -1) {
		// |`code` --> `|code`
		view.dispatch(view.state.tr.addStoredMark(markType.create()));
		return true;
	}
	return false;
}

function onArrowRight(view: EditorView, plugin: Plugin, event: KeyboardEvent, markType: MarkType): boolean {
	const handled = onArrowRightInside(view, plugin, event, markType);
	if (handled) return true;
	const { selection } = view.state;
	const pos = selection.$from;
	if (selection.empty && pos.parentOffset === pos.parent.nodeSize - 2) {
		return stepOutsideNextTrAndPass(view, plugin);
	}
	return false;
}
