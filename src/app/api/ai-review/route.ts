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

    const { rules, mainText } = await request.json();

    // 第一步：获取初始审核结果
    const initialPrompt = `你是"重庆中联信息产业有限责任公司"的律师，这是一家医疗软件公司，请按照《审核标准》进行审核，内容如下：
    要求：
    1. 严格根据我提供的《审核标准》进行审核，禁止提示《审核标准》以外的风险，内容如下：
    ${JSON.stringify(rules, null, 2)}
    
    2. 这份合同的内容如下：
    ${mainText}
    
    3.“是否找到风险”必须回答，如果找到风险，应当在结果中回答“是”，如果没找到相关风险，应当回答“否”，
    4.你必须准确的指出"原文内容"，以便于我定位条款的位置
    5.严禁提示《审核标准》以外的风险
    6."修改建议"必须是可以用于一键替换"原文内容"的，具体的条款写法
    7. 你需要判断合同中，与审核规则相关的条款主要增加的是哪一方的风险，请在"主要增加哪方风险"中回答，
    8.返回严格的JSON格式数组，格式如下案例：
    [
      {
        "是否找到风险": "是",  
        "重庆中联信息产业有限责任公司是哪方": "乙方",
        "主要增加哪方的风险": "乙方",
        "原文": "违约金为合同总价的50%",
        "风险等级": "高",
        "风险提示": "违约金过高，超过合同总价的30%",
        "修改建议": "违约金不超过造成损失的30%"
      }
    ]
    请严格按照这个JSON格式返回，不要添加其他内容，确保可以被 JSON.parse() 正确解析。
    `;

    const initialCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: initialPrompt }],
    });

    const initialResponse = initialCompletion.choices[0].message.content;

    // 第二步：验证和过滤结果
    const verificationPrompt = `作为审核员，请检查AI返回的审核结果是否严格符合规则要求。

    1. 本次审核标准规则如下：
    ${JSON.stringify(rules, null, 2)}

    2. AI返回的审核结果如下：
    ${initialResponse}

    请执行以下检查：
    1. 如果AI返回的审核结果，与审核规则并不相关，请回答“否”
    2. 如果"重庆中联信息产业有限责任公司是哪方"和"主要增加哪方的风险"一致，则在"是否增加我方的风险"请回答“是”，否则回答“否”
    3. 确保风险等级与规则中的定义一致
    4. 返回过滤后的JSON数组如下：
    [
      {
        "是否找到风险": "是",  
        "重庆中联信息产业有限责任公司是哪方": "乙方",
        "主要增加哪方的风险": "乙方",
        "原文": "违约金为合同总价的50%",
        "风险等级": "高",
        "风险提示": "违约金过高，超过合同总价的30%",
        "修改建议": "违约金不超过造成损失的30%"
        "是否与规则相关": "是"
        "是否增加我方的风险": "是"
      }
    ]
    
    只返回过滤后的JSON数组，不要包含任何其他解释或评论。`;

    const verificationCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: verificationPrompt }],
    });

    const verificationResponse =
      verificationCompletion.choices[0].message.content;

    return Response.json({ result: verificationResponse });
  } catch (error) {
    console.error("AI Review Error:", error);
    return Response.json(
      { error: "Failed to process AI review" },
      { status: 500 },
    );
  }
}
