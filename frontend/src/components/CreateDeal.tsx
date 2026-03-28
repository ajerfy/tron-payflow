import { useMemo, useState } from "react";
import type { CreateDealInput } from "../types";
import { ENERGY_HINTS, TOKENS } from "../utils/constants";

type Props = {
  onCreate: (input: CreateDealInput) => Promise<void>;
};

export function CreateDeal({ onCreate }: Props) {
  const [form, setForm] = useState<CreateDealInput>({
    tokenA: TOKENS[0].address,
    amountA: "10",
    tokenB: TOKENS[1].address,
    amountB: "100",
    counterparty: "",
    timeoutHours: 24
  });
  const [submitting, setSubmitting] = useState(false);

  const impliedRate = useMemo(() => {
    const amountA = Number(form.amountA || 0);
    const amountB = Number(form.amountB || 0);
    if (!amountA || !amountB) {
      return "Enter both amounts";
    }
    return `1 ${TOKENS.find((token) => token.address === form.tokenA)?.symbol} = ${(amountB / amountA).toFixed(4)} ${TOKENS.find((token) => token.address === form.tokenB)?.symbol}`;
  }, [form]);

  async function submit() {
    setSubmitting(true);
    try {
      await onCreate(form);
      setForm({ ...form, counterparty: "" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <h2>Create New Deal</h2>
      <div className="form-grid">
        <label>
          <span>I’m selling</span>
          <div className="inline-field">
            <select value={form.tokenA} onChange={(event) => setForm({ ...form, tokenA: event.target.value })}>
              {TOKENS.map((token) => <option key={token.address} value={token.address}>{token.label}</option>)}
            </select>
            <input value={form.amountA} onChange={(event) => setForm({ ...form, amountA: event.target.value })} />
          </div>
        </label>
        <label>
          <span>I want</span>
          <div className="inline-field">
            <select value={form.tokenB} onChange={(event) => setForm({ ...form, tokenB: event.target.value })}>
              {TOKENS.map((token) => <option key={token.address} value={token.address}>{token.label}</option>)}
            </select>
            <input value={form.amountB} onChange={(event) => setForm({ ...form, amountB: event.target.value })} />
          </div>
        </label>
        <label>
          <span>Counterparty address</span>
          <input value={form.counterparty} onChange={(event) => setForm({ ...form, counterparty: event.target.value })} placeholder="T..." />
        </label>
        <label>
          <span>Timeout</span>
          <select value={form.timeoutHours} onChange={(event) => setForm({ ...form, timeoutHours: Number(event.target.value) })}>
            {[1, 6, 12, 24, 48].map((hours) => <option key={hours} value={hours}>{hours} hour{hours > 1 ? "s" : ""}</option>)}
          </select>
        </label>
      </div>
      <div className="row spread">
        <div>
          <p className="muted">Implied rate</p>
          <strong>{impliedRate}</strong>
        </div>
        <div>
          <p className="muted">Energy estimate</p>
          <strong>{ENERGY_HINTS.create}</strong>
        </div>
      </div>
      <button className="primary-button" disabled={submitting} onClick={submit}>Create Deal</button>
    </section>
  );
}
