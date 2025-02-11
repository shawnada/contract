import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getUserInfo } from "@/lib/session";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUserInfo();
    if (!user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { rule, mainText } = body;

    if (!rule || !mainText) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key not configured");
      return Response.json(
        { error: "OpenAI configuration missing" },
        { status: 500 },
      );
    }

    try {
      const initialPrompt = `
      你是一名专业的病历审核人员，请根据以下规则审查病历是否不符合要求：

      规则信息：
      - 类别: ${rule.category}
      - 风险等级: ${rule.level}
      - 审核原则: ${rule.principle}
      ${rule.clause ? `- 相关条款: ${rule.clause}` : ""}

      请检查病历书写中是否存在此类风险。你必须返回严格的JSON格式数组，格式如下：
      [
        {
          "是否找到风险": "",
          "原文": "",
          "风险等级": "${rule.level}",
          "风险提示": "",
          "违规用词": ""
        }
      ]

      要求：
      1. "是否找到风险"必须回答"是"或"否"
      2. 在全文中，寻找违反规则的句子，并指出该句子的"原文"，如果存在多处的，应当分别指出
      3. 针对某该存在问题的句子，如果涉及违规用词的，应当进一步指出导致其违反规则的核心“违规用词”，注意是该句中的违规用词，不要返回其他句子或全文的其他违规用词
      4. 严禁提示规则以外的风险
      5. 如果找不到相关风险，也要返回数组，但"是否找到风险"填"否"
      6.除了json,不要返回任何其他内容

      病历全文内容：
      ${mainText}
      `;

      // 打印完整的提示词
      console.log("发送给 AI 病历审核员的提示词:");
      console.log("----------------------------------------");
      console.log(initialPrompt);
      console.log("----------------------------------------");

      const initialCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: initialPrompt }],
      });

      const initialResponse = initialCompletion.choices[0].message.content;
      console.log("AI病历审核员回答:", initialResponse);

      // 打印验证提示词
      const verificationPrompt = `
      1.你是病历修改人员，熟悉的病历书写，目前需要修改这份病历${mainText}
      2.病历审核员在查看了这份病历后，返回了以下结果：
      ${initialResponse}
      3.请根据病历审核员返回的结果，针对有问题的句子的"原文"，进行重新书写，给出"修改建议"
  
      4.“修改建议”的内容不能使用“违规用词”中的内容，重写的内容应当满足“风险提示”中的要求
      5.除了json,不要返回任何其他内容
      6.你应当返回的格式如下：
      [
        {
          "是否找到风险": "是",  
          "原文": "",
          "风险等级": "",
          "风险提示": "",
          "违规用词": "",
          "修改建议": ""
        }
      ]
      `;

      console.log("发送给复查员的提示词:");
      console.log("----------------------------------------");
      // console.log(verificationPrompt);
      // console.log("----------------------------------------");

      const verificationCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: verificationPrompt }],
      });

      const verificationResponse =
        verificationCompletion.choices[0].message.content;
      // console.log("复查员返回结果:", verificationResponse);

      return Response.json({ result: verificationResponse });
    } catch (openaiError) {
      console.error("OpenAI API error:", openaiError);
      return Response.json(
        { error: "AI service error", details: openaiError.message },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("API route error:", error);
    return Response.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
