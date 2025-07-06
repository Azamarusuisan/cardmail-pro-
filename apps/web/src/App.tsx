import React, { useState } from 'react'
import { extractTextFromImage } from './lib/googleVision'
import { parseCard } from './helpers/parseCard'
import { generateMail } from './helpers/generateMail'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [ocrText, setOcrText] = useState('')
  const [parsedData, setParsedData] = useState<any>(null)
  const [emailContent, setEmailContent] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setLoading(true)

    try {
      // Step 1: OCR with Google Vision
      console.log('Google Vision APIでOCR処理中...')
      const ocrResult = await extractTextFromImage(selectedFile)
      setOcrText(ocrResult.text)
      
      // Step 2: Parse with GPT
      console.log('OpenAI APIで解析中...')
      const parsed = await parseCard(ocrResult.text)
      setParsedData(parsed)
      
      // Step 3: Generate email
      console.log('メール生成中...')
      const email = await generateMail(parsed)
      setEmailContent(email)
      
    } catch (error) {
      console.error('エラー:', error)
      alert('処理中にエラーが発生しました: ' + error)
    }
    
    setLoading(false)
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>CardMail Pro - 簡易版</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>1. 名刺画像をアップロード</h2>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileUpload}
          disabled={loading}
        />
        {loading && <p>処理中...</p>}
      </div>

      {file && (
        <div style={{ marginBottom: '20px' }}>
          <h3>アップロードされた画像:</h3>
          <img 
            src={URL.createObjectURL(file)} 
            alt="Business card" 
            style={{ maxWidth: '300px', border: '1px solid #ccc' }}
          />
        </div>
      )}

      {ocrText && (
        <div style={{ marginBottom: '20px' }}>
          <h3>2. OCR結果:</h3>
          <textarea 
            value={ocrText} 
            rows={5} 
            style={{ width: '100%', padding: '10px' }}
            readOnly
          />
        </div>
      )}

      {parsedData && (
        <div style={{ marginBottom: '20px' }}>
          <h3>3. 解析結果:</h3>
          <div style={{ background: '#f5f5f5', padding: '10px' }}>
            <p><strong>名前:</strong> {parsedData.name}</p>
            <p><strong>会社:</strong> {parsedData.company}</p>
            <p><strong>役職:</strong> {parsedData.role}</p>
            <p><strong>メール:</strong> {parsedData.email}</p>
            <p><strong>電話:</strong> {parsedData.phone}</p>
            <p><strong>信頼度:</strong> {(parsedData.confidence * 100).toFixed(1)}%</p>
          </div>
        </div>
      )}

      {emailContent && (
        <div style={{ marginBottom: '20px' }}>
          <h3>4. 生成されたメール:</h3>
          <div style={{ background: '#f0f8ff', padding: '15px', border: '1px solid #ddd' }}>
            <p><strong>件名:</strong> {emailContent.subject}</p>
            <div>
              <strong>本文:</strong>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
                {emailContent.body}
              </pre>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '40px', fontSize: '12px', color: '#666' }}>
        <p>現在設定されているAPI:</p>
        <p>Google Vision API: {import.meta.env.VITE_GOOGLE_CLOUD_API_KEY ? '✅ 設定済み' : '❌ 未設定'}</p>
        <p>OpenAI API: {import.meta.env.VITE_OPENAI_API_KEY ? '✅ 設定済み' : '❌ 未設定'}</p>
      </div>
    </div>
  )
}

export default App