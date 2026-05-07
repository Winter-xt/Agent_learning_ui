<script setup>
import { ref } from 'vue'

const resumeFile = ref(null)
const resumeFiles = ref([])
const uploading = ref(false)
const uploadResult = ref('')
const batchUploading = ref(false)
const batchUploadResult = ref('')
const resumeQuery = ref('这位候选人的核心技术栈是什么？')
const querying = ref(false)
const queryResult = ref('')
const resumes = ref([])
const loadingResumes = ref(false)
const listResult = ref('')
const deletingResumeId = ref(null)

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
    const formData = new FormData()
    formData.append('file', resumeFile.value)

    const resp = await fetch('/api/documents/upload-resume', {
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
      `文件: ${data.fileName}\n` +
      `候选人: ${data.candidateName ?? '未知'}\n` +
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
    const formData = new FormData()
    for (const file of resumeFiles.value) {
      formData.append('files', file)
    }

    const resp = await fetch('/api/documents/upload-resumes', {
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
    const uploadedLines = uploaded.map((item, idx) => `${idx + 1}. ${item.candidateName ?? '-'} / ${item.fileName}`)
    const skippedLines = skipped.map((item, idx) => `${idx + 1}. ${item.fileName} - ${item.reason}`)

    batchUploadResult.value =
      `批量上传完成\n成功: ${uploaded.length}，跳过: ${skipped.length}\n\n` +
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
    const params = new URLSearchParams({ query: resumeQuery.value })
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

async function loadResumes() {
  loadingResumes.value = true
  listResult.value = ''
  try {
    const resp = await fetch('/api/documents/resumes')
    if (!resp.ok) {
      throw new Error(`列表查询失败: ${resp.status}`)
    }
    resumes.value = await resp.json()
    listResult.value = `已加载 ${resumes.value.length} 条简历`
  } catch (error) {
    listResult.value = `错误: ${error.message}`
  } finally {
    loadingResumes.value = false
  }
}

async function deleteResume(resumeId) {
  deletingResumeId.value = resumeId
  listResult.value = ''
  try {
    const resp = await fetch(`/api/documents/resumes/${resumeId}`, {
      method: 'DELETE'
    })
    if (!resp.ok) {
      let message = `删除失败: ${resp.status}`
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
    listResult.value = `删除成功: ${data.candidateName || resumeId}`
    resumes.value = resumes.value.filter((item) => item.resumeId !== resumeId)
  } catch (error) {
    listResult.value = `错误: ${error.message}`
  } finally {
    deletingResumeId.value = null
  }
}
</script>

<template>
  <section class="panel elegant">
    <h1>Document Center</h1>
    <p>上传、查询与候选人简历列表</p>

    <div class="card-group">
      <article class="card-block">
        <h2>上传</h2>
        <label>
          单文件上传
          <input
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            type="file"
            @change="onFileChange"
          />
        </label>
        <div class="actions compact">
          <button :disabled="uploading" @click="uploadResume">{{ uploading ? '上传中...' : '上传简历' }}</button>
        </div>
        <label>
          多文件/ZIP 上传
          <input
            accept=".pdf,.doc,.docx,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,application/x-zip-compressed,multipart/x-zip"
            type="file"
            multiple
            @change="onFilesChange"
          />
        </label>
        <div class="actions compact">
          <button :disabled="batchUploading" @click="uploadResumes">{{ batchUploading ? '批量上传中...' : '批量上传（支持 ZIP）' }}</button>
        </div>
        <pre class="result upload">{{ uploadResult || '单文件上传结果...' }}</pre>
        <pre class="result upload">{{ batchUploadResult || '批量上传结果...' }}</pre>
      </article>

      <article class="card-block">
        <h2>查询</h2>
        <label>
          问题
          <textarea v-model="resumeQuery" rows="4" placeholder="例如：候选人的核心技术栈与项目经验是什么？" />
        </label>
        <div class="actions compact">
          <button :disabled="querying" @click="queryResume">{{ querying ? '查询中...' : 'AI 查询简历' }}</button>
        </div>
        <pre class="result">{{ queryResult || '查询结果会显示在这里...' }}</pre>
      </article>

      <article class="card-block">
        <h2>列表</h2>
        <div class="actions compact">
          <button :disabled="loadingResumes" @click="loadResumes">{{ loadingResumes ? '加载中...' : '刷新列表' }}</button>
        </div>
        <pre class="result upload">{{ listResult || '列表状态...' }}</pre>

        <div v-if="resumes.length" class="list">
          <div v-for="item in resumes" :key="item.resumeId" class="list-item">
            <div class="list-main">
              <div><strong>{{ item.candidateName || '未命名候选人' }}</strong></div>
              <div>简历ID: {{ item.resumeId }}</div>
              <div>文件: {{ item.fileName }}</div>
              <div>分片: {{ item.segmentCount }} | 字符: {{ item.characterCount }}</div>
              <div>上传: {{ item.uploadedAt }}</div>
            </div>
            <button :disabled="deletingResumeId === item.resumeId" @click="deleteResume(item.resumeId)">
              {{ deletingResumeId === item.resumeId ? '删除中...' : '删除' }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
