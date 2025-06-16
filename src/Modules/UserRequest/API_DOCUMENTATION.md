# User Request API Documentation

## Overview
This API provides endpoints for managing user requests in the research platform. It includes both authenticated user endpoints and public website endpoints.

## Base URL
```
http://localhost:5001/user-request
```

---

## 🌐 Website Public APIs (No Authentication Required)

### 1. Get Research Requests for Website
**Endpoint:** `GET /user-request/website/research`
**Description:** Get all unfulfilled user requests with requester details for the website research page
**Access:** Public

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max 50) |
| search | string | - | Search in title, description, etc. |
| type | string | - | Filter by type: Lab, Document, Data |
| priority | string | - | Filter by priority: Low, Medium, High |
| sortBy | string | createdAt | Sort field |
| sortOrder | string | desc | Sort order: asc, desc |

#### Example Request
```bash
GET /user-request/website/research?page=1&limit=10&type=Document&priority=High
```

#### Example Response
```json
{
  "success": true,
  "message": "Found 5 unfulfilled research requests",
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "type": "Document",
      "status": "Pending",
      "priority": "High",
      "title": "Research Paper on AI Ethics",
      "description": "Looking for recent papers on AI ethics and bias",
      "documentDetails": {
        "type": "Research Paper",
        "title": "AI Ethics in Modern Applications",
        "author": "Dr. Smith",
        "doi": "10.1000/xyz123"
      },
      "requestBy": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "firstName": "John",
        "lastName": "Doe",
        "collegeName": "MIT",
        "department": "Computer Science",
        "graduationStatus": "PhD",
        "profilePicture": "https://example.com/profile.jpg"
      },
      "createdAt": "2023-09-06T10:30:00.000Z",
      "updatedAt": "2023-09-06T10:30:00.000Z"
    }
  ],
  "meta": {
    "totalCount": 25,
    "currentPage": 1,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false,
    "itemsPerPage": 10
  }
}
```

### 2. Get Request Statistics
**Endpoint:** `GET /user-request/website/stats`
**Description:** Get public statistics about requests
**Access:** Public

#### Example Response
```json
{
  "success": true,
  "message": "Request statistics fetched successfully",
  "data": {
    "overview": {
      "totalRequests": 150,
      "pendingRequests": 45,
      "inProgressRequests": 20,
      "approvedRequests": 70,
      "rejectedRequests": 15
    },
    "byType": {
      "Document": 80,
      "Lab": 35,
      "Data": 35
    },
    "byPriority": {
      "High": 25,
      "Medium": 85,
      "Low": 40
    }
  }
}
```

### 3. Get Request by ID
**Endpoint:** `GET /user-request/website/:id`
**Description:** Get specific request details for public view
**Access:** Public

#### Example Response
```json
{
  "success": true,
  "message": "Request details fetched successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "type": "Document",
    "status": "Pending",
    "priority": "High",
    "title": "Research Paper on AI Ethics",
    "description": "Looking for recent papers on AI ethics and bias",
    "documentDetails": {
      "type": "Research Paper",
      "title": "AI Ethics in Modern Applications",
      "author": "Dr. Smith",
      "doi": "10.1000/xyz123"
    },
    "requestBy": {
      "firstName": "John",
      "lastName": "Doe",
      "collegeName": "MIT",
      "department": "Computer Science",
      "graduationStatus": "PhD"
    },
    "createdAt": "2023-09-06T10:30:00.000Z"
  }
}
```

---

## 🔐 Authenticated User APIs (Authentication Required)

### Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### 1. Create User Request
**Endpoint:** `POST /user-request/create`
**Description:** Create a new user request
**Access:** Authenticated Users

#### Request Body Examples

**Lab Request:**
```json
{
  "type": "Lab",
  "title": "Chemistry Lab Access",
  "description": "Need access to organic chemistry lab",
  "priority": "High",
  "labNature": "Chemistry Lab",
  "labNeeds": "Spectroscopy equipment",
  "labAdditionalInfo": "For thesis research"
}
```

**Document Request:**
```json
{
  "type": "Document",
  "title": "AI Research Paper",
  "description": "Need access to specific research paper",
  "priority": "Medium",
  "documentType": "Research Paper",
  "documentTitle": "Deep Learning Applications",
  "documentAuthor": "Dr. Johnson",
  "documentDoi": "10.1000/abc123",
  "documentPublisher": "IEEE"
}
```

**Data Request:**
```json
{
  "type": "Data",
  "title": "Climate Dataset",
  "description": "Need historical climate data",
  "priority": "Low",
  "dataType": "Dataset",
  "dataTitle": "Global Climate Data 2000-2020",
  "dataDescription": "Temperature and precipitation data"
}
```

### 2. Get User's Requests
**Endpoint:** `POST /user-request/getAll`
**Description:** Get all requests created by the authenticated user

### 3. Update Request Status (Admin)
**Endpoint:** `POST /user-request/updateStatus`
**Description:** Update request status (admin only)

#### Request Body
```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "status": "Approved",
  "responseMessage": "Request approved and processed"
}
```

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ },
  "meta": { /* pagination/metadata */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

---

## 🔍 Request Types

### Lab Request Fields
- `labNature`: Chemistry Lab, Physics Lab, Biology Lab, Computer Lab, Engineering Lab, Research Lab
- `labNeeds`: Description of what's needed
- `labAdditionalInfo`: Additional information

### Document Request Fields
- `documentType`: Research Paper, Journal Article, Conference Paper, Thesis, Book Chapter, Technical Report
- `documentTitle`: Title of the document
- `documentAuthor`: Author name
- `documentDoi`: DOI number
- `documentPublisher`: Publisher name
- `documentPublishedDate`: Publication date

### Data Request Fields
- `dataType`: Dataset, Database Access, API Access, Survey Data, Experimental Data, Historical Data
- `dataTitle`: Title of the data
- `dataDescription`: Description of the data needed

---

## 📈 Status Values
- `Pending`: Request submitted, awaiting review
- `In Progress`: Request is being processed
- `Approved`: Request approved and fulfilled
- `Rejected`: Request rejected

## 🎯 Priority Values
- `Low`: Low priority request
- `Medium`: Medium priority request (default)
- `High`: High priority request

---

## 🚀 Usage Examples

### Frontend Integration (React/Angular)

```javascript
// Get research requests for website
const getResearchRequests = async (page = 1, filters = {}) => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: '20',
    ...filters
  });
  
  const response = await fetch(`/user-request/website/research?${queryParams}`);
  const data = await response.json();
  return data;
};

// Create a new request (authenticated)
const createRequest = async (requestData, token) => {
  const response = await fetch('/user-request/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(requestData)
  });
  
  const data = await response.json();
  return data;
};
```

---

## 🔒 Security Notes

1. **Public APIs**: Website APIs are public and don't require authentication
2. **Rate Limiting**: Public APIs have reasonable limits (max 50 items per page)
3. **Data Privacy**: Public APIs exclude sensitive information like admin responses and attachments
4. **Input Validation**: All inputs are validated and sanitized
5. **CORS**: Properly configured for cross-origin requests

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- MongoDB ObjectIds are used for all IDs
- Pagination is 1-based (first page is page 1)
- Search is case-insensitive and supports partial matches
- Soft delete is implemented (isDeleted flag) 