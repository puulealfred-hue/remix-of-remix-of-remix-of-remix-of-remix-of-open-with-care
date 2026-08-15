import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAdmin } from "@/components/admin/AdminDataContext";
import { BackLink, Badge, Btn, Field, Panel, Stat, dateTime, inputCls, ugx } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/transactions/$txId")({
  component: TxDetailPage,
});

function TxDetailPage() {
  const { txId } = Route.useParams();
  const navigate = useNavigate();
  const { state, updateTransaction, deleteTransaction } = useAdmin();
  const tx = state.transactions.find((t) => t.id === txId);

  if (!tx) {
    return (
      <Panel title="Transaction not found">
        <BackLink to="/admin/transactions" label="Back to transactions" />
      </Panel>
    );
  }
  const owner = state.users.find((u) => u.id === tx.actorId);
  const agent = state.agents.find((a) => a.id === tx.actorId);
  const affiliate = state.affiliates.find((a) => a.id === tx.actorId);

  return (
    <div className="space-y-2 md:space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <BackLink to="/admin/transactions" label="All transactions" />
          <h2 className="text-lg font-black text-xb-text">{tx.reference}</h2>
          <p className="text-[11px] text-xb-text-muted">
            {tx.kind} · {tx.actorName} · {dateTime(tx.at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge value={tx.status} />
          {owner && (
            <Link to="/admin/users/$userId" params={{ userId: owner.id }} className="rounded-lg bg-xb-blue px-3 py-1.5 text-[11px] font-bold text-xb-on-dark">
              Owner profile
            </Link>
          )}
          {agent && (
            <Link to="/admin/agents/$agentId" params={{ agentId: agent.id }} className="rounded-lg bg-xb-blue px-3 py-1.5 text-[11px] font-bold text-xb-on-dark">
              Agent profile
            </Link>
          )}
          {affiliate && (
            <Link to="/admin/affiliates/$affiliateId" params={{ affiliateId: affiliate.id }} className="rounded-lg bg-xb-blue px-3 py-1.5 text-[11px] font-bold text-xb-on-dark">
              Affiliate profile
            </Link>
          )}
          <Btn
            size="xs"
            tone="red"
            onClick={() => {
              deleteTransaction(tx.id);
              toast.success("Transaction deleted");
              navigate({ to: "/admin/transactions" });
            }}
          >
            Delete
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <Stat label="Amount" value={ugx(tx.amount)} tone={tx.amount < 0 ? "red" : "green"} big />
        <Stat label="Type" value={tx.kind} />
        <Stat label="Method" value={tx.method} />
        <Stat label="Role" value={tx.actorType} />
      </div>

      <Panel title="Edit transaction">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Reference">
            <input className={inputCls} value={tx.reference} onChange={(e) => updateTransaction(tx.id, { reference: e.target.value })} />
          </Field>
          <Field label="Amount">
            <input type="number" className={inputCls} value={tx.amount} onChange={(e) => updateTransaction(tx.id, { amount: Number(e.target.value) })} />
          </Field>
          <Field label="Method">
            <input className={inputCls} value={tx.method} onChange={(e) => updateTransaction(tx.id, { method: e.target.value })} />
          </Field>
          <Field label="Status">
            <select
              className={inputCls}
              value={tx.status}
              onChange={(e) => updateTransaction(tx.id, { status: e.target.value as typeof tx.status })}
            >
              <option value="completed">completed</option>
              <option value="pending">pending</option>
              <option value="failed">failed</option>
            </select>
          </Field>
        </div>
      </Panel>
    </div>
  );
}
