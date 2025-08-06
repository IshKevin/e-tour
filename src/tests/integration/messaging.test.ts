import { describe, test, expect } from '@jest/globals';
import {
  makeRequest,
  testTokens,
  testUsers,
  testTrip,
  expectSuccessResponse,
  expectErrorResponse,
  expectAuthError,
  expectValidationError,
  TEST_CONSTANTS
} from '../setup';

describe('Communication System Tests', () => {
  describe('POST /api/v1/messages/send', () => {
    const validMessageData = {
      recipientId: testUsers.agent.id,
      subject: 'Trip inquiry',
      message: 'I am interested in your Paris trip. Can you provide more details?',
      tripId: testTrip.id,
      attachments: ['https://example.com/document.pdf']
    };

    test('should send message successfully', async () => {
      const response = await makeRequest(testTokens.client)
        .post('/api/v1/messages/send')
        .send(validMessageData);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('messageInfo');
      expect(response.body.data.messageInfo).toHaveProperty('messageId');
      expect(response.body.data.messageInfo).toHaveProperty('conversationId');
      expect(response.body.data.messageInfo).toHaveProperty('status', 'sent');
      expect(response.body.data.deliveryInfo).toHaveProperty('delivered', true);
    });

    test('should send message without attachments', async () => {
      const dataWithoutAttachments = {
        recipientId: testUsers.agent.id,
        subject: 'Simple inquiry',
        message: 'Hello, I have a question about your services.'
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/messages/send')
        .send(dataWithoutAttachments);

      expectSuccessResponse(response, 201);
      expect(response.body.data.messageInfo.hasAttachments).toBe(false);
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .post('/api/v1/messages/send')
        .send(validMessageData);

      expectAuthError(response);
    });

    test('should validate recipient ID format', async () => {
      const invalidData = {
        ...validMessageData,
        recipientId: 'invalid-uuid'
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/messages/send')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate subject length', async () => {
      const invalidData = {
        ...validMessageData,
        subject: 'a'.repeat(256) // Too long
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/messages/send')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate message length', async () => {
      const invalidData = {
        ...validMessageData,
        message: 'a'.repeat(5001) // Too long
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/messages/send')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate attachment URLs', async () => {
      const invalidData = {
        ...validMessageData,
        attachments: ['invalid-url', 'another-invalid-url']
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/messages/send')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should limit number of attachments', async () => {
      const invalidData = {
        ...validMessageData,
        attachments: Array(6).fill('https://example.com/file.pdf') // Too many
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/messages/send')
        .send(invalidData);

      expectValidationError(response);
    });
  });

  describe('GET /api/v1/messages/conversations', () => {
    test('should get conversations successfully', async () => {
      const response = await makeRequest(testTokens.client)
        .get('/api/v1/messages/conversations');

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('conversations');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('conversationInfo');
      expect(response.body.data).toHaveProperty('features');
    });

    test('should support pagination', async () => {
      const response = await makeRequest(testTokens.client)
        .get('/api/v1/messages/conversations?page=1&limit=5');

      expectSuccessResponse(response);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    test('should support status filtering', async () => {
      const response = await makeRequest(testTokens.client)
        .get('/api/v1/messages/conversations?status=active');

      expectSuccessResponse(response);
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .get('/api/v1/messages/conversations');

      expectAuthError(response);
    });
  });

  describe('GET /api/v1/messages/conversations/:id', () => {
    test('should get conversation messages successfully', async () => {
      const response = await makeRequest(testTokens.client)
        .get(`/api/v1/messages/conversations/${TEST_CONSTANTS.VALID_UUID}`);

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('messages');
      expect(response.body.data).toHaveProperty('conversation');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('conversationInfo');
      expect(response.body.data).toHaveProperty('messageStats');
      expect(response.body.data).toHaveProperty('features');
    });

    test('should support pagination', async () => {
      const response = await makeRequest(testTokens.client)
        .get(`/api/v1/messages/conversations/${TEST_CONSTANTS.VALID_UUID}?page=1&limit=10`);

      expectSuccessResponse(response);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .get(`/api/v1/messages/conversations/${TEST_CONSTANTS.VALID_UUID}`);

      expectAuthError(response);
    });

    test('should validate conversation ID format', async () => {
      const response = await makeRequest(testTokens.client)
        .get('/api/v1/messages/conversations/invalid-uuid');

      expectErrorResponse(response, 400);
    });

    test('should handle non-existent conversation', async () => {
      const nonExistentId = 'non-existent-uuid-1234-5678-9012-123456789012';
      const response = await makeRequest(testTokens.client)
        .get(`/api/v1/messages/conversations/${nonExistentId}`);

      expectErrorResponse(response, 404);
    });
  });

  describe('PUT /api/v1/messages/mark-read', () => {
    const validMarkReadData = {
      messageIds: [TEST_CONSTANTS.VALID_UUID, 'another-valid-uuid-1234-5678-9012-123456789012']
    };

    test('should mark messages as read successfully', async () => {
      const response = await makeRequest(testTokens.client)
        .put('/api/v1/messages/mark-read')
        .send(validMarkReadData);

      expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('readInfo');
      expect(response.body.data.readInfo).toHaveProperty('messagesMarked');
      expect(response.body.data).toHaveProperty('impact');
      expect(response.body.data.impact).toHaveProperty('unreadCountReduced');
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .put('/api/v1/messages/mark-read')
        .send(validMarkReadData);

      expectAuthError(response);
    });

    test('should validate message IDs format', async () => {
      const invalidData = {
        messageIds: ['invalid-uuid', 'another-invalid-uuid']
      };

      const response = await makeRequest(testTokens.client)
        .put('/api/v1/messages/mark-read')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should require at least one message ID', async () => {
      const invalidData = {
        messageIds: []
      };

      const response = await makeRequest(testTokens.client)
        .put('/api/v1/messages/mark-read')
        .send(invalidData);

      expectValidationError(response);
    });
  });

  describe('DELETE /api/v1/messages/conversations/:id', () => {
    test('should delete conversation successfully', async () => {
      const response = await makeRequest(testTokens.client)
        .delete(`/api/v1/messages/conversations/${TEST_CONSTANTS.VALID_UUID}`);

      expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('deletionInfo');
      expect(response.body.data.deletionInfo).toHaveProperty('conversationId');
      expect(response.body.data.deletionInfo).toHaveProperty('permanent', true);
      expect(response.body.data).toHaveProperty('impact');
      expect(response.body.data.impact).toHaveProperty('cannotBeUndone', true);
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .delete(`/api/v1/messages/conversations/${TEST_CONSTANTS.VALID_UUID}`);

      expectAuthError(response);
    });

    test('should validate conversation ID format', async () => {
      const response = await makeRequest(testTokens.client)
        .delete('/api/v1/messages/conversations/invalid-uuid');

      expectErrorResponse(response, 400);
    });

    test('should handle non-existent conversation', async () => {
      const nonExistentId = 'non-existent-uuid-1234-5678-9012-123456789012';
      const response = await makeRequest(testTokens.client)
        .delete(`/api/v1/messages/conversations/${nonExistentId}`);

      expectErrorResponse(response, 404);
    });
  });

  describe('Messaging Integration Tests', () => {
    test('should handle complete messaging workflow', async () => {
      // 1. Send initial message
      const sendResponse = await makeRequest(testTokens.client)
        .post('/api/v1/messages/send')
        .send({
          recipientId: testUsers.agent.id,
          subject: 'Trip Planning Assistance',
          message: 'Hi, I need help planning my trip to Paris.',
          tripId: testTrip.id
        });

      expectSuccessResponse(sendResponse, 201);
      const conversationId = sendResponse.body.data.messageInfo.conversationId;

      // 2. Get conversations list
      const conversationsResponse = await makeRequest(testTokens.client)
        .get('/api/v1/messages/conversations');

      expectSuccessResponse(conversationsResponse);
      expect(conversationsResponse.body.data.conversations.length).toBeGreaterThanOrEqual(0);

      // 3. Get messages in conversation
      const messagesResponse = await makeRequest(testTokens.client)
        .get(`/api/v1/messages/conversations/${conversationId}`);

      expectSuccessResponse(messagesResponse);

      // 4. Agent replies to the message
      const replyResponse = await makeRequest(testTokens.agent)
        .post('/api/v1/messages/send')
        .send({
          recipientId: testUsers.client.id,
          subject: 'Re: Trip Planning Assistance',
          message: 'Hello! I would be happy to help you plan your Paris trip.'
        });

      expectSuccessResponse(replyResponse, 201);

      // 5. Mark messages as read
      const markReadResponse = await makeRequest(testTokens.client)
        .put('/api/v1/messages/mark-read')
        .send({
          messageIds: [TEST_CONSTANTS.VALID_UUID]
        });

      expectSuccessResponse(markReadResponse, 200);

      // 6. Delete conversation
      const deleteResponse = await makeRequest(testTokens.client)
        .delete(`/api/v1/messages/conversations/${conversationId}`);

      expectSuccessResponse(deleteResponse, 200);
    });

    test('should handle message validation edge cases', async () => {
      // Test empty message
      const emptyMessageResponse = await makeRequest(testTokens.client)
        .post('/api/v1/messages/send')
        .send({
          recipientId: testUsers.agent.id,
          subject: 'Test',
          message: ''
        });

      expectValidationError(emptyMessageResponse);

      // Test empty subject
      const emptySubjectResponse = await makeRequest(testTokens.client)
        .post('/api/v1/messages/send')
        .send({
          recipientId: testUsers.agent.id,
          subject: '',
          message: 'Test message'
        });

      expectValidationError(emptySubjectResponse);

      // Test self-messaging (should work)
      const selfMessageResponse = await makeRequest(testTokens.client)
        .post('/api/v1/messages/send')
        .send({
          recipientId: testUsers.client.id,
          subject: 'Note to self',
          message: 'This is a note to myself'
        });

      expectSuccessResponse(selfMessageResponse, 201);
    });
  });
});
