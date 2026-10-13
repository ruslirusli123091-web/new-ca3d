<script lang="ts">
	interface Props {
		minValue?: number;
		maxValue?: number;
		rounded?: 'none' | 'md' | 'full';
		color?: 'violet' | 'pink' | 'red' | 'orange' | 'yellow' | 'lime' | 'cyan';
		currentValue?: number;
		showPercentage?: boolean;
		disabled?: boolean;
		class?: string;
	}

	let {
		minValue = 0,
		maxValue = 100,
		rounded = 'none',
		color = 'cyan',
		currentValue = 0,
		showPercentage = true,
		disabled = false,
		class: className = ''
	}: Props = $props();

	const clampedValue = $derived(Math.min(maxValue, Math.max(currentValue, minValue)));
	const widthPercentage = $derived(((clampedValue - minValue) / (maxValue - minValue)) * 100);

	const colorClass = $derived(
		disabled
			? ''
			: {
					violet: 'bg-violet-200 hover:bg-violet-300',
					pink: 'bg-pink-200 hover:bg-pink-300',
					red: 'bg-red-200 hover:bg-red-300',
					orange: 'bg-orange-200 hover:bg-orange-300',
					yellow: 'bg-yellow-200 hover:bg-yellow-300',
					lime: 'bg-lime-200 hover:bg-lime-300',
					cyan: 'bg-cyan-200 hover:bg-cyan-300'
				}[color]
	);

	const roundClass = $derived(
		rounded === 'full' ? 'rounded-full' : rounded === 'md' ? 'rounded-md' : 'rounded-none'
	);
</script>

<div
	class={[
		'w-72 md:w-full max-w-md border-black border-2 focus:outline-none h-9 overflow-hidden bg-white',
		disabled ? 'border-[#727272] bg-[#D4D4D4] text-[#676767]' : 'shadow-[2px_2px_0px_rgba(0,0,0,1)]',
		roundClass,
		className
	]
		.filter(Boolean)
		.join(' ')}
>
	<div
		style="width: {widthPercentage}%"
		class={['h-full flex flex-row items-center justify-end overflow-hidden', colorClass, roundClass]
			.filter(Boolean)
			.join(' ')}
	>
		{#if showPercentage && !disabled}
			<h1
				class={['mr-2', widthPercentage !== 100 ? 'font-bold opacity-60' : 'font-black opacity-100', className]
					.filter(Boolean)
					.join(' ')}
			>
				{Math.round(widthPercentage)}%
			</h1>
		{/if}
	</div>
</div>
