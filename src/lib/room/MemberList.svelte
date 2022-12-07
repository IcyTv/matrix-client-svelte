<script lang="ts">
	import { client } from '$lib/store';
	import { resolvePowerLevel } from '$lib/utils/powerLevels';
	import { User } from 'carbon-icons-svelte';
	import type { Room, RoomMember } from 'matrix-js-sdk';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import _ from 'underscore';
	import ColorHashText from './ColorHashText.svelte';
	import { memberListIsOpen } from './stores';
	import { horizontalSlide } from './transition';

	export let room: Room;

	const query = window.matchMedia('(min-width: 1048px)');

	const onChange = (event: MediaQueryListEvent) => {
		$memberListIsOpen = event.matches;
	};

	onMount(() => {
		//TODO add a way for the user to disable this behavior
		query.addEventListener('change', onChange);
		$memberListIsOpen = query.matches;
	});

	onDestroy(() => {
		query.removeEventListener('change', onChange);
	});

	interface ResolvedMember extends RoomMember {
		resolvedAvatarUrl?: string;
		resolvedPowerLevel: string;
	}

	$: members = room.getMembers().map((m) => {
		const ret = m as ResolvedMember;
		ret.resolvedAvatarUrl = m.getAvatarUrl($client.baseUrl, 32, 32, 'crop', true, true) ?? undefined;
		ret.resolvedPowerLevel = resolvePowerLevel($client, m.powerLevel);
		return ret;
	});

	$: membersByPower = _.groupBy(members, 'resolvedPowerLevel');

	const dispatch = createEventDispatcher();
</script>

{#if $memberListIsOpen}
	<div class="w-64 flex-shrink-0 bg-slate-800 px-2 scrollbar-thin scrollbar-thumb-slate-500 scrollbar-thumb-rounded-lg" transition:horizontalSlide>
		<div class="my-6 mx-2 flex flex-col">
			{#each Object.entries(membersByPower).sort((a, b) => b[1][0].powerLevel - a[1][0].powerLevel) as [powerLevel, members]}
				<div class="flex flex-col py-2">
					<p class="text-xs"><span class="font-bold uppercase">{powerLevel}</span> - {members.length}</p>
					{#each members as member}
						<div
							class="m-1 flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-slate-600"
							on:click={(ev) => {
								dispatch('memberClick', { userId: member.userId, element: ev.currentTarget });
							}}
							on:keydown={() => console.error('TODO')}
						>
							<ColorHashText text={member.userId} let:color>
								{#if member.resolvedAvatarUrl}
									<img src={member.resolvedAvatarUrl} class="h-8 w-8 rounded-full" alt="Avatar" />
								{:else}
									<div class="h-8 w-8 flex-shrink-0 overflow-clip rounded-full" style="background-color: {color};">
										<User class="h-full w-full" />
									</div>
								{/if}
								<p>{member.name}</p>
							</ColorHashText>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>
{/if}
