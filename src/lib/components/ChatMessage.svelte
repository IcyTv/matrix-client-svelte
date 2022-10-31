<script lang="ts">
	import type { MatrixEvent } from 'matrix-js-sdk';

	export let message: MatrixEvent;
	console.assert(message.getType() == 'm.room.message');
</script>
