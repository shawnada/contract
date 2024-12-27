"use client";

import { useState } from "react";
import { updateStandard } from "./action";
import debounce from "lodash.debounce";

// 防抖保存标题
const saveTitle = debounce((id: string, title: string) => {
  updateStandard(id, { title });
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
    <div className="mb-8">
      <input
        className="text-4xl font-bold w-full border-none focus:outline-none focus:ring-0 p-0"
        value={title}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="未命名标准"
      />
    </div>
  );
}
