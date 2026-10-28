"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BankInfoDrawerProps = {
  teamId: number;
  onSuccess: (bankInfoId: number) => void;
  onCancel: () => void;
};

export function BankInfoDrawer({
  teamId,
  onSuccess,
  onCancel,
}: BankInfoDrawerProps) {
  const t = useTranslations("savedInfo");
  const tCommon = useTranslations("common");
  const [label, setLabel] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [account, setAccount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedBankName = bankName.trim();
    const trimmedBankCode = bankCode.trim();
    if (!trimmedBankName || !trimmedBankCode) {
      setError(t("bank.required"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/bank-infos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          label: label.trim() || undefined,
          bankName: trimmedBankName,
          bankCode: trimmedBankCode,
          account: account.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("addFailed"));
        setSubmitting(false);
        return;
      }
      if (data.bankInfo?.id) {
        onSuccess(data.bankInfo.id);
      }
      setLabel("");
      setBankName("");
      setBankCode("");
      setAccount("");
      onCancel();
    } catch {
      setError(t("addFailed"));
    }
    setSubmitting(false);
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex flex-col gap-2">
        <Label htmlFor="bank-label">{t("bank.labelLabel")}</Label>
        <Input
          id="bank-label"
          placeholder={t("bank.labelPlaceholder")}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <p className="text-xs text-gray-500">{t("bank.labelHint")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="bank-name">{t("bank.bankNameLabel")}</Label>
        <Input
          id="bank-name"
          placeholder={t("bank.bankNamePlaceholder")}
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="bank-code">{t("bank.bankCodeLabel")}</Label>
        <Input
          id="bank-code"
          placeholder={t("bank.bankCodePlaceholder")}
          value={bankCode}
          onChange={(e) => setBankCode(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="bank-account">{t("bank.accountLabel")}</Label>
        <Input
          id="bank-account"
          placeholder={t("bank.accountPlaceholder")}
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tCommon("cancel")}
        </Button>
        <Button
          type="submit"
          className="bg-primary text-ink hover:bg-brand-hover"
          disabled={submitting}
        >
          {submitting ? tCommon("adding") : tCommon("add")}
        </Button>
      </div>
    </form>
  );
}
