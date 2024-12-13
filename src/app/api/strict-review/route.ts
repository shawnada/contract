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

    const { rule, mainText } = await request.json()

    // 第一步：获取初始审核结果
    const initialPrompt = `你是一名律师，请查看以下合同中是否存在《合同审核标准》中的这一典型问题：
    ${JSON.stringify(rule, null, 2)}
       
    1. 这份合同的内容如下：
    ${mainText}
    2. 如不存在上述问题，请返回空json
    3. 注意严禁提示该与该条规则无关的内容
    4. 你必须准确的指出"原文内容"，以便于我定位条款的位置
    5. "修改建议"必须是可以用于一键替换"原文内容"的，具体的条款写法
    6. 返回严格的JSON格式数组，格式如下：
    [
      {
        "原文": "违约金为合同总价的50%",
        "风险等级": "${rule.level}",
        "风险提示": "违约金过高，超过合同总价的30%",
        "修改建议": "违约金不超过造成损失的30%"
      }
    ]
    请严格按照这个JSON格式返回，不要添加其他内容，确保可以被 JSON.parse() 正确解析。`

    const initialCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: initialPrompt }],
    })

    const initialResponse = initialCompletion.choices[0].message.content

    // 第二步：验证和过滤结果
    const verificationPrompt = `作为审核员，请检查AI返回的审核结果是否严格符合规则要求。

    1. 审核标准规则如下：
    ${JSON.stringify(rule, null, 2)}

    2. AI返回的审核结果如下：
    ${initialResponse}

    请执行以下检查：
    1. 检查每个风险点是否与当前规则相关
    2. 删除任何与当前规则无关的风险点
    3. 确保风险等级与规则中的定义完全一致（${rule.level}）
    4. 确保风险提示与规则中的审核原则相符
    5. 返回过滤后的JSON数组，格式与输入相同
    6. 如果没有找到相关风险，返回空数组 []
    
    只返回过滤后的JSON数组，不要包含任何其他解释或评论。`

    const verificationCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: verificationPrompt }],
    })

    const verificationResponse =
      verificationCompletion.choices[0].message.content

    return Response.json({ result: verificationResponse })
  } catch (error) {
    console.error('Strict Review Error:', error)
    return Response.json(
      { error: 'Failed to process strict review' },
      { status: 500 }
    )
  }
}
