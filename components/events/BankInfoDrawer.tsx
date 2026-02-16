"use client";

import { useState } from "react";
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
      setError("請輸入銀行名稱與銀行代碼");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/bank-infos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bankName: trimmedBankName,
          bankCode: trimmedBankCode,
          account: account.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "新增失敗");
        setSubmitting(false);
        return;
      }
      if (data.bankInfo?.id) {
        onSuccess(data.bankInfo.id);
      }
      setBankName("");
      setBankCode("");
      setAccount("");
      onCancel();
    } catch {
      setError("新增失敗");
    }
    setSubmitting(false);
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex flex-col gap-2">
        <Label htmlFor="bank-name">銀行名稱 *</Label>
        <Input
          id="bank-name"
          placeholder="輸入銀行名稱"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="bank-code">銀行代碼 *</Label>
        <Input
          id="bank-code"
          placeholder="輸入銀行代碼"
          value={bankCode}
          onChange={(e) => setBankCode(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="bank-account">銀行帳戶</Label>
        <Input
          id="bank-account"
          placeholder="輸入銀行帳戶"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button
          type="submit"
          className="bg-gray-900 text-white hover:bg-gray-800"
          disabled={submitting}
        >
          {submitting ? "新增中…" : "新增"}
        </Button>
      </div>
    </form>
  );
}
