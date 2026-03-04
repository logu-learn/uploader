'use client';

import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    setFile(selectedFile || null);
    setMessage('');
  };

  const handleUpload = async () => {
    try {
      if (!file) {
        setMessage('Please select a file first.');
        return;
      }

      setUploading(true);
      setMessage('');

      const presignResponse = await fetch('/api/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
        }),
      });

      if (!presignResponse.ok) {
        const errorData = await presignResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get upload URL');
      }

      const { url, key } = await presignResponse.json();

      const uploadResponse = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload to S3 failed');
      }

      setMessage(`Upload successful! File key: ${key}`);
      setFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      setMessage(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        padding: '1rem',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '0.75rem',
          padding: '2rem',
          boxShadow:
            '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
        }}
      >
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
            textAlign: 'center',
          }}
        >
          S3 File Uploader
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            color: '#6b7280',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}
        >
          Choose a file from your computer and upload it directly to your S3
          bucket using a pre-signed URL.
        </p>

        <div
          style={{
            border: '2px dashed #e5e7eb',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '1rem',
            textAlign: 'center',
            background: '#f9fafb',
          }}
        >
          <input
            type="file"
            onChange={handleFileChange}
            style={{ marginBottom: '0.75rem' }}
          />
          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            {file ? `Selected: ${file.name}` : 'No file selected'}
          </div>
        </div>

        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !file}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '9999px',
            border: 'none',
            background: uploading || !file ? '#9ca3af' : '#2563eb',
            color: '#ffffff',
            fontWeight: 600,
            cursor: uploading || !file ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s ease',
            marginBottom: '0.75rem',
          }}
        >
          {uploading ? 'Uploading...' : 'Upload to S3'}
        </button>

        {message && (
          <div
            style={{
              fontSize: '0.9rem',
              color: message.toLowerCase().includes('success')
                ? '#059669'
                : '#b91c1c',
              textAlign: 'center',
              wordBreak: 'break-all',
            }}
          >
            {message}
          </div>
        )}
      </div>
    </main>
  );
}

