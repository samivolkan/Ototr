import test from 'node:test';
import {acceptanceCases} from './scenarios.mjs';
for(const [name,fn] of acceptanceCases)test(name,fn);
