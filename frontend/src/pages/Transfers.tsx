import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowRight, RotateCcw, Calendar, FileText, ChevronRight } from 'lucide-react';
import { getTransfers, reverseTransfer, createTransfer, TransferEvent } from '../api/transfers';
import Modal from '../components/Modal';
import TransferForm from '../components/TransferForm';

const Transfers: React.FC = () => {
  const [transfers, setTransfers] = useState<TransferEvent[]>([]);
  const [pagination, setPagination] = useState({ after: null, limit: 10 });
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTransfers = useCallback(async (after?: string) => {
    setIsLoading(true);
    try {
      const { data, pagination: pag } = await getTransfers(after, 10);
      setTransfers(data);
      setPagination(pag);
    } catch (error) {
      console.error('Failed to fetch transfers:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleReverse = async (id: string) => {
    const notes = window.prompt('Enter reason for reversal (optional):');
    if (notes === null) return; // Cancelled

    try {
      await reverseTransfer(id, notes || undefined);
      fetchTransfers();
    } catch (error) {
      console.error('Reversal failed:', error);
      alert('Failed to reverse transfer.');
    }
  };

  const getStatusBadge = (transfer: TransferEvent) => {
    if (transfer.reversedBy) {
      return (
        <span className="px-2 py-1 text-xs font-semibold bg-red-50 text-red-700 rounded border border-red-100 uppercase">
          Reversed
        </span>
      );
    }
    if (transfer.type === 'reversal') {
      return (
        <span className="px-2 py-1 text-xs font-semibold bg-orange-50 text-orange-700 rounded border border-orange-100 uppercase">
          Reversal
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-semibold bg-green-50 text-green-700 rounded border border-green-100 uppercase">
        {transfer.type}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">Transfers & Swaps</h1>
          <p className="text-xs text-slate-400 mt-0.5">Record property movements between companies and multi-leg swaps.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Transfer / Swap
        </button>
      </div>

      <div className="bg-slate-950 rounded-xl shadow-sm border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <th className="px-4 py-2.5">Date & Type</th>
                <th className="px-4 py-2.5">Movement</th>
                <th className="px-4 py-2.5">Notes</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {transfers.map((transfer) => {
                // Group legs by property to show movement more clearly
                // In a transfer, we have an 'out' and an 'in' leg for the same property
                const movements = transfer.legs.reduce((acc: any, leg) => {
                  const propId = leg.propertyCompany.property.id;
                  if (!acc[propId]) {
                    acc[propId] = {
                      property: leg.propertyCompany.property,
                      from: null,
                      to: null,
                      pct: leg.propertyCompany.ownershipPct
                    };
                  }
                  if (leg.direction === 'out') acc[propId].from = leg.propertyCompany.company;
                  if (leg.direction === 'in') acc[propId].to = leg.propertyCompany.company;
                  return acc;
                }, {});

                return (
                  <tr key={transfer.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center text-sm font-medium text-gray-900">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {new Date(transfer.createdAt).toLocaleDateString()}
                      </div>
                      <div className="mt-2">
                        {getStatusBadge(transfer)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-3">
                        {Object.values(movements).map((m: any) => (
                          <div key={m.property.id} className="flex items-start">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {m.property.name}
                              </p>
                              <div className="flex items-center mt-1 text-xs text-gray-500 space-x-2">
                                <span className="font-medium text-gray-700">{m.from?.name || 'Unknown'}</span>
                                <ArrowRight className="w-3 h-3 text-gray-400" />
                                <span className="font-medium text-blue-600">{m.to?.name || 'Unknown'}</span>
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded ml-2 font-bold">
                                  {m.pct}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      {transfer.notes ? (
                        <div className="flex items-start text-sm text-gray-500">
                          <FileText className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="italic">"{transfer.notes}"</span>
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right align-top">
                      {!transfer.reversedBy && transfer.type !== 'reversal' && (
                        <button
                          onClick={() => handleReverse(transfer.id)}
                          className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors inline-flex items-center text-xs font-medium"
                          title="Reverse Transfer"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Reverse
                        </button>
                      )}
                      {transfer.reversedBy && (
                        <span className="text-xs text-red-400 italic">Reversed by {transfer.reversedBy.substring(0, 8)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {transfers.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No transfers recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {transfers.length} transfer events
          </p>
          <div className="flex items-center space-x-2">
            <button
              disabled={isLoading || !pagination.after}
              onClick={() => fetchTransfers(pagination.after || undefined)}
              className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Property Transfer / Swap"
      >
        <TransferForm
          onSubmit={async (data) => {
            try {
              await createTransfer(data);
              setIsModalOpen(false);
              fetchTransfers();
            } catch (error) {
              alert('Failed to record transfer. Check if ownership percentage is sufficient and snapshot gate is open.');
            }
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default Transfers;
