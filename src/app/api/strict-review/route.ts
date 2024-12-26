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

    // 打印请求体
    const body = await request.json()
    // console.log('Request body:', body)

    const { rule, mainText } = body

    if (!rule || !mainText) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 检查 OpenAI 配置
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured')
      return Response.json(
        { error: 'OpenAI configuration missing' },
        { status: 500 }
      )
    }

    try {
      const initialPrompt = `
      你是一名专业的合同审核律师，请根据以下规则审查合同中是否存在风险：

      规则信息：
      - 类别: ${rule.category}
      - 风险等级: ${rule.level}
      - 审核原则: ${rule.principle}
      ${rule.clause ? `- 相关条款: ${rule.clause}` : ''}



      请检查合同中是否存在此类风险。你必须返回严格的JSON格式数组，格式如下：
      [
        {
          "是否找到风险": "是",  
          "主要增加哪方的风险": "乙方",
          "原文": "违约金为合同总价的50%",
          "风险等级": "${rule.level}",
          "风险提示": "违约金过高，超过合同总价的30%",
          "修改建议": "违约金不超过造成损失的30%"
        }
      ]

      要求：
      1. "是否找到风险"必须回答"是"或"否"
      2. 必须准确指出"原文内容"，包含完整的金额表述
      3. 严禁提示规则以外的风险
      4. "修改建议"必须可以直接替换原文
      5. 判断条款主要增加哪方风险（甲方/乙方/双方）
      6. 如果找不到相关风险，也要返回数组，但"是否找到风险"填"否"
      7.除了json，不要返回任何其他内容

      合同全文内容：
      ${mainText}
      
      `

      // 打印完整提示词
      // console.log('Prompt:', initialPrompt)
      console.log('----------------------------------------')

      const initialCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: initialPrompt }],
      })

      const initialResponse = initialCompletion.choices[0].message.content

      console.log('AI律师回答:', initialResponse)

      // 第二步：验证和过滤结果
      const verificationPrompt = `

      1.作为复查员，请严格检查AI律师返回的结果的格式是否为json格式，我们的格式示例为：
      [
        {
          "是否找到风险": "是",  
          "主要增加哪方的风险": "乙方",
          "原文": "违约金为合同总价的50%",
          "风险等级": "中",
          "风险提示": "违约金过高，超过合同总价的30%",
          "修改建议": "违约金不超过造成损失的30%"
        }
      ]
      2.是否除了json，没有返回任何其他任何多余内容
      3.AI律师返回结果：
      ${initialResponse}
      4.你返回的结果应当在AI律师返回结果的基础上，增加“是否符合要求”和“不符合原因”两个字段
      5.如果AI律师返回的结果格式错误，请在“是否符合要求”中填“否”，并写明“不符合原因”，否则填“是”
      6.你应当返回的格式如下：
      [
        {
          "是否找到风险": "是",  
          "主要增加哪方的风险": "乙方",
          "原文": "违约金为合同总价的50%",
          "风险等级": "中",
          "风险提示": "违约金过高，超过合同总价的30%",
          "修改建议": "违约金不超过造成损失的30%"
          "是否符合要求": "是",
          "不符合原因": "格式错误"
        }
      ]

      `

      // 打印验证提示词
      // console.log('Verification Prompt:', verificationPrompt)
      console.log('----------------------------------------')

      const verificationCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: verificationPrompt }],
      })

      const verificationResponse =
        verificationCompletion.choices[0].message.content
      console.log('复查员返回结果:', verificationResponse)

      return Response.json({ result: verificationResponse })
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError)
      return Response.json(
        { error: 'AI service error', details: openaiError.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('API route error:', error)
    return Response.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
