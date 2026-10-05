import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runChecks } from '../src/lib/checks.js';

const { exercises } = JSON.parse(readFileSync(new URL('../content/en/topics/dev.json', import.meta.url), 'utf8'));

test('English user stories pass the localized exercise checks', () => {
  const answer = `As a customer, I want stock notifications so that I can buy a product when it returns.
Given an out-of-stock product, When I subscribe, Then my subscription is recorded.
Given an existing subscription, When I subscribe again, Then no duplicate is created.
NFR: Send notification emails within 15 minutes at p95.`;
  assert.ok(runChecks(exercises[0], answer).every(({ ok }) => ok));
});

test('English postmortems pass while personal names are still rejected', () => {
  const answer = `# Summary
A timeout configuration caused checkout failures.
# Impact
1,240 orders failed and 87 customers need refunds.
# Timeline
14:02 configuration deployed.
14:09 error rate increased.
14:55 service recovered.
# Contributing factors
Staging used an instant mock gateway and configuration had no review.
# What went well
Rollback restored service.
# Action items
Owner: platform team; require configuration review; due 2026-10-02.`;
  assert.ok(runChecks(exercises[1], answer).every(({ ok }) => ok));
  assert.ok(runChecks(exercises[1], answer + '\nSomchai caused the outage.').some(({ ok }) => !ok));
});
