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

    const prompt = `你是"重庆中联信息产业有限责任公司"的律师，这是一家医疗软件公司，请按照《审核标准》进行审核，内容如下：
    要求：
    1. 严格根据我提供的《审核标准》进行审核，禁止提示《审核标准》以外的风险，内容如下：
    ${JSON.stringify(rules, null, 2)}
    
    2. 这份合同的内容如下：
    ${mainText}
    
    3.注意你是“重庆中联信息产业有限责任公司”的律师，如果该公司在合同中是乙方，你需要保护乙方权利，对甲方不利的条款无需提示
    4.你必须准确的指出“原文内容”，以便于我定位条款的位置
    5.严禁提示《审核标准》以外的风险
    6.“修改建议”必须是可以用于一键替换“原文内容”的，具体的条款写法
    7. 返回严格的JSON格式数组，格式如下案例：
    [
      {
        "原文": "违约金为合同总价的50%",
        "风险等级": "高",
        "风险提示": "违约金过高，超过合同总价的30%",
        "修改建议": "违约金不超过造成损失的30%"
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
