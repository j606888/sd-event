/**
 * 在 React hydrate 之前執行的 client 入口（Next.js instrumentation-client）。
 *
 * Google 翻譯（Chrome「翻譯這個網頁」、iOS Safari 翻譯同理）會把頁面上的文字節點
 * 換成 `<font>` 包起來的譯文，原本的文字節點就此離開 DOM。React 之後要移除那個節點、
 * 或要把新元素插在它前面時，`removeChild` / `insertBefore` 會丟 NotFoundError，
 * 整個 React 樹卸載、畫面變白（facebook/react#11538）。Radix Select 一打開就會踩到。
 *
 * 這裡讓兩個 API 在「節點已經不在這個 parent 底下」時不要炸：移除就略過、
 * 插入就接到最後面。只有 DOM 被外部改過才會走到這條路，正常情況行為不變。
 */
if (typeof Node === "function" && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, node: T, child: Node | null): T {
    if (child && child.parentNode !== this) return originalInsertBefore.call(this, node, null) as T;
    return originalInsertBefore.call(this, node, child) as T;
  };
}
