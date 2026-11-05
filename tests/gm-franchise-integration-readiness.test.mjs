import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {evaluateIntegrationReadiness,PROVIDER_CHANNELS} from '../gm-franchise/integration-readiness.mjs';
const deployment=JSON.parse(await readFile(new URL('../gm-franchise/staging-worker-deployment.json',import.meta.url),'utf8'));
test('staging integration readiness proves workers and accounting but keeps real endpoints fail-closed',()=>{const result=evaluateIntegrationReadiness(deployment);assert.equal(result.decision,'NO_GO');assert.equal(result.departmentSources.length,13);assert.ok(result.departmentSources.includes('accounting'));assert.deepEqual(result.providerChannels,PROVIDER_CHANNELS);assert.ok(result.blockers.includes('real_department_endpoints'));for(const channel of PROVIDER_CHANNELS)assert.ok(result.blockers.includes(`provider:${channel}`));assert.ok(result.blockers.includes('scheduled_dispatch'));});
test('integration readiness requires every real endpoint, provider channel and scheduler',()=>{const configured=structuredClone(deployment);configured.externalEndpointsConfigured=true;configured.providerSecretsConfigured=true;configured.scheduledDispatchConfigured=true;assert.equal(evaluateIntegrationReadiness(configured).decision,'READY_FOR_DEPARTMENT_ACCEPTANCE');});
