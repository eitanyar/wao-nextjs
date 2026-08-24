import { config } from 'dotenv';
import { runGbpScopeSmokeTest } from '../src/lib/gbp/client';

config({ path: '.env.local' });

const result = await runGbpScopeSmokeTest();
console.log(JSON.stringify(result, null, 2));
