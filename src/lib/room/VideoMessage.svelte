<script lang="ts">
	import { client } from '$lib/store';
	import { Gesture, Media, MediaSync, MediaVisibility, PlayButton, Poster, Video } from '@vidstack/player-svelte';
	import { PlayFilled } from 'carbon-icons-svelte';
	import type { MatrixEvent } from 'matrix-js-sdk';

	export let event: MatrixEvent;

	$: url = event.getContent()?.url;
	$: mimeType = event.getContent()?.info?.mimetype ?? 'text/plain';
	$: mxcPoster = event.getContent()?.info?.thumbnail_url ?? event.getContent()?.info?.thumbnail_file?.url ?? event.getContent()?.info?.thumbnail_url ?? event.getContent()?.url;

	$: src = url && $client.mxcUrlToHttp(url);
	$: poster = mxcPoster && $client.mxcUrlToHttp(mxcPoster);
</script>

<div class="relative my-2 h-full w-full overflow-visible">
	<video controls class="max-h-96 w-full max-w-md rounded" {poster} preload="none">
		<source {src} type={mimeType} />
		<track kind="captions" />
	</video>

	<!-- <Media
		class="max-h-96 max-w-md rounded"
		on:vds-fullscreen-change={(e) => console.log('FUllscreen', e)}
		on:vds-fullscreen-error={console.error}
		on:vds-fullscreen-support-change={console.log}
	>
		<MediaSync syncVolume singlePlayback volumeStorageKey="rooms-video-volume">
			<MediaVisibility exitViewport="pause" intersectionThreshold={0.01}>
				<Video poster={event.body.image} class="rounded" on:fullscreenchange={console.log} on:vds-fullscreen-change={console.log}>
					<video preload="metadata" src={event.body.video} class="rounded">
						<track kind="captions" />
					</video>
				</Video>
			</MediaVisibility>
		</MediaSync>

		<Poster alt="{event.body.text} Preview" class="absolute inset-0 media-error:hidden media-started:pointer-events-none media-started:opacity-0" />

		<div
			class="absolute inset-0 flex items-center justify-center rounded bg-black bg-opacity-50 opacity-0 transition-[opacity] duration-300 ease-in media-can-play:opacity-100 media-started:pointer-events-none media-started:opacity-0"
		>
			<PlayButton class="h-12 w-12">
				<PlayFilled class="h-12 w-12" />
			</PlayButton>
		</div>

		<Gesture action="toggle:paused" type="click" class="absolute inset-0" />
	</Media> -->
</div>

<style>
</style>
