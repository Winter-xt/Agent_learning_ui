<script setup>
import { ref } from 'vue'

const userId = ref('default')
const resumeFile = ref(null)
const resumeFiles = ref([])
const uploading = ref(false)
const uploadResult = ref('')
const batchUploading = ref(false)
const batchUploadResult = ref('')
const resumeQuery = ref('这位候选人的核心技术栈是什么？')
const querying = ref(false)
const queryResult = ref('')

function onFileChange(event) {
  const files = event.target.files
  resumeFile.value = files && files.length > 0 ? files[0] : null
}

function onFilesChange(event) {
  const files = event.target.files
  resumeFiles.value = files ? Array.from(files) : []
}

async function uploadResume() {
  if (!resumeFile.value) {
    uploadResult.value = '请先选择简历文件（PDF/DOC/DOCX）'
    return
  }

  uploading.value = true
  uploadResult.value = ''

  try {
    const params = new URLSearchParams({
      userId: userId.value
    })
    const formData = new FormData()
    formData.append('file', resumeFile.value)

    const resp = await fetch(`/api/documents/upload-resume?${params.toString()}`, {
      method: 'POST',
      body: formData
    })

    if (!resp.ok) {
      let message = `上传失败: ${resp.status}`
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

    const data = await resp.json()
    uploadResult.value =
      `上传成功\n` +
      `用户: ${data.userId}\n` +
      `文件: ${data.fileName}\n` +
      `分片数: ${data.segmentCount}\n` +
      `字符数: ${data.characterCount}\n` +
      `Embedding Tokens: ${data.embeddingTokenCount ?? 'N/A'}`
  } catch (error) {
    uploadResult.value = `错误: ${error.message}`
  } finally {
    uploading.value = false
  }
}

async function uploadResumes() {
  if (!resumeFiles.value.length) {
    batchUploadResult.value = '请先选择多个文件'
    return
  }

  batchUploading.value = true
  batchUploadResult.value = ''

  try {
    const params = new URLSearchParams({
      userId: userId.value
    })
    const formData = new FormData()
    for (const file of resumeFiles.value) {
      formData.append('files', file)
    }

    const resp = await fetch(`/api/documents/upload-resumes?${params.toString()}`, {
      method: 'POST',
      body: formData
    })

    if (!resp.ok) {
      let message = `批量上传失败: ${resp.status}`
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

    const data = await resp.json()
    const uploaded = data.uploaded ?? []
    const skipped = data.skipped ?? []
    const uploadedLines = uploaded.map((item, idx) => `${idx + 1}. ${item.fileName} (分片:${item.segmentCount})`)
    const skippedLines = skipped.map((item, idx) => `${idx + 1}. ${item.fileName} - ${item.reason}`)

    batchUploadResult.value =
      `批量上传完成\n` +
      `用户: ${data.userId}\n` +
      `成功: ${uploaded.length}\n` +
      `跳过: ${skipped.length}\n\n` +
      `成功列表:\n${uploadedLines.length ? uploadedLines.join('\n') : '无'}\n\n` +
      `跳过列表:\n${skippedLines.length ? skippedLines.join('\n') : '无'}`
  } catch (error) {
    batchUploadResult.value = `错误: ${error.message}`
  } finally {
    batchUploading.value = false
  }
}

async function queryResume() {
  if (!resumeQuery.value.trim()) {
    queryResult.value = '请先输入要查询的问题'
    return
  }

  querying.value = true
  queryResult.value = ''

  try {
    const params = new URLSearchParams({
      userId: userId.value,
      query: resumeQuery.value
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

    queryResult.value = await resp.text()
  } catch (error) {
    queryResult.value = `错误: ${error.message}`
  } finally {
    querying.value = false
  }
}
</script>

<template>
  <section class="panel">
    <h1>Document Controller</h1>
    <p>对应后端接口：/api/documents/upload-resume 与 /api/documents/query-resume</p>

    <label>
      用户ID
      <input v-model="userId" type="text" />
    </label>

    <label>
      简历文件
      <input
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        type="file"
        @change="onFileChange"
      />
    </label>

    <div class="actions">
      <button :disabled="uploading" @click="uploadResume">
        {{ uploading ? '上传中...' : '上传简历入库' }}
      </button>
    </div>

    <pre class="result upload">{{ uploadResult || '上传结果会显示在这里...' }}</pre>

    <label>
      简历文件（多文件）
      <input
        accept=".pdf,.doc,.docx,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,application/x-zip-compressed,multipart/x-zip"
        type="file"
        multiple
        @change="onFilesChange"
      />
    </label>

    <div class="actions">
      <button :disabled="batchUploading" @click="uploadResumes">
        {{ batchUploading ? '批量上传中...' : '批量上传简历入库（支持 ZIP）' }}
      </button>
    </div>

    <pre class="result upload">{{ batchUploadResult || '批量上传结果会显示在这里...' }}</pre>

    <label>
      简历问答
      <textarea v-model="resumeQuery" rows="3" placeholder="例如：该候选人的工作年限、项目经验和技术栈是什么？" />
    </label>

    <div class="actions">
      <button :disabled="querying" @click="queryResume">
        {{ querying ? '查询中...' : 'AI 查询简历信息' }}
      </button>
    </div>

    <pre class="result">{{ queryResult || '简历问答结果会显示在这里...' }}</pre>
  </section>
</template>
