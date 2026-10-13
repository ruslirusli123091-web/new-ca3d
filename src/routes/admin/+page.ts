import type { PageLoad } from './$types';

export const ssr = true;

export const load: PageLoad = async ({ data }) => {
	return data;
};
