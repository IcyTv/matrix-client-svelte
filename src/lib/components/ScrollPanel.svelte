<script lang="ts">
	import Timer from '$lib/utils/timer';
	import { afterUpdate, createEventDispatcher, onDestroy, onMount } from 'svelte';
	import _ from 'underscore';

	export let stickyAtBottom: boolean = true;
	export let startAtBottom: boolean = true;
	let clazz: string = '';
	export { clazz as class };

	/* onFillRequest(backwards): a callback which is called on scroll when
	 * the user nears the start (backwards = true) or end (backwards =
	 * false) of the list.
	 *
	 * This should return a promise; no more calls will be made until the
	 * promise completes.
	 *
	 * The promise should resolve to true if there is more data to be
	 * retrieved in this direction (in which case onFillRequest may be
	 * called again immediately), or false if there is no more data in this
	 * direction (at this time) - which will stop the pagination cycle until
	 * the user scrolls again.
	 */
	export let onFillRequest: (backwards: boolean) => Promise<boolean> = () => Promise.resolve(false);
	/* onUnfillRequest(backwards): a callback which is called on scroll when
	 * there are children elements that are far out of view and could be removed
	 * without causing pagination to occur.
	 *
	 * This function should accept a boolean, which is true to indicate the back/top
	 * of the panel and false otherwise, and a scroll token, which refers to the
	 * first element to remove if removing from the front/bottom, and last element
	 * to remove if removing from the back/top.
	 */
	export let onUnfillRequest: (backwards: boolean, scrollToken: string) => void = () => {};

	const dispatch = createEventDispatcher();

	// The amount of extra scroll distance to allow prior to unfilling.
	// See getExcessHeight.
	const UNPAGINATION_PADDING = 6000;
	const ITEMLIST_PADDING = 18;
	const UNFILL_REQUEST_DEBOUNCE = 200;
	const PAGE_SIZE = 400;

	const debouncedOnUnfillRequest = _.debounce(onUnfillRequest, UNFILL_REQUEST_DEBOUNCE);

	let scrollTimeout: Timer;
	let preventShrinkingState: {
		offsetFromBottom: number;
		offsetNode: HTMLElement;
	} | null = null;
	let scrollState: {
		stuckAtBottom: boolean;
		trackedNode?: HTMLElement;
		trackedScrollToken?: string;
		bottomOffset?: number;
		pixelOffset?: number;
	};
	let isFilling: boolean = false;
	let isFillingDueToPropsUpdate: boolean = false;
	let fillRequestWhileRunning: boolean;
	let pendingFillDueToPropsUpdate: boolean;
	let itemList: HTMLOListElement | null = null;
	let pendingFillRequests = {
		b: false,
		f: false,
	};
	let heightUpdateInProgress: boolean = false;
	let bottomGrowth: number = 0;
	let minListHeight: number = 0;
	let divScroll: HTMLDivElement | null = null;

	const onScroll = (ev: Event) => {
		scrollTimeout.restart();
		saveScrollState();
		updatePreventShrinking();
		dispatch('scroll', ev);
		checkFillState();
	};

	const onResize = () => {
		checkScroll();
		if (preventShrinkingState) {
			preventShrinking();
		}
	};

	const checkScroll = (isFromPropsUpdate = false) => {
		restoreSavedScrollState();
		checkFillState(0, isFromPropsUpdate);
	};

	export const isAtBottom = () => {
		const sn = getScrollNode();
		return sn.scrollHeight - (sn.scrollTop + sn.clientHeight) <= 1;
	};

	const getExcessHeight = (backwards: boolean) => {
		const sn = getScrollNode();
		const contentHeight = getMessagesHeight();
		const listHeight = getListHeight();
		const clippedHeight = contentHeight - listHeight;
		const unclippedScrollTop = sn.scrollTop + clippedHeight;

		if (backwards) {
			return unclippedScrollTop - sn.clientHeight - UNPAGINATION_PADDING;
		} else {
			return contentHeight - (unclippedScrollTop + 2 * sn.clientHeight) - UNPAGINATION_PADDING;
		}
	};

	const checkFillState = async (depth = 0, isFromPropsUpdate = false) => {
		const isFirstCall = depth === 0;
		const sn = getScrollNode();

		if (isFirstCall) {
			if (isFilling && !isFillingDueToPropsUpdate) {
				fillRequestWhileRunning = true;
				pendingFillDueToPropsUpdate = isFromPropsUpdate;
				return;
			}
			isFilling = true;
			isFillingDueToPropsUpdate = isFromPropsUpdate;
		}

		const firstTile = itemList?.firstElementChild as HTMLElement;
		const contentTop = firstTile?.offsetTop ?? 0;
		const fillPromises: Promise<void>[] = [];

		if (!firstTile || sn.scrollTop - contentTop < sn.clientHeight) {
			fillPromises.push(maybeFill(depth, true));
		}

		if (sn.scrollHeight - sn.scrollTop < sn.clientHeight * 2) {
			fillPromises.push(maybeFill(depth, false));
		}

		if (fillPromises.length) {
			try {
				await Promise.all(fillPromises);
			} catch (e) {
				console.error('Error filling scroll panel', e);
			}
		}

		if (isFirstCall) {
			isFilling = false;
			isFillingDueToPropsUpdate = false;
		}

		if (fillRequestWhileRunning) {
			const refillDueToPropsUpdate = pendingFillDueToPropsUpdate;
			fillRequestWhileRunning = false;
			pendingFillDueToPropsUpdate = false;
			checkFillState(0, refillDueToPropsUpdate);
		}
	};

	const checkUnfillState = (backwards: boolean) => {
		let excessHeight = getExcessHeight(backwards);
		if (excessHeight <= 0) {
			return;
		}

		const tiles = itemList?.children as HTMLCollectionOf<HTMLElement>;
		let markerScrollToken: string | undefined = undefined;

		if (tiles) {
			for (const tile of tiles) {
				excessHeight -= tile.clientHeight;
				if (tile.clientHeight > excessHeight) {
					break;
				}

				if (tile.dataset.scrollTokens) {
					markerScrollToken = tile.dataset.scrollTokens.split(',')[0];
				}
			}
		}

		if (markerScrollToken) {
			debouncedOnUnfillRequest(backwards, markerScrollToken);
			// if (unfillDebouncer) {
			// 	clearTimeout(unfillDebouncer);
			// }
			// unfillDebouncer = setTimeout(() => {
			// 	unfillDebouncer = null;
			// 	onUnfillRequest(backwards, markerScrollToken!);
			// }, UNFILL_REQUEST_DEBOUNCE);
		}
	};

	const maybeFill = async (depth: number, backwards: boolean) => {
		const dir = backwards ? 'b' : 'f';
		if (pendingFillRequests[dir]) {
			return Promise.resolve();
		}

		pendingFillRequests[dir] = true;

		let hasMoreResults: boolean;
		try {
			await new Promise((resolve) => setTimeout(resolve, 1));
			hasMoreResults = await onFillRequest(backwards);
		} finally {
			pendingFillRequests[dir] = false;
		}
		checkUnfillState(!backwards);
		if (hasMoreResults) {
			return checkFillState(depth + 1);
		}
	};

	const scrollToTop = () => {
		const sn = getScrollNode();
		sn.scrollTop = 0;
		saveScrollState();
	};
	const scrollToBottom = () => {
		const sn = getScrollNode();
		sn.scrollTop = sn.scrollHeight;
		saveScrollState();
	};

	const scrollRelative = (multiple: -1 | 1) => {
		const sn = getScrollNode();
		const delta = multiple * sn.clientHeight * 0.9;
		sn.scrollBy(0, delta);
		saveScrollState();
	};

	const handleScrollKey = (ev: KeyboardEvent) => {
		throw 'TODO: handleScrollKey';
	};

	const saveScrollState = () => {
		if (stickyAtBottom && isAtBottom()) {
			console.log("Saved state: 'stuck at bottom'", isAtBottom());
			scrollState = { stuckAtBottom: true };
			return;
		}

		console.log("Saved state: 'not stuck at bottom'");

		const sn = getScrollNode();
		const viewportBottom = sn.scrollHeight - (sn.scrollTop + sn.clientHeight);

		const messages = itemList!.children as HTMLCollectionOf<HTMLElement>;
		let node: HTMLElement | null = null;

		for (let i = messages.length - 1; i >= 0; i--) {
			const htmlMessage = messages[i];
			if (!htmlMessage.dataset.scrollTokens) {
				continue;
			}
			node = htmlMessage;
			if (topFromBottom(node) > viewportBottom) {
				break;
			}
		}

		if (!node) {
			console.log("No node found, can't save scroll state");
			return;
		}

		const scrollToken = node.dataset.scrollTokens!.split(',')[0];
		const bottomOffset = topFromBottom(node);
		scrollState = {
			stuckAtBottom: false,
			trackedNode: node,
			trackedScrollToken: scrollToken,
			bottomOffset,
			pixelOffset: bottomOffset - viewportBottom,
		};
	};

	const restoreSavedScrollState = async () => {
		if (scrollState.stuckAtBottom) {
			console.log('Restoring scroll state: stuck at bottom');
			const sn = getScrollNode();
			if (sn.scrollTop !== sn.scrollHeight) {
				sn.scrollTop = sn.scrollHeight;
			}
		} else if (scrollState.trackedScrollToken) {
			const trackedNode = getTrackedNode();
			if (trackedNode) {
				const newBottomOffset = topFromBottom(trackedNode);
				const bottomDiff = newBottomOffset - scrollState.bottomOffset!;
				bottomGrowth += bottomDiff;
				scrollState.bottomOffset = newBottomOffset;
				const newHeight = `${getListHeight()}px`;
				if (newHeight !== itemList!.style.height) {
					itemList!.style.height = newHeight;
				}
			}
		}

		if (!heightUpdateInProgress) {
			heightUpdateInProgress = true;
			try {
				await updateHeight();
			} finally {
				heightUpdateInProgress = false;
			}
		}
	};

	const updateHeight = async () => {
		if (scrollTimeout.isRunning()) {
			console.log('Waiting for scroll timeout to finish before updating height');
			await scrollTimeout.finished();
		}

		const sn = getScrollNode();
		const contentHeight = getMessagesHeight();
		if (contentHeight < sn.clientHeight) {
			minListHeight = sn.clientHeight;
		} else {
			minListHeight = Math.ceil(contentHeight / PAGE_SIZE) * PAGE_SIZE;
		}

		bottomGrowth = 0;
		const newHeight = `${getListHeight()}px`;

		if (scrollState.stuckAtBottom) {
			if (itemList!.style.height !== newHeight) {
				itemList!.style.height = newHeight;
			}
			if (sn.scrollTop !== sn.scrollHeight) {
				sn.scrollTop = sn.scrollHeight;
			}
		} else if (scrollState.trackedScrollToken) {
			const trackedNode = getTrackedNode();

			if (trackedNode) {
				const oldTop = trackedNode.offsetTop;
				if (itemList!.style.height !== newHeight) {
					itemList!.style.height = newHeight;
				}
				const newTop = trackedNode.offsetTop;
				const topDiff = newTop - oldTop;
				sn.scrollBy(0, topDiff);
			}
		}
	};

	const getTrackedNode = () => {
		if (!scrollState.trackedNode?.parentElement) {
			let node: HTMLElement | undefined;
			const messages = itemList!.children as HTMLCollectionOf<HTMLElement>;
			const scrollToken = scrollState.trackedScrollToken;
			if (scrollToken) {
				for (const htmlMessage of messages) {
					if (htmlMessage.dataset.scrollTokens?.split(',').includes(scrollToken)) {
						node = htmlMessage;
						break;
					}
				}
			}
			scrollState.trackedNode = node;
		}

		if (!scrollState.trackedNode) {
			return;
		}

		return scrollState.trackedNode;
	};

	const getListHeight = () => bottomGrowth + minListHeight;

	const getMessagesHeight = () => {
		const lastNode = itemList!.lastElementChild as HTMLElement;
		const lastNodeBottom = lastNode ? lastNode.offsetTop + lastNode.clientHeight : 0;
		const firstNodeTop = itemList?.firstElementChild ? (itemList.firstElementChild as HTMLElement).offsetTop : 0;
		return lastNodeBottom - firstNodeTop + ITEMLIST_PADDING * 2;
	};

	const topFromBottom = (node: HTMLElement) => itemList!.clientHeight - node.offsetTop;

	const getScrollNode = () => {
		if (!divScroll) {
			throw 'getScrollNode() called before divScroll was set';
		}
		return divScroll;
	};

	/**
    Mark the bottom offset of the last tile, so we can balance it out when
    anything below it changes, by calling updatePreventShrinking, to keep
    the same minimum bottom offset, effectively preventing the timeline to shrink.
    */
	const preventShrinking = () => {
		if (!itemList) return;
		const tiles = itemList.children as HTMLCollectionOf<HTMLElement>;
		let lastTileNode: HTMLElement | null = null;
		for (let i = tiles.length - 1; i >= 0; i--) {
			if (tiles[i].dataset.scrollTokens) {
				lastTileNode = tiles[i];
				break;
			}
		}
		if (!lastTileNode) return;
		clearPreventShrinking();

		const offsetFromBottom = itemList.clientHeight - (lastTileNode.offsetTop + lastTileNode.clientHeight);
		preventShrinkingState = {
			offsetFromBottom,
			offsetNode: lastTileNode,
		};
	};

	export const clearPreventShrinking = () => {
		const balanceElement = itemList?.parentElement;
		if (balanceElement) balanceElement.style.paddingBottom = '';
		preventShrinkingState = null;
	};

	export const getScrollState = () => scrollState;

	export const updateTimelineMinHeight = () => {
		if (isAtBottom()) {
			preventShrinking();
		}
	};

	const updatePreventShrinking = () => {
		if (!preventShrinkingState) return;
		const sn = getScrollNode();
		const { offsetNode, offsetFromBottom } = preventShrinkingState;
		const balanceElement = itemList?.parentElement;
		let shouldClear = !offsetNode.parentElement;
		if (!shouldClear && !scrollState.stuckAtBottom) {
			const spaceBelowViewport = sn.scrollHeight - (sn.scrollTop + sn.clientHeight);
			shouldClear = spaceBelowViewport >= 200;
		}

		if (!shouldClear) {
			const currentOffset = itemList!.clientHeight - (offsetNode.offsetTop + offsetNode.clientHeight);
			const offsetDiff = offsetFromBottom - currentOffset;
			if (offsetDiff > 0) {
				balanceElement!.style.paddingBottom = `${offsetDiff}px`;
			} else if (offsetDiff < 0) {
				shouldClear = true;
			}
		}

		if (shouldClear) {
			clearPreventShrinking();
		}
	};

	const resetScrollState = () => {
		console.log('Resetting scroll state');
		scrollState = {
			stuckAtBottom: startAtBottom,
		};
		bottomGrowth = 0;
		minListHeight = 0;
		scrollTimeout = new Timer(100);
		heightUpdateInProgress = false;
	};

	onMount(() => {
		resetScrollState();
		checkScroll();
	});

	afterUpdate(() => {
		checkScroll(true);
		updatePreventShrinking();
	});

	onDestroy(() => {});
</script>

<div bind:this={divScroll} on:scroll={onScroll} class="scroll-panel flex-1 overflow-y-auto overflow-x-hidden {clazz}">
	<slot name="fixed" />
	<div class="relative flex flex-col justify-end break-words">
		<ol class="relative flex flex-col justify-end" bind:this={itemList} aria-live="polite">
			<slot />
		</ol>
	</div>
</div>

<svelte:window on:resize={onResize} />

<style>
	ol {
		content-visibility: auto;
		contain-intrinsic-size: 50px;
	}
</style>
