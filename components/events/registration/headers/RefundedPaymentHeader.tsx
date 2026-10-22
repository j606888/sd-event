import { Undo2 } from "lucide-react";

/** 主辦已全額退款；報名取消、入場憑證失效 */
export function RefundedPaymentHeader() {
  return (
    <div className="bg-paper px-4 py-8 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-leader flex items-center justify-center">
          <Undo2 className="w-9 h-9 text-white" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">已退款</h1>
      <p className="text-sm text-gray-600 mb-1">主辦方已退還這筆報名的款項</p>
      <p className="text-sm text-gray-600 mb-4">報名已取消，入場憑證也一併失效</p>
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm text-leader border border-card-border">
        <Undo2 className="w-4 h-4" />
        <span>已退款</span>
      </div>
    </div>
  );
}
