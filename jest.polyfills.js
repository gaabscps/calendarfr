/**
 * Polyfills carregados ANTES do test framework (via jest.config setupFiles).
 *
 * MSW v2 depende de Web APIs (fetch, Request, Response, Headers, ReadableStream,
 * BroadcastChannel etc.) que o jsdom não expõe. Como rodamos Node 20+, todas
 * essas APIs existem no Node — copiamos pro globalThis interno do jsdom.
 *
 * Para fetch/Request/Response usamos o `undici` (mesmo motor que Node usa
 * internamente) — necessário porque `cross-fetch` retorna `Response` cujo
 * `body` não tem `getReader()` compatível com MSW interceptors.
 *
 * `configurable: true` é importante: MSW precisa redefinir `Request` quando
 * faz hook do interceptor — sem isso falha com "Cannot redefine property".
 */

const { TextDecoder, TextEncoder } = require('node:util');
const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web');
const { Blob, File } = require('node:buffer');
const { BroadcastChannel, MessagePort, MessageChannel } = require('node:worker_threads');
const { performance } = require('node:perf_hooks');
const {
  setImmediate,
  clearImmediate,
  setTimeout: nodeSetTimeout,
  clearTimeout: nodeClearTimeout,
  setInterval: nodeSetInterval,
  clearInterval: nodeClearInterval,
} = require('node:timers');

const define = (props) => {
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true,
    });
  }
};

define({
  TextDecoder,
  TextEncoder,
  ReadableStream,
  WritableStream,
  TransformStream,
  Blob,
  File,
  BroadcastChannel,
  MessagePort,
  MessageChannel,
  performance,
  setImmediate,
  clearImmediate,
  // Substitui timers do jsdom pelos do Node — undici depende de Timeout.unref()
  // que jsdom não expõe.
  setTimeout: nodeSetTimeout,
  clearTimeout: nodeClearTimeout,
  setInterval: nodeSetInterval,
  clearInterval: nodeClearInterval,
});

const { fetch, Headers, FormData, Request, Response } = require('undici');

define({ fetch, Headers, FormData, Request, Response });
