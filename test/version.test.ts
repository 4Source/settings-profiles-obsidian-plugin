import { version as manifestVersion, minAppVersion as manifestMinAppVersion } from '../manifest.json';
import { version as packageVersion } from '../package.json';
import versions from '../versions.json';

test('Versions matching', () => {
	expect(manifestVersion).toBe(packageVersion);
	expect(Object.keys(versions).find(value => value === manifestVersion)).toBe(manifestVersion);
	expect(Object.entries(versions).find(value => value[0] === manifestVersion)?.[1]).toBe(manifestMinAppVersion);
});