"use client";

import { DeleteButton } from "@/components/doc-operations";
import { ImportDocButton } from "@/components/import-doc-button";
import { useState } from "react";
import { updateDoc } from "./action";
import debounce from "lodash.debounce";

// 防抖保存标题
const saveTitle = debounce((id: string, title: string) => {
  updateDoc(id, { title });
}, 1000);

export default function Title({
  id,
  title: initialTitle,
}: {
  id: string;
  title: string;
}) {
  const [title, setTitle] = useState(initialTitle);

  const handleChange = (value: string) => {
    // 立即更新 UI
    setTitle(value);
    // 防抖保存到数据库
    saveTitle(id, value);
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b">
      <div className="flex-1 max-w-2xl">
        <input
          className="text-xl font-semibold w-full border-none focus:outline-none focus:ring-0 p-0"
          value={title}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="未命名文档"
        />
      </div>
      <div className="flex items-center gap-2 ml-4">
        <ImportDocButton id={id} />
        <DeleteButton id={id} />
      </div>
    </div>
  );
}
