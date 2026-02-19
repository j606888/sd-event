"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer } from "@/components/ui/drawer";
import { useCurrentTeam } from "@/hooks/use-current-team";

type BankInfo = {
  id: number;
  teamId: number;
  bankName: string;
  bankCode: string;
  account: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function EventBankPage() {
  const { teamId, isLoading: teamLoading, error: teamError } = useCurrentTeam();
  const [bankInfos, setBankInfos] = useState<BankInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBankInfoId, setEditingBankInfoId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formBankName, setFormBankName] = useState("");
  const [formBankCode, setFormBankCode] = useState("");
  const [formAccount, setFormAccount] = useState("");

  const fetchBankInfos = useCallback(async () => {
    if (teamId == null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/bank-infos`, { credentials: "include" });
      if (!res.ok) {
        setBankInfos([]);
        return;
      }
      const data = await res.json();
      setBankInfos(data.bankInfos ?? []);
    } catch {
      setBankInfos([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchBankInfos();
  }, [fetchBankInfos]);

  const openDrawer = () => {
    setEditingBankInfoId(null);
    setSubmitError(null);
    setFormBankName("");
    setFormBankCode("");
    setFormAccount("");
    setDrawerOpen(true);
  };

  const openEditDrawer = (bankInfo: BankInfo) => {
    setEditingBankInfoId(bankInfo.id);
    setSubmitError(null);
    setFormBankName(bankInfo.bankName);
    setFormBankCode(bankInfo.bankCode);
    setFormAccount(bankInfo.account || "");
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teamId == null) return;
    setSubmitError(null);
    const bankName = formBankName.trim();
    const bankCode = formBankCode.trim();
    if (!bankName || !bankCode) {
      setSubmitError("請輸入銀行名稱與銀行代碼");
      return;
    }

    const isEditing = editingBankInfoId !== null;
    const url = isEditing
      ? `/api/teams/${teamId}/bank-infos/${editingBankInfoId}`
      : `/api/teams/${teamId}/bank-infos`;
    const method = isEditing ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bankName,
          bankCode,
          account: formAccount.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || (isEditing ? "更新失敗" : "新增失敗"));
        return;
      }
      setDrawerOpen(false);
      fetchBankInfos();
    } catch {
      setSubmitError(isEditing ? "更新失敗" : "新增失敗");
    }
  };

  if (teamLoading || (teamId == null && !teamError)) {
    return (
      <div className="p-6">
        <p className="text-gray-500">載入中…</p>
      </div>
    );
  }

  if (teamError || teamId == null) {
    return (
      <div className="p-6">
        <p className="text-red-500">{teamError || "請先建立或加入團隊"}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">銀行資訊</h1>
        <Button onClick={openDrawer} className="gap-2">
          <Plus className="size-4" />
          新增銀行資訊
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-500">載入中…</p>
      ) : bankInfos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center text-gray-500">
          尚無銀行資訊，點擊「新增銀行資訊」建立
        </div>
      ) : (
        <ul className="space-y-2">
          {bankInfos.map((bank) => (
            <li
              key={bank.id}
              onClick={() => openEditDrawer(bank)}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <Landmark className="size-5 shrink-0 text-[#5295BC]" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{bank.bankName}</p>
                <p className="text-sm text-gray-500">
                  代碼 {bank.bankCode}
                  {bank.account ? ` · ${bank.account}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        subtitle={editingBankInfoId ? "Edit Bank Info" : "New Bank Info"}
        title={editingBankInfoId ? "編輯銀行資訊" : "新增銀行資訊"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {submitError && (
            <p className="text-sm text-red-500">{submitError}</p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="bank-name">銀行名稱 *</Label>
            <Input
              id="bank-name"
              value={formBankName}
              onChange={(e) => setFormBankName(e.target.value)}
              placeholder="輸入銀行名稱"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bank-code">銀行代碼 *</Label>
            <Input
              id="bank-code"
              value={formBankCode}
              onChange={(e) => setFormBankCode(e.target.value)}
              placeholder="輸入銀行代碼"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bank-account">銀行帳戶</Label>
            <Input
              id="bank-account"
              value={formAccount}
              onChange={(e) => setFormAccount(e.target.value)}
              placeholder="輸入銀行帳戶"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button type="submit" className="bg-gray-900 text-white hover:bg-gray-800">
              {editingBankInfoId ? "更新" : "新增"}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
