import { ChevronDown } from 'lucide-react';
import type { TFunction } from '../i18n.js';

interface VersionOption {
  id: string;
  name: string;
}

const VERSIONS: VersionOption[] = [
  { id: 'naa', name: 'Nova Almeida Atualizada' },
  { id: 'ara', name: 'Almeida Revista e Atualizada' },
  { id: 'nvi', name: 'Nova Versão Internacional' },
];

interface VersionSelectorProps {
  current: string;
  onChange: (version: string) => void;
  t: TFunction;
}

export function VersionSelector({ current, onChange, t }: VersionSelectorProps) {
  return (
    <div className="relative">
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-input bg-background px-3 py-1.5 pr-8 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
      >
        {VERSIONS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
