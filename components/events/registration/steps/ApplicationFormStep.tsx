"use client";

import { ChevronLeft, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublicEventData } from "@/types/event";
import type { FormData, Participant } from "../event-application-types";

const ROLES = ["Leader", "Follower", "Not sure"] as const;

type ApplicationFormStepProps = {
  event: PublicEventData;
  formData: FormData;
  onFormFieldChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onAddParticipant: () => void;
  onRemoveParticipant: (id: string) => void;
  onUpdateParticipant: (id: string, field: keyof Participant, value: string) => void;
  canProceed: boolean;
  onBack: () => void;
  onNext: () => void;
};

export function ApplicationFormStep({
  event,
  formData,
  onFormFieldChange,
  onAddParticipant,
  onRemoveParticipant,
  onUpdateParticipant,
  canProceed,
  onBack,
  onNext,
}: ApplicationFormStepProps) {
  return (
    <div className="min-h-screen">
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-10 h-10 rounded-full text-gray-600 hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-lg font-semibold text-gray-900">
          選擇方案 & 人數
        </h1>
      </div>

      <div className="px-4 py-6 space-y-6">

      <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">聯絡人資料</h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="contactName">姓名</Label>
              <Input
                id="contactName"
                placeholder="請輸入姓名"
                value={formData.contactName}
                onChange={(e) => onFormFieldChange("contactName", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contactPhone">電話</Label>
              <Input
                id="contactPhone"
                placeholder="請輸入電話"
                value={formData.contactPhone}
                onChange={(e) => onFormFieldChange("contactPhone", e.target.value)}
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
                onChange={(e) => onFormFieldChange("contactEmail", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">選擇方案</h2>
          <div className="space-y-2">
            {event.purchaseItems.map((item) => (
              <label
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border  cursor-pointer hover:bg-gray-50 ${formData.selectedPlanId === item.id ? "bg-gray-50 border-[#5295BC]" : "border-gray-200"}`}
              >
                <input
                  type="radio"
                  name="plan"
                  checked={formData.selectedPlanId === item.id}
                  onChange={() => onFormFieldChange("selectedPlanId", item.id)}
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
                      onClick={() => onRemoveParticipant(participant.id)}
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
                      onUpdateParticipant(participant.id, "name", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>角色</Label>
                  <div className="flex gap-4 mt-2">
                    {ROLES.map((role) => (
                      <label
                        key={role}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={`role-${participant.id}`}
                          checked={participant.role === role}
                          onChange={() =>
                            onUpdateParticipant(participant.id, "role", role)
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
            onClick={onAddParticipant}
            variant="outline"
            className="w-full border-[#5295BC] text-[#5295BC] hover:bg-[#5295BC]/10"
          >
            <Plus className="w-4 h-4" />
            增加參加者
          </Button>
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">費用</h2>
          <div>
            <Label htmlFor="totalAmount">總金額(請自行計算)</Label>
            <Input
              id="totalAmount"
              placeholder="請輸入總金額"
              type="number"
              value={formData.totalAmount}
              onChange={(e) => onFormFieldChange("totalAmount", e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="w-full bg-[#5295BC] text-white hover:bg-[#4285A5] h-12 text-base font-medium"
        >
          選擇付款方式
        </Button>
      </div>
    </div>
  );
}
