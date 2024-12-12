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
    
    3.注意如果“重庆中联信息产业有限责任公司” 是乙方，你必须站在乙方的角度，分析合同条款，并给出修改建议，反之亦然
    4.你必须准确的指出“原文内容”，以便于我定位条款的位置
    5.根据我的规则中的内容分析“风险”，并给出“风险提示”
    6.不属于我提供的审核规则以内的风险，风险等级均为“低”
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
