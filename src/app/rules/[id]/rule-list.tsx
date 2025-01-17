import { useState, useCallback, useMemo } from "react";
import { debounce } from "lodash";
import { toast } from "react-hot-toast";
import { Rule } from "@prisma/client";

interface RuleListProps {
  rules: Rule[];
  standardId: string;
}

interface RuleWithStandard extends Rule {
  standard?: {
    userId: string;
  };
}

export function RuleList({ rules, standardId }: RuleListProps) {
  // 使用 useMemo 来记住原始顺序
  const ruleOrder = useMemo(() => rules.map((rule) => rule.id), [rules]);

  const [editingRules, setEditingRules] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [localRules, setLocalRules] = useState<RuleWithStandard[]>(rules);

  // 在渲染时确保按原始顺序排序
  const sortedLocalRules = useMemo(() => {
    const ruleMap = new Map(localRules.map((rule) => [rule.id, rule]));
    return ruleOrder
      .map((id) => ruleMap.get(id))
      .filter(Boolean) as RuleWithStandard[];
  }, [localRules, ruleOrder]);

  // 使用 useCallback 包装更新函数
  const updateRuleData = useCallback(
    async (ruleId: string, principle: string) => {
      try {
        const response = await fetch(`/api/rules/${ruleId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ principle }),
        });

        if (!response.ok) {
          throw new Error("Failed to update rule");
        }

        const updatedRule = await response.json();
        return updatedRule;
      } catch (error) {
        console.error("Error updating rule:", error);
        throw error;
      }
    },
    [],
  );

  const debouncedUpdate = useCallback(
    debounce(async (ruleId: string, principle: string) => {
      try {
        await updateRuleData(ruleId, principle);
      } catch (error) {
        // 如果保存失败，回滚本地状态
        setLocalRules((prevRules) =>
          prevRules.map((rule) =>
            rule.id === ruleId
              ? {
                  ...rule,
                  principle:
                    rules.find((r) => r.id === ruleId)?.principle || "",
                }
              : rule,
          ),
        );
        toast.error("保存失败，请重试");
      }
    }, 2000),
    [updateRuleData],
  );

  const handlePrincipleChange = (ruleId: string, principle: string) => {
    // 只更新本地状态
    setLocalRules((prevRules) =>
      prevRules.map((rule) =>
        rule.id === ruleId ? { ...rule, principle } : rule,
      ),
    );

    // 触发防抖保存
    debouncedUpdate(ruleId, principle);
  };

  const handleEditStart = (ruleId: string) => {
    setEditingRules((prev) => ({ ...prev, [ruleId]: true }));
  };

  const handleEditEnd = (ruleId: string) => {
    setEditingRules((prev) => ({ ...prev, [ruleId]: false }));
  };

  return (
    <div className="space-y-4">
      {sortedLocalRules.map((rule) => (
        <div
          key={rule.id}
          className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div className="mt-2">
            <label className="text-sm font-medium text-gray-600">
              审核原则
            </label>
            {editingRules[rule.id] ? (
              <textarea
                className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-primary/50 focus:border-primary"
                value={rule.principle || ""}
                onChange={(e) => handlePrincipleChange(rule.id, e.target.value)}
                onBlur={() => handleEditEnd(rule.id)}
                rows={3}
                autoFocus
              />
            ) : (
              <div
                className="mt-1 p-2 border rounded-md min-h-[3em] cursor-text hover:bg-gray-50"
                onClick={() => handleEditStart(rule.id)}
              >
                {rule.principle || "点击编辑审核原则"}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
