<script setup>
import { ref } from 'vue'

const userId = ref('default-user')
const query = ref('帮我分析当前财务状况')
const result = ref('')
const loading = ref(false)
const streamController = ref(null)

async function analyze() {
  loading.value = true
  result.value = ''

  try {
    const params = new URLSearchParams({
      userId: userId.value,
      query: query.value
    })

    const resp = await fetch(`/api/talent/analyze?${params.toString()}`)
    if (!resp.ok) {
      throw new Error(`请求失败: ${resp.status}`)
    }

    result.value = await resp.text()
  } catch (error) {
    result.value = `错误: ${error.message}`
  } finally {
    loading.value = false
  }
}

function stopStream() {
  if (streamController.value) {
    streamController.value.abort()
    streamController.value = null
  }
  loading.value = false
}

async function analyzeStream() {
  stopStream()
  loading.value = true
  result.value = ''

  const controller = new AbortController()
  streamController.value = controller

  try {
    const params = new URLSearchParams({
      userId: userId.value,
      query: query.value
    })

    const resp = await fetch(`/api/talent/analyze/stream?${params.toString()}`, {
      headers: {
        Accept: 'text/event-stream'
      },
      signal: controller.signal
    })

    if (!resp.ok || !resp.body) {
      throw new Error(`流式请求失败: ${resp.status}`)
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split('\n\n')
      buffer = chunks.pop() || ''

      for (const chunk of chunks) {
        const lines = chunk.split('\n')
        let eventName = 'message'
        let data = ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            data += line.slice(5).trimStart()
          }
        }

        if (eventName === 'token') {
          result.value += data
        }

        if (eventName === 'done') {
          loading.value = false
          streamController.value = null
          return
        }

        if (eventName === 'error') {
          throw new Error(data || '流式接口错误')
        }
      }
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      result.value = `错误: ${error.message}`
    }
  } finally {
    loading.value = false
    streamController.value = null
  }
}
</script>

<template>
  <section class="panel">
    <h1>Talent Controller</h1>
    <p>对应后端接口：/api/talent/analyze 与 /api/talent/analyze/stream</p>

    <label>
      用户ID
      <input v-model="userId" type="text" />
    </label>

    <label>
      查询内容
      <textarea v-model="query" rows="4" />
    </label>

    <div class="actions">
      <button :disabled="loading" @click="analyze">普通请求</button>
      <button :disabled="loading" @click="analyzeStream">流式请求</button>
      <button :disabled="!loading" @click="stopStream">停止</button>
    </div>

    <pre class="result">{{ result || '返回结果会显示在这里...' }}</pre>
  </section>
</template>
