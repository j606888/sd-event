"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RegistrationDetailData } from "@/types/registration";

const ROLES = ["Leader", "Follower", "Not sure"] as const;

type AttendeeRow = { key: string; id?: number; name: string; role: string; flagged: boolean };

export type RegistrationEditPatch = {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  totalAmount: number;
  attendees: { id?: number; name: string; role: string; flagged: boolean }[];
};

type RegistrationEditDrawerProps = {
  open: boolean;
  registration: RegistrationDetailData;
  onClose: () => void;
  onSave: (patch: RegistrationEditPatch) => Promise<void>;
};

export function RegistrationEditDrawer({
  open,
  registration,
  onClose,
  onSave,
}: RegistrationEditDrawerProps) {
  const t = useTranslations("registration");
  const tCommon = useTranslations("common");
  const seqRef = useRef(0);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 開啟時用現有報名資料初始化表單
  useEffect(() => {
    if (open) {
      seqRef.current = 0;
      setContactName(registration.contactName ?? "");
      setContactPhone(registration.contactPhone ?? "");
      setContactEmail(registration.contactEmail ?? "");
      setAmountInput(String(registration.totalAmount ?? ""));
      setAttendees(
        registration.attendees.map((a) => ({
          key: `a-${seqRef.current++}`,
          id: a.id,
          name: a.name,
          role: ROLES.includes(a.role as (typeof ROLES)[number])
            ? a.role
            : "Not sure",
          flagged: a.flagged === true,
        }))
      );
      setError(null);
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, registration.id]);

  const flagLabel = registration.attendeeFlagLabel?.trim() || null;

  const updateAttendee = (key: string, field: "name" | "role", value: string) =>
    setAttendees((prev) =>
      prev.map((a) => (a.key === key ? { ...a, [field]: value } : a))
    );
  const addAttendee = () =>
    setAttendees((prev) => [
      ...prev,
      { key: `a-${seqRef.current++}`, name: "", role: "Leader", flagged: false },
    ]);
  const removeAttendee = (key: string) =>
    setAttendees((prev) => (prev.length > 1 ? prev.filter((a) => a.key !== key) : prev));

  const handleSubmit = async () => {
    setError(null);

    const name = contactName.trim();
    if (!name) {
      setError(t("edit.contactNameRequired"));
      return;
    }
    const email = contactEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("edit.invalidEmail"));
      return;
    }

    const validAttendees = attendees
      .map((a) => ({ id: a.id, name: a.name.trim(), role: a.role, flagged: a.flagged }))
      .filter((a) => a.name && ROLES.includes(a.role as (typeof ROLES)[number]));
    if (validAttendees.length === 0) {
      setError(t("form.atLeastOneAttendee"));
      return;
    }

    const amountNum = Math.floor(Number(amountInput));
    if (!Number.isInteger(amountNum) || amountNum <= 0) {
      setError(t("edit.invalidAmount"));
      return;
    }

    setSaving(true);
    try {
      await onSave({
        contactName: name,
        contactPhone: contactPhone.trim(),
        contactEmail: email,
        totalAmount: amountNum,
        attendees: validAttendees,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("edit.failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t("edit.title")}
      subtitle={t("edit.subtitle")}
    >
      <div className="space-y-6">
        {/* 聯絡人 */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">{t("edit.contactHeading")}</h3>
          <div className="space-y-2">
            <Label htmlFor="edit-contact-name">{t("edit.nameLabel")}</Label>
            <Input
              id="edit-contact-name"
              placeholder={t("form.namePlaceholder")}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-contact-phone">{t("edit.phoneLabel")}</Label>
            <Input
              id="edit-contact-phone"
              placeholder={t("edit.phoneLabel")}
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-contact-email">Email</Label>
            <Input
              id="edit-contact-email"
              type="email"
              placeholder="Email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
        </div>

        {/* 參加者 */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">{t("form.attendeesHeading")}</h3>
          {attendees.map((a, index) => (
            <div key={a.key} className="space-y-2 rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  {t("form.attendeeN", { n: index + 1 })}
                </span>
                {attendees.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAttendee(a.key)}
                    className="text-gray-400 hover:text-red-500"
                    aria-label={t("form.removeAttendee")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Input
                placeholder={t("form.namePlaceholder")}
                value={a.name}
                onChange={(e) => updateAttendee(a.key, "name", e.target.value)}
              />
              <div className="flex gap-4">
                {ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name={`edit-role-${a.key}`}
                      checked={a.role === role}
                      onChange={() => updateAttendee(a.key, "role", role)}
                      className="h-4 w-4 text-brand-strong"
                    />
                    {role}
                  </label>
                ))}
              </div>
              {flagLabel && (
                <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={a.flagged}
                    onChange={(e) =>
                      setAttendees((prev) =>
                        prev.map((x) => (x.key === a.key ? { ...x, flagged: e.target.checked } : x))
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300 accent-brand"
                  />
                  {flagLabel}
                </label>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addAttendee}
            className="w-full gap-1.5 border-brand text-brand-strong hover:bg-brand/10"
          >
            <Plus className="h-4 w-4" />
            <span>{t("form.addAttendee")}</span>
          </Button>
        </div>

        {/* 金額 */}
        <div className="space-y-2">
          <Label htmlFor="edit-amount">{t("edit.amountLabel")}</Label>
          <Input
            id="edit-amount"
            type="number"
            min={0}
            placeholder={t("form.amountPlaceholder")}
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="bg-brand text-ink hover:bg-brand-hover"
          >
            {saving ? tCommon("saving") : tCommon("save")}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
