import React from 'react';
import { Clock, HelpCircle } from 'lucide-react';
import { CutoffPolicyInfo } from '../../types';

interface CutoffSelectorProps {
  selectedPolicyId: string;
  onSelectPolicy: (policyId: string) => void;
  policies?: CutoffPolicyInfo[];
  disabled?: boolean;
}

const DEFAULT_POLICIES: CutoffPolicyInfo[] = [
  {
    policy_id: 'd0_0000',
    label: 'Delivery Day 00:00 (Default)',
    description: 'Latest forecast published before the delivery date begins (00:00 GMT). Baseline view of forecast volume prior to delivery commencement.'
  },
  {
    policy_id: 'd1_1100',
    label: 'Auction Gate (11:00 D-1)',
    description: '11:00 UK local time on D-1. Standard Day-Ahead Wholesale Auction order submission deadline (EPEX SPOT / Nord Pool).'
  },
  {
    policy_id: 'd1_1200',
    label: 'Auction Result (12:00 D-1)',
    description: '12:00 UK local time on D-1. Post-auction clearing publication and bilateral portfolio balancing.'
  },
  {
    policy_id: 'd1_1700',
    label: 'Evening Close (17:00 D-1)',
    description: '17:00 UK local time on D-1. Evening trading desk handover before overnight automated dispatch.'
  }
];

export const CutoffSelector: React.FC<CutoffSelectorProps> = ({
  selectedPolicyId,
  onSelectPolicy,
  policies = DEFAULT_POLICIES,
  disabled = false
}) => {
  const activePolicy = policies.find((p) => p.policy_id === selectedPolicyId) || policies[0];

  return (
    <div className="panel-card p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          Decision Cutoff Policy
        </label>
        <span className="text-xs text-slate-500">
          Enforces: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">publishTime &le; cutoff</code>
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {policies.map((policy) => {
          const isSelected = policy.policy_id === selectedPolicyId;
          return (
            <button
              key={policy.policy_id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectPolicy(policy.policy_id)}
              className={`p-3 rounded-md text-left text-xs font-medium transition-colors border ${
                isSelected
                  ? 'bg-blue-50 text-blue-900 border-blue-400 shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              } disabled:opacity-50`}
            >
              <div className="font-semibold">{policy.label}</div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                {policy.policy_id}
              </div>
            </button>
          );
        })}
      </div>

      {activePolicy && (
        <div className="mt-3 px-3 py-2 rounded bg-slate-50 border border-slate-200 flex items-start gap-2 text-xs text-slate-600">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-800">{activePolicy.label}:</strong> {activePolicy.description}
          </p>
        </div>
      )}
    </div>
  );
};
