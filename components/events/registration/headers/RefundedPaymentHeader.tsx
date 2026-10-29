import { Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";

/** 主辦已全額退款；報名取消、入場憑證失效 */
export function RefundedPaymentHeader() {
  const t = useTranslations("myRegistration.headers.refunded");
  const tStatus = useTranslations("enums.paymentStatus");
  return (
    <div className="bg-paper px-4 py-8 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-leader flex items-center justify-center">
          <Undo2 className="w-9 h-9 text-white" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("title")}</h1>
      <p className="text-sm text-gray-600 mb-1">{t("refunded")}</p>
      <p className="text-sm text-gray-600 mb-4">{t("passVoid")}</p>
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm text-leader border border-card-border">
        <Undo2 className="w-4 h-4" />
        <span>{tStatus("refunded")}</span>
      </div>
    </div>
  );
}
