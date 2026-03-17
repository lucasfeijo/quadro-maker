import type { ModuleDefinition } from '../types';
import {
  allComponents,
  getComponentById,
  isScrewMounted,
  isDualMount,
  EXTERNAL_COMPONENT_IDS,
} from './components';

export const MODULE_DEFINITIONS: ModuleDefinition[] = allComponents;

export const EXTERNAL_MODULE_IDS = EXTERNAL_COMPONENT_IDS;

export function getModuleById(id: string): ModuleDefinition | undefined {
  return getComponentById(id);
}

/** Externo (parafuso), mas não dual-mount. Dual-mount usa DraggableModule e new-module. */
export function isExternalModule(id: string): boolean {
  return isScrewMounted(id) && !isDualMount(id);
}

export { isDualMount };
