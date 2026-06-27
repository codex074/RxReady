import type { TicketStatus } from '../types/backorder';
import { STATUSES } from '../utils/status';

type StatusBadgeProps = {
  status: TicketStatus;
  compact?: boolean;
  large?: boolean;
};

export function StatusBadge({ status, compact = false, large = false }: StatusBadgeProps) {
  const meta = STATUSES[status];
  const sizing = large
    ? 'gap-[7px] px-[14px] py-[6px] text-[13px] font-bold'
    : compact
      ? 'gap-[5px] px-[9px] py-[3px] text-[11.5px] font-semibold'
      : 'gap-[6px] px-[10px] py-[4px] text-[12px] font-semibold';
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border ${sizing}`}
      style={{ background: meta.bg, color: meta.text, borderColor: meta.border }}
    >
      <span
        className={`${large ? 'h-[8px] w-[8px]' : compact ? 'h-[6px] w-[6px]' : 'h-[7px] w-[7px]'} rounded-full`}
        style={{ background: meta.dot }}
      />
      {meta.label}
    </span>
  );
}
