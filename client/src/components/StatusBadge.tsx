type Status = "orcamento" | "confirmado" | "pagamento" | "concluido";

const STATUS_CONFIG: Record<Status, { label: string; className: string; accentClassName: string; fillClassName: string }> = {
  orcamento: { label: "Orçamento", className: "status-orcamento", accentClassName: "status-accent-orcamento", fillClassName: "status-fill-orcamento" },
  confirmado: { label: "Confirmado", className: "status-confirmado", accentClassName: "status-accent-confirmado", fillClassName: "status-fill-confirmado" },
  pagamento: { label: "Pagamento", className: "status-pagamento", accentClassName: "status-accent-pagamento", fillClassName: "status-fill-pagamento" },
  concluido: { label: "Concluído", className: "status-concluido", accentClassName: "status-accent-concluido", fillClassName: "status-fill-concluido" },
};

export function getStatusAccentClass(status: string) {
  return STATUS_CONFIG[status as Status]?.accentClassName ?? "";
}

export function getStatusFillClass(status: string) {
  return STATUS_CONFIG[status as Status]?.fillClassName ?? "";
}

export default function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as Status] ?? { label: status, className: "" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${config.className}`}>
      {config.label}
    </span>
  );
}
