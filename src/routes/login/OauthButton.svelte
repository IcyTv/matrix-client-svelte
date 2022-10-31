<script lang="ts">
	export let to: string;
</script>

<a href="/login/auth/{to}" class="m1 group flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 shadow-xl shadow-slate-900 hover:bg-purple-700">
	<slot />
</a>
