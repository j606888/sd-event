"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer } from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadDropzone } from "@/lib/uploadthing";
import { useCurrentTeam } from "@/hooks/use-current-team";

type DrawerType =
  | null
  | "location"
  | "purchaseItem"
  | "notice"
  | "organizer"
  | "bank";

type Location = { id: number; name: string };
type Organizer = { id: number; name: string };
type BankInfo = { id: number; bankName: string };
type PurchaseItemDraft = { name: string; amount: number };
type NoticeItemDraft = { content: string };

export default function NewEventPage() {
  const { teamId } = useCurrentTeam();
  const [drawer, setDrawer] = useState<DrawerType>(null);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [locationId, setLocationId] = useState<string>("");
  const [organizerId, setOrganizerId] = useState<string>("");
  const [bankInfoId, setBankInfoId] = useState<string>("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [bankInfos, setBankInfos] = useState<BankInfo[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 購買項目、須知項目（尚未建立活動，先存本地，儲存草稿時一併建立）
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemDraft[]>([]);
  const [noticeItems, setNoticeItems] = useState<NoticeItemDraft[]>([]);

  // 各 Drawer 表單 state
  const [locName, setLocName] = useState("");
  const [locGoogleMapUrl, setLocGoogleMapUrl] = useState("");
  const [locAddress, setLocAddress] = useState("");
  const [locRemark, setLocRemark] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgPhotoUrl, setOrgPhotoUrl] = useState("");
  const [orgLineId, setOrgLineId] = useState("");
  const [orgInstagram, setOrgInstagram] = useState("");
  const [orgFacebook, setOrgFacebook] = useState("");
  const [bankNameInput, setBankNameInput] = useState("");
  const [bankCodeInput, setBankCodeInput] = useState("");
  const [bankAccountInput, setBankAccountInput] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemAmount, setItemAmount] = useState("");
  const [noticeContent, setNoticeContent] = useState("");

  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerSubmitting, setDrawerSubmitting] = useState(false);

  const openDrawer = (type: DrawerType) => () => {
    setDrawerError(null);
    setDrawer(type);
  };
  const closeDrawer = () => {
    setDrawer(null);
    setDrawerError(null);
    setDrawerSubmitting(false);
    if (drawer === "location") {
      fetchLocations();
      setLocName(""); setLocGoogleMapUrl(""); setLocAddress(""); setLocRemark("");
    }
    if (drawer === "organizer") {
      fetchOrganizers();
      setOrgName(""); setOrgPhotoUrl(""); setOrgLineId(""); setOrgInstagram(""); setOrgFacebook("");
    }
    if (drawer === "bank") {
      fetchBankInfos();
      setBankNameInput(""); setBankCodeInput(""); setBankAccountInput("");
    }
    if (drawer === "purchaseItem") { setItemName(""); setItemAmount(""); }
    if (drawer === "notice") setNoticeContent("");
  };

  const fetchLocations = useCallback(async () => {
    if (teamId == null) return;
    const res = await fetch(`/api/teams/${teamId}/locations`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setLocations(data.locations ?? []);
    }
  }, [teamId]);
  const fetchOrganizers = useCallback(async () => {
    if (teamId == null) return;
    const res = await fetch(`/api/teams/${teamId}/organizers`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setOrganizers(data.organizers ?? []);
    }
  }, [teamId]);
  const fetchBankInfos = useCallback(async () => {
    if (teamId == null) return;
    const res = await fetch(`/api/teams/${teamId}/bank-infos`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setBankInfos(data.bankInfos ?? []);
    }
  }, [teamId]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);
  useEffect(() => {
    fetchOrganizers();
  }, [fetchOrganizers]);
  useEffect(() => {
    fetchBankInfos();
  }, [fetchBankInfos]);

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teamId == null) return;
    setDrawerError(null);
    const name = locName.trim();
    if (!name) {
      setDrawerError("請輸入名稱");
      return;
    }
    setDrawerSubmitting(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          googleMapUrl: locGoogleMapUrl.trim() || undefined,
          address: locAddress.trim() || undefined,
          remark: locRemark.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDrawerError(data.error || "新增失敗");
        setDrawerSubmitting(false);
        return;
      }
      await fetchLocations();
      if (data.location?.id) setLocationId(String(data.location.id));
      setLocName(""); setLocGoogleMapUrl(""); setLocAddress(""); setLocRemark("");
      setDrawer(null);
    } catch {
      setDrawerError("新增失敗");
    }
    setDrawerSubmitting(false);
  };

  const handleAddOrganizer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teamId == null) return;
    setDrawerError(null);
    const name = orgName.trim();
    if (!name) {
      setDrawerError("請輸入名稱");
      return;
    }
    setDrawerSubmitting(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/organizers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          photoUrl: orgPhotoUrl.trim() || undefined,
          lineId: orgLineId.trim() || undefined,
          instagram: orgInstagram.trim() || undefined,
          facebook: orgFacebook.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDrawerError(data.error || "新增失敗");
        setDrawerSubmitting(false);
        return;
      }
      await fetchOrganizers();
      if (data.organizer?.id) setOrganizerId(String(data.organizer.id));
      setOrgName(""); setOrgPhotoUrl(""); setOrgLineId(""); setOrgInstagram(""); setOrgFacebook("");
      setDrawer(null);
    } catch {
      setDrawerError("新增失敗");
    }
    setDrawerSubmitting(false);
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teamId == null) return;
    setDrawerError(null);
    const bankName = bankNameInput.trim();
    const bankCode = bankCodeInput.trim();
    if (!bankName || !bankCode) {
      setDrawerError("請輸入銀行名稱與銀行代碼");
      return;
    }
    setDrawerSubmitting(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/bank-infos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bankName,
          bankCode,
          account: bankAccountInput.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDrawerError(data.error || "新增失敗");
        setDrawerSubmitting(false);
        return;
      }
      await fetchBankInfos();
      if (data.bankInfo?.id) setBankInfoId(String(data.bankInfo.id));
      setBankNameInput(""); setBankCodeInput(""); setBankAccountInput("");
      setDrawer(null);
    } catch {
      setDrawerError("新增失敗");
    }
    setDrawerSubmitting(false);
  };

  const handleAddPurchaseItem = (e: React.FormEvent) => {
    e.preventDefault();
    const name = itemName.trim();
    const amount = Math.floor(Number(itemAmount));
    if (!name) {
      setDrawerError("請輸入名稱");
      return;
    }
    if (!Number.isInteger(amount) || amount < 0) {
      setDrawerError("請輸入有效金額（非負整數）");
      return;
    }
    setPurchaseItems((prev) => [...prev, { name, amount }]);
    setItemName(""); setItemAmount(""); setDrawerError(null);
    setDrawer(null);
  };

  const handleAddNoticeItem = (e: React.FormEvent) => {
    e.preventDefault();
    setNoticeItems((prev) => [...prev, { content: noticeContent.trim() }]);
    setNoticeContent(""); setDrawerError(null);
    setDrawer(null);
  };

  const removePurchaseItem = (index: number) => {
    setPurchaseItems((prev) => prev.filter((_, i) => i !== index));
  };
  const removeNoticeItem = (index: number) => {
    setNoticeItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teamId == null) return;
    setSaveError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setSaveError("請輸入標題");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          teamId,
          title: trimmedTitle,
          description: description.trim() || undefined,
          coverUrl: coverUrl || undefined,
          startAt: startAt || new Date().toISOString(),
          endAt: endAt || new Date().toISOString(),
          locationId: locationId ? Number(locationId) : undefined,
          organizerId: organizerId ? Number(organizerId) : undefined,
          bankInfoId: bankInfoId ? Number(bankInfoId) : undefined,
          allowMultiplePurchase: allowMultiple,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data.error || "儲存失敗");
        setSaving(false);
        return;
      }
      const eventId = data.event?.id;
      if (eventId != null) {
        for (let i = 0; i < purchaseItems.length; i++) {
          const item = purchaseItems[i];
          await fetch(`/api/events/${eventId}/purchase-items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name: item.name, amount: item.amount, sortOrder: i }),
          });
        }
        for (let i = 0; i < noticeItems.length; i++) {
          await fetch(`/api/events/${eventId}/notice-items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ content: noticeItems[i].content, sortOrder: i }),
          });
        }
      }
      window.location.href = "/events";
    } catch {
      setSaveError("儲存失敗");
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-2xl  px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">建立新活動</h1>

      <form className="flex flex-col gap-6" onSubmit={handleSaveDraft}>
        {saveError && (
          <p className="text-sm text-red-500">{saveError}</p>
        )}
        {/* 標題 */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">標題</Label>
          <Input
            id="title"
            placeholder="輸入標題"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* 活動描述 */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="description">活動描述</Label>
          <textarea
            id="description"
            placeholder="輸入活動描述"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-w-0 rounded-md border-0 bg-[#F3F5F7] px-3 py-2 text-base shadow-xs outline-none placeholder:text-gray-400 md:text-sm"
          />
        </div>

        {/* 活動封面 */}
        <div className="flex flex-col gap-2">
          <Label>活動封面</Label>
          {coverUrl ? (
            <div className="relative inline-block">
              <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                <Image
                  src={coverUrl}
                  alt="活動封面"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <button
                type="button"
                onClick={() => setCoverUrl(null)}
                className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                aria-label="移除封面"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <UploadDropzone
              endpoint="eventCover"
              onClientUploadComplete={(res) => {
                const first = res?.[0];
                const url = first && ("url" in first ? first.url : (first as { ufsUrl?: string }).ufsUrl);
                if (url) setCoverUrl(url);
              }}
              onUploadError={(err) => {
                console.error(err);
                setSaveError("上傳失敗");
              }}
              appearance={{
                container: "rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-8 ut-ready:border-[#5295BC]",
                label: "text-gray-500",
                button: "ut-uploading:bg-[#5295BC] ut-ready:bg-[#5295BC] ut-uploading:after:bg-[#4285A]",
              }}
            />
          )}
        </div>

        {/* 開始時間 / 結束時間 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="startTime">開始時間</Label>
            <Input
              id="startTime"
              type="datetime-local"
              className="bg-[#F3F5F7]"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="endTime">結束時間</Label>
            <Input
              id="endTime"
              type="datetime-local"
              className="bg-[#F3F5F7]"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </div>
        </div>

        {/* 活動地點 */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="location">活動地點</Label>
          <div className="flex gap-2">
            <Select value={locationId || undefined} onValueChange={setLocationId}>
              <SelectTrigger id="location" className="flex-1 min-w-0">
                <SelectValue placeholder="選擇活動地點" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={String(loc.id)}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={openDrawer("location")}
              aria-label="新增活動地點"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        {/* 購買項目 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>購買項目</Label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
                className="size-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">開放多選</span>
            </label>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-fit gap-2"
            onClick={openDrawer("purchaseItem")}
          >
            <Plus className="size-4" />
            新增項目
          </Button>
          {purchaseItems.length > 0 && (
            <ul className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
              {purchaseItems.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-700">{item.name} — ${item.amount}</span>
                  <button
                    type="button"
                    onClick={() => removePurchaseItem(i)}
                    className="text-red-500 hover:underline"
                    aria-label="移除"
                  >
                    移除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 須知項目(選填) */}
        <div className="flex flex-col gap-2">
          <Label>須知項目(選填)</Label>
          <Button
            type="button"
            variant="outline"
            className="w-fit gap-2"
            onClick={openDrawer("notice")}
          >
            <Plus className="size-4" />
            新增項目
          </Button>
          {noticeItems.length > 0 && (
            <ul className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
              {noticeItems.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-700 truncate">{item.content || "(空白)"}</span>
                  <button
                    type="button"
                    onClick={() => removeNoticeItem(i)}
                    className="shrink-0 text-red-500 hover:underline"
                    aria-label="移除"
                  >
                    移除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 主辦單位 */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="organizer">主辦單位</Label>
          <div className="flex gap-2">
            <Select value={organizerId || undefined} onValueChange={setOrganizerId}>
              <SelectTrigger id="organizer" className="flex-1 min-w-0">
                <SelectValue placeholder="選擇主辦單位" />
              </SelectTrigger>
              <SelectContent>
                {organizers.map((org) => (
                  <SelectItem key={org.id} value={String(org.id)}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={openDrawer("organizer")}
              aria-label="新增主辦單位"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        {/* 銀行資訊 */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="bank">銀行資訊</Label>
          <div className="flex gap-2">
            <Select value={bankInfoId || undefined} onValueChange={setBankInfoId}>
              <SelectTrigger id="bank" className="flex-1 min-w-0">
                <SelectValue placeholder="選擇銀行資訊" />
              </SelectTrigger>
              <SelectContent>
                {bankInfos.map((bank) => (
                  <SelectItem key={bank.id} value={String(bank.id)}>
                    {bank.bankName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={openDrawer("bank")}
              aria-label="新增銀行資訊"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          <Button type="button" variant="outline" asChild className="flex-1">
            <Link href="/events">取消</Link>
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-gray-900 text-white hover:bg-gray-800"
            disabled={saving}
          >
            {saving ? "儲存中…" : "儲存草稿"}
          </Button>
        </div>
      </form>

      {/* 單一 Drawer：只在 drawer 不為 null 時渲染，避免多個疊加 */}
      {drawer !== null && (
        <Drawer
          open={true}
          onClose={closeDrawer}
          subtitle={
            drawer === "location" || drawer === "organizer" || drawer === "bank"
              ? "New Location"
              : "New Item"
          }
          title={
            drawer === "location"
              ? "新增活動地點"
              : drawer === "purchaseItem"
                ? "新增購買項目"
                : drawer === "notice"
                  ? "新增須知項目"
                  : drawer === "organizer"
                    ? "新增主辦單位"
                    : "新增銀行資訊"
          }
        >
          {drawer === "location" && (
            <form className="flex flex-col gap-4" onSubmit={handleAddLocation}>
              {drawerError && <p className="text-sm text-red-500">{drawerError}</p>}
              <div className="flex flex-col gap-2">
                <Label htmlFor="loc-name">名稱 *</Label>
                <Input id="loc-name" placeholder="輸入名稱" value={locName} onChange={(e) => setLocName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="loc-map">Google Map</Label>
                <Input id="loc-map" placeholder="輸入 Google Map 連結" value={locGoogleMapUrl} onChange={(e) => setLocGoogleMapUrl(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="loc-address">地址</Label>
                <Input id="loc-address" placeholder="輸入地址" value={locAddress} onChange={(e) => setLocAddress(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="loc-remark">備註</Label>
                <Input id="loc-remark" placeholder="輸入備註" value={locRemark} onChange={(e) => setLocRemark(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeDrawer}>取消</Button>
                <Button type="submit" className="bg-gray-900 text-white hover:bg-gray-800" disabled={drawerSubmitting}>{drawerSubmitting ? "新增中…" : "新增"}</Button>
              </div>
            </form>
          )}
          {drawer === "purchaseItem" && (
            <form className="flex flex-col gap-4" onSubmit={handleAddPurchaseItem}>
              {drawerError && <p className="text-sm text-red-500">{drawerError}</p>}
              <div className="flex flex-col gap-2">
                <Label htmlFor="item-name">名稱 *</Label>
                <Input id="item-name" placeholder="輸入名稱" value={itemName} onChange={(e) => setItemName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="item-amount">金額 *</Label>
                <Input id="item-amount" placeholder="輸入金額" type="number" min={0} value={itemAmount} onChange={(e) => setItemAmount(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeDrawer}>取消</Button>
                <Button type="submit" className="bg-gray-900 text-white hover:bg-gray-800">新增</Button>
              </div>
            </form>
          )}
          {drawer === "notice" && (
            <form className="flex flex-col gap-4" onSubmit={handleAddNoticeItem}>
              {drawerError && <p className="text-sm text-red-500">{drawerError}</p>}
              <div className="flex flex-col gap-2">
                <Label htmlFor="notice-content">內容</Label>
                <Input id="notice-content" placeholder="輸入內容" value={noticeContent} onChange={(e) => setNoticeContent(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeDrawer}>取消</Button>
                <Button type="submit" className="bg-gray-900 text-white hover:bg-gray-800">新增</Button>
              </div>
            </form>
          )}
          {drawer === "organizer" && (
            <form className="flex flex-col gap-4" onSubmit={handleAddOrganizer}>
              {drawerError && <p className="text-sm text-red-500">{drawerError}</p>}
              <div className="flex flex-col gap-2">
                <Label htmlFor="org-photo">主辦方照片網址（選填）</Label>
                <Input id="org-photo" placeholder="圖片網址" value={orgPhotoUrl} onChange={(e) => setOrgPhotoUrl(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="org-name">名稱 *</Label>
                <Input id="org-name" placeholder="輸入名稱" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="org-line">Line ID</Label>
                <Input id="org-line" placeholder="輸入 Line ID" value={orgLineId} onChange={(e) => setOrgLineId(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="org-ig">Instagram</Label>
                <Input id="org-ig" placeholder="輸入 Instagram" value={orgInstagram} onChange={(e) => setOrgInstagram(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="org-fb">Facebook</Label>
                <Input id="org-fb" placeholder="輸入 Facebook" value={orgFacebook} onChange={(e) => setOrgFacebook(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeDrawer}>取消</Button>
                <Button type="submit" className="bg-gray-900 text-white hover:bg-gray-800" disabled={drawerSubmitting}>{drawerSubmitting ? "新增中…" : "新增"}</Button>
              </div>
            </form>
          )}
          {drawer === "bank" && (
            <form className="flex flex-col gap-4" onSubmit={handleAddBank}>
              {drawerError && <p className="text-sm text-red-500">{drawerError}</p>}
              <div className="flex flex-col gap-2">
                <Label htmlFor="bank-name">銀行名稱 *</Label>
                <Input id="bank-name" placeholder="輸入銀行名稱" value={bankNameInput} onChange={(e) => setBankNameInput(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bank-code">銀行代碼 *</Label>
                <Input id="bank-code" placeholder="輸入銀行代碼" value={bankCodeInput} onChange={(e) => setBankCodeInput(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bank-account">銀行帳戶</Label>
                <Input id="bank-account" placeholder="輸入銀行帳戶" value={bankAccountInput} onChange={(e) => setBankAccountInput(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeDrawer}>取消</Button>
                <Button type="submit" className="bg-gray-900 text-white hover:bg-gray-800" disabled={drawerSubmitting}>{drawerSubmitting ? "新增中…" : "新增"}</Button>
              </div>
            </form>
          )}
        </Drawer>
      )}
    </div>
  );
}
