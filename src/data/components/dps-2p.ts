import type { ComponentSpec } from './_spec';

const component: ComponentSpec = {
  id: 'dps-2p',
  name: 'DPS Bipolar',
  description: 'Dispositivo de Proteção contra Surtos bipolar. Protege fase e neutro contra picos de tensão, desviando a energia para o terra. Não conduz em operação normal.',
  widthMm: 60,
  category: 'dps',
  poles: 2,
  color: '#bf360c',
  icon: 'dps',
  ports: [
    { id: 'in-L1', label: 'L1', side: 'top', offsetXMm: 20, type: 'phase' },
    { id: 'in-N', label: 'N', side: 'top', offsetXMm: 40, type: 'neutral' },
    { id: 'out-PE1', label: 'PE', side: 'bottom', offsetXMm: 20, type: 'ground' },
    { id: 'out-PE2', label: 'PE', side: 'bottom', offsetXMm: 40, type: 'ground' },
  ],
  portDescriptions: {
    'in-L1': 'Conexão à fase (monitoramento de surtos)',
    'in-N': 'Conexão ao neutro (monitoramento de surtos)',
    'out-PE1': 'Conexão ao terra (descarga da fase)',
    'out-PE2': 'Conexão ao terra (descarga do neutro)',
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
