import test from 'node:test';
import assert from 'node:assert/strict';
import { DELETE_CONFIRMATION_WORD, isAppStorageKey } from '../src/services/accountDeletion.ts';

test("only this app's keys are erased, and the confirmation word is the one on screen", () => {
  assert.equal(isAppStorageKey('@mobidou/journey/v1'), true);
  assert.equal(isAppStorageKey('@mobidou/server/v1'), true);
  assert.equal(isAppStorageKey('@mobidou/cloudsave/v1'), true);
  assert.equal(isAppStorageKey('@other/app'), false);
  assert.equal(isAppStorageKey('mobidou'), false);
  assert.equal(DELETE_CONFIRMATION_WORD, '削除');
});
