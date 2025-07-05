# Chat Before Purchase Feature - API Documentation

## Overview
The "Chat Before Purchase" feature allows students to initiate conversations with teachers before purchasing consultancy cards. This feature includes conversation threading, message management, and real-time communication via Socket.IO.

## Architecture

### Models
- **Conversation**: Groups messages into threads between participants
- **Chat**: Individual messages within conversations
- **Student**: Student user model
- **Profile**: Teacher/instructor profile model

### Key Features
- ✅ Conversation threading
- ✅ Pre-purchase chat context
- ✅ JWT authentication
- ✅ Real-time messaging via Socket.IO
- ✅ Message seen/unread tracking
- ✅ Conversation status management
- ✅ Soft deletion support
- ✅ Backward compatibility with existing chat

## API Endpoints

### Conversation Management

#### 1. Initiate Conversation
```
POST /api/conversations/initiate
```
**Description**: Start a new conversation between student and teacher (main endpoint for "Chat Before Purchase")

**Authentication**: Required (JWT Token)

**Request Body**:
```json
{
  "teacherId": "64a1b2c3d4e5f6789012345",
  "consultancyId": "64a1b2c3d4e5f6789012346", // Optional
  "consultancyTitle": "Web Development Consultation" // Optional
}
```

**Response**:
```json
{
  "success": true,
  "message": "New conversation created",
  "data": {
    "conversation": {
      "_id": "64a1b2c3d4e5f6789012347",
      "participants": [...],
      "consultancyContext": {...},
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "isNew": true
  }
}
```

#### 2. Get User Conversations
```
GET /api/conversations
```
**Description**: Retrieve all conversations for the authenticated user

**Authentication**: Required (JWT Token)

**Response**:
```json
{
  "success": true,
  "message": "Conversations fetched successfully",
  "data": {
    "conversations": [
      {
        "_id": "64a1b2c3d4e5f6789012347",
        "consultancyContext": {...},
        "lastMessage": {...},
        "status": "active",
        "unreadCount": {
          "student": 2,
          "teacher": 0
        },
        "otherParticipant": {...}
      }
    ],
    "count": 1
  }
}
```

#### 3. Get Conversation by ID
```
GET /api/conversations/:conversationId
```
**Description**: Retrieve specific conversation details

**Authentication**: Required (JWT Token)

**Response**:
```json
{
  "success": true,
  "message": "Conversation fetched successfully",
  "data": {
    "conversation": {
      "_id": "64a1b2c3d4e5f6789012347",
      "participants": [...],
      "consultancyContext": {...},
      "status": "active"
    }
  }
}
```

#### 4. Update Conversation Status
```
PUT /api/conversations/:conversationId/status
```
**Description**: Update conversation status (active, archived, closed)

**Authentication**: Required (JWT Token)

**Request Body**:
```json
{
  "status": "archived"
}
```

#### 5. Mark Conversation as Read
```
PUT /api/conversations/:conversationId/read
```
**Description**: Mark all messages in conversation as read

**Authentication**: Required (JWT Token)

#### 6. Archive Conversation
```
PUT /api/conversations/:conversationId/archive
```
**Description**: Archive a conversation

**Authentication**: Required (JWT Token)

#### 7. Delete Conversation
```
DELETE /api/conversations/:conversationId
```
**Description**: Soft delete a conversation

**Authentication**: Required (JWT Token)

### Enhanced Chat Endpoints

#### 1. Get Conversation Messages
```
GET /api/chats/conversation/:conversationId/messages?page=1&limit=50
```
**Description**: Retrieve messages for a specific conversation

**Authentication**: Required (JWT Token)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Messages per page (default: 50)

**Response**:
```json
{
  "success": true,
  "data": {
    "messages": [...],
    "totalCount": 150,
    "currentPage": 1,
    "totalPages": 3
  }
}
```

## Socket.IO Events

### Client to Server Events

#### 1. Join Conversation
```javascript
socket.emit('joinConversation', conversationId);
```

#### 2. Send Message
```javascript
socket.emit('conversationMessage', {
  conversationId: '64a1b2c3d4e5f6789012347',
  sender: '64a1b2c3d4e5f6789012345',
  recipient: '64a1b2c3d4e5f6789012346',
  message: 'Hello, I have a question about your consultancy.',
  messageType: 'text',
  senderModel: 'Student',
  recipientModel: 'Profile'
});
```

#### 3. Mark as Seen
```javascript
socket.emit('markConversationSeen', {
  conversationId: '64a1b2c3d4e5f6789012347',
  userId: '64a1b2c3d4e5f6789012345'
});
```

#### 4. Typing Indicator
```javascript
socket.emit('typing', {
  conversationId: '64a1b2c3d4e5f6789012347',
  userId: '64a1b2c3d4e5f6789012345',
  isTyping: true
});
```

#### 5. User Online Status
```javascript
socket.emit('online', userId);
```

### Server to Client Events

#### 1. New Message
```javascript
socket.on('newMessage', (data) => {
  // Handle new message in conversation
});
```

#### 2. Message Notification
```javascript
socket.on('messageNotification', (data) => {
  // Handle message notification for offline users
});
```

#### 3. Messages Seen
```javascript
socket.on('messagesSeen', (data) => {
  // Handle messages marked as seen
});
```

#### 4. User Typing
```javascript
socket.on('userTyping', (data) => {
  // Handle typing indicator
});
```

## Frontend Integration

### Angular Service Example

```typescript
// conversation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConversationService {
  private apiUrl = 'http://localhost:3000/api/conversations';

  constructor(private http: HttpClient) {}

  initiateConversation(teacherId: string, consultancyId?: string, consultancyTitle?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/initiate`, {
      teacherId,
      consultancyId,
      consultancyTitle
    });
  }

  getUserConversations(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  getConversationById(conversationId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${conversationId}`);
  }

  markAsRead(conversationId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${conversationId}/read`, {});
  }
}
```

### Socket.IO Integration

```typescript
// socket.service.ts
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io('http://localhost:3000');
  }

  joinConversation(conversationId: string): void {
    this.socket.emit('joinConversation', conversationId);
  }

  sendMessage(messageData: any): void {
    this.socket.emit('conversationMessage', messageData);
  }

  onNewMessage(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('newMessage', data => observer.next(data));
    });
  }

  markAsSeen(conversationId: string, userId: string): void {
    this.socket.emit('markConversationSeen', { conversationId, userId });
  }
}
```

## Security Features

1. **JWT Authentication**: All endpoints require valid JWT tokens
2. **User Authorization**: Users can only access their own conversations
3. **Student-Only Initiation**: Only students can initiate conversations with teachers
4. **Conversation Access Control**: Participants can only access conversations they're part of
5. **Input Validation**: All inputs are validated and sanitized

## Database Schema

### Conversation Model
```javascript
{
  participants: [{
    user: ObjectId,
    userModel: String,
    role: String
  }],
  consultancyContext: {
    consultancyId: ObjectId,
    consultancyTitle: String,
    isPrePurchase: Boolean
  },
  lastMessage: {
    content: String,
    sender: ObjectId,
    timestamp: Date
  },
  status: String,
  unreadCount: {
    student: Number,
    teacher: Number
  },
  isDelete: Boolean
}
```

### Enhanced Chat Model
```javascript
{
  conversationId: ObjectId,
  sender: ObjectId,
  recipient: ObjectId,
  message: String,
  messageType: String,
  attachment: Object,
  isSeen: Boolean,
  isDelete: Boolean
}
```

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

Common error codes:
- `400`: Bad Request (missing required fields)
- `401`: Unauthorized (invalid/missing JWT token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (conversation/user not found)
- `500`: Internal Server Error

## Migration Notes

This implementation maintains backward compatibility with existing chat functionality while adding new conversation features. Existing chat endpoints and socket events continue to work as before.

## Testing

### API Testing with Postman
1. Set up JWT token in Authorization header
2. Test conversation initiation with different teacher IDs
3. Verify conversation listing and filtering
4. Test message sending and receiving
5. Verify read/unread status updates

### Socket.IO Testing
1. Connect multiple clients to test real-time messaging
2. Test typing indicators
3. Verify message delivery and seen status
4. Test offline message notifications

## Performance Considerations

1. **Database Indexing**: Added indexes on frequently queried fields
2. **Pagination**: Implemented for message retrieval
3. **Aggregation Pipelines**: Optimized for conversation listing
4. **Socket Room Management**: Efficient room joining/leaving
5. **Memory Management**: Proper cleanup of socket connections

## Future Enhancements

1. **File Attachments**: Support for images, documents
2. **Message Reactions**: Emoji reactions to messages
3. **Message Threading**: Reply to specific messages
4. **Voice Messages**: Audio message support
5. **Video Calls**: Integrated video calling
6. **Message Search**: Full-text search across conversations
7. **Push Notifications**: Mobile push notifications
8. **Message Encryption**: End-to-end encryption support 