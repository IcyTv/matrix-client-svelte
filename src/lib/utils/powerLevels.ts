//TODO use custom events to assign names to power levels

import type { MatrixClient } from 'matrix-js-sdk';

export const resolvePowerLevel = (client: MatrixClient, powerLevel: number) => {
	if (powerLevel === 100) return 'admin';
	if (powerLevel >= 50) return 'moderator';
	if (powerLevel >= 1) return 'user';
	return 'guest';
};
