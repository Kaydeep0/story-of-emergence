/**
 * Structural Lineage Graph Module
 * 
 * Records how reflections relate to one another over time without
 * introducing causality, narrative, or semantic hierarchy.
 * 
 * This captures structure, not meaning.
 * 
 * Firewall preserved:
 * - No inference impact: does not influence emergence, novelty, decay, saturation, regime, dwell time
 * - Encrypted at rest: all lineage data encrypted client-side
 * - Session scoped: recomputed per wallet session
 * - No narrative semantics: no labels, no directionality, no start/end nodes
 */

export type {
  StructuralLink,
  StructuralLineageGraph,
  LineageSignals,
} from './buildStructuralLineage';

export {
  buildStructuralLineage,
} from './buildStructuralLineage';

export type {
  EncryptedLineageGraph,
} from './encryptLineageGraph';

export {
  encryptLineageGraph,
  decryptLineageGraph,
} from './encryptLineageGraph';

export {
  saveLineageGraph,
  loadLineageGraph,
  clearLineageGraph,
  clearAllLineageGraphs,
} from './storeLineageGraph';

export type {
  StructuralDistanceMatrix,
  DistanceSignals,
} from './computeStructuralDistance';

export {
  computeStructuralDistance,
  getStructuralDistance,
  getDistancesFromReflection,
} from './computeStructuralDistance';

export type {
  EncryptedDistanceMatrix,
} from './encryptDistanceMatrix';

export {
  encryptDistanceMatrix,
  decryptDistanceMatrix,
} from './encryptDistanceMatrix';

export {
  saveDistanceMatrix,
  loadDistanceMatrix,
  clearDistanceMatrix,
  clearAllDistanceMatrices,
} from './storeDistanceMatrix';

