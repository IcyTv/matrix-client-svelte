/**
A countdown timer, exposing a promise api.
A timer starts in a non-started state,
and needs to be started by calling `start()`` on it first.
Timers can be `abort()`-ed which makes the promise reject prematurely.
Once a timer is finished or aborted, it can't be started again
(because the promise should not be replaced). Instead, create
a new one through `clone()` or `cloneIfRun()`.
*/
export default class Timer {
	private timerHandle?: NodeJS.Timeout | null;
	private startTs?: number | null;
	private promise?: Promise<void>;
	private resolve?: () => void;
	private reject?: (e: Error) => void;

	constructor(private timeout: number) {
		this.setNotStarted();
	}

	private setNotStarted() {
		this.timerHandle = null;
		this.startTs = null;
		this.promise = new Promise<void>((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		}).finally(() => {
			this.timerHandle = null;
		});
	}

	private onTimeout = () => {
		const now = Date.now();
		const elapsed = now - this.startTs!;
		if (elapsed >= this.timeout) {
			this.resolve!();
			this.setNotStarted();
		} else {
			const delta = this.timeout - elapsed;
			this.timerHandle = setTimeout(this.onTimeout, delta);
		}
	};

	changeTimeout(timeout: number) {
		if (timeout === this.timeout) {
			return;
		}
		const isSmallerTimeout = timeout < this.timeout;
		this.timeout = timeout;
		if (this.isRunning() && isSmallerTimeout) {
			clearTimeout(this.timerHandle!);
			this.onTimeout();
		}
	}

	/**
	 * if not started before, starts the timer.
	 * @returns {Timer} the same timer
	 */
	public start(): Timer {
		if (!this.isRunning()) {
			this.startTs = Date.now();
			this.timerHandle = setTimeout(this.onTimeout, this.timeout);
		}
		return this;
	}

	/**
	 * (re)start the timer. If it's running, reset the timeout. If not, start it.
	 * @returns {Timer} the same timer
	 */
	public restart(): Timer {
		if (this.isRunning()) {
			// don't clearTimeout here as this method
			// can be called in fast succession,
			// instead just take note and compare
			// when the already running timeout expires
			this.startTs = Date.now();
			return this;
		} else {
			return this.start();
		}
	}

	/**
	 * if the timer is running, abort it,
	 * and reject the promise for this timer.
	 * @returns {Timer} the same timer
	 */
	public abort(): Timer {
		if (this.isRunning()) {
			clearTimeout(this.timerHandle!);
			this.reject!(new Error('Timer was aborted.'));
			this.setNotStarted();
		}
		return this;
	}

	/**
	 *promise that will resolve when the timer elapses,
	 *or is rejected when abort is called
	 */
	public finished(): Promise<void> {
		return this.promise!;
	}

	isRunning() {
		return this.timerHandle !== null;
	}
}
