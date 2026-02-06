import type { FunFact } from '../../types';

interface FunFactsProps {
  facts: FunFact[];
}

export function FunFacts({ facts }: FunFactsProps) {
  if (facts.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-accent/10 to-purple-500/10 rounded-lg p-4 border border-accent/20">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <span>✨</span>
        <span>Fun Facts</span>
      </h3>
      
      <div className="space-y-3">
        {facts.map((fact) => (
          <div key={fact.id} className="flex items-start gap-3">
            <span className="text-lg flex-shrink-0">{fact.icon}</span>
            <div className="min-w-0">
              <p className="text-sm text-gray-300">
                {fact.text}
              </p>
              <p className="text-sm font-semibold text-accent">
                {fact.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
