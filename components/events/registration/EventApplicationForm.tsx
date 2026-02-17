"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, Trash2, Plus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublicEventData } from "@/types/event";

const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

function formatEventDate(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const fmt = (d: Date) =>
    `${d.getMonth() + 1}月${d.getDate()}日 (${WEEKDAY[d.getDay()]})`;
  const timeFmt = (d: Date) => {
    const hour = d.getHours();
    const minute = String(d.getMinutes()).padStart(2, "0");
    const period = hour >= 12 ? "下午" : "上午";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${period} ${displayHour}:${minute}`;
  };
  return `${fmt(start)} ${timeFmt(start)} ~ ${timeFmt(end)}`;
}

function formatEventDateShort(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const fmt = (d: Date) =>
    `${d.getMonth() + 1}月${d.getDate()}日 (${WEEKDAY[d.getDay()]})`;
  const timeFmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${fmt(start)} ${timeFmt(start)} ~ ${timeFmt(end)}`;
}

type Participant = {
  id: string;
  name: string;
  role: "Leader" | "Follower" | "Not sure";
};

type FormData = {
  selectedPlanId: number | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  participants: Participant[];
  totalAmount: string;
  paymentMethod: "Line Pay" | "Bank Transfer" | "Other" | null;
};

type EventApplicationFormProps = {
  event: PublicEventData;
};

export function EventApplicationForm({ event }: EventApplicationFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<FormData>({
    selectedPlanId: null,
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    participants: [{ id: "1", name: "", role: "Leader" }],
    totalAmount: "",
    paymentMethod: null,
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedPlan = event.purchaseItems.find(
    (item) => item.id === formData.selectedPlanId
  );

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const addParticipant = () => {
    setFormData((prev) => ({
      ...prev,
      participants: [
        ...prev.participants,
        {
          id: String(Date.now()),
          name: "",
          role: "Leader",
        },
      ],
    }));
  };

  const removeParticipant = (id: string) => {
    if (formData.participants.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      participants: prev.participants.filter((p) => p.id !== id),
    }));
  };

  const updateParticipant = (id: string, field: keyof Participant, value: string) => {
    setFormData((prev) => ({
      ...prev,
      participants: prev.participants.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    }));
  };

  const canProceedToStep2 = () => {
    return agreedToTerms;
  };

  const canProceedToStep3 = () => {
    return (
      formData.selectedPlanId !== null &&
      formData.contactName.trim() !== "" &&
      formData.contactPhone.trim() !== "" &&
      formData.contactEmail.trim() !== "" &&
      formData.participants.every((p) => p.name.trim() !== "") &&
      formData.totalAmount.trim() !== ""
    );
  };

  // Step 1: Event Details Page
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-lg">
          {event.coverUrl && (
            <div className="relative h-64 w-full bg-gray-100">
              <Image
                src={event.coverUrl}
                alt={event.title}
                fill
                className="object-cover"
                unoptimized
                sizes="(max-width: 512px) 100vw, 512px"
              />
            </div>
          )}
          <div className="px-4 py-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>

            {/* Event Details */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-gray-500 mt-0.5">時間</span>
                <span className="text-gray-900">{formatEventDate(event.startAt, event.endAt)}</span>
              </div>
              {event.location && (
                <div className="flex items-start gap-3">
                  <span className="text-gray-500 mt-0.5">地點</span>
                  <div className="flex-1">
                    <div className="text-gray-900">{event.location.name}</div>
                    {event.location.address && (
                      <div className="text-sm text-gray-600 mt-1">
                        {event.location.address}
                      </div>
                    )}
                    {event.location.googleMapUrl && (
                      <a
                        href={event.location.googleMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#5295BC] mt-1 inline-block"
                      >
                        導航 &gt;
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                {event.description}
              </div>
            )}

            {/* Pricing Plans */}
            {event.purchaseItems.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-semibold text-gray-900">方案介紹</h2>
                <div className="space-y-2">
                  {event.purchaseItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
                    >
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-gray-900 font-semibold">${item.amount}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Organizer */}
            {event.organizer && (
              <div className="space-y-2">
                <h2 className="font-semibold text-gray-900">主辦單位</h2>
                <div className="flex items-center gap-3">
                  {event.organizer.photoUrl && (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                      <Image
                        src={event.organizer.photoUrl}
                        alt={event.organizer.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{event.organizer.name}</div>
                    <div className="flex items-center gap-3 mt-1">
                      {event.organizer.instagram && (
                        <a
                          href={event.organizer.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                          </svg>
                        </a>
                      )}
                      {event.organizer.lineId && (
                        <a
                          href={`https://line.me/ti/p/${event.organizer.lineId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.63.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.058 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                          </svg>
                        </a>
                      )}
                      {event.organizer.facebook && (
                        <a
                          href={event.organizer.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notice Items */}
            {event.noticeItems.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-semibold text-gray-900">報名須知</h2>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  {event.noticeItems.map((notice, index) => (
                    <li key={notice.id}>{notice.content}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Agreement Checkbox */}
            {event.noticeItems.length > 0 && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#5295BC] border-gray-300 rounded focus:ring-[#5295BC]"
                />
                <span className="text-sm text-gray-700">
                  我已閱讀並同意報名須知
                </span>
              </label>
            )}

            {/* Register Button */}
            <Button
              onClick={() => setStep(2)}
              disabled={!canProceedToStep2()}
              className="w-full bg-[#5295BC] text-white hover:bg-[#4285A5] h-12 text-base font-medium"
            >
              報名活動
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Application Form
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setStep(1)}
            className="flex items-center justify-center w-10 h-10 rounded-full text-gray-600 hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-lg font-semibold text-gray-900">
            選擇方案 & 人數
          </h1>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Select Plan */}
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900">選擇方案</h2>
            <div className="space-y-2">
              {event.purchaseItems.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="plan"
                    checked={formData.selectedPlanId === item.id}
                    onChange={() =>
                      setFormData((prev) => ({ ...prev, selectedPlanId: item.id }))
                    }
                    className="w-4 h-4 text-[#5295BC] border-gray-300 focus:ring-[#5295BC]"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-600">${item.amount}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">聯絡人資料</h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="contactName">姓名</Label>
                <Input
                  id="contactName"
                  placeholder="請輸入姓名"
                  value={formData.contactName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contactName: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">電話</Label>
                <Input
                  id="contactPhone"
                  placeholder="請輸入電話"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contactEmail">信箱</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="請輸入信箱"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">參加者資料</h2>
            <div className="space-y-4">
              {formData.participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="px-3 py-1 bg-[#5295BC] text-white rounded text-sm font-medium">
                      參加者 {index + 1}
                    </div>
                    {formData.participants.length > 1 && (
                      <button
                        onClick={() => removeParticipant(participant.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <div>
                    <Label>稱呼</Label>
                    <Input
                      placeholder="請輸入姓名"
                      value={participant.name}
                      onChange={(e) =>
                        updateParticipant(participant.id, "name", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>角色</Label>
                    <div className="flex gap-4 mt-2">
                      {(["Leader", "Follower", "Not sure"] as const).map((role) => (
                        <label
                          key={role}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={`role-${participant.id}`}
                            checked={participant.role === role}
                            onChange={() =>
                              updateParticipant(participant.id, "role", role)
                            }
                            className="w-4 h-4 text-[#5295BC] border-gray-300 focus:ring-[#5295BC]"
                          />
                          <span className="text-sm text-gray-700">{role}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={addParticipant}
              variant="outline"
              className="w-full border-[#5295BC] text-[#5295BC] hover:bg-[#5295BC]/10"
            >
              <Plus className="w-4 h-4" />
              增加參加者
            </Button>
          </div>

          {/* Cost */}
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900">費用</h2>
            <div className="text-sm text-gray-600">總金額(請自行計算)</div>
            <div>
              <Label htmlFor="totalAmount">總金額</Label>
              <Input
                id="totalAmount"
                placeholder="請輸入總金額"
                type="number"
                value={formData.totalAmount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, totalAmount: e.target.value }))
                }
                className="mt-1"
              />
            </div>
          </div>

          {/* Next Button */}
          <Button
            onClick={() => setStep(3)}
            disabled={!canProceedToStep3()}
            className="w-full bg-[#5295BC] text-white hover:bg-[#4285A5] h-12 text-base font-medium"
          >
            選擇付款方式
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Payment Selection
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setStep(2)}
          className="flex items-center justify-center w-10 h-10 rounded-full text-gray-600 hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-lg font-semibold text-gray-900">選擇付款方式</h1>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Event Summary */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">{event.title}</h2>
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <span className="text-gray-500">時間</span>
              <span className="text-gray-900">{formatEventDateShort(event.startAt, event.endAt)}</span>
            </div>
            {event.location && (
              <div className="flex gap-3">
                <span className="text-gray-500">地點</span>
                <span className="text-gray-900">{event.location.name}</span>
              </div>
            )}
            {selectedPlan && (
              <div className="flex gap-3">
                <span className="text-gray-500">選擇方案</span>
                <span className="text-gray-900">{selectedPlan.name} ${selectedPlan.amount}</span>
              </div>
            )}
            <div className="flex gap-3">
              <span className="text-gray-500">聯絡人</span>
              <span className="text-gray-900">
                {formData.contactName} / {formData.contactPhone} / {formData.contactEmail}
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-500">參加者</span>
              <span className="text-gray-900">
                {formData.participants.map((p, i) => (
                  <span key={p.id}>
                    {p.name} ({p.role})
                    {i < formData.participants.length - 1 && "、"}
                  </span>
                ))}
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-500">總金額</span>
              <span className="text-gray-900 font-semibold">${formData.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">付款方式</h2>
          <p className="text-sm text-gray-600">請於確認報名後立即付款</p>
          <div className="space-y-2">
            {(["Line Pay", "Bank Transfer", "Other"] as const).map((method) => (
              <label
                key={method}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={formData.paymentMethod === method}
                  onChange={() =>
                    setFormData((prev) => ({ ...prev, paymentMethod: method }))
                  }
                  className="w-4 h-4 text-[#5295BC] border-gray-300 focus:ring-[#5295BC]"
                />
                <span className="text-gray-900">{method}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Bank Transfer Details */}
        {event.bankInfo && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900">匯款帳號</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-gray-500">銀行</span>
                  <span className="ml-2 text-gray-900">
                    {event.bankInfo.bankName} {event.bankInfo.bankCode}
                  </span>
                </div>
              </div>
              {event.bankInfo.account && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-500">帳號</span>
                    <span className="ml-2 text-gray-900">{event.bankInfo.account}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(event.bankInfo!.account!, "bank")}
                    className="h-8"
                  >
                    {copiedText === "bank" ? (
                      <>
                        <Check className="w-3 h-3" />
                        已複製
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        複製帳號
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Line Friend Details */}
        {event.organizer?.lineId && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900">Line 好友</h3>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-500">LINE ID</span>
                <span className="ml-2 text-sm text-gray-900">{event.organizer.lineId}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(event.organizer!.lineId!, "line")}
                className="h-8"
              >
                {copiedText === "line" ? (
                  <>
                    <Check className="w-3 h-3" />
                    已複製
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    複製 ID
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {submitError && (
          <div className="text-sm text-red-500 text-center">{submitError}</div>
        )}

        {/* Confirm Button */}
        <Button
          onClick={async () => {
            if (!formData.paymentMethod) return;

            setSubmitting(true);
            setSubmitError(null);

            try {
              const response = await fetch(
                `/api/events/${event.id}/registrations`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    purchaseItemId: formData.selectedPlanId,
                    contactName: formData.contactName,
                    contactPhone: formData.contactPhone,
                    contactEmail: formData.contactEmail,
                    paymentMethod: formData.paymentMethod,
                    totalAmount: Number(formData.totalAmount),
                    attendees: formData.participants.map((p) => ({
                      name: p.name,
                      role: p.role,
                    })),
                  }),
                }
              );

              const data = await response.json().catch(() => ({}));

              if (!response.ok) {
                setSubmitError(data.error || "報名失敗，請稍後再試");
                setSubmitting(false);
                return;
              }

              // Redirect to success page with the registration key
              if (data.registration?.registrationKey) {
                router.push(
                  `/registration-success/${data.registration.registrationKey}`
                );
              } else {
                setSubmitError("報名成功，但無法取得報名編號");
                setSubmitting(false);
              }
            } catch (error) {
              console.error("Registration error:", error);
              setSubmitError("網路錯誤，請稍後再試");
              setSubmitting(false);
            }
          }}
          disabled={!formData.paymentMethod || submitting}
          className="w-full bg-[#5295BC] text-white hover:bg-[#4285A5] h-12 text-base font-medium"
        >
          {submitting ? "處理中…" : "確認報名"}
        </Button>
      </div>
    </div>
  );
}
