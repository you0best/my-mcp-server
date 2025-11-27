import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { InferenceClient } from '@huggingface/inference'
import { z } from 'zod'

// Hugging Face Inference Client 초기화
const hfClient = new InferenceClient(process.env.HF_TOKEN)

// Create server instance
const server = new McpServer({
    name: 'greeting-server',
    version: '1.0.0',
    capabilities: {
        tools: {},
        resources: {},
        prompts: {}
    }
})

// 가짜 서버 정보 데이터
const fakeServerInfo = {
    serverName: 'MCP-Demo-Server',
    version: '2.5.1',
    status: 'running',
    uptime: '15일 7시간 23분',
    cpu: {
        model: 'Intel Xeon E5-2680 v4',
        cores: 8,
        usage: '23.5%'
    },
    memory: {
        total: '32GB',
        used: '18.2GB',
        free: '13.8GB',
        usage: '56.9%'
    },
    disk: {
        total: '500GB',
        used: '234GB',
        free: '266GB',
        usage: '46.8%'
    },
    network: {
        ip: '192.168.1.100',
        hostname: 'mcp-server-01',
        port: 3000,
        connections: 42
    },
    lastRestart: '2025-11-12T08:30:00Z',
    environment: 'production'
}

// 서버 정보 리소스 등록
server.resource(
    'server-info',
    'server://info',
    async (uri) => ({
        contents: [
            {
                uri: uri.href,
                mimeType: 'application/json',
                text: JSON.stringify(fakeServerInfo, null, 2)
            }
        ]
    })
)

// 서버 상태 리소스 등록
server.resource(
    'server-status',
    'server://status',
    async (uri) => ({
        contents: [
            {
                uri: uri.href,
                mimeType: 'text/plain',
                text: `🖥️ 서버 상태 리포트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📛 서버명: ${fakeServerInfo.serverName}
📌 버전: ${fakeServerInfo.version}
🟢 상태: ${fakeServerInfo.status}
⏱️ 가동 시간: ${fakeServerInfo.uptime}

💻 CPU 정보
   모델: ${fakeServerInfo.cpu.model}
   코어: ${fakeServerInfo.cpu.cores}개
   사용률: ${fakeServerInfo.cpu.usage}

💾 메모리 정보
   전체: ${fakeServerInfo.memory.total}
   사용: ${fakeServerInfo.memory.used}
   여유: ${fakeServerInfo.memory.free}
   사용률: ${fakeServerInfo.memory.usage}

📀 디스크 정보
   전체: ${fakeServerInfo.disk.total}
   사용: ${fakeServerInfo.disk.used}
   여유: ${fakeServerInfo.disk.free}
   사용률: ${fakeServerInfo.disk.usage}

🌐 네트워크 정보
   IP: ${fakeServerInfo.network.ip}
   호스트명: ${fakeServerInfo.network.hostname}
   포트: ${fakeServerInfo.network.port}
   연결 수: ${fakeServerInfo.network.connections}개

🔄 마지막 재시작: ${fakeServerInfo.lastRestart}
🏷️ 환경: ${fakeServerInfo.environment}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            }
        ]
    })
)

// 언어별 인사말 매핑
const greetings: Record<string, (name: string) => string> = {
    korean: (name) => `안녕하세요, ${name}님! 반갑습니다!`,
    english: (name) => `Hello, ${name}! Nice to meet you!`,
    japanese: (name) => `こんにちは、${name}さん！はじめまして！`,
    chinese: (name) => `你好，${name}！很高兴认识你！`,
    spanish: (name) => `¡Hola, ${name}! ¡Mucho gusto!`,
    french: (name) => `Bonjour, ${name}! Enchanté!`,
    german: (name) => `Hallo, ${name}! Freut mich!`,
}

// greeting 도구 등록
server.tool(
    'greeting',
    '사용자에게 이름과 언어를 입력받아 해당 언어로 인사말을 반환합니다.',
    {
        name: z.string().describe('인사할 사람의 이름'),
        language: z.string().describe('인사말 언어 (korean, english, japanese, chinese, spanish, french, german)')
    },
    async ({ name, language }) => {
        const lang = language.toLowerCase()
        const greetingFn = greetings[lang]

        if (!greetingFn) {
            const availableLanguages = Object.keys(greetings).join(', ')
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `지원하지 않는 언어입니다. 사용 가능한 언어: ${availableLanguages}`
                    }
                ]
            }
        }

        return {
            content: [
                {
                    type: 'text' as const,
                    text: greetingFn(name)
                }
            ]
        }
    }
)

// calc 도구 등록
server.tool(
    'calc',
    '두 개의 숫자와 연산자를 입력받아 계산 결과를 반환합니다.',
    {
        num1: z.number().describe('첫 번째 숫자'),
        num2: z.number().describe('두 번째 숫자'),
        operator: z.string().describe('연산자 (+, -, *, /)')
    },
    async ({ num1, num2, operator }) => {
        let result: number

        switch (operator) {
            case '+':
                result = num1 + num2
                break
            case '-':
                result = num1 - num2
                break
            case '*':
                result = num1 * num2
                break
            case '/':
                if (num2 === 0) {
                    return {
                        content: [
                            {
                                type: 'text' as const,
                                text: '오류: 0으로 나눌 수 없습니다.'
                            }
                        ]
                    }
                }
                result = num1 / num2
                break
            default:
                return {
                    content: [
                        {
                            type: 'text' as const,
                            text: `지원하지 않는 연산자입니다. 사용 가능한 연산자: +, -, *, /`
                        }
                    ]
                }
        }

        return {
            content: [
                {
                    type: 'text' as const,
                    text: `${num1} ${operator} ${num2} = ${result}`
                }
            ]
        }
    }
)

// getCurrentTime 도구 등록
server.tool(
    'getCurrentTime',
    '현지 타임존을 확인하고 현재 시간을 반환합니다.',
    {
        format: z.enum(['full', 'date', 'time']).optional().describe('출력 형식 (full: 전체, date: 날짜만, time: 시간만). 기본값: full')
    },
    async ({ format = 'full' }) => {
        const now = new Date()
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        
        const dateOptions: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        }
        
        const timeOptions: Intl.DateTimeFormatOptions = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }
        
        let result: string
        
        switch (format) {
            case 'date':
                result = `📅 날짜: ${now.toLocaleDateString('ko-KR', dateOptions)}\n🌍 타임존: ${timezone}`
                break
            case 'time':
                result = `⏰ 시간: ${now.toLocaleTimeString('ko-KR', timeOptions)}\n🌍 타임존: ${timezone}`
                break
            case 'full':
            default:
                result = `📅 날짜: ${now.toLocaleDateString('ko-KR', dateOptions)}\n⏰ 시간: ${now.toLocaleTimeString('ko-KR', timeOptions)}\n🌍 타임존: ${timezone}`
        }
        
        return {
            content: [
                {
                    type: 'text' as const,
                    text: result
                }
            ]
        }
    }
)

// generateImage 도구 등록
server.tool(
    'generateImage',
    '텍스트 프롬프트를 입력받아 AI 이미지를 생성합니다.',
    {
        prompt: z.string().describe('생성할 이미지에 대한 설명 (영어 권장)')
    },
    async ({ prompt }) => {
        try {
            const result = await hfClient.textToImage({
                provider: 'auto',
                model: 'black-forest-labs/FLUX.1-schnell',
                inputs: prompt,
                parameters: { num_inference_steps: 5 }
            })

            // 결과를 base64로 변환 (Blob 객체 처리)
            let base64Data: string
            if (result && typeof result === 'object' && 'arrayBuffer' in result) {
                // Blob인 경우 arrayBuffer 메서드가 있음
                const arrayBuffer = await (result as Blob).arrayBuffer()
                base64Data = Buffer.from(arrayBuffer).toString('base64')
            } else if (typeof result === 'string') {
                // URL인 경우 fetch하여 변환
                if (result.startsWith('http://') || result.startsWith('https://')) {
                    const response = await fetch(result)
                    const arrayBuffer = await response.arrayBuffer()
                    base64Data = Buffer.from(arrayBuffer).toString('base64')
                } else {
                    // 이미 base64인 경우
                    base64Data = result
                }
            } else {
                throw new Error('예상치 못한 응답 형식입니다.')
            }

            return {
                content: [
                    {
                        type: 'image' as const,
                        data: base64Data,
                        mimeType: 'image/png',
                        annotations: {
                            audience: ['user'],
                            priority: 0.9
                        }
                    }
                ]
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `이미지 생성 중 오류가 발생했습니다: ${errorMessage}`
                    }
                ]
            }
        }
    }
)

// code_review 프롬프트 등록
server.prompt(
    'code_review',
    '코드를 입력받아 상세한 코드 리뷰를 수행합니다.',
    {
        code: z.string().describe('리뷰할 코드'),
        language: z.string().optional().describe('프로그래밍 언어 (예: javascript, python, typescript 등)')
    },
    async ({ code, language }) => {
        const langInfo = language ? `프로그래밍 언어: ${language}` : '프로그래밍 언어: 자동 감지'
        
        return {
            messages: [
                {
                    role: 'user' as const,
                    content: {
                        type: 'text' as const,
                        text: `다음 코드에 대해 상세한 코드 리뷰를 수행해주세요.

${langInfo}

## 리뷰 항목
다음 항목들을 중점적으로 검토해주세요:

1. **코드 품질 (Code Quality)**
   - 가독성 및 명명 규칙
   - 코드 구조 및 모듈화
   - 중복 코드 여부

2. **버그 및 오류 (Bugs & Errors)**
   - 잠재적인 버그
   - 엣지 케이스 처리
   - 에러 핸들링

3. **성능 (Performance)**
   - 비효율적인 로직
   - 메모리 누수 가능성
   - 최적화 제안

4. **보안 (Security)**
   - 보안 취약점
   - 입력 검증
   - 민감한 데이터 처리

5. **베스트 프랙티스 (Best Practices)**
   - 언어/프레임워크 관례 준수
   - SOLID 원칙
   - 테스트 용이성

## 리뷰할 코드
\`\`\`${language || ''}
${code}
\`\`\`

## 출력 형식
각 항목에 대해 다음 형식으로 피드백을 제공해주세요:
- ✅ 잘된 점
- ⚠️ 개선이 필요한 점
- 💡 제안사항

마지막에 전체적인 코드 품질 점수를 10점 만점으로 평가해주세요.`
                    }
                }
            ]
        }
    }
)

// 서버 시작
async function main() {
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error('Greeting MCP Server running on stdio')
}

main().catch(console.error)
