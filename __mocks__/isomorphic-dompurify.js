/**
 * Jest manual mock for isomorphic-dompurify.
 *
 * The real package bundles jsdom v28 which has ESM-only dependencies
 * (@asamuzakjp/css-color, @exodus/bytes) that Jest cannot transform.
 * This mock recreates the same behaviour using the root-level dompurify +
 * jsdom (already present for the jsdom test environment) — no ESM deps.
 *
 * CJS format intentional (Jest manual mocks can be CJS even in ESM projects).
 */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */
'use strict';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { JSDOM } = require('jsdom');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DOMPurifyLib = require('dompurify');

const { window } = new JSDOM('<!DOCTYPE html>');
const DOMPurify = DOMPurifyLib(window);

module.exports = DOMPurify;
module.exports.default = DOMPurify;
