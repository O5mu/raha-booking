import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Lock, Trash2, UserRound } from "lucide-react";
import { api } from "../../api/client";
import type { CalendarEntry, OwnerIstiraha } from "../../api/types";
import { useFormat } from "../../lib/format";
import { bookedNights } from "../../lib/dates";
import { Dialog } from "../../components/Dashboard";
import { DateRangeCalendar, type Range } from "../../components/DateRangeCalendar";
import styles from "./ManageDatesDialog.module.css";

export function ManageDatesDialog({ istiraha, onClose }: { istiraha: OwnerIstiraha | null; onClose: () => void }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const queryClient = useQueryClient();
  const [range, setRange] = useState<Range>({});
  const id = istiraha?.id;

  const calendar = useQuery({
    queryKey: ["owner", "calendar", id],
    queryFn: () => api<{ entries: CalendarEntry[] }>(`/owner/istirahas/${id}/calendar`),
    enabled: id !== undefined,
  });
  const taken = useMemo(() => bookedNights(calendar.data?.entries ?? []), [calendar.data]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["owner"] });
    queryClient.invalidateQueries({ queryKey: ["istiraha", String(id)] });
  };

  const block = useMutation({
    mutationFn: () => api(`/owner/istirahas/${id}/blocks`, { method: "POST", body: range }),
    onSuccess: () => {
      setRange({});
      refresh();
    },
  });

  const unblock = useMutation({
    mutationFn: (blockId: number) => api(`/owner/blocks/${blockId}`, { method: "DELETE" }),
    onSuccess: refresh,
  });

  function close() {
    setRange({});
    block.reset();
    onClose();
  }

  return (
    <Dialog open={istiraha !== null} title={istiraha ? t("owner.datesTitle", { name: fmt.pick(istiraha, "name") }) : ""} onClose={close}>
      <p className="muted">{t("owner.datesHint")}</p>

      <div className={styles.calendar}>
        <DateRangeCalendar value={range} onChange={setRange} booked={taken} months={2} />
      </div>

      {block.isError && <p className="form-error">{(block.error as Error).message}</p>}
      <button className="btn btn-primary" disabled={!range.checkOut || block.isPending} onClick={() => block.mutate()}>
        <Lock size={16} />
        {range.checkIn && range.checkOut ? t("owner.blockDates", { dates: fmt.range(range.checkIn, range.checkOut) }) : t("details.pickCheckIn")}
      </button>

      <h3 className={styles.listTitle}>{t("owner.blocksList")}</h3>
      {calendar.data?.entries.length === 0 && <p className="muted">{t("owner.noEntries")}</p>}
      <ul className={styles.list}>
        {calendar.data?.entries.map((e) => (
          <li key={e.id} className={e.kind === "block" ? styles.block : ""}>
            {e.kind === "block" ? <Lock size={16} /> : <UserRound size={16} />}
            <span className={styles.entryText}>
              <strong>{fmt.range(e.check_in, e.check_out)}</strong>
              <span className="muted">{e.kind === "block" ? t("owner.blocked") : `${e.guest_name} · ${t("bookings.guests", { count: e.guests ?? 0 })}`}</span>
            </span>
            {e.kind === "block" && (
              <button className="btn btn-ghost" onClick={() => unblock.mutate(e.id)} disabled={unblock.isPending} aria-label={t("owner.remove")}>
                <Trash2 size={16} />
                {t("owner.remove")}
              </button>
            )}
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
