<script setup>
import { computed, ref } from 'vue'

const userId = ref('default-user')
const query = ref('候选人的核心技术栈是什么？')
const querying = ref(false)
const result = ref('')

const userIdKey = computed(() => {
  const encoder = new TextEncoder()
  const bytes = encoder.encode((userId.value || '').trim())
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
})

async function queryResume() {
  if (!query.value.trim()) {
    result.value = '请先输入问题'
    return
  }

  querying.value = true
  result.value = ''

  try {
    const params = new URLSearchParams({
      userId: userId.value,
      query: query.value
    })
    const resp = await fetch(`/api/documents/query-resume?${params.toString()}`)

    if (!resp.ok) {
      let message = `查询失败: ${resp.status}`
      try {
        const err = await resp.json()
        if (err && err.message) {
          message = err.message
        }
      } catch (_) {
        // ignore parse error
      }
      throw new Error(message)
    }

    result.value = await resp.text()
  } catch (error) {
    result.value = `错误: ${error.message}`
  } finally {
    querying.value = false
  }
}
</script>

<template>
  <section class="panel">
    <h1>Resume Search</h1>
    <p>对应后端接口：/api/documents/query-resume（按 userIdKey + sourceType 检索）</p>

    <label>
      用户ID
      <input v-model="userId" type="text" />
    </label>

    <div class="tips">
      当前 userIdKey（与后端一致）: <code>{{ userIdKey }}</code>
    </div>

    <label>
      查询问题
      <textarea v-model="query" rows="3" placeholder="例如：他有几年 Java 开发经验？" />
    </label>

    <div class="actions">
      <button :disabled="querying" @click="queryResume">
        {{ querying ? '查询中...' : '查询简历信息' }}
      </button>
    </div>

    <pre class="result">{{ result || '查询结果会显示在这里...' }}</pre>
  </section>
</template>
