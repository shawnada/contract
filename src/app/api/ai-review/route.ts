import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { getUserInfo } from '@/lib/session'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const user = await getUserInfo()
    if (!user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rules, mainText } = await request.json()

    const prompt = `你是"重庆中联信息产业有限责任公司"的律师，请帮我审核一份合同
    要求：
    1. 请根据我提供的审核规则审核，审核规则如下：
    ${JSON.stringify(rules, null, 2)}
    
    2. 这份合同的内容如下：
    ${mainText}
    
    3. 你必须准确的指出原文内容，以便于我定位条款的位置
    4. 根据我的规则中的内容提供修改建议，如果规则没有修改建议，你可以结合你的专业知识，提供修改建议
    5. 返回严格的JSON格式数组，格式如下案例：
    [
      {
        "原文": "派人协助落实系统实施的基础设施所需的条件",
        "风险等级": "高",
        "风险提示": "违约金过高，超过",
        "修改建议": "违约金为造成损失的30%"
      },
      {
        "原文": "同时向乙方开具税率3%的等额技术服务增值税专用发票",
        "风险等级": "中",
        "风险提示": "表述不清晰",
        "修改建议": "需要更详细地说明具体情况"
      }
    ]
    请严格按照这个JSON格式返回，不要添加其他内容，确保可以被 JSON.parse() 正确解析。
    风险等级必须是"高"、"中"、"低"三个级别之一。`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: prompt }],
    })

    const responseText = completion.choices[0].message.content
    return Response.json({ result: responseText })
  } catch (error) {
    console.error('AI Review Error:', error)
    return Response.json(
      { error: 'Failed to process AI review' },
      { status: 500 }
    )
  }
}
