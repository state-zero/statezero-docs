# Files

StateZero provides comprehensive file handling capabilities that work seamlessly with both local Django storage and S3-compatible cloud storage. The library supports two upload modes and automatically handles file uploads, storage, and retrieval.

## Overview

StateZero's file system consists of:

- **FileObject**: A JavaScript class that handles file uploads and provides access to uploaded files
- **Backend Support**: Django views that handle both direct uploads and S3 presigned URL uploads
- **Storage Integration**: Works with Django's storage backends including `django-storages` for S3
- **Field Serializers**: Custom serializers for Django FileField and ImageField

## Upload Modes

StateZero supports two file upload modes:

### Server Upload Mode (`fileUploadMode: "server"`)

Files are uploaded directly to your Django backend, which then stores them using the configured Django storage backend.

**Pros:**
- Simple setup
- Works with any Django storage backend
- Server has full control over file processing

**Cons:**
- Files pass through your server, using bandwidth and processing time
- Slower for large files
- Higher server load

### S3 Upload Mode (`fileUploadMode: "s3"`)

Files are uploaded directly to S3 using presigned URLs, bypassing your Django server entirely.

**Pros:**
- Faster uploads, especially for large files
- Reduces server load and bandwidth usage
- Supports multipart uploads for large files (automatic chunking)
- Better user experience with progress tracking

**Cons:**
- Requires S3-compatible storage
- More complex setup
- Less server control over upload process

## Configuration

### Frontend Configuration

```javascript
import { setupStateZero } from '@statezero/core';

const config = {
  backendConfigs: {
    default: {
      API_URL: 'http://localhost:8000/api/',
      GENERATED_TYPES_DIR: './src/models',
      GENERATED_ACTIONS_DIR: "./src/actions/",
      fileUploadMode: 's3', // or 'server'
      // fileRootURL not needed when using S3 storage - URLs come from storage backend
      getAuthHeaders: () => ({
        'Authorization': `Bearer ${getToken()}`
      })
    }
  }
};

setupStateZero(config);
```

### Django Backend Configuration

#### Basic Setup

```python
# settings.py
STATEZERO_STORAGE_KEY = 'default'  # Primary statezero backend
STATEZERO_UPLOAD_DIR = 'statezero'  # Upload directory within storage
```

#### S3 Configuration with django-storages

If you're already using `django-storages` in your project, simply set `fileUploadMode: "s3"` in your frontend configuration and StateZero will automatically use your existing storage setup.

For new installations:

```python
# Install django-storages
pip install django-storages[s3]

# settings.py
INSTALLED_APPS = [
    # ... other apps
    'storages',
]

# S3 Storage Configuration
AWS_ACCESS_KEY_ID = 'your-access-key'
AWS_SECRET_ACCESS_KEY = 'your-secret-key'
AWS_STORAGE_BUCKET_NAME = 'your-bucket-name'
AWS_S3_REGION_NAME = 'us-west-2'
AWS_S3_ENDPOINT_URL = None  # For AWS S3, leave as None

# Use S3 as default storage
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

# Optional: Use separate storage for static files
STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'
```

::: tip
When using S3 storage, don't include `fileRootURL` in your frontend configuration. StateZero will automatically use the URLs provided by your Django storage backend.
:::

#### Custom Storage Backend

```python
# settings.py
STORAGES = {
    'default': {
        'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage',
        'OPTIONS': {
            'bucket_name': 'your-bucket-name',
            'region_name': 'us-west-2',
        }
    },
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
    }
}

STATEZERO_STORAGE_KEY = 'default'  # Use the S3 storage
```

## Usage

### FileObject Class

### FileObject Class

The `FileObject` class handles file uploads and provides access to uploaded files:

```javascript
import { FileObject } from './models/fileobject.js';

// Create a FileObject from a File (e.g., from input element)
const fileInput = document.getElementById('file-input');
const file = fileInput.files[0];
const fileObject = new FileObject(file);

// Wait for upload to complete
await fileObject.waitForUpload();

// Access file information
console.log(fileObject.filePath);  // Server file path
console.log(fileObject.fileUrl);   // Full URL to access file
console.log(fileObject.status);    // 'pending', 'uploading', 'uploaded', 'failed'
```

### Using Files in Models

```javascript
import { Model } from './models/model.js';
import { FileObject } from './models/fileobject.js';

class Document extends Model {
  static modelName = 'app.Document';
}

// Create a new document with a file
const fileInput = document.getElementById('file-input');
const file = fileInput.files[0];
const fileObject = new FileObject(file);

const document = await Document.objects.create({
  title: 'My Document',
  file: fileObject  // FileObject automatically handled
});

// Access the file URL
console.log(document.file.fileUrl);
```

### FileObject Properties

```javascript
const fileObject = new FileObject(file);

// File information
fileObject.name          // Original filename
fileObject.size          // File size in bytes
fileObject.type          // MIME type

// Upload status
fileObject.status        // 'pending', 'uploading', 'uploaded', 'failed'
fileObject.uploading     // Boolean
fileObject.uploaded      // Boolean
fileObject.uploadError   // Error object if upload failed

// File paths (available after upload)
fileObject.filePath      // Server file path
fileObject.fileUrl       // Full URL to access file

// Upload progress (for S3 mode)
fileObject.uploadProgress // 0-100 percentage
```

### Upload Configuration Options

```javascript
const fileObject = new FileObject(file, {
  chunkSize: 5 * 1024 * 1024,  // 5MB chunks (S3 mode only)
  maxConcurrency: 3,           // Max concurrent chunk uploads
});
```

## Advanced Features

### Multipart Uploads (S3 Mode)

For large files, StateZero automatically uses multipart uploads:

- Files larger than the chunk size (default 5MB) are split into chunks
- Chunks are uploaded concurrently for faster performance
- Failed chunks are automatically retried
- Supports files up to 5TB (AWS S3 limit)

### Upload Progress Tracking

```javascript
const fileObject = new FileObject(largeFile);

// Monitor upload progress
const interval = setInterval(() => {
  console.log(`Upload progress: ${fileObject.uploadProgress}%`);
  if (fileObject.uploaded || fileObject.uploadError) {
    clearInterval(interval);
  }
}, 1000);
```

### Error Handling

```javascript
const fileObject = new FileObject(file);

try {
  await fileObject.waitForUpload();
  console.log('Upload successful!');
} catch (error) {
  console.error('Upload failed:', fileObject.uploadError);
}
```

### File Validation

StateZero automatically validates files based on your Django model field definitions:

```python
# models.py
from django.db import models

class Document(models.Model):
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='documents/')
    image = models.ImageField(upload_to='images/')  # Validates image format
```

## Django Model Integration

### FileField Serialization

StateZero provides custom serializers for Django FileField and ImageField:

```python
# Automatic serialization format
{
    "file_path": "documents/myfile.pdf",
    "file_name": "myfile.pdf", 
    "file_url": "https://bucket.s3.amazonaws.com/documents/myfile.pdf",
    "size": 1024000,
    "mime_type": "application/pdf"
}
```

### Working with Stored Files

```javascript
// Fetch a model with file field
const document = await Document.objects.get(1);

// Access file information
console.log(document.file.fileName);  // "myfile.pdf"
console.log(document.file.fileUrl);   // Full URL
console.log(document.file.size);      // File size in bytes

// Check if it's a stored file (not being uploaded)
console.log(document.file.isStoredFile); // true
```

## Security Considerations

### Upload Permissions

The statezero view access class determins which users can upload files:

```python
# settings.py
STATEZERO_VIEW_ACCESS_CLASS = 'rest_framework.permissions.IsAuthenticated'
```

### File Validation

- File type validation is handled by Django's FileField/ImageField
- Additional validation can be added through Django model clean methods
- File size limits can be configured at the storage level

### S3 Security

- Presigned URLs expire after 1 hour by default
- Configure appropriate CORS settings on your S3 bucket
- Use IAM roles with minimal required permissions

## Troubleshooting

### Common Issues

**Upload fails with "Fast upload requires S3 storage backend"**
- Ensure you're using an S3-compatible storage backend when `fileUploadMode: "s3"`
- Check that `django-storages` is installed and configured

**File not found errors**
- Verify storage configuration is correct
- Check file paths and storage backend connectivity
- Ensure proper permissions on storage backend

**CORS errors in S3 mode**
- Configure CORS policy on your S3 bucket to allow uploads from your domain

### Debug Mode

Enable debug logging to troubleshoot upload issues:

```python
# settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'statezero.adaptors.django.views': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
```

## Migration Guide

### From Server to S3 Mode

1. Install and configure `django-storages`
2. Update frontend configuration to set `fileUploadMode: "s3"`
3. Configure S3 credentials and bucket settings
4. Test file uploads work correctly
5. Optionally migrate existing files to S3