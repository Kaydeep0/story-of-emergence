/**
 * Observer Trace Module
 * 
 * Epistemic firewall: Observer trace lives in a separate internal channel.
 * Inference layer cannot import observer data.
 * Only the meta layer may read it.
 * 
 * This module is isolated from inference logic.
 * Observer presence does not change inference outcome.
 */

export type {
  ObserverViewTrace,
  ObserverTraceSession,
} from './traceObserverView';

export {
  traceObserverView,
  getObserverTrace,
  clearObserverTraceSession,
  getAllObserverTraces,
  getObserverTraceSession,
} from './traceObserverView';

