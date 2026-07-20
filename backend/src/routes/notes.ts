import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { roleGuard } from '../middleware/roleGuard.js';
import { MinioService } from '../services/minioService.js';

const noteRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  const minioService = new MinioService();

  // --- Company Notes ---

  // List Company Notes
  server.get('/companies/:id/notes', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    const { id } = request.params;
    const notes = await server.prisma.companyNote.findMany({
      where: { companyId: id, deletedAt: null },
      include: {
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return notes;
  });

  // Create Company Note
  server.post('/companies/:id/notes', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { title, content } = request.body;

    const note = await server.prisma.companyNote.create({
      data: {
        companyId: id,
        userId: request.user.id,
        title,
        content,
      },
    });
    return note;
  });

  // Update Company Note
  server.put('/companies/:id/notes/:noteId', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { noteId } = request.params;
    const { title, content } = request.body;

    const note = await server.prisma.companyNote.update({
      where: { id: noteId },
      data: { title, content },
    });
    return note;
  });

  // Delete Company Note (Soft Delete)
  server.delete('/companies/:id/notes/:noteId', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { noteId } = request.params;

    await server.prisma.companyNote.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    });
    return { message: 'Note deleted successfully' };
  });

  // --- Note Attachments ---

  // Upload Attachment
  server.post('/notes/:noteId/attachments', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { noteId } = request.params;
    const file = await request.file();

    if (!file) {
      return reply.status(400).send({ message: 'No file uploaded' });
    }

    const buffer = await file.toBuffer();
    const storagePath = await minioService.uploadFile(buffer, file.filename, file.mimetype);

    const attachment = await server.prisma.companyNoteAttachment.create({
      data: {
        noteId,
        filename: file.filename,
        fileSize: buffer.length,
        mimeType: file.mimetype,
        storagePath: storagePath,
      },
    });

    return attachment;
  });

  // Download Attachment (Presigned URL)
  server.get('/notes/:noteId/attachments/:attachmentId/download', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    const { attachmentId } = request.params;

    const attachment = await server.prisma.companyNoteAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return reply.status(404).send({ message: 'Attachment not found' });
    }

    const downloadUrl = await minioService.getDownloadUrl(attachment.storagePath, attachment.filename);

    return { downloadUrl };
  });

  // Delete Attachment
  server.delete('/notes/:noteId/attachments/:attachmentId', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { attachmentId } = request.params;

    const attachment = await server.prisma.companyNoteAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return reply.status(404).send({ message: 'Attachment not found' });
    }

    // Delete from MinIO
    await minioService.deleteFile(attachment.storagePath);

    // Delete from DB
    await server.prisma.companyNoteAttachment.delete({
      where: { id: attachmentId },
    });

    return { message: 'Attachment deleted successfully' };
  });
};

export default noteRoutes;
