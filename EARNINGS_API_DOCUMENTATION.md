# Earnings System API Documentation

## Overview

The Earnings System provides APIs for teachers to track their earnings and for admins to manage settlements. The system automatically creates earnings transactions when payments are completed.

## Base URL

- **Development**: `http://localhost:3000/api/user/earnings`
- **Production**: `https://yourdomain.com/api/user/earnings`

## Authentication

All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Teacher/Expert Endpoints

### 1. Get Earnings Summary

**Endpoint**: `POST /api/user/earnings/summary`

**Description**: Get a summary of the teacher's earnings including totals, pending amounts, and monthly comparisons.

**Request Body**: None (uses JWT token for teacher identification)

**Response**:
```json
{
  "success": true,
  "data": {
    "totalEarnings": 50000,
    "settledEarnings": 30000,
    "pendingEarnings": 20000,
    "cancelledEarnings": 0,
    "thisMonthEarnings": 15000,
    "lastMonthEarnings": 12000,
    "totalTransactions": 25,
    "settledTransactions": 15,
    "pendingTransactions": 10
  },
  "msg": "Earnings summary retrieved successfully"
}
```

### 2. Get Transactions

**Endpoint**: `POST /api/user/earnings/transactions`

**Description**: Get paginated list of earnings transactions with filtering options.

**Request Body**:
```json
{
  "status": "pending", // optional: "pending", "settled", "cancelled"
  "type": "consultancy", // optional: "consultancy", "collaboration", "course", "other"
  "search": "project", // optional: search in description or titles
  "startDate": "2024-01-01", // optional: ISO date string
  "endDate": "2024-12-31", // optional: ISO date string
  "page": 1, // optional: default 1
  "limit": 10 // optional: default 10
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "_id": "transaction_id",
        "expertId": "teacher_id",
        "consultancyId": "consultancy_id",
        "amount": 5000,
        "currency": "INR",
        "status": "pending",
        "type": "consultancy",
        "description": "Payment for consultancy - consultancy_booking",
        "paymentDate": "2024-01-15T10:30:00.000Z",
        "settlementDate": null,
        "platformFee": 500,
        "netAmount": 4500,
        "consultancy": {
          "title": "Project Consultation",
          "category": "Technology"
        },
        "student": {
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "settlementRequested": false,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  },
  "msg": "Transactions retrieved successfully"
}
```

### 3. Get Specific Transaction

**Endpoint**: `GET /api/user/earnings/transaction/:transactionId`

**Description**: Get details of a specific earnings transaction.

**Parameters**:
- `transactionId` (string): The ID of the transaction

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "transaction_id",
    "expertId": "teacher_id",
    "consultancyId": "consultancy_id",
    "amount": 5000,
    "currency": "INR",
    "status": "pending",
    "type": "consultancy",
    "description": "Payment for consultancy - consultancy_booking",
    "paymentDate": "2024-01-15T10:30:00.000Z",
    "settlementDate": null,
    "adminNotes": null,
    "paymentMethod": null,
    "referenceNumber": null,
    "platformFee": 500,
    "netAmount": 4500,
    "consultancy": {
      "title": "Project Consultation",
      "category": "Technology"
    },
    "student": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "settlementRequested": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "msg": "Transaction retrieved successfully"
}
```

### 4. Get Earnings by Date Range

**Endpoint**: `POST /api/user/earnings/range`

**Description**: Get earnings aggregated by date within a specified range.

**Request Body**:
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "2024-01-15",
      "totalAmount": 5000,
      "count": 2
    },
    {
      "_id": "2024-01-20",
      "totalAmount": 3000,
      "count": 1
    }
  ],
  "msg": "Earnings by range retrieved successfully"
}
```

### 5. Get Monthly Earnings

**Endpoint**: `GET /api/user/earnings/monthly/:year`

**Description**: Get monthly earnings breakdown for a specific year.

**Parameters**:
- `year` (number): The year to get earnings for

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "2024-01",
      "totalAmount": 15000,
      "count": 5
    },
    {
      "_id": "2024-02",
      "totalAmount": 12000,
      "count": 4
    }
  ],
  "msg": "Monthly earnings retrieved successfully"
}
```

### 6. Request Settlement

**Endpoint**: `POST /api/user/earnings/request-settlement`

**Description**: Request settlement for pending transactions.

**Request Body**:
```json
{
  "transactionIds": ["transaction_id_1", "transaction_id_2"]
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "transaction_id_1",
      "status": "pending",
      "settlementRequested": true,
      "settlementRequestDate": "2024-01-15T10:30:00.000Z"
    }
  ],
  "msg": "Settlement requested successfully"
}
```

### 7. Get Settlement History

**Endpoint**: `POST /api/user/earnings/settlements`

**Description**: Get paginated list of settled transactions.

**Request Body**:
```json
{
  "page": 1,
  "limit": 10
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "settlements": [
      {
        "_id": "transaction_id",
        "amount": 5000,
        "status": "settled",
        "settlementDate": "2024-01-20T10:30:00.000Z",
        "paymentMethod": "Bank Transfer",
        "referenceNumber": "REF123456",
        "adminNotes": "Settled via NEFT"
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  },
  "msg": "Settlement history retrieved successfully"
}
```

### 8. Export Earnings Data

**Endpoint**: `POST /api/user/earnings/export`

**Description**: Export earnings data for a date range.

**Request Body**:
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "format": "pdf" // optional: "pdf" or "excel"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "earnings": [...],
    "transactions": [...],
    "exportDate": "2024-01-15T10:30:00.000Z",
    "dateRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-12-31"
    }
  },
  "msg": "Earnings data exported successfully"
}
```

## Admin Endpoints

### 1. Get Pending Settlements

**Endpoint**: `POST /api/user/earnings/admin/pending-settlements`

**Description**: Get paginated list of pending settlements for admin review.

**Request Body**:
```json
{
  "page": 1,
  "limit": 10
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "settlements": [
      {
        "_id": "transaction_id",
        "expertId": {
          "_id": "teacher_id",
          "firstName": "John",
          "lastName": "Teacher",
          "email": "teacher@example.com"
        },
        "amount": 5000,
        "status": "pending",
        "settlementRequested": true,
        "settlementRequestDate": "2024-01-15T10:30:00.000Z",
        "description": "Payment for consultancy - consultancy_booking"
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  },
  "msg": "Pending settlements retrieved successfully"
}
```

### 2. Process Settlement

**Endpoint**: `POST /api/user/earnings/admin/settle`

**Description**: Process settlement for a single transaction.

**Request Body**:
```json
{
  "transactionId": "transaction_id",
  "paymentMethod": "Bank Transfer",
  "referenceNumber": "REF123456",
  "adminNotes": "Settled via NEFT"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "transaction_id",
    "status": "settled",
    "settlementDate": "2024-01-20T10:30:00.000Z",
    "paymentMethod": "Bank Transfer",
    "referenceNumber": "REF123456",
    "adminNotes": "Settled via NEFT"
  },
  "msg": "Settlement processed successfully"
}
```

### 3. Bulk Settlement

**Endpoint**: `POST /api/user/earnings/admin/bulk-settle`

**Description**: Process settlements for multiple transactions.

**Request Body**:
```json
{
  "transactionIds": ["transaction_id_1", "transaction_id_2"],
  "paymentMethod": "Bank Transfer",
  "referenceNumber": "REF123456",
  "adminNotes": "Bulk settlement via NEFT"
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "transaction_id_1",
      "status": "settled",
      "settlementDate": "2024-01-20T10:30:00.000Z"
    },
    {
      "_id": "transaction_id_2",
      "status": "settled",
      "settlementDate": "2024-01-20T10:30:00.000Z"
    }
  ],
  "msg": "Bulk settlement processed successfully"
}
```

### 4. Update Transaction Status

**Endpoint**: `POST /api/user/earnings/admin/update-status`

**Description**: Update transaction status (admin function).

**Request Body**:
```json
{
  "transactionId": "transaction_id",
  "updateData": {
    "status": "cancelled",
    "adminNotes": "Payment refunded"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "transaction_id",
    "status": "cancelled",
    "adminNotes": "Payment refunded"
  },
  "msg": "Transaction status updated successfully"
}
```

## Internal Endpoints

### 1. Create Earnings Transaction

**Endpoint**: `POST /api/user/earnings/create-transaction`

**Description**: Create earnings transaction (called internally when payment is made).

**Request Body**:
```json
{
  "expertId": "teacher_id",
  "consultancyId": "consultancy_id",
  "collaborationId": "collaboration_id",
  "paymentId": "payment_id",
  "amount": 5000,
  "currency": "INR",
  "type": "consultancy",
  "description": "Payment for consultancy - consultancy_booking",
  "paymentDate": "2024-01-15T10:30:00.000Z",
  "platformFee": 500,
  "netAmount": 4500
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "transaction_id",
    "expertId": "teacher_id",
    "amount": 5000,
    "status": "pending",
    "type": "consultancy"
  },
  "msg": "Earnings transaction created successfully"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "msg": "Error message description"
}
```

Common HTTP status codes:
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource not found)
- `500`: Internal Server Error

## Data Models

### Earnings Transaction Schema

```javascript
{
  _id: ObjectId,
  expertId: ObjectId, // Reference to TeacherProfile
  consultancyId: ObjectId, // Optional reference to ConsultancyCard
  collaborationId: ObjectId, // Optional reference to Collaboration
  paymentId: ObjectId, // Reference to Payment
  amount: Number, // Total amount
  currency: String, // Default: 'INR'
  status: String, // 'pending', 'settled', 'cancelled'
  type: String, // 'consultancy', 'collaboration', 'course', 'other'
  description: String,
  paymentDate: Date,
  settlementDate: Date, // Optional
  adminNotes: String, // Optional
  paymentMethod: String, // Optional
  referenceNumber: String, // Optional
  platformFee: Number, // Platform commission
  netAmount: Number, // Amount after platform fee
  consultancy: {
    title: String,
    category: String
  },
  collaboration: {
    title: String,
    description: String
  },
  student: {
    firstName: String,
    lastName: String,
    email: String
  },
  settlementRequested: Boolean,
  settlementRequestDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Integration Notes

1. **Automatic Earnings Creation**: Earnings transactions are automatically created when payments are completed via the payment verification process.

2. **Platform Fee**: A 10% platform fee is automatically calculated and deducted from the teacher's earnings.

3. **Settlement Flow**: Teachers can request settlements for pending transactions, which admins can then process.

4. **Security**: All endpoints require authentication, and teachers can only access their own earnings data.

5. **Pagination**: List endpoints support pagination with configurable page size.

6. **Filtering**: Transaction endpoints support filtering by status, type, date range, and search terms.

## Testing

You can test the APIs using tools like Postman or curl. Make sure to:

1. Include the JWT token in the Authorization header
2. Use the correct HTTP method for each endpoint
3. Provide required request body data where needed
4. Handle pagination for list endpoints

## Rate Limiting

Consider implementing rate limiting for production use to prevent abuse of the APIs. 