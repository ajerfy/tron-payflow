export type InvoiceStatus = "pending" | "partial" | "paid" | "overdue";

export type SettlementMethod = "demo" | "tron_tx" | "manual";

export type ReconciliationAlert = "partial-payment" | "overdue" | "failed-attempt";

export type SettlementRecord = {
  id: string;
  amountUsdt: number;
  txHash: string;
  settledAt: string;
  payerAddress?: string;
  note?: string;
  method: SettlementMethod;
  referenceLabel?: string;
};

export type ReconciliationNote = {
  id: string;
  createdAt: string;
  kind: ReconciliationAlert;
  message: string;
};

export type PaymentRecord = {
  id: string;
  merchantAddress: string;
  merchantName: string;
  supportEmail: string;
  amountUsdt: number;
  amountPaidUsdt: number;
  label: string;
  category: string;
  counterpartyName: string;
  counterpartyEmail: string;
  notes?: string;
  network: "demo" | "nile";
  onchainRequestId?: number;
  onchainInvoiceTxHash?: string;
  status: InvoiceStatus;
  createdAt: string;
  dueAt?: string;
  txHash?: string;
  paidAt?: string;
  payerAddress?: string;
  attemptCount: number;
  lastFailureReason?: string;
  lastAttemptAt?: string;
  settlements: SettlementRecord[];
  reconciliationNotes: ReconciliationNote[];
};

export type CreatePaymentInput = {
  merchantAddress: string;
  merchantName: string;
  supportEmail: string;
  amountUsdt: number;
  label: string;
  category: string;
  counterpartyName: string;
  counterpartyEmail: string;
  notes?: string;
  network: "demo" | "nile";
  onchainRequestId?: number;
  onchainInvoiceTxHash?: string;
  dueAt?: string;
};

export type AddSettlementInput = {
  amountUsdt: number;
  txHash: string;
  settledAt: string;
  payerAddress?: string;
  note?: string;
  method: SettlementMethod;
  referenceLabel?: string;
};

function normalizeTxHash(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Settlement reference is required.");
  }
  return trimmed;
}

function nextNote(kind: ReconciliationAlert, message: string, at: string): ReconciliationNote {
  return {
    id: `note_${kind}_${Date.parse(at)}`,
    createdAt: at,
    kind,
    message
  };
}

export function derivePaymentStatus(payment: PaymentRecord, nowIso = new Date().toISOString()): InvoiceStatus {
  if (payment.amountPaidUsdt + 1e-6 >= payment.amountUsdt) {
    return "paid";
  }

  if (payment.amountPaidUsdt > 0) {
    if (payment.dueAt && payment.dueAt < nowIso) {
      return "overdue";
    }
    return "partial";
  }

  if (payment.dueAt && payment.dueAt < nowIso) {
    return "overdue";
  }

  return "pending";
}

export function createPaymentRecord(input: CreatePaymentInput, now = new Date()): PaymentRecord {
  const createdAt = now.toISOString();
  const payment: PaymentRecord = {
    id: `inv_${now.getTime()}`,
    merchantAddress: input.merchantAddress,
    merchantName: input.merchantName,
    supportEmail: input.supportEmail,
    amountUsdt: input.amountUsdt,
    amountPaidUsdt: 0,
    label: input.label,
    category: input.category,
    counterpartyName: input.counterpartyName,
    counterpartyEmail: input.counterpartyEmail,
    notes: input.notes,
    network: input.network,
    onchainRequestId: input.onchainRequestId,
    onchainInvoiceTxHash: input.onchainInvoiceTxHash,
    status: "pending",
    createdAt,
    dueAt: input.dueAt,
    attemptCount: 0,
    settlements: [],
    reconciliationNotes: []
  };

  payment.status = derivePaymentStatus(payment, createdAt);
  return payment;
}

export function addSettlementRecord(payment: PaymentRecord, input: AddSettlementInput): PaymentRecord {
  const settledAt = input.settledAt;
  const txHash = normalizeTxHash(input.txHash);
  const outstandingBefore = Math.max(payment.amountUsdt - payment.amountPaidUsdt, 0);
  if (input.amountUsdt <= 0) {
    throw new Error("Settlement amount must be greater than zero.");
  }
  if (input.amountUsdt - outstandingBefore > 1e-6) {
    throw new Error("Settlement amount exceeds the outstanding balance.");
  }

  const settlement: SettlementRecord = {
    id: `settlement_${payment.settlements.length + 1}_${Date.parse(settledAt)}`,
    amountUsdt: input.amountUsdt,
    txHash,
    settledAt,
    payerAddress: input.payerAddress,
    note: input.note,
    method: input.method,
    referenceLabel: input.referenceLabel
  };

  const amountPaidUsdt = Number((payment.amountPaidUsdt + input.amountUsdt).toFixed(6));
  const updated: PaymentRecord = {
    ...payment,
    amountPaidUsdt,
    txHash,
    paidAt: amountPaidUsdt + 1e-6 >= payment.amountUsdt ? settledAt : payment.paidAt,
    payerAddress: input.payerAddress ?? payment.payerAddress,
    settlements: [...payment.settlements, settlement],
    attemptCount: payment.attemptCount + 1,
    lastFailureReason: undefined,
    lastAttemptAt: settledAt,
    reconciliationNotes: [...payment.reconciliationNotes]
  };

  if (amountPaidUsdt + 1e-6 < payment.amountUsdt) {
    const remaining = Number((payment.amountUsdt - amountPaidUsdt).toFixed(2));
    updated.reconciliationNotes.push(
      nextNote("partial-payment", `Partial settlement recorded. ${remaining.toFixed(2)} USDT remains outstanding.`, settledAt)
    );
  }

  updated.status = derivePaymentStatus(updated, settledAt);
  return updated;
}

export function recordPaymentFailure(payment: PaymentRecord, reason: string, walletAddress?: string, now = new Date()): PaymentRecord {
  const attemptTime = now.toISOString();
  const updated: PaymentRecord = {
    ...payment,
    payerAddress: walletAddress ?? payment.payerAddress,
    attemptCount: payment.attemptCount + 1,
    lastFailureReason: reason,
    lastAttemptAt: attemptTime,
    reconciliationNotes: [
      ...payment.reconciliationNotes,
      nextNote("failed-attempt", reason, attemptTime)
    ]
  };

  updated.status = derivePaymentStatus(updated, attemptTime);
  return updated;
}

export function summarizeMerchantPortfolio(payments: PaymentRecord[]) {
  const totals = payments.reduce(
    (acc, payment) => {
      acc.issued += payment.amountUsdt;
      acc.collected += payment.amountPaidUsdt;
      acc.outstanding += Math.max(payment.amountUsdt - payment.amountPaidUsdt, 0);
      acc[payment.status] += 1;
      return acc;
    },
    {
      issued: 0,
      collected: 0,
      outstanding: 0,
      pending: 0,
      partial: 0,
      paid: 0,
      overdue: 0
    }
  );

  return {
    ...totals,
    collectionRate: totals.issued === 0 ? 0 : totals.collected / totals.issued
  };
}
