import type { ComponentSpec } from './_spec';

const component: ComponentSpec = {
  id: 'dps-1p',
  name: 'DPS Unipolar',
  description: 'Dispositivo de Proteção contra Surtos. Desvia picos de tensão (raios, manobras) para o terra, protegendo os equipamentos. Não conduz em operação normal — é um dispositivo em paralelo (shunt).',
  widthMm: 18,
  category: 'dps',
  poles: 1,
  color: '#e65100',
  icon: 'dps',
  ports: [
    { id: 'in-L1', label: 'L1', side: 'top', offsetXMm: 9, type: 'phase' },
    { id: 'out-PE', label: 'PE', side: 'bottom', offsetXMm: 9, type: 'ground' },
  ],
  portDescriptions: {
    'in-L1': 'Conexão à fase (monitoramento de surtos)',
    'out-PE': 'Conexão ao terra (descarga de surtos)',
  },
  modes: [
    { id: 'ok', label: 'Normal', color: '#4caf50', routes: [] },
    { id: 'tripped', label: 'Atuado', color: '#ff9800', routes: [] },
  ],
  defaultMode: 'ok',
  nominalCurrentA: 40,
  din_mounted: true,
  screw_mounted: false,
};

export default component;
