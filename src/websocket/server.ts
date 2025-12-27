import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { multiplayerService } from '@services';
import { logger } from '@utils';
import type { GameRoom } from '@shared/types';

export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      credentials: true,
    },
  });

  logger.info('WebSocket server initializing...');

  // Listen to service events and broadcast to rooms
  setupServiceEventListeners(io);

  // Handle client connections
  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Register event handlers
    handleRoomCreate(socket, io);
    handleRoomJoin(socket, io);
    handleRoomRejoin(socket, io);
    handleRoomLeave(socket, io);
    handleChatMessage(socket, io);
    handleRoomState(socket, io);
    handleConfigUpdate(socket, io);
    handleGameStart(socket, io);
    handleAnswerSubmit(socket, io);
    handleRoundResults(socket, io);
    handleNextRound(socket, io);
    handleGameEnd(socket, io);
    handleGameSummary(socket, io);
    handleDisconnect(socket);

    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Setup periodic cleanup of inactive rooms (every 5 minutes)
  const cleanupInterval = setInterval(() => {
    const cleanedCount = multiplayerService.cleanupInactiveRooms(30 * 60 * 1000); // 30 minutes
    if (cleanedCount > 0) {
      logger.info(`Periodic cleanup: removed ${cleanedCount} inactive room(s)`);
    }
  }, 5 * 60 * 1000); // Run every 5 minutes

  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    clearInterval(cleanupInterval);
    logger.info('Cleanup interval stopped');
  });

  logger.info('WebSocket server initialized');
  return io;
}

/**
 * Setup listeners for service events to broadcast to WebSocket clients
 */
function setupServiceEventListeners(io: SocketIOServer): void {
  // Room created event (no broadcast needed, only creator knows)
  multiplayerService.on('room:created', ({ room }: { room: GameRoom }) => {
    logger.debug(`Room created event: ${room.roomId}`);
  });

  // Player joined event - broadcast to room
  multiplayerService.on('player:joined', ({ roomId, username, avatar }: { roomId: string; username: string; avatar: string }) => {
    io.to(roomId).emit('player:joined', {
      username,
      avatar,
      role: 'player',
    });
    logger.debug(`Player ${username} joined broadcast to room ${roomId}`);
  });

  // Player left event - broadcast to room
  multiplayerService.on('player:left', ({ roomId, username, newHostId }: { roomId: string; username: string; newHostId: string }) => {
    io.to(roomId).emit('player:left', {
      username,
      newHostId,
    });
    logger.debug(`Player ${username} left broadcast to room ${roomId}`);
  });

  // Player rejoined event - broadcast to room
  multiplayerService.on('player:rejoined', ({ roomId, username, avatar, currentScore, phase }: {
    roomId: string;
    username: string;
    avatar: string;
    currentScore: number;
    phase: string;
  }) => {
    io.to(roomId).emit('player:rejoined', {
      username,
      avatar,
      currentScore,
      phase,
      message: `${username} has reconnected`,
    });
    logger.debug(`Player ${username} rejoined broadcast to room ${roomId}`);
  });

  // Chat message event - broadcast to room
  multiplayerService.on('chat:message', ({ roomId, message }: { roomId: string; message: any }) => {
    io.to(roomId).emit('chat:message', message);
    logger.debug(`Chat message broadcast to room ${roomId}`);
  });

  // Room deleted event
  multiplayerService.on('room:deleted', ({ roomId }: { roomId: string }) => {
    io.to(roomId).emit('room:deleted', {
      message: 'Room has been closed',
    });
    logger.debug(`Room deleted event for ${roomId}`);
  });

  // Game started event
  multiplayerService.on('game:started', ({ roomId, round, totalRounds }: { roomId: string; round: any; totalRounds: number }) => {
    io.to(roomId).emit('game:started', {
      round: {
        roundNumber: round.roundNumber,
        letter: round.letter,
        categories: round.categories,
        startedAt: Date.now(),
      },
      totalRounds,
    });
    logger.debug(`Game started event for room ${roomId}`);
  });

  // Answer submitted event
  multiplayerService.on('answer:submitted', ({ roomId, username, submitted, total, allSubmitted }: any) => {
    io.to(roomId).emit('answer:submitted', {
      username,
      submitted,
      total,
      allSubmitted,
    });
    logger.debug(`Answer submitted by ${username} in room ${roomId} (${submitted}/${total})`);
  });

  // Round ended event
  multiplayerService.on('round:ended', ({ roomId, roundNumber }: { roomId: string; roundNumber: number }) => {
    io.to(roomId).emit('round:ended', {
      roundNumber,
      message: 'All players have submitted their answers',
    });
    logger.debug(`Round ${roundNumber} ended for room ${roomId}`);
  });

  // Round started event (next round)
  multiplayerService.on('round:started', ({ roomId, round, roundNumber, totalRounds }: any) => {
    io.to(roomId).emit('round:started', {
      round: {
        roundNumber: round.roundNumber,
        letter: round.letter,
        categories: round.categories,
        startedAt: Date.now(),
      },
      roundNumber,
      totalRounds,
    });
    logger.debug(`Round ${roundNumber} started for room ${roomId}`);
  });

  // Game finished event
  multiplayerService.on('game:finished', ({ roomId, winner }: any) => {
    io.to(roomId).emit('game:finished', {
      winner,
      message: 'Game has finished!',
    });
    logger.debug(`Game finished for room ${roomId}`);
  });

  // Game ended early event
  multiplayerService.on('game:ended', ({ roomId, endedBy }: { roomId: string; endedBy: string }) => {
    io.to(roomId).emit('game:ended', {
      endedBy,
      message: 'Game has been ended by the host. Returning to lobby...',
    });
    logger.debug(`Game ended early by ${endedBy} in room ${roomId}`);
  });

  // Config updated event
  multiplayerService.on('config:updated', ({ roomId, config }: { roomId: string; config: any }) => {
    io.to(roomId).emit('config:updated', {
      config,
      message: 'Game configuration updated by host',
    });
    logger.debug(`Config updated for room ${roomId}`);
  });

  // Player disconnected event
  multiplayerService.on('player:disconnected', ({ roomId, username }: { roomId: string; username: string }) => {
    io.to(roomId).emit('player:disconnected', {
      username,
      message: `${username} has disconnected`,
    });
    logger.debug(`Player ${username} disconnected from room ${roomId}`);
  });

  // Player reconnected event
  multiplayerService.on('player:reconnected', ({ roomId, username }: { roomId: string; username: string }) => {
    io.to(roomId).emit('player:reconnected', {
      username,
      message: `${username} has reconnected`,
    });
    logger.debug(`Player ${username} reconnected to room ${roomId}`);
  });
}

/**
 * Handle room:create event
 */
function handleRoomCreate(socket: Socket, io: SocketIOServer): void {
  socket.on('room:create', async (data: {
    username: string;
    avatar?: string;
  }) => {
    try {
      logger.info(`room:create request from ${data.username}`);

      // Default avatar if not provided
      const avatar = data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`;

      const result = await multiplayerService.createRoom(
        data.username,
        avatar
      );

      if (result.success && result.data) {
        const room = result.data;

        // Join the socket to the room
        socket.join(room.roomId);

        // Update player with socket ID
        const player = room.players.get(data.username);
        if (player) {
          player.socketId = socket.id;
          multiplayerService.updateRoom(room);
        }

        // Send success response
        socket.emit('room:created', {
          success: true,
          data: {
            roomId: room.roomId,
            joinCode: room.joinCode,
            hostId: room.hostId,
            phase: room.phase,
            players: Array.from(room.players.values()).map(p => ({
              userId: p.userId,
              username: p.username,
              avatar: p.avatar,
              role: p.role,
              status: p.status,
              currentScore: p.currentScore,
              isGuest: p.isGuest,
            })),
            config: room.config,
            createdAt: room.createdAt,
          },
        });

        logger.info(`Room ${room.roomId} created successfully`);
      } else {
        socket.emit('error', {
          success: false,
          error: result.error || 'UNKNOWN_ERROR',
          message: 'Failed to create room',
        });

        logger.warn(`Room creation failed: ${result.error}`);
      }
    } catch (error: any) {
      logger.error('Error handling room:create', error);
      socket.emit('error', {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while creating the room',
      });
    }
  });
}

/**
 * Handle room:join event
 */
function handleRoomJoin(socket: Socket, io: SocketIOServer): void {
  socket.on('room:join', async (data: {
    joinCode: string;
    username: string;
    avatar?: string;
  }) => {
    try {
      logger.info(`room:join request from ${data.username} with code ${data.joinCode}`);

      const result = await multiplayerService.joinRoom(
        data.joinCode,
        data.username,
        data.avatar
      );

      if (result.success && result.data) {
        const room = result.data;

        // Join the socket to the room
        socket.join(room.roomId);

        // Update player with socket ID
        const player = room.players.get(data.username);
        if (player) {
          player.socketId = socket.id;
          multiplayerService.updateRoom(room);
        }

        // Send success response to joiner
        socket.emit('room:joined', {
          success: true,
          data: {
            roomId: room.roomId,
            joinCode: room.joinCode,
            hostId: room.hostId,
            phase: room.phase,
            players: Array.from(room.players.values()).map(p => ({
              userId: p.userId,
              username: p.username,
              avatar: p.avatar,
              role: p.role,
              status: p.status,
              currentScore: p.currentScore,
              isGuest: p.isGuest,
            })),
            config: room.config,
            chatMessages: room.chatMessages,
          },
        });

        logger.info(`Player ${data.username} joined room ${room.roomId}`);
      } else {
        socket.emit('error', {
          success: false,
          error: result.error || 'UNKNOWN_ERROR',
          message: 'Failed to join room',
        });

        logger.warn(`Room join failed: ${result.error}`);
      }
    } catch (error: any) {
      logger.error('Error handling room:join', error);
      socket.emit('error', {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while joining the room',
      });
    }
  });
}

/**
 * Handle game:rejoin event
 */
function handleRoomRejoin(socket: Socket, io: SocketIOServer): void {
  socket.on('game:rejoin', async (data: {
    joinCode: string;
    username: string;
    avatar?: string;
  }) => {
    try {
      logger.info(`game:rejoin request from ${data.username} to room ${data.joinCode}`);

      const result = await multiplayerService.rejoinRoom(
        data?.joinCode,
        data?.username,
        data?.avatar
      );

      if (result.success && result.data) {
        const room = result.data;

        // Join the socket to the room
        socket.join(room.roomId);

        // Update player with socket ID
        const player = room.players.get(data.username);
        if (player) {
          player.socketId = socket.id;
          multiplayerService.updateRoom(room);
        }

        // Get current round info if in playing phase
        let currentRound = undefined;
        if (room.phase === 'playing' && room.rounds.length > 0) {
          const round = room.rounds[room.currentRound - 1];
          if (round) {
            currentRound = {
              roundNumber: round.roundNumber,
              letter: round.letter,
              categories: round.categories,
              startedAt: round.startedAt,
            };
          }
        }

        // Send success response to rejoining player
        socket.emit('room:joined', {
          success: true,
          data: {
            roomId: room.roomId,
            joinCode: room.joinCode,
            hostId: room.hostId,
            phase: room.phase,
            currentRound: room.currentRound,
            totalRounds: room.totalRounds,
            players: Array.from(room.players.values()).map(p => ({
              userId: p.userId,
              username: p.username,
              avatar: p.avatar,
              role: p.role,
              status: p.status,
              currentScore: p.currentScore,
              isGuest: p.isGuest,
            })),
            config: room.config,
            chatMessages: room.chatMessages,
            round: currentRound,
            winner: room.winner,
          },
        });

        logger.info(`Player ${data.username} rejoined room ${room.roomId}`);
      } else {
        socket.emit('error', {
          success: false,
          error: result.error || 'UNKNOWN_ERROR',
          message: result.error === 'BAD_REQUEST'
            ? 'Cannot rejoin - player has left the game'
            : 'Failed to rejoin room',
        });

        logger.warn(`Room rejoin failed for ${data.username}: ${result.error}`);
      }
    } catch (error: any) {
      logger.error('Error handling game:rejoin', error);
      socket.emit('error', {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while rejoining the room',
      });
    }
  });
}

/**
 * Handle room:leave event
 */
function handleRoomLeave(socket: Socket, io: SocketIOServer): void {
  socket.on('room:leave', async (data: {
    roomId: string;
    username: string;
  }) => {
    try {
      logger.info(`room:leave request from ${data.username} in room ${data.roomId}`);

      const result = await multiplayerService.leaveRoom(data.roomId, data.username);

      if (result.success) {
        // Leave the socket room
        socket.leave(data.roomId);

        socket.emit('room:left', {
          success: true,
        });

        logger.info(`Player ${data.username} left room ${data.roomId}`);
      } else {
        socket.emit('error', {
          success: false,
          error: result.error || 'UNKNOWN_ERROR',
          message: 'Failed to leave room',
        });
      }
    } catch (error: any) {
      logger.error('Error handling room:leave', error);
      socket.emit('error', {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while leaving the room',
      });
    }
  });
}

/**
 * Handle chat:message event
 */
function handleChatMessage(socket: Socket, io: SocketIOServer): void {
  socket.on('chat:message', async (data: {
    roomId: string;
    username: string;
    message: string;
  }) => {
    try {
      logger.debug(`chat:message from ${data.username} in room ${data.roomId}`);

      const result = await multiplayerService.sendChatMessage(
        data.roomId,
        data.username,
        data.message
      );

      if (result.success) {
        // Success response (message already broadcast by service event)
        socket.emit('message:sent', {
          success: true,
        });
      } else {
        socket.emit('error', {
          success: false,
          error: result.error || 'UNKNOWN_ERROR',
          message: 'Failed to send message',
        });
      }
    } catch (error: any) {
      logger.error('Error handling chat:message', error);
      socket.emit('error', {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while sending the message',
      });
    }
  });
}

/**
 * Handle room:state event (for polling updates)
 */
function handleRoomState(socket: Socket, io: SocketIOServer): void {
  socket.on('room:state', (data: {
    roomId: string;
  }) => {
    try {
      const room = multiplayerService.getRoom(data.roomId);

      if (!room) {
        socket.emit('error', {
          success: false,
          error: 'NOT_FOUND',
          message: 'Room not found',
        });
        return;
      }

      // Send current room state
      socket.emit('room:state', {
        success: true,
        data: {
          roomId: room.roomId,
          joinCode: room.joinCode,
          hostId: room.hostId,
          phase: room.phase,
          currentRound: room.currentRound,
          totalRounds: room.totalRounds,
          players: Array.from(room.players.values()).map(p => ({
            userId: p.userId,
            username: p.username,
            avatar: p.avatar,
            role: p.role,
            status: p.status,
            currentScore: p.currentScore,
            isGuest: p.isGuest,
          })),
          chatMessages: room.chatMessages,
          timestamp: Date.now(),
        },
      });
    } catch (error: any) {
      logger.error('Error handling room:state', error);
      socket.emit('error', {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching room state',
      });
    }
  });
}

/**
 * Handle config:update event
 */
function handleConfigUpdate(socket: Socket, io: SocketIOServer): void {
  socket.on('config:update', async (data: {
    roomId: string;
    username: string;
    config: {
      roundsCount: number;
      supportedCategories: string[];
      excludedLetters: string[];
    };
  }) => {
    try {
      logger.info(`config:update request from ${data.username} in room ${data.roomId}`);

      const result = await multiplayerService.updateConfig(
        data.roomId,
        data.username,
        data.config
      );

      if (result.success) {
        socket.emit('config:update:success', {
          success: true,
          message: 'Configuration updated successfully',
        });

        logger.info(`Config updated for room ${data.roomId}`);
      } else {
        socket.emit('error', {
          success: false,
          error: result.error || 'UNKNOWN_ERROR',
          message: 'Failed to update configuration',
        });

        logger.warn(`Config update failed: ${result.error}`);
      }
    } catch (error: any) {
      logger.error('Error handling config:update', error);
      socket.emit('error', {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while updating configuration',
      });
    }
  });
}

/**
 * Handle game:start event
 */
function handleGameStart(socket: Socket, io: SocketIOServer): void {
  socket.on('game:start', async (data: {
    roomId: string;
    username: string;
    config?: {
      roundsCount: number;
      supportedCategories: string[];
      excludedLetters: string[];
    };
  }) => {
    try {
      logger.info(`game:start request from ${data.username} in room ${data.roomId}`);

      const result = await multiplayerService.startGame(
        data.roomId,
        data.username,
        data.config
      );

      if (result.success && result.data) {
        const room = result.data;

        // Update room phase to playing after starting
        room.phase = 'playing';
        room.rounds[0].startedAt = Date.now();
        multiplayerService.updateRoom(room);

        socket.emit('game:start:success', {
          success: true,
          message: 'Game started successfully',
        });

        logger.info(`Game started for room ${data.roomId}`);
      } else {
        socket.emit('error', {
          success: false,
          error: result.error || 'UNKNOWN_ERROR',
          message: 'Failed to start game',
        });

        logger.warn(`Game start failed: ${result.error}`);
      }
    } catch (error: any) {
      logger.error('Error handling game:start', error);
      socket.emit('error', {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while starting the game',
      });
    }
  });
}

/**
 * Handle answer:submit event
 */
function handleAnswerSubmit(socket: Socket, io: SocketIOServer): void {
  socket.on('answer:submit', async (data: {
    roomId: string;
    username: string;
    answers: Array<{
      letter: string;
      word: string;
      category: string;
      timeLeft: number;
    }>;
  }) => {
    try {
      logger.info(`answer:submit request from ${data.username} in room ${data.roomId}`);

      const result = await multiplayerService.submitAnswers(
        data.roomId,
        data.username,
        data.answers
      );

      if (result.success && result.data) {
        socket.emit('answer:submit:success', {
          success: true,
          data: result.data,
        });

        logger.info(`Answers submitted for ${data.username} in room ${data.roomId}`);
      } else {
        socket.emit('error', {
          success: false,
          error: result.error || 'UNKNOWN_ERROR',
          message: 'Failed to submit answers',
        });

        logger.warn(`Answer submission failed: ${result.error}`);
      }
    } catch (error: any) {
      logger.error('Error handling answer:submit', error);
      socket.emit('error', {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while submitting answers',
      });
    }
  });
}

/**
 * Handle round:results event
 */
function handleRoundResults(socket: Socket, io: SocketIOServer): void {
  socket.on('round:results', async (data: {
    roomId: string;
    username: string;
    roundNumber?: number;
  }) => {
    try {
      logger.info(`round:results request from ${data.username} in room ${data.roomId}`);

      const result = await multiplayerService.getRoundResults(
        data.roomId,
        data.username,
        data.roundNumber
      );

      if (result.success && result.data) {
        socket.emit('round:results:success', {
          success: true,
          data: result.data,
        });

        logger.info(`Round results sent for room ${data.roomId}`);
      } else {
        socket.emit('error', {
          success: false,
          error: result.error || 'UNKNOWN_ERROR',
          message: 'Failed to get round results',
        });

        logger.warn(`Get round results failed: ${result.error}`);
      }
    } catch (error: any) {
      logger.error('Error handling round:results', error);
      socket.emit('error', {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while getting round results',
      });
    }
  });
}

/**
 * Handle round:next event
 */
function handleNextRound(socket: Socket, io: SocketIOServer): void {
  socket.on('round:next', async (data: {
    roomId: string;
    username: string;
  }) => {
    try {
      logger.info(`round:next request from ${data.username} in room ${data.roomId}`);

      const result = await multiplayerService.nextRound(data.roomId, data.username);

      if (result.success) {
        socket.emit('round:next:success', {
          success: true,
          message: 'Proceeding to next round',
        });

        logger.info(`Next round triggered for room ${data.roomId}`);
      } else {
        socket.emit('error', {
          success: false,
          error: result.error || 'UNKNOWN_ERROR',
          message: 'Failed to proceed to next round',
        });

        logger.warn(`Next round failed: ${result.error}`);
      }
    } catch (error: any) {
      logger.error('Error handling round:next', error);
      socket.emit('error', {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while proceeding to next round',
      });
    }
  });
}

/**
 * Handle game:end event
 */
function handleGameEnd(socket: Socket, io: SocketIOServer): void {
  socket.on('game:end', async (data: {
    roomId: string;
    username: string;
  }) => {
    try {
      logger.info(`game:end request from ${data.username} in room ${data.roomId}`);

      const result = await multiplayerService.endGame(data.roomId, data.username);

      if (result.success) {
        socket.emit('game:end:success', {
          success: true,
          message: 'Game ended successfully. Returning to lobby...',
        });

        logger.info(`Game ended by ${data.username} in room ${data.roomId}`);
      } else {
        socket.emit('error', {
          success: false,
          error: result.error || 'UNKNOWN_ERROR',
          message: 'Failed to end game',
        });

        logger.warn(`Game end failed: ${result.error}`);
      }
    } catch (error: any) {
      logger.error('Error handling game:end', error);
      socket.emit('error', {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while ending the game',
      });
    }
  });
}

/**
 * Handle game:summary event
 */
function handleGameSummary(socket: Socket, io: SocketIOServer): void {
  socket.on('game:summary', async (data: {
    roomId: string;
    username: string;
  }) => {
    try {
      logger.info(`game:summary request from ${data.username} in room ${data.roomId}`);

      const result = await multiplayerService.getGameSummary(data.roomId, data.username);

      if (result.success && result.data) {
        socket.emit('game:summary:success', {
          success: true,
          data: result.data,
        });

        logger.info(`Game summary sent for room ${data.roomId}`);
      } else {
        socket.emit('error', {
          success: false,
          error: result.error || 'UNKNOWN_ERROR',
          message: 'Failed to get game summary',
        });

        logger.warn(`Get game summary failed: ${result.error}`);
      }
    } catch (error: any) {
      logger.error('Error handling game:summary', error);
      socket.emit('error', {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while getting game summary',
      });
    }
  });
}

/**
 * Handle client disconnect
 */
function handleDisconnect(socket: Socket): void {
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);

    // Mark player as disconnected
    multiplayerService.markPlayerDisconnected(socket.id);
  });
}
