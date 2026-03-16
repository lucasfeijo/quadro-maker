import type { ModuleDefinition } from '../types';
import {
  allComponents,
  getComponentById,
  isExternalComponent,
  EXTERNAL_COMPONENT_IDS,
} from './components';

export const MODULE_DEFINITIONS: ModuleDefinition[] = allComponents;

export const EXTERNAL_MODULE_IDS = EXTERNAL_COMPONENT_IDS;

export function getModuleById(id: string): ModuleDefinition | undefined {
  return getComponentById(id);
}

export function isExternalModule(id: string): boolean {
  return isExternalComponent(id);
}
