import React from 'react';
import { Wallet, PlusCircle, ArrowUpRight, History } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../lib/formatters';
import { useApp } from '../../context/AppContext';

interface PartnerCardProps {
  name: string;
  percentage: number;
  balance: number;
  initialCapital?: number;
  onAddContribution?: () => void;
  onWithdraw?: () => void;
  onViewTransactions?: () => void;
}

export const PartnerCard: React.FC<PartnerCardProps> = ({
  name,
  percentage,
  balance,
  onAddContribution,
  onWithdraw,
  onViewTransactions,
}) => {
  const { t, language } = useApp();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow">
            {name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-base">{name}</h4>
            <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {formatPercentage(percentage)} {t.partners}
            </span>
          </div>
        </div>
        <div className="p-2 rounded-lg bg-slate-50 text-slate-400">
          <Wallet className="w-5 h-5" />
        </div>
      </div>

      {/* Progress Bar showing equity share */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Part du capital</span>
          <span className="font-semibold text-slate-700">{formatPercentage(percentage)}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Balance display */}
      <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-100">
        <p className="text-xs font-medium text-slate-500">{t.availableBalance}</p>
        <p className="text-xl font-extrabold text-slate-900 mt-0.5">
          {formatCurrency(balance, language)}
        </p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onAddContribution}
          className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-medium border border-slate-200 hover:border-emerald-200 transition-colors"
          title={t.addContribution}
        >
          <PlusCircle className="w-4 h-4 mb-1 text-emerald-600" />
          <span className="truncate w-full text-center">Apport</span>
        </button>

        <button
          onClick={onWithdraw}
          className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-medium border border-slate-200 hover:border-rose-200 transition-colors"
          title={t.withdraw}
        >
          <ArrowUpRight className="w-4 h-4 mb-1 text-rose-600" />
          <span className="truncate w-full text-center">Retrait</span>
        </button>

        <button
          onClick={onViewTransactions}
          className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-medium border border-slate-200 hover:border-blue-200 transition-colors"
          title={t.viewTransactions}
        >
          <History className="w-4 h-4 mb-1 text-blue-600" />
          <span className="truncate w-full text-center">Grand livre</span>
        </button>
      </div>
    </div>
  );
};
