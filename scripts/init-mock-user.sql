-- 连接到数据库
\c base1;

-- 插入或更新模拟用户
INSERT INTO "User" (
    id,
    name,
    email,
    "createdAt",
    "updatedAt"
) VALUES (
    'cm5g5e9sa0000mmzyb5dt4m4f',
    '测试账号',
    'jx@zlsoft.com',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE 
SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    "updatedAt" = CURRENT_TIMESTAMP;

-- 验证插入结果
SELECT * FROM "User" WHERE id = 'cm5g5e9sa0000mmzyb5dt4m4f'; 